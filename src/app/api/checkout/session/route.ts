import {
    auth,
} from "@clerk/nextjs/server";

import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    desc,
    eq,
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
    trialRedemptions,
} from "@/db/schema";

export const dynamic =
    "force-dynamic";

type CheckoutEnvironment = {
    STRIPE_SECRET_KEY?: string;
};

type CheckoutPayload = {
    purchaseType?: unknown;
    industry?: unknown;
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

        this.status = status;
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
        !Array.isArray(value)
    );
}

function getEnvironment():
    CheckoutEnvironment {
    const {
        env,
    } = getCloudflareContext();

    return env as
        CheckoutEnvironment;
}

function getIndustry(
    value: unknown,
): string {
    if (
        typeof value !==
        "string"
    ) {
        throw new ApiError(
            "Selecciona una industria.",
            400,
        );
    }

    const industry =
        value.trim();

    if (!industry) {
        throw new ApiError(
            "Selecciona una industria.",
            400,
        );
    }

    return industry;
}

function getBillingPeriod(
    value: unknown,
): "monthly" | "annual" {
    if (
        value !== "monthly" &&
        value !== "annual"
    ) {
        throw new ApiError(
            "Selecciona una periodicidad de pago válida.",
            400,
        );
    }

    return value;
}

function getCatalogItemIds(
    value: unknown,
): string[] {
    if (!Array.isArray(value)) {
        throw new ApiError(
            "Selecciona al menos una opción comercial.",
            400,
        );
    }

    const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const catalogItemIds =
        Array.from(
            new Set(
                value.filter(
                    (
                        itemId,
                    ): itemId is string =>
                        typeof itemId ===
                            "string" &&
                        uuidPattern.test(
                            itemId,
                        ),
                ),
            ),
        );

    if (
        catalogItemIds.length ===
        0
    ) {
        throw new ApiError(
            "Selecciona al menos una opción comercial.",
            400,
        );
    }

    if (
        catalogItemIds.length !==
        value.length
    ) {
        throw new ApiError(
            "La selección comercial contiene elementos inválidos.",
            400,
        );
    }

    if (
        catalogItemIds.length > 30
    ) {
        throw new ApiError(
            "La selección comercial excede el límite permitido.",
            400,
        );
    }

    return catalogItemIds;
}

