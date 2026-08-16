import {
    clerkClient,
} from "@clerk/nextjs/server";

import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    and,
    desc,
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
    tenantProducts,
    tenants,
} from "@/db/schema";

import {
    isDataraProductKey,
} from "@/config/datara-products";

import {
    isCRMModulePackageKey,
} from "@/lib/crm/module-catalog";

import {
    provisionCRMModuleEntitlements,
} from "@/lib/crm/provision-module-entitlements";

export const dynamic =
    "force-dynamic";

type StripeWebhookEnvironment = {
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
};

function getEnvironment():
    StripeWebhookEnvironment {
    const {
        env,
    } = getCloudflareContext();

    return env as
        StripeWebhookEnvironment;
}

function getStripeObjectId(
    value:
        | string
        | {
            id: string;
        }
        | null,
): string | null {
    if (
        typeof value ===
        "string"
    ) {
        return value;
    }

    return value?.id ?? null;
}

async function handleCompletedCheckout(
    stripe: Stripe,
    session:
        Stripe.Checkout.Session,
) {
    const purchaseId =
        session.metadata
            ?.purchaseId;

    if (!purchaseId) {
        throw new Error(
            `La sesión ${session.id} no contiene purchaseId.`,
        );
    }

    const [purchase] =
        await db
            .select({
                id:
                    commercialPurchases.id,

                purchaseType:
                    commercialPurchases
                        .purchaseType,

                tenantId:
                    commercialPurchases
                        .tenantId,

                clerkOrganizationId:
                    commercialPurchases
                        .clerkOrganizationId,

                industry:
                    commercialPurchases
                        .industry,

                productKey:
                    commercialPurchases
                        .productKey,

                billingPeriod:
                    commercialPurchases
                        .billingPeriod,

                catalogItemIds:
                    commercialPurchases
                        .catalogItemIds,

                currency:
                    commercialPurchases
                        .currency,

                status:
                    commercialPurchases
                        .status,
            })
            .from(
                commercialPurchases,
            )
            .where(
                eq(
                    commercialPurchases.id,
                    purchaseId,
                ),
            )
            .limit(1);

    if (!purchase) {
        throw new Error(
            `No encontramos la compra ${purchaseId}.`,
        );
    }

    if (
        purchase.status ===
        "provisioned"
    ) {
        return;
    }

    const stripeCustomerId =
        getStripeObjectId(
            session.customer,
        );

    const stripeSubscriptionId =
        getStripeObjectId(
            session.subscription,
        );

    const ownerEmail =
        session.customer_details
            ?.email
            ?.trim()
            .toLowerCase() ??
        session.customer_email
            ?.trim()
            .toLowerCase() ??
        null;

    const now =
        new Date();

    if (
        purchase.purchaseType !==
        "trial_conversion"
    ) {
        await db
            .update(
                commercialPurchases,
            )
            .set({
                ownerEmail,

                stripeCheckoutSessionId:
                    session.id,

                stripeCustomerId,

                stripeSubscriptionId,

                status:
                    "paid_pending_account",

                paidAt:
                    now,

                updatedAt:
                    now,
            })
            .where(
                eq(
                    commercialPurchases.id,
                    purchaseId,
                ),
            );

        return;
    }

    if (
        !purchase.tenantId ||
        !stripeSubscriptionId
    ) {
        throw new Error(
            `La conversión ${purchaseId} no tiene tenant o suscripción de Stripe.`,
        );
    }

    const industryTemplate =
        getCRMIndustryTemplates()
            .find(
                (template) =>
                    template.id ===
                    purchase.industry &&
                    template
                        .defaultModules
                        .length >
                        0,
            );

    if (!industryTemplate) {
        throw new Error(
            `La compra ${purchaseId} no contiene una industria disponible.`,
        );
    }

    const catalogItemIds =
        Array.isArray(
            purchase.catalogItemIds,
        )
            ? purchase.catalogItemIds.filter(
                  (
                      catalogItemId,
                  ): catalogItemId is string =>
                      typeof catalogItemId ===
                      "string",
              )
            : [];

    if (
        catalogItemIds.length ===
        0
    ) {
        throw new Error(
            `La compra ${purchaseId} no contiene elementos comerciales.`,
        );
    }

    const contractedItems =
        await db
            .select({
                itemKey:
                    commercialCatalogItems
                        .itemKey,

                includedUsers:
                    commercialCatalogItems
                        .includedUsers,
            })
            .from(
                commercialCatalogItems,
            )
            .where(
                inArray(
                    commercialCatalogItems.id,
                    catalogItemIds,
                ),
            );

    const packageKeys =
        Array.from(
            new Set(
                contractedItems
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
        throw new Error(
            `La compra ${purchaseId} no contiene paquetes de CRM válidos.`,
        );
    }

    const seats =
        Math.max(
            1,
            contractedItems.reduce(
                (
                    total,
                    item,
                ) =>
                    total +
                    item.includedUsers,
                0,
            ),
        );

    const stripeSubscription =
        await stripe
            .subscriptions
            .retrieve(
                stripeSubscriptionId,
            );

    const recurringItem =
        stripeSubscription
            .items
            .data[0];

    if (!recurringItem) {
        throw new Error(
            `La suscripción ${stripeSubscriptionId} no contiene partidas recurrentes.`,
        );
    }

    const currentPeriodStart =
        new Date(
            recurringItem
                .current_period_start *
                1000,
        );

    const currentPeriodEnd =
        new Date(
            recurringItem
                .current_period_end *
                1000,
        );

    const [existingSubscription] =
        await db
            .select({
                id:
                    subscriptions.id,
            })
            .from(
                subscriptions,
            )
            .where(
                eq(
                    subscriptions.tenantId,
                    purchase.tenantId,
                ),
            )
            .orderBy(
                desc(
                    subscriptions.createdAt,
                ),
            )
            .limit(1);

    if (!existingSubscription) {
        throw new Error(
            `El tenant ${purchase.tenantId} no tiene una suscripción de demo.`,
        );
    }

    await db
        .update(
            commercialPurchases,
        )
        .set({
            ownerEmail,

            stripeCheckoutSessionId:
                session.id,

            stripeCustomerId,

            stripeSubscriptionId,

            status:
                "provisioning",

            paidAt:
                now,

            updatedAt:
                now,
        })
        .where(
            eq(
                commercialPurchases.id,
                purchaseId,
            ),
        );

    await provisionCRMModuleEntitlements({
        tenantId:
            purchase.tenantId,

        industry:
            industryTemplate.id,

        mode:
            "subscription",

        packageKeys,

        expiresAt:
            null,
    });

    await db
        .update(
            subscriptions,
        )
        .set({
            provider:
                "stripe",

            providerCustomerId:
                stripeCustomerId,

            providerSubscriptionId:
                stripeSubscriptionId,

            productKey:
                purchase.productKey,

            billingPeriod:
                purchase.billingPeriod,

            catalogItemIds:
                purchase.catalogItemIds,

            pendingBillingPeriod:
                null,

            pendingCatalogItemIds:
                null,

            pendingChangeAt:
                null,

            planKey:
                `crm-${packageKeys.join(
                    "-",
                )}`,

            status:
                "active",

            seats,

            currency:
                purchase.currency,

            currentPeriodStart,

            currentPeriodEnd,

            cancelAtPeriodEnd:
                stripeSubscription
                    .cancel_at_period_end,

            updatedAt:
                now,
        })
        .where(
            eq(
                subscriptions.id,
                existingSubscription.id,
            ),
        );

    await db
        .update(
            tenants,
        )
        .set({
            status:
                "active",

            updatedAt:
                now,
        })
        .where(
            eq(
                tenants.id,
                purchase.tenantId,
            ),
        );

        if (
        !purchase
            .clerkOrganizationId
    ) {
        throw new Error(
            `La compra ${purchaseId} no tiene una organización de Clerk vinculada.`,
        );
    }

    const clerk =
        await clerkClient();

    await clerk
        .organizations
        .updateOrganizationMetadata(
            purchase
                .clerkOrganizationId,
            {
                publicMetadata: {
                    dataraProvisioning: {
                        mode:
                            "subscription",

                        packageKeys,

                        trialEndsAt:
                            null,
                    },
                },
            },
        );

    await db
        .update(
            commercialPurchases,
        )
        .set({
            status:
                "provisioned",

            provisionedAt:
                now,

            updatedAt:
                now,
        })
        .where(
            eq(
                commercialPurchases.id,
                purchaseId,
            ),
        );
}

function getInvoiceSubscriptionId(
    invoice:
        Stripe.Invoice,
): string | null {
    const subscription =
        invoice.parent
            ?.subscription_details
            ?.subscription;

    return getStripeObjectId(
        subscription ?? null,
    );
}

async function handlePaidInvoice(
    stripe: Stripe,
    invoice:
        Stripe.Invoice,
) {
    const stripeSubscriptionId =
        getInvoiceSubscriptionId(
            invoice,
        );

    if (!stripeSubscriptionId) {
        return;
    }

    const stripeSubscription =
        await stripe
            .subscriptions
            .retrieve(
                stripeSubscriptionId,
            );

    if (
        stripeSubscription
            .items
            .data
            .length ===
        0
    ) {
        throw new Error(
            `La suscripción ${stripeSubscriptionId} no contiene partidas recurrentes.`,
        );
    }

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

    await db
        .update(
            subscriptions,
        )
        .set({
            status:
                "active",

            currentPeriodStart:
                new Date(
                    currentPeriodStart *
                    1000,
                ),

            currentPeriodEnd:
                new Date(
                    currentPeriodEnd *
                    1000,
                ),

            updatedAt:
                new Date(),
        })
        .where(
            and(
                eq(
                    subscriptions.provider,
                    "stripe",
                ),

                eq(
                    subscriptions
                        .providerSubscriptionId,
                    stripeSubscriptionId,
                ),
            ),
        );
}

async function handleFailedInvoice(
    invoice:
        Stripe.Invoice,
) {
    const stripeSubscriptionId =
        getInvoiceSubscriptionId(
            invoice,
        );

    if (!stripeSubscriptionId) {
        return;
    }

    await db
        .update(
            subscriptions,
        )
        .set({
            status:
                "past_due",

            updatedAt:
                new Date(),
        })
        .where(
            and(
                eq(
                    subscriptions.provider,
                    "stripe",
                ),

                eq(
                    subscriptions
                        .providerSubscriptionId,
                    stripeSubscriptionId,
                ),
            ),
        );
}

function getSubscriptionStatus(
    status:
        Stripe.Subscription.Status,
):
    | "incomplete"
    | "trialing"
    | "active"
    | "past_due"
    | "paused"
    | "canceled"
    | "unpaid" {
    switch (status) {
        case "incomplete":
            return "incomplete";

        case "trialing":
            return "trialing";

        case "active":
            return "active";

        case "past_due":
            return "past_due";

        case "paused":
            return "paused";

        case "unpaid":
            return "unpaid";

        case "canceled":
        case "incomplete_expired":
        default:
            return "canceled";
    }
}

async function handleUpdatedSubscription(
    stripeSubscription:
        Stripe.Subscription,
) {
    const status =
        getSubscriptionStatus(
            stripeSubscription.status,
        );

    const now =
        new Date();

    if (
        stripeSubscription
            .items
            .data
            .length ===
        0
    ) {
        throw new Error(
            `La suscripción ${stripeSubscription.id} no contiene partidas recurrentes.`,
        );
    }

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

    const scheduleId =
        typeof stripeSubscription
            .schedule ===
            "string"
            ? stripeSubscription
                .schedule
            : stripeSubscription
                .schedule
                ?.id ??
            null;

    const [subscription] =
        await db
            .update(
                subscriptions,
            )
            .set({
                status,

                providerScheduleId:
                    scheduleId,

                currentPeriodStart:
                    new Date(
                        currentPeriodStart *
                        1000,
                    ),

                currentPeriodEnd:
                    new Date(
                        currentPeriodEnd *
                        1000,
                    ),

                cancelAtPeriodEnd:
                    stripeSubscription
                        .cancel_at_period_end ||
                    stripeSubscription
                        .cancel_at !==
                        null,

                updatedAt:
                    now,
            })
            .where(
                and(
                    eq(
                        subscriptions.provider,
                        "stripe",
                    ),

                    eq(
                        subscriptions
                            .providerSubscriptionId,
                        stripeSubscription.id,
                    ),
                ),
            )
            .returning({
                id:
                    subscriptions.id,

                tenantId:
                    subscriptions.tenantId,

                billingPeriod:
                    subscriptions
                        .billingPeriod,

                catalogItemIds:
                    subscriptions
                        .catalogItemIds,

                pendingBillingPeriod:
                    subscriptions
                        .pendingBillingPeriod,

                pendingCatalogItemIds:
                    subscriptions
                        .pendingCatalogItemIds,
            });

    if (!subscription) {
        return;
    }

    if (
        subscription
            .pendingBillingPeriod &&
        subscription
            .pendingCatalogItemIds &&
        subscription
            .pendingCatalogItemIds
            .length >
            0
    ) {
        const pendingItems =
            await db
                .select({
                    id:
                        commercialCatalogItems.id,

                    itemKey:
                        commercialCatalogItems
                            .itemKey,

                    name:
                        commercialCatalogItems.name,

                    includedUsers:
                        commercialCatalogItems
                            .includedUsers,

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
                            subscription
                                .pendingCatalogItemIds,
                        ),

                        eq(
                            commercialCatalogItems
                                .productKey,
                            "crm",
                        ),
                    ),
                );

        const pendingPriceIds =
            pendingItems
                .map(
                    (item) =>
                        subscription
                            .pendingBillingPeriod ===
                        "annual"
                            ? item
                                .stripeAnnualPriceId
                            : item
                                .stripeMonthlyPriceId,
                )
                .filter(
                    (
                        priceId,
                    ): priceId is string =>
                        Boolean(
                            priceId,
                        ),
                )
                .sort();

        const activePriceIds =
            stripeSubscription
                .items
                .data
                .map(
                    (item) =>
                        item.price.id,
                )
                .sort();

        const pendingPhaseIsActive =
            pendingItems.length ===
                subscription
                    .pendingCatalogItemIds
                    .length &&
            pendingPriceIds.length ===
                activePriceIds.length &&
            pendingPriceIds.every(
                (
                    priceId,
                    index,
                ) =>
                    priceId ===
                    activePriceIds[
                        index
                    ],
            );

        if (
            pendingPhaseIsActive
        ) {
            const packageKeys =
                Array.from(
                    new Set(
                        pendingItems
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
                throw new Error(
                    `La suscripción ${stripeSubscription.id} no contiene paquetes de CRM válidos.`,
                );
            }

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
                            subscription
                                .tenantId,
                        ),
                    )
                    .limit(1);

            if (
                !tenant
                    ?.industry
            ) {
                throw new Error(
                    `El tenant ${subscription.tenantId} no tiene una industria configurada.`,
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
                throw new Error(
                    `La industria ${tenant.industry} no está disponible.`,
                );
            }

            const seats =
                Math.max(
                    1,
                    pendingItems.reduce(
                        (
                            total,
                            item,
                        ) =>
                            total +
                            item.includedUsers,
                        0,
                    ),
                );

            const periodStart =
                Math.min(
                    ...stripeSubscription
                        .items
                        .data
                        .map(
                            (item) =>
                                item.current_period_start,
                        ),
                );

            const periodEnd =
                Math.max(
                    ...stripeSubscription
                        .items
                        .data
                        .map(
                            (item) =>
                                item.current_period_end,
                        ),
                );

            await provisionCRMModuleEntitlements({
                tenantId:
                    subscription
                        .tenantId,

                industry:
                    industryTemplate.id,

                mode:
                    "subscription",

                packageKeys,

                expiresAt:
                    null,
            });

            const pendingBillingPeriod =
                subscription
                    .pendingBillingPeriod;

            const pendingCatalogItemIds =
                subscription
                    .pendingCatalogItemIds;

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

                    billingPeriod:
                        pendingBillingPeriod,

                    catalogItemIds:
                        pendingCatalogItemIds,

                    seats,

                    currentPeriodStart:
                        new Date(
                            periodStart *
                            1000,
                        ),

                    currentPeriodEnd:
                        new Date(
                            periodEnd *
                            1000,
                        ),

                    pendingBillingPeriod:
                        null,

                    pendingCatalogItemIds:
                        null,

                    pendingChangeAt:
                        null,

                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        subscriptions.id,
                        subscription.id,
                    ),
                );

            const totalAmount =
                pendingItems.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total +
                        Number(
                            pendingBillingPeriod ===
                                "annual"
                                ? item.annualPrice
                                : item.monthlyPrice,
                        ),
                    0,
                );

            const purchaseLineItems =
                pendingItems.map(
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
                                    pendingBillingPeriod ===
                                        "annual"
                                        ? item.annualPrice
                                        : item.monthlyPrice,
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
                    billingPeriod:
                        pendingBillingPeriod,

                    catalogItemIds:
                        pendingCatalogItemIds,

                    lineItems:
                        purchaseLineItems,

                    currency:
                        pendingItems[
                            0
                        ]?.currency ??
                        "mxn",

                    totalAmount:
                        totalAmount.toFixed(
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
                        stripeSubscription.id,
                    ),
                );
        }
    }

    const [purchase] =
        await db
            .select({
                productKey:
                    commercialPurchases
                        .productKey,
            })
            .from(
                commercialPurchases,
            )
            .where(
                eq(
                    commercialPurchases
                        .stripeSubscriptionId,
                    stripeSubscription.id,
                ),
            )
            .limit(1);

    if (
        !purchase ||
        !isDataraProductKey(
            purchase.productKey,
        )
    ) {
        return;
    }

    const shouldEnableProduct =
        status ===
            "active" ||
        status ===
            "trialing"
            ? true
            : status ===
                  "canceled" ||
              status ===
                  "unpaid" ||
              status ===
                  "paused"
              ? false
              : null;

    if (
        shouldEnableProduct ===
        null
    ) {
        return;
    }

    await db
        .update(
            tenantProducts,
        )
        .set({
            enabled:
                shouldEnableProduct,

            enabledAt:
                shouldEnableProduct
                    ? now
                    : undefined,

            disabledAt:
                shouldEnableProduct
                    ? null
                    : now,
        })
        .where(
            and(
                eq(
                    tenantProducts
                        .tenantId,
                    subscription.tenantId,
                ),

                eq(
                    tenantProducts.product,
                    purchase.productKey,
                ),
            ),
        );
}

async function handleExpiredCheckout(
    session:
        Stripe.Checkout.Session,
) {
    const purchaseId =
        session.metadata
            ?.purchaseId;

    if (!purchaseId) {
        return;
    }

    await db
        .update(
            commercialPurchases,
        )
        .set({
            status:
                "checkout_expired",

            updatedAt:
                new Date(),
        })
        .where(
            eq(
                commercialPurchases.id,
                purchaseId,
            ),
        );
}

export async function POST(
    request: Request,
) {
    const environment =
        getEnvironment();

    const stripeSecretKey =
        environment
            .STRIPE_SECRET_KEY ??
        process.env
            .STRIPE_SECRET_KEY;

    const stripeWebhookSecret =
        environment
            .STRIPE_WEBHOOK_SECRET ??
        process.env
            .STRIPE_WEBHOOK_SECRET;

    if (
        !stripeSecretKey ||
        !stripeWebhookSecret
    ) {
        console.error(
            "Stripe no está configurado completamente.",
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "El webhook de Stripe no está configurado.",
            },
            {
                status: 500,
            },
        );
    }

    const stripeSignature =
        request.headers.get(
            "stripe-signature",
        );

    if (!stripeSignature) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "La solicitud no contiene la firma de Stripe.",
            },
            {
                status: 400,
            },
        );
    }

    const rawBody =
        await request.text();

    const stripe =
        new Stripe(
            stripeSecretKey,
        );

    let event:
        Stripe.Event;

    try {
        event =
            stripe.webhooks
                .constructEvent(
                    rawBody,
                    stripeSignature,
                    stripeWebhookSecret,
                );
    } catch (signatureError) {
        console.error(
            "La firma del webhook de Stripe no es válida:",
            signatureError,
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "La firma del webhook no es válida.",
            },
            {
                status: 400,
            },
        );
    }

    try {
        switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
                await handleCompletedCheckout(
                    stripe,
                    event.data.object,
                );
                break;

            case "checkout.session.expired":
            case "checkout.session.async_payment_failed":
                await handleExpiredCheckout(
                    event.data.object,
                );
                break;

            case "invoice.paid":
                await handlePaidInvoice(
                    stripe,
                    event.data.object,
                );
                break;

            case "invoice.payment_failed":
                await handleFailedInvoice(
                    event.data.object,
                );
                break;

            case "customer.subscription.updated":
            case "customer.subscription.deleted":
                await handleUpdatedSubscription(
                    event.data.object,
                );
                break;

            default:
                break;
        }

        return NextResponse.json({
            success: true,

            data: {
                received:
                    true,

                eventId:
                    event.id,

                eventType:
                    event.type,
            },
        });
    } catch (processingError) {
        console.error(
            `No fue posible procesar el evento ${event.id}:`,
            processingError,
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "No fue posible procesar el evento de Stripe.",
            },
            {
                status: 500,
            },
        );
    }
}