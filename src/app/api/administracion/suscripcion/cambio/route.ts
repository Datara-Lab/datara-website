import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    and,
    eq,
    inArray,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import Stripe from "stripe";

import {
    getCRMIndustryTemplates,
} from "@/config/crm/industries";

import {
    db,
} from "@/db";

import {
    commercialCatalogItems,
    commercialPurchases,
    subscriptions,
    tenants,
} from "@/db/schema";

import {
    AdministrationAuthError,
    requireAdminContext,
} from "@/lib/administration/require-admin-context";

import {
    isCRMModulePackageKey,
} from "@/lib/crm/module-catalog";

import {
    provisionCRMModuleEntitlements,
} from "@/lib/crm/provision-module-entitlements";

export const dynamic =
    "force-dynamic";

type PreviewEnvironment = {
    STRIPE_SECRET_KEY?: string;
};

type PreviewPayload = {
    billingPeriod?: unknown;
    catalogItemIds?: unknown;
};

class ApiError extends Error {
    status: number;

    constructor(
        message: string,
        status: number,
    ) {
        super(message);

        this.status =
            status;
    }
}

function isRecord(
    value: unknown,
): value is Record<
    string,
    unknown
> {
    return (
        typeof value ===
        "object" &&
        value !== null &&
        !Array.isArray(
            value,
        )
    );
}

function getBillingPeriod(
    value: unknown,
):
    | "monthly"
    | "annual" {
    if (
        value ===
        "monthly" ||
        value ===
        "annual"
    ) {
        return value;
    }

    throw new ApiError(
        "La periodicidad seleccionada no es válida.",
        400,
    );
}

function getCatalogItemIds(
    value: unknown,
): string[] {
    if (
        !Array.isArray(
            value,
        ) ||
        value.length ===
        0 ||
        value.some(
            (itemId) =>
                typeof itemId !==
                "string" ||
                !itemId.trim(),
        )
    ) {
        throw new ApiError(
            "Selecciona al menos una opción comercial.",
            400,
        );
    }

    return Array.from(
        new Set(
            value.map(
                (itemId) =>
                    (
                        itemId as string
                    ).trim(),
            ),
        ),
    );
}

function getEnvironment():
    PreviewEnvironment {
    const {
        env,
    } = getCloudflareContext();

    return env as
        PreviewEnvironment;
}

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof
        ApiError ||
        error instanceof
        AdministrationAuthError
    ) {
        return NextResponse.json(
            {
                success: false,
                error:
                    error.message,
            },
            {
                status:
                    error.status,
            },
        );
    }

    console.error(
        "No fue posible aplicar el cambio de plan:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible aplicar el cambio de plan.",
        },
        {
            status: 500,
        },
    );
}

export async function POST(
    request: Request,
) {
    try {
        const {
            tenantId,
        } =
            await requireAdminContext();

        const requestBody:
            unknown =
            await request.json();

        if (
            !isRecord(
                requestBody,
            )
        ) {
            throw new ApiError(
                "La información enviada no tiene un formato válido.",
                400,
            );
        }

        const payload =
            requestBody as
            PreviewPayload;

        const billingPeriod =
            getBillingPeriod(
                payload.billingPeriod,
            );

        const requestedItemIds =
            getCatalogItemIds(
                payload.catalogItemIds,
            );

        const [tenant] =
            await db
                .select({
                    industry:
                        tenants.industry,
                })
                .from(
                    tenants,
                )
                .where(
                    eq(
                        tenants.id,
                        tenantId,
                    ),
                )
                .limit(1);

        if (
            !tenant
                ?.industry
        ) {
            throw new ApiError(
                "La empresa no tiene una industria configurada.",
                409,
            );
        }

        const industryTemplate =
            getCRMIndustryTemplates()
                .find(
                    (template) =>
                        template.id ===
                        tenant.industry,
                );

        if (
            !industryTemplate
        ) {
            throw new ApiError(
                "La industria de la empresa no está disponible.",
                409,
            );
        }

        const [
            currentSubscription,
        ] =
            await db
                .select({
                    id:
                        subscriptions.id,

                    providerSubscriptionId:
                        subscriptions
                            .providerSubscriptionId,

                    providerScheduleId:
                        subscriptions
                            .providerScheduleId,

                    status:
                        subscriptions.status,

                    billingPeriod:
                        subscriptions
                            .billingPeriod,

                    catalogItemIds:
                        subscriptions
                            .catalogItemIds,
                })
                .from(
                    subscriptions,
                )
                .where(
                    and(
                        eq(
                            subscriptions.tenantId,
                            tenantId,
                        ),

                        eq(
                            subscriptions.provider,
                            "stripe",
                        ),

                        eq(
                            subscriptions.productKey,
                            "crm",
                        ),
                    ),
                )
                .limit(1);

        if (
            !currentSubscription
                ?.providerSubscriptionId
        ) {
            throw new ApiError(
                "La empresa no tiene una suscripción de Stripe disponible para modificar.",
                409,
            );
        }

        if (
            currentSubscription.status !==
            "active"
        ) {
            throw new ApiError(
                "Soluciona el estado de pago antes de cambiar el plan.",
                409,
            );
        }

        const allItemIds =
            Array.from(
                new Set([
                    ...currentSubscription
                        .catalogItemIds,

                    ...requestedItemIds,
                ]),
            );

        const catalogItems =
            await db
                .select({
                    id:
                        commercialCatalogItems.id,

                    name:
                        commercialCatalogItems.name,

                    itemKey:
                        commercialCatalogItems
                            .itemKey,

                    includedUsers:
                        commercialCatalogItems
                            .includedUsers,

                    productKey:
                        commercialCatalogItems
                            .productKey,

                    moduleIds:
                        commercialCatalogItems
                            .moduleIds,

                    required:
                        commercialCatalogItems
                            .required,

                    monthlyPrice:
                        commercialCatalogItems
                            .monthlyPrice,

                    annualPrice:
                        commercialCatalogItems
                            .annualPrice,

                    currency:
                        commercialCatalogItems
                            .currency,

                    stripeMonthlyPriceId:
                        commercialCatalogItems
                            .stripeMonthlyPriceId,

                    stripeAnnualPriceId:
                        commercialCatalogItems
                            .stripeAnnualPriceId,
                })
                .from(
                    commercialCatalogItems,
                )
                .where(
                    and(
                        inArray(
                            commercialCatalogItems.id,
                            allItemIds,
                        ),

                        eq(
                            commercialCatalogItems.active,
                            true,
                        ),

                        eq(
                            commercialCatalogItems.productKey,
                            "crm",
                        ),
                    ),
                );

        const selectedModuleIds =
            new Set(
                industryTemplate
                    .defaultModules,
            );

        const compatibleItems =
            catalogItems.filter(
                (item) =>
                    item.moduleIds.length ===
                    0 ||
                    item.moduleIds.every(
                        (moduleId) =>
                            selectedModuleIds.has(
                                moduleId,
                            ),
                    ),
            );

        const compatibleIds =
            new Set(
                compatibleItems.map(
                    (item) =>
                        item.id,
                ),
            );

        if (
            requestedItemIds.some(
                (itemId) =>
                    !compatibleIds.has(
                        itemId,
                    ),
            )
        ) {
            throw new ApiError(
                "La selección contiene opciones incompatibles con la industria.",
                400,
            );
        }

        const requiredItemIds =
            compatibleItems
                .filter(
                    (item) =>
                        item.required,
                )
                .map(
                    (item) =>
                        item.id,
                );

        const selectedItemIds =
            Array.from(
                new Set([
                    ...requestedItemIds,
                    ...requiredItemIds,
                ]),
            );

        const selectedItems =
            compatibleItems.filter(
                (item) =>
                    selectedItemIds.includes(
                        item.id,
                    ),
            );

        const packageKeys =
            Array.from(
                new Set(
                    selectedItems
                        .map(
                            (item) =>
                                item.itemKey,
                        )
                        .filter(
                            isCRMModulePackageKey,
                        ),
                ),
            );

        if (
            packageKeys.length ===
            0
        ) {
            throw new ApiError(
                "El plan debe incluir al menos un paquete de CRM.",
                400,
            );
        }

        const seats =
            Math.max(
                1,
                selectedItems.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total +
                        item.includedUsers,
                    0,
                ),
            );


        const currentItems =
            compatibleItems.filter(
                (item) =>
                    currentSubscription
                        .catalogItemIds
                        .includes(
                            item.id,
                        ),
            );

        const getTotal =
            (
                items:
                    typeof selectedItems,
                period:
                    | "monthly"
                    | "annual",
            ) =>
                items.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total +
                        Number(
                            period ===
                                "monthly"
                                ? item.monthlyPrice
                                : item.annualPrice,
                        ),
                    0,
                );

        const currentTotal =
            getTotal(
                currentItems,
                currentSubscription
                    .billingPeriod ===
                    "annual"
                    ? "annual"
                    : "monthly",
            );

        const selectedTotal =
            getTotal(
                selectedItems,
                billingPeriod,
            );

        const currentItemIds =
            [
                ...currentSubscription
                    .catalogItemIds,
            ].sort();

        const nextItemIds =
            [
                ...selectedItemIds,
            ].sort();

        const hasSameItems =
            currentItemIds.length ===
                nextItemIds.length &&
            currentItemIds.every(
                (
                    itemId,
                    index,
                ) =>
                    itemId ===
                    nextItemIds[
                        index
                    ],
            );

        const hasSameBillingPeriod =
            currentSubscription
                .billingPeriod ===
            billingPeriod;

        if (
            hasSameItems &&
            hasSameBillingPeriod
        ) {
            return NextResponse.json({
                success: true,

                data: {
                    changeType:
                        "no_change",

                    billingPeriod,

                    catalogItemIds:
                        selectedItemIds,

                    recurringTotal:
                        selectedTotal,

                    amountDueNow:
                        0,

                    currency:
                        selectedItems[
                            0
                        ]?.currency ??
                        "mxn",

                    effectiveAt:
                        null,
                },
            });
        }

        const normalizedCurrentAnnual =
            currentSubscription
                .billingPeriod ===
                "annual"
                ? currentTotal
                : currentTotal *
                12;

        const normalizedSelectedAnnual =
            billingPeriod ===
                "annual"
                ? selectedTotal
                : selectedTotal *
                12;

        const scheduled =
            (
                currentSubscription
                    .billingPeriod ===
                "annual" &&
                billingPeriod ===
                "monthly"
            ) ||
            (
                currentSubscription
                    .billingPeriod ===
                billingPeriod &&
                normalizedSelectedAnnual <
                normalizedCurrentAnnual
            );

        const stripeSecretKey =
            getEnvironment()
                .STRIPE_SECRET_KEY ??
            process.env
                .STRIPE_SECRET_KEY;

        if (!stripeSecretKey) {
            throw new ApiError(
                "El servicio de pagos no está configurado.",
                500,
            );
        }

        const stripe =
            new Stripe(
                stripeSecretKey,
            );

        const stripeSubscription =
            await stripe
                .subscriptions
                .retrieve(
                    currentSubscription
                        .providerSubscriptionId,
                );

        const currentPeriodEnd =
            Math.max(
                ...stripeSubscription
                    .items
                    .data
                    .map(
                        (item) =>
                            item.current_period_end,
                    ),
            );

        const priceIds =
            selectedItems.map(
                (item) => {
                    const priceId =
                        billingPeriod ===
                            "monthly"
                            ? item
                                .stripeMonthlyPriceId
                            : item
                                .stripeAnnualPriceId;

                    if (!priceId) {
                        throw new ApiError(
                            `El precio de ${item.name} no está sincronizado con Stripe.`,
                            500,
                        );
                    }

                    return priceId;
                },
            );

        if (scheduled) {
            const attachedScheduleId =
                typeof stripeSubscription
                    .schedule ===
                    "string"
                    ? stripeSubscription
                        .schedule
                    : stripeSubscription
                        .schedule
                        ?.id ??
                    currentSubscription
                        .providerScheduleId;

            const schedule =
                attachedScheduleId
                    ? await stripe
                        .subscriptionSchedules
                        .retrieve(
                            attachedScheduleId,
                        )
                    : await stripe
                        .subscriptionSchedules
                        .create({
                            from_subscription:
                                stripeSubscription.id,
                        });

            const currentPeriodStart =
                Math.min(
                    ...stripeSubscription
                        .items
                        .data
                        .map(
                            (item) =>
                                item.current_period_start,
                        ),
                );

            await stripe
                .subscriptionSchedules
                .update(
                    schedule.id,
                    {
                        end_behavior:
                            "release",

                        phases: [
                            {
                                start_date:
                                    schedule
                                        .current_phase
                                        ?.start_date ??
                                    currentPeriodStart,

                                end_date:
                                    currentPeriodEnd,

                                items:
                                    stripeSubscription
                                        .items
                                        .data
                                        .map(
                                            (item) => ({
                                                price:
                                                    item.price.id,

                                                quantity:
                                                    item.quantity ??
                                                    1,
                                            }),
                                        ),

                                proration_behavior:
                                    "none",
                            },

                            {
                                start_date:
                                    currentPeriodEnd,

                                items:
                                    priceIds.map(
                                        (price) => ({
                                            price,

                                            quantity:
                                                1,
                                        }),
                                    ),

                                proration_behavior:
                                    "none",

                                metadata: {
                                    productKey:
                                        "crm",

                                    industry:
                                        tenant.industry,

                                    billingPeriod,

                                    catalogItemIds:
                                        selectedItemIds.join(
                                            ",",
                                        ),
                                },
                            },
                        ],
                    },
                );

            await db
                .update(
                    subscriptions,
                )
                .set({
                    providerScheduleId:
                        schedule.id,

                    pendingBillingPeriod:
                        billingPeriod,

                    pendingCatalogItemIds:
                        selectedItemIds,

                    pendingChangeAt:
                        new Date(
                            currentPeriodEnd *
                            1000,
                        ),

                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        subscriptions.id,
                        currentSubscription.id,
                    ),
                );

            return NextResponse.json({
                success: true,

                data: {
                    changeType:
                        "scheduled",

                    billingPeriod,

                    catalogItemIds:
                        selectedItemIds,

                    recurringTotal:
                        selectedTotal,

                    amountDueNow:
                        0,

                    currency:
                        selectedItems[
                            0
                        ]?.currency ??
                        "mxn",

                    effectiveAt:
                        new Date(
                            currentPeriodEnd *
                            1000,
                        ).toISOString(),
                },
            });
        }

        const prorationDate =
            Math.floor(
                Date.now() /
                1000,
            );

        const invoicePreview =
            await stripe.invoices
                .createPreview({
                    subscription:
                        stripeSubscription.id,

                    subscription_details: {
                        items: [
                            ...stripeSubscription
                                .items
                                .data
                                .map(
                                    (item) => ({
                                        id:
                                            item.id,

                                        deleted:
                                            true,
                                    }),
                                ),

                            ...priceIds.map(
                                (price) => ({
                                    price,
                                    quantity:
                                        1,
                                }),
                            ),
                        ],

                        proration_behavior:
                            "always_invoice",

                        proration_date:
                            currentSubscription
                                .billingPeriod ===
                            billingPeriod
                                ? prorationDate
                                : undefined,

                        billing_cycle_anchor:
                            currentSubscription
                                .billingPeriod !==
                            billingPeriod
                                ? "now"
                                : "unchanged",
                    },
                });

        const attachedScheduleId =
            typeof stripeSubscription
                .schedule ===
                "string"
                ? stripeSubscription
                    .schedule
                : stripeSubscription
                    .schedule
                    ?.id ??
                currentSubscription
                    .providerScheduleId;

        if (attachedScheduleId) {
            const schedule =
                await stripe
                    .subscriptionSchedules
                    .retrieve(
                        attachedScheduleId,
                    );

            if (
                schedule.status ===
                    "active" ||
                schedule.status ===
                    "not_started"
            ) {
                await stripe
                    .subscriptionSchedules
                    .release(
                        schedule.id,
                    );
            }

            await db
                .update(
                    subscriptions,
                )
                .set({
                    providerScheduleId:
                        null,

                    pendingBillingPeriod:
                        null,

                    pendingCatalogItemIds:
                        null,

                    pendingChangeAt:
                        null,

                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        subscriptions.id,
                        currentSubscription.id,
                    ),
                );
        }

        const updatedStripeSubscription =
            await stripe
                .subscriptions
                .update(
                    stripeSubscription.id,
                    {
                        items: [
                            ...stripeSubscription
                                .items
                                .data
                                .map(
                                    (item) => ({
                                        id:
                                            item.id,

                                        deleted:
                                            true,
                                    }),
                                ),

                            ...priceIds.map(
                                (price) => ({
                                    price,
                                    quantity:
                                        1,
                                }),
                            ),
                        ],

                        proration_behavior:
                            "always_invoice",

                        payment_behavior:
                            "error_if_incomplete",

                        proration_date:
                            currentSubscription
                                .billingPeriod ===
                            billingPeriod
                                ? prorationDate
                                : undefined,

                        billing_cycle_anchor:
                            currentSubscription
                                .billingPeriod !==
                            billingPeriod
                                ? "now"
                                : "unchanged",

                        metadata: {
                            productKey:
                                "crm",

                            industry:
                                tenant.industry,

                            billingPeriod,

                            catalogItemIds:
                                selectedItemIds.join(
                                    ",",
                                ),
                        },
                    },
                );

        const updatedPeriodStart =
            Math.min(
                ...updatedStripeSubscription
                    .items
                    .data
                    .map(
                        (item) =>
                            item.current_period_start,
                    ),
            );

        const updatedPeriodEnd =
            Math.max(
                ...updatedStripeSubscription
                    .items
                    .data
                    .map(
                        (item) =>
                            item.current_period_end,
                    ),
            );

        const now =
            new Date();

        await provisionCRMModuleEntitlements({
            tenantId,

            industry:
                industryTemplate.id,

            mode:
                "subscription",

            packageKeys,

            expiresAt:
                null,
        });

        const planKey =
            `crm-${packageKeys.join(
                "-",
            )}`;

        await db
            .update(
                subscriptions,
            )
            .set({
                planKey,

                status:
                    "active",

                seats,

                billingPeriod,

                catalogItemIds:
                    selectedItemIds,

                pendingBillingPeriod:
                    null,

                pendingCatalogItemIds:
                    null,

                pendingChangeAt:
                    null,

                currentPeriodStart:
                    new Date(
                        updatedPeriodStart *
                        1000,
                    ),

                currentPeriodEnd:
                    new Date(
                        updatedPeriodEnd *
                        1000,
                    ),

                cancelAtPeriodEnd:
                    updatedStripeSubscription
                        .cancel_at_period_end,

                updatedAt:
                    now,
            })
            .where(
                eq(
                    subscriptions.id,
                    currentSubscription.id,
                ),
            );

        const purchaseLineItems =
            selectedItems.map(
                (item) => ({
                    name:
                        item.name,

                    itemKey:
                        item.itemKey,

                    quantity:
                        1,

                    unitAmount:
                        Math.round(
                            Number(
                                billingPeriod ===
                                    "monthly"
                                    ? item.monthlyPrice
                                    : item.annualPrice,
                            ) *
                            100,
                        ),

                    catalogItemId:
                        item.id,
                }),
            );

        await db
            .update(
                commercialPurchases,
            )
            .set({
                billingPeriod,

                catalogItemIds:
                    selectedItemIds,

                lineItems:
                    purchaseLineItems,

                totalAmount:
                    selectedTotal.toFixed(
                        2,
                    ),

                status:
                    "provisioned",

                updatedAt:
                    now,
            })
            .where(
                eq(
                    commercialPurchases
                        .stripeSubscriptionId,
                    currentSubscription
                        .providerSubscriptionId,
                ),
            );

        return NextResponse.json({
            success: true,

            data: {
                changeType:
                    "immediate",

                billingPeriod,

                catalogItemIds:
                    selectedItemIds,

                recurringTotal:
                    selectedTotal,

                amountDueNow:
                    invoicePreview
                        .amount_due /
                    100,

                currency:
                    invoicePreview.currency,

                effectiveAt:
                    new Date().toISOString(),

                prorationDate:
                    currentSubscription
                        .billingPeriod ===
                    billingPeriod
                        ? prorationDate
                        : null,
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}

export async function DELETE() {
    try {
        const {
            tenantId,
        } =
            await requireAdminContext();

        const [
            currentSubscription,
        ] =
            await db
                .select({
                    id:
                        subscriptions.id,

                    providerScheduleId:
                        subscriptions
                            .providerScheduleId,

                    pendingChangeAt:
                        subscriptions
                            .pendingChangeAt,
                })
                .from(
                    subscriptions,
                )
                .where(
                    and(
                        eq(
                            subscriptions.tenantId,
                            tenantId,
                        ),

                        eq(
                            subscriptions.provider,
                            "stripe",
                        ),

                        eq(
                            subscriptions.productKey,
                            "crm",
                        ),
                    ),
                )
                .limit(1);

        if (
            !currentSubscription
        ) {
            throw new ApiError(
                "La empresa no tiene una suscripción de Stripe.",
                404,
            );
        }

        if (
            !currentSubscription
                .pendingChangeAt
        ) {
            throw new ApiError(
                "La suscripción no tiene un cambio programado.",
                409,
            );
        }

        if (
            currentSubscription
                .providerScheduleId
        ) {
            const stripeSecretKey =
                getEnvironment()
                    .STRIPE_SECRET_KEY ??
                process.env
                    .STRIPE_SECRET_KEY;

            if (!stripeSecretKey) {
                throw new ApiError(
                    "El servicio de pagos no está configurado.",
                    500,
                );
            }

            const stripe =
                new Stripe(
                    stripeSecretKey,
                );

            const schedule =
                await stripe
                    .subscriptionSchedules
                    .retrieve(
                        currentSubscription
                            .providerScheduleId,
                    );

            if (
                schedule.status ===
                    "active" ||
                schedule.status ===
                    "not_started"
            ) {
                await stripe
                    .subscriptionSchedules
                    .release(
                        schedule.id,
                    );
            }
        }

        await db
            .update(
                subscriptions,
            )
            .set({
                providerScheduleId:
                    null,

                pendingBillingPeriod:
                    null,

                pendingCatalogItemIds:
                    null,

                pendingChangeAt:
                    null,

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    subscriptions.id,
                    currentSubscription.id,
                ),
            );

        return NextResponse.json({
            success: true,

            message:
                "El cambio programado fue cancelado correctamente.",
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}