function getAmountInCents(
    value: string,
): number {
    const amount =
        Number(value);

    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {
        throw new ApiError(
            "El catálogo contiene un precio inválido.",
            500,
        );
    }

    return Math.round(
        amount * 100,
    );
}

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof ApiError
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
        "No fue posible crear la sesión de pago:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible iniciar el pago. Intenta nuevamente.",
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
            userId,
            orgId,
        } = await auth();

        const environment =
            getEnvironment();

        const stripeSecretKey =
            environment
                .STRIPE_SECRET_KEY ??
            process.env
                .STRIPE_SECRET_KEY;

        if (!stripeSecretKey) {
            throw new ApiError(
                "El servicio de pagos no está configurado.",
                500,
            );
        }

        let requestBody:
            unknown;

        try {
            requestBody =
                await request.json();
        } catch {
            throw new ApiError(
                "La información enviada no tiene un formato válido.",
                400,
            );
        }

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
                CheckoutPayload;

        let industry =
            getIndustry(
                payload.industry,
            );

        const billingPeriod =
            getBillingPeriod(
                payload.billingPeriod,
            );

        const requestedItemIds =
            getCatalogItemIds(
                payload.catalogItemIds,
            );

        const purchaseType =
            payload.purchaseType ===
            "trial_conversion"
                ? "trial_conversion"
                : "new_customer";

        let linkedTenantId:
            string | null =
            null;

        let linkedOrganizationId:
            string | null =
            null;

        let linkedOwnerEmail:
            string | null =
            null;

        if (
            purchaseType ===
            "trial_conversion"
        ) {
            if (
                !userId ||
                !orgId
            ) {
                throw new ApiError(
                    "Inicia sesión en la organización del demo para contratar.",
                    401,
                );
            }

            const [tenant] =
                await db
                    .select({
                        id:
                            tenants.id,

                        industry:
                            tenants.industry,
                    })
                    .from(
                        tenants,
                    )
                    .where(
                        eq(
                            tenants.clerkOrganizationId,
                            orgId,
                        ),
                    )
                    .limit(1);

            if (!tenant) {
                throw new ApiError(
                    "No encontramos la empresa asociada con este demo.",
                    404,
                );
            }

            const [subscription] =
                await db
                    .select({
                        status:
                            subscriptions.status,
                    })
                    .from(
                        subscriptions,
                    )
                    .where(
                        eq(
                            subscriptions.tenantId,
                            tenant.id,
                        ),
                    )
                    .orderBy(
                        desc(
                            subscriptions.createdAt,
                        ),
                    )
                    .limit(1);

            if (
                subscription?.status !==
                "trialing"
            ) {
                throw new ApiError(
                    "La organización seleccionada no tiene un demo disponible para convertir.",
                    409,
                );
            }

            if (!tenant.industry) {
                throw new ApiError(
                    "El demo no tiene una industria configurada.",
                    409,
                );
            }

            industry =
                tenant.industry;

            linkedTenantId =
                tenant.id;

            linkedOrganizationId =
                orgId;

            const [trialRedemption] =
                await db
                    .select({
                        ownerEmail:
                            trialRedemptions
                                .ownerEmail,
                    })
                    .from(
                        trialRedemptions,
                    )
                    .where(
                        eq(
                            trialRedemptions
                                .tenantId,
                            tenant.id,
                        ),
                    )
                    .orderBy(
                        desc(
                            trialRedemptions
                                .createdAt,
                        ),
                    )
                    .limit(1);

            linkedOwnerEmail =
                trialRedemption
                    ?.ownerEmail
                    ?.trim()
                    .toLowerCase() ??
                null;

            const [existingPurchase] =
                await db
                    .select({
                        status:
                            commercialPurchases
                                .status,

                        expiresAt:
                            commercialPurchases
                                .expiresAt,
                    })
                    .from(
                        commercialPurchases,
                    )
                    .where(
                        eq(
                            commercialPurchases
                                .tenantId,
                            tenant.id,
                        ),
                    )
                    .orderBy(
                        desc(
                            commercialPurchases
                                .createdAt,
                        ),
                    )
                    .limit(1);

            const existingStatus =
                existingPurchase
                    ?.status;

            const checkoutStillActive =
                [
                    "checkout_pending",
                    "checkout_created",
                ].includes(
                    existingStatus ??
                        "",
                ) &&
                (
                    !existingPurchase
                        ?.expiresAt ||
                    existingPurchase
                        .expiresAt
                        .getTime() >
                        Date.now()
                );

            const purchaseAlreadyPaid =
                [
                    "paid_pending_account",
                    "account_linked",
                    "organization_created",
                    "provisioning",
                    "provisioned",
                ].includes(
                    existingStatus ??
                        "",
                );

            if (checkoutStillActive) {
                throw new ApiError(
                    "Ya existe una sesión de pago vigente para este demo.",
                    409,
                );
            }

            if (purchaseAlreadyPaid) {
                throw new ApiError(
                    "Este demo ya tiene una contratación pagada o en proceso de activación.",
                    409,
                );
            }
        }

        const selectedTemplate =
            getCRMIndustryTemplates()
                .filter(
                    (template) =>
                        template
                            .defaultModules
                            .length >
                        0,
                )
                .find(
                    (template) =>
                        template.id ===
                        industry,
                );

        if (!selectedTemplate) {
            throw new ApiError(
                "Selecciona una industria disponible.",
                400,
            );
        }

        const selectedModuleIds =
            new Set(
                selectedTemplate
                    .defaultModules,
            );

        const catalogItems =
            await db
                .select({
                    id:
                        commercialCatalogItems.id,

                    productKey:
                        commercialCatalogItems
                            .productKey,

                    itemKey:
                        commercialCatalogItems
                            .itemKey,

                    name:
                        commercialCatalogItems.name,

                    description:
                        commercialCatalogItems
                            .description,

                    monthlyPrice:
                        commercialCatalogItems
                            .monthlyPrice,

                    annualPrice:
                        commercialCatalogItems
                            .annualPrice,

                    stripeMonthlyPriceId:
                        commercialCatalogItems
                            .stripeMonthlyPriceId,

                    stripeAnnualPriceId:
                        commercialCatalogItems
                            .stripeAnnualPriceId,

                    currency:
                        commercialCatalogItems
                            .currency,

                    moduleIds:
                        commercialCatalogItems
                            .moduleIds,

                    required:
                        commercialCatalogItems
                            .required,
                })
                .from(
                    commercialCatalogItems,
                )
                .where(
                    eq(
                        commercialCatalogItems.active,
                        true,
                    ),
                );

        const compatibleItems =
            catalogItems.filter(
                (item) => {
                    if (
                        item.productKey !==
                        "crm"
                    ) {
                        return false;
                    }

                    if (
                        item.moduleIds.length ===
                        0
                    ) {
                        return true;
                    }

                    return item.moduleIds.every(
                        (moduleId) =>
                            selectedModuleIds.has(
                                moduleId,
                            ),
                    );
                },
            );

        const compatibleItemIds =
            new Set(
                compatibleItems.map(
                    (item) =>
                        item.id,
                ),
            );

        const hasInvalidSelection =
            requestedItemIds.some(
                (itemId) =>
                    !compatibleItemIds.has(
                        itemId,
                    ),
            );

        if (hasInvalidSelection) {
            throw new ApiError(
                "Una de las opciones seleccionadas no está disponible para esta industria.",
                400,
            );
        }

        const selectedCatalogItemIds =
            Array.from(
                new Set([
                    ...requestedItemIds,

                    ...compatibleItems
                        .filter(
                            (item) =>
                                item.required,
                        )
                        .map(
                            (item) =>
                                item.id,
                        ),
                ]),
            );

        const selectedCatalogItems =
            compatibleItems.filter(
                (item) =>
                    selectedCatalogItemIds
                        .includes(
                            item.id,
                        ),
            );

        if (
            selectedCatalogItems.length ===
            0
        ) {
            throw new ApiError(
                "Selecciona al menos una opción comercial.",
                400,
            );
        }

        const itemWithoutStripePrice =
            selectedCatalogItems.find(
                (item) =>
                    billingPeriod ===
                    "monthly"
                        ? !item
                              .stripeMonthlyPriceId
                        : !item
                              .stripeAnnualPriceId,
            );

        if (itemWithoutStripePrice) {
            throw new ApiError(
                `El precio de ${itemWithoutStripePrice.name} no está sincronizado con Stripe.`,
                500,
            );
        }

        const currencies =
            new Set(
                selectedCatalogItems.map(
                    (item) =>
                        item.currency
                            .trim()
                            .toLowerCase(),
                ),
            );

        if (
            currencies.size !==
            1
        ) {
            throw new ApiError(
                "Las opciones seleccionadas utilizan monedas diferentes.",
                400,
            );
        }

        const currency =
            Array.from(
                currencies,
            )[0];

        if (!currency) {
            throw new ApiError(
                "El catálogo no tiene una moneda válida.",
                500,
            );
        }

        const purchaseLineItems =
            selectedCatalogItems.map(
                (item) => {
                    const price =
                        billingPeriod ===
                        "monthly"
                            ? item.monthlyPrice
                            : item.annualPrice;

                    return {
                        catalogItemId:
                            item.id,

                        itemKey:
                            item.itemKey,

                        name:
                            item.name,

                        quantity:
                            1,

                        unitAmount:
                            getAmountInCents(
                                price,
                            ),
                    };
                },
            );

        const totalAmountInCents =
            purchaseLineItems.reduce(
                (
                    total,
                    item,
                ) =>
                    total +
                    item.unitAmount *
                        item.quantity,
                0,
            );

        if (
            totalAmountInCents <=
            0
        ) {
            throw new ApiError(
                "El total de la contratación debe ser mayor a cero.",
                400,
            );
        }

        const now =
            new Date();

        const expiresAt =
            new Date(
                now.getTime() +
                    23 *
                        60 *
                        60 *
                        1000,
            );

        const [purchase] =
            await db
                .insert(
                    commercialPurchases,
                )
                .values({
                    purchaseType,

                    tenantId:
                        linkedTenantId,

                    clerkUserId:
                        purchaseType ===
                        "trial_conversion"
                            ? userId
                            : null,

                    clerkOrganizationId:
                        linkedOrganizationId,

                    productKey:
                        "crm",

                    industry,

                    billingPeriod,

                    catalogItemIds:
                        selectedCatalogItemIds,

                    lineItems:
                        purchaseLineItems,

                    currency,

                    totalAmount:
                        (
                            totalAmountInCents /
                            100
                        ).toFixed(2),

                    status:
                        "checkout_pending",

                    expiresAt,

                    updatedAt:
                        now,
                })
                .returning({
                    id:
                        commercialPurchases.id,
                });

        if (!purchase) {
            throw new ApiError(
                "No fue posible registrar la contratación.",
                500,
            );
        }

        const stripe =
            new Stripe(
                stripeSecretKey,
            );

        let checkoutSession:
            Stripe.Checkout.Session;

        try {
            checkoutSession =
                await stripe
                    .checkout
                    .sessions
                    .create({
                        mode:
                            "subscription",

                        billing_address_collection:
                            "required",

                        customer_email:
                            linkedOwnerEmail ??
                            undefined,

                        line_items:
                            selectedCatalogItems.map(
                                (item) => ({
                                    quantity:
                                        1,

                                    price:
                                        billingPeriod ===
                                        "monthly"
                                            ? item
                                                  .stripeMonthlyPriceId!
                                            : item
                                                  .stripeAnnualPriceId!,
                                }),
                            ),

                        metadata: {
                            purchaseId:
                                purchase.id,

                            purchaseType,

                            tenantId:
                                linkedTenantId ??
                                "",

                            clerkOrganizationId:
                                linkedOrganizationId ??
                                "",

                            industry,

                            billingPeriod,
                        },

                        subscription_data: {
                            metadata: {
                                purchaseId:
                                    purchase.id,

                                purchaseType,

                                tenantId:
                                    linkedTenantId ??
                                    "",

                                clerkOrganizationId:
                                    linkedOrganizationId ??
                                    "",

                                industry,

                                billingPeriod,
                            },
                        },

                        success_url:
                            `${new URL(
                                request.url,
                            ).origin}/contratar/confirmar?session_id={CHECKOUT_SESSION_ID}`,

                        cancel_url:
                            `${new URL(
                                request.url,
                            ).origin}/contratar?industry=${encodeURIComponent(
                                industry,
                            )}${
                                purchaseType ===
                                "trial_conversion"
                                    ? "&purchase=trial_conversion"
                                    : ""
                            }`,

                        expires_at:
                            Math.floor(
                                expiresAt
                                    .getTime() /
                                    1000,
                            ),
                    });
        } catch (
            stripeError
        ) {
            await db
                .update(
                    commercialPurchases,
                )
                .set({
                    status:
                        "checkout_failed",

                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        commercialPurchases.id,
                        purchase.id,
                    ),
                );

            throw stripeError;
        }

        if (
            !checkoutSession.url
        ) {
            await db
                .update(
                    commercialPurchases,
                )
                .set({
                    status:
                        "checkout_failed",

                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        commercialPurchases.id,
                        purchase.id,
                    ),
                );

            throw new ApiError(
                "Stripe no devolvió una dirección de pago.",
                500,
            );
        }

        await db
            .update(
                commercialPurchases,
            )
            .set({
                stripeCheckoutSessionId:
                    checkoutSession.id,

                status:
                    "checkout_created",

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    commercialPurchases.id,
                    purchase.id,
                ),
            );

        return NextResponse.json(
            {
                success: true,

                data: {
                    purchaseId:
                        purchase.id,

                    checkoutSessionId:
                        checkoutSession.id,

                    checkoutUrl:
                        checkoutSession.url,
                },
            },
            {
                status: 201,
            },
        );
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}