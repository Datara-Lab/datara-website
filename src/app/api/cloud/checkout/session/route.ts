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
    db,
} from "@/db";

import {
    createStripeCheckoutSession,
} from "@/lib/commercial/create-stripe-checkout-session";

import {
    createCommercialQuote,
    findOrCreateOpenCommercialDeal,
    resolveCommercialContact,
} from "@/lib/crm/commercial-intake";

import {
    cloudCatalogItems,
    commercialPurchases,
} from "@/db/schema";

import {
    getInternalDataraTenant,
} from "@/lib/platform/internal-tenant";

import {
    getInternalCommercialOwner,
} from "@/lib/platform/internal-commercial-owner";

export const dynamic =
    "force-dynamic";

type CheckoutEnvironment = {
    STRIPE_SECRET_KEY?: string;
};

function getEnvironment():
    CheckoutEnvironment {
    const {
        env,
    } = getCloudflareContext();

    return env as
        CheckoutEnvironment;
}

type CloudCheckoutPayload = {
    catalogItemId?: unknown;

    items?: unknown;

    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    phone?: unknown;
    company?: unknown;
};

type CloudCheckoutItemInput = {
    catalogItemId: string;
    quantity: number;
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

function getCatalogItemId(
    value: unknown,
): string {
    if (
        typeof value !==
        "string"
    ) {
        throw new ApiError(
            "Selecciona un producto o servicio de Datara Cloud.",
            400,
        );
    }

    const catalogItemId =
        value.trim();

    if (!catalogItemId) {
        throw new ApiError(
            "Selecciona un producto o servicio de Datara Cloud.",
            400,
        );
    }

    return catalogItemId;
}

function getCheckoutItems(
    itemsValue: unknown,
    legacyCatalogItemId:
        unknown,
): CloudCheckoutItemInput[] {
    if (
        Array.isArray(
            itemsValue,
        ) &&
        itemsValue.length >
            0
    ) {
        const items =
            itemsValue.map(
                (
                    value,
                ) => {
                    if (
                        !value ||
                        typeof value !==
                            "object"
                    ) {
                        throw new ApiError(
                            "La selección de productos de Datara Cloud no es válida.",
                            400,
                        );
                    }

                    const item =
                        value as Record<
                            string,
                            unknown
                        >;

                    const catalogItemId =
                        getCatalogItemId(
                            item.catalogItemId,
                        );

                    const quantity =
                        typeof item.quantity ===
                            "number" &&
                        Number.isInteger(
                            item.quantity,
                        ) &&
                        item.quantity >
                            0
                            ? item.quantity
                            : 1;

                    return {
                        catalogItemId,
                        quantity,
                    };
                },
            );

        const mergedItems =
            new Map<
                string,
                number
            >();

        for (
            const item of items
        ) {
            mergedItems.set(
                item.catalogItemId,
                (mergedItems.get(
                    item.catalogItemId,
                ) ?? 0) +
                    item.quantity,
            );
        }

        return Array.from(
            mergedItems,
            ([
                catalogItemId,
                quantity,
            ]) => ({
                catalogItemId,
                quantity,
            }),
        );
    }

    return [
        {
            catalogItemId:
                getCatalogItemId(
                    legacyCatalogItemId,
                ),

            quantity:
                1,
        },
    ];
}

function getRequiredString(
    value: unknown,
    fieldName: string,
): string {
    if (
        typeof value !==
        "string"
    ) {
        throw new ApiError(
            `${fieldName} es obligatorio.`,
            400,
        );
    }

    const result =
        value.trim();

    if (!result) {
        throw new ApiError(
            `${fieldName} es obligatorio.`,
            400,
        );
    }

    return result;
}

function getOptionalString(
    value: unknown,
): string | null {
    if (
        typeof value !==
        "string"
    ) {
        return null;
    }

    const result =
        value.trim();

    return result || null;
}

function getEmail(
    value: unknown,
): string {
    const email =
        getRequiredString(
            value,
            "El correo electrónico",
        ).toLowerCase();

    if (
        !email.includes("@")
    ) {
        throw new ApiError(
            "Ingresa un correo electrónico válido.",
            400,
        );
    }

    return email;
}

export async function POST(
    request: Request,
) {
    try {
        const payload =
            (await request.json()) as
            CloudCheckoutPayload;

        const checkoutItems =
            getCheckoutItems(
                payload.items,
                payload.catalogItemId,
            );

        const firstName =
            getRequiredString(
                payload.firstName,
                "El nombre",
            );

        const lastName =
            getOptionalString(
                payload.lastName,
            );

        const email =
            getEmail(
                payload.email,
            );

        const phone =
            getOptionalString(
                payload.phone,
            );

        const company =
            getOptionalString(
                payload.company,
            );

        const environment =
            getEnvironment();

        const stripeSecretKey =
            environment.STRIPE_SECRET_KEY ??
            process.env.STRIPE_SECRET_KEY;

        if (!stripeSecretKey) {
            throw new ApiError(
                "El servicio de pagos no está configurado.",
                500,
            );
        }

        const {
            tenantId,
            organizationId,
        } =
            await getInternalDataraTenant();

        const owner =
            await getInternalCommercialOwner(
                tenantId,
            );

        const catalogItemIds =
            checkoutItems.map(
                (
                    checkoutItem,
                ) =>
                    checkoutItem.catalogItemId,
            );

        const catalogItems =
            await db
                .select({
                    id:
                        cloudCatalogItems.id,

                    itemKey:
                        cloudCatalogItems.itemKey,

                    itemType:
                        cloudCatalogItems.itemType,

                    billingMode:
                        cloudCatalogItems.billingMode,

                    name:
                        cloudCatalogItems.name,

                    description:
                        cloudCatalogItems.description,

                    monthlyPrice:
                        cloudCatalogItems.monthlyPrice,

                    annualPrice:
                        cloudCatalogItems.annualPrice,

                    oneTimePrice:
                        cloudCatalogItems.oneTimePrice,

                    currency:
                        cloudCatalogItems.currency,

                    requiresQuote:
                        cloudCatalogItems.requiresQuote,
                })
                .from(
                    cloudCatalogItems,
                )
                .where(
                    and(
                        inArray(
                            cloudCatalogItems.id,
                            catalogItemIds,
                        ),
                        eq(
                            cloudCatalogItems.active,
                            true,
                        ),
                    ),
                );

        if (
            catalogItems.length !==
            checkoutItems.length
        ) {
            throw new ApiError(
                "Uno o más productos o servicios seleccionados no están disponibles.",
                404,
            );
        }

        const selectedItems =
            checkoutItems.map(
                (
                    checkoutItem,
                ) => {
                    const catalogItem =
                        catalogItems.find(
                            (
                                catalogItem,
                            ) =>
                                catalogItem.id ===
                                checkoutItem.catalogItemId,
                        );

                    if (!catalogItem) {
                        throw new ApiError(
                            "Uno o más productos o servicios seleccionados no están disponibles.",
                            404,
                        );
                    }

                    return {
                        ...catalogItem,

                        quantity:
                            checkoutItem.quantity,
                    };
                },
            );

        const item =
            selectedItems[0];

        if (!item) {
            throw new ApiError(
                "Selecciona al menos un producto o servicio de Datara Cloud.",
                400,
            );
        }

        const {
            customerId,
            leadId,
        } =
            await resolveCommercialContact({
                tenantId,

                firstName,

                lastName,

                email,

                phone,

                company,

                source:
                    "Datara Cloud",

                owner: {
                    id:
                        owner.id,

                    name:
                        owner.name,

                    email:
                        owner.email,
                },

                metadata: {
                    source:
                        "cloud_checkout",

                    catalogItemId:
                        item.id,

                    itemKey:
                        item.itemKey,
                },
            });

        const pricedItems =
            selectedItems.map(
                (
                    selectedItem,
                ) => {
                    let unitPrice =
                        "0";

                    if (
                        selectedItem.billingMode ===
                        "monthly"
                    ) {
                        unitPrice =
                            selectedItem.monthlyPrice;
                    } else if (
                        selectedItem.billingMode ===
                        "annual"
                    ) {
                        unitPrice =
                            selectedItem.annualPrice;
                    } else if (
                        selectedItem.billingMode ===
                        "one_time"
                    ) {
                        unitPrice =
                            selectedItem.oneTimePrice;
                    } else {
                        throw new ApiError(
                            "El esquema de cobro de uno de los productos no es válido.",
                            400,
                        );
                    }

                    const numericUnitPrice =
                        Number(
                            unitPrice,
                        );

                    const hasValidPrice =
                        Number.isFinite(
                            numericUnitPrice,
                        ) &&
                        numericUnitPrice >
                            0;

                    if (
                        !hasValidPrice &&
                        !selectedItem.requiresQuote
                    ) {
                        throw new ApiError(
                            `El producto o servicio "${selectedItem.name}" no tiene un precio válido configurado.`,
                            400,
                        );
                    }

                    const numericLineTotal =
                        hasValidPrice
                            ? numericUnitPrice *
                              selectedItem.quantity
                            : 0;

                    return {
                        ...selectedItem,

                        unitPrice,

                        numericUnitPrice,

                        hasValidPrice,

                        numericLineTotal,

                        lineTotal:
                            numericLineTotal.toFixed(
                                2,
                            ),
                    };
                },
            );

        const monthlyTotal =
            pricedItems
                .filter(
                    (
                        pricedItem,
                    ) =>
                        pricedItem.billingMode ===
                        "monthly" &&
                        pricedItem.hasValidPrice,
                )
                .reduce(
                    (
                        total,
                        pricedItem,
                    ) =>
                        total +
                        pricedItem.numericLineTotal,
                    0,
                );

        const annualTotal =
            pricedItems
                .filter(
                    (
                        pricedItem,
                    ) =>
                        pricedItem.billingMode ===
                        "annual" &&
                        pricedItem.hasValidPrice,
                )
                .reduce(
                    (
                        total,
                        pricedItem,
                    ) =>
                        total +
                        pricedItem.numericLineTotal,
                    0,
                );

        const oneTimeTotal =
            pricedItems
                .filter(
                    (
                        pricedItem,
                    ) =>
                        pricedItem.billingMode ===
                        "one_time" &&
                        pricedItem.hasValidPrice,
                )
                .reduce(
                    (
                        total,
                        pricedItem,
                    ) =>
                        total +
                        pricedItem.numericLineTotal,
                    0,
                );

        const currencies =
            new Set(
                pricedItems.map(
                    (
                        pricedItem,
                    ) =>
                        pricedItem.currency
                            .trim()
                            .toLowerCase(),
                ),
            );

        if (
            currencies.size >
            1
        ) {
            throw new ApiError(
                "No es posible combinar productos o servicios con monedas distintas en una misma contratación.",
                400,
            );
        }

        const requiresQuote =
            pricedItems.some(
                (
                    pricedItem,
                ) =>
                    pricedItem.requiresQuote,
            );

        const numericPrice =
            monthlyTotal +
            annualTotal +
            oneTimeTotal;

        const price =
            numericPrice.toFixed(
                2,
            );

        const hasValidPrice =
            numericPrice >
            0;

        const now =
            new Date();

        const deal =
            await findOrCreateOpenCommercialDeal({
                tenantId,

                customerId,

                leadId,

                name:
                    `${
                        pricedItems.length === 1
                            ? pricedItems[0].name
                            : `${pricedItems[0].name} + ${
                                  pricedItems.length - 1
                              }`
                    } - ${firstName}${
                        lastName
                            ? ` ${lastName}`
                            : ""
                    }`,

                acquisitionChannel:
                    "Datara Cloud",

                owner: {
                    id:
                        owner.id,

                    name:
                        owner.name,

                    email:
                        owner.email,
                },

                currency:
                    item.currency,

                baseAmount:
                    hasValidPrice
                        ? price
                        : "0",

                totalAmount:
                    hasValidPrice
                        ? price
                        : "0",

                nextStep:
                    requiresQuote
                        ? "Preparar cotización"
                        : "Completar pago en Stripe",

                metadata: {
                    source:
                        "cloud_checkout",

                    requiresQuote,

                    monthlyTotal:
                        monthlyTotal.toFixed(
                            2,
                        ),

                    annualTotal:
                        annualTotal.toFixed(
                            2,
                        ),

                    oneTimeTotal:
                        oneTimeTotal.toFixed(
                            2,
                        ),

                    items:
                        pricedItems.map(
                            (
                                pricedItem,
                            ) => ({
                                catalogItemId:
                                    pricedItem.id,

                                itemKey:
                                    pricedItem.itemKey,

                                itemType:
                                    pricedItem.itemType,

                                billingMode:
                                    pricedItem.billingMode,

                                quantity:
                                    pricedItem.quantity,

                                unitPrice:
                                    pricedItem.unitPrice,

                                lineTotal:
                                    pricedItem.lineTotal,

                                requiresQuote:
                                    pricedItem.requiresQuote,
                            }),
                        ),
                },
            });

        const quoteAmount =
            hasValidPrice
                ? price
                : "0";

        const quote =
            await createCommercialQuote({
                tenantId,

                customerId,

                leadId,

                dealId:
                    deal.id,

                owner: {
                    id:
                        owner.id,

                    name:
                        owner.name,

                    email:
                        owner.email,
                },

                subject:
                    pricedItems.length ===
                    1
                        ? pricedItems[0].name
                        : `Datara Cloud - ${pricedItems.length} conceptos`,

                currency:
                    item.currency,

                baseAmount:
                    quoteAmount,

                totalAmount:
                    quoteAmount,

                calculationSnapshot: {
                    source:
                        "cloud_checkout",

                    requiresQuote,

                    monthlyTotal:
                        monthlyTotal.toFixed(
                            2,
                        ),

                    annualTotal:
                        annualTotal.toFixed(
                            2,
                        ),

                    oneTimeTotal:
                        oneTimeTotal.toFixed(
                            2,
                        ),

                    baseAmount:
                        quoteAmount,

                    discountAmount:
                        "0",

                    taxAmount:
                        "0",

                    adjustmentAmount:
                        "0",

                    totalWithTax:
                        quoteAmount,

                    items:
                        pricedItems.map(
                            (
                                pricedItem,
                            ) => ({
                                catalogItemId:
                                    pricedItem.id,

                                itemKey:
                                    pricedItem.itemKey,

                                itemType:
                                    pricedItem.itemType,

                                billingMode:
                                    pricedItem.billingMode,

                                quantity:
                                    pricedItem.quantity,

                                unitPrice:
                                    pricedItem.unitPrice,

                                lineTotal:
                                    pricedItem.lineTotal,

                                requiresQuote:
                                    pricedItem.requiresQuote,
                            }),
                        ),
                },

                items:
                    pricedItems.map(
                        (
                            pricedItem,
                        ) => ({
                            productId:
                                null,

                            name:
                                pricedItem.name,

                            description:
                                pricedItem.description,

                            quantity:
                                String(
                                    pricedItem.quantity,
                                ),

                            unitPrice:
                                pricedItem.unitPrice,

                            baseAmount:
                                pricedItem.lineTotal,

                            totalAmount:
                                pricedItem.lineTotal,

                            calculationSnapshot: {
                                source:
                                    "cloud_catalog",

                                catalogItemId:
                                    pricedItem.id,

                                itemKey:
                                    pricedItem.itemKey,

                                itemType:
                                    pricedItem.itemType,

                                billingMode:
                                    pricedItem.billingMode,

                                quantity:
                                    pricedItem.quantity,
                            },
                        }),
                    ),
            });

        if (
            item.requiresQuote
        ) {
            return NextResponse.json({
                success: true,

                data: {
                    item,

                    action:
                        "quote",

                    price:
                        hasValidPrice
                            ? numericPrice
                            : null,

                    customerId,
                    leadId,

                    dealId:
                        deal.id,

                    quoteId:
                        quote.id,
                },
            });
        }

                const recurringBillingModes =
            new Set(
                pricedItems
                    .filter(
                        (
                            pricedItem,
                        ) =>
                            pricedItem.billingMode !==
                            "one_time",
                    )
                    .map(
                        (
                            pricedItem,
                        ) =>
                            pricedItem.billingMode,
                    ),
            );

        if (
            recurringBillingModes.size >
            1
        ) {
            throw new ApiError(
                "No es posible combinar servicios mensuales y anuales en una misma contratación.",
                400,
            );
        }

        const hasRecurringItems =
            recurringBillingModes.size >
            0;

        const expiresAt =
            new Date(
                now.getTime() +
                    23 * 60 * 60 * 1000,
            );


        const [purchase] =
            await db
                .insert(
                    commercialPurchases,
                )
                .values({
                    purchaseType:
                        "cloud_purchase",

                    productKey:
                        "cloud",

                    tenantId,

                    clerkUserId:
                        null,

                    clerkOrganizationId:
                        organizationId,

                    ownerEmail:
                        email,

                    companyName:
                        company,

                    taxId:
                        null,

                    industry:
                        null,

                    billingPeriod:
                        pricedItems.length ===
                        1
                            ? pricedItems[0]
                                  .billingMode
                            : "mixed",

                    catalogItemIds:
                        pricedItems.map(
                            (
                                pricedItem,
                            ) =>
                                pricedItem.id,
                        ),

                    lineItems:
                        pricedItems.map(
                            (
                                pricedItem,
                            ) => ({
                                catalogItemId:
                                    pricedItem.id,

                                itemKey:
                                    pricedItem.itemKey,

                                name:
                                    pricedItem.name,

                                quantity:
                                    pricedItem.quantity,

                                billingMode:
                                    pricedItem.billingMode,

                                unitAmount:
                                    Math.round(
                                        pricedItem.numericUnitPrice *
                                            100,
                                    ),

                                lineAmount:
                                    Math.round(
                                        pricedItem.numericLineTotal *
                                            100,
                                    ),

                                requiresQuote:
                                    pricedItem.requiresQuote,
                            }),
                        ),

                    currency:
                        item.currency,

                    totalAmount:
                        numericPrice.toFixed(
                            2,
                        ),

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
                "No fue posible preparar el pago.",
                500,
            );
        }

        const stripe = {
            checkout: {
                sessions: {
                    create: (
                        payload:
                            Stripe.Checkout.SessionCreateParams,
                    ) =>
                        createStripeCheckoutSession({
                            secretKey:
                                stripeSecretKey,
                            payload,
                        }),
                },
            },
        };

        let checkoutSession:
            Stripe.Checkout.Session;

        try {
            const baseMetadata = {
                purchaseId:
                    purchase.id,

                purchaseType:
                    "cloud_purchase",

                tenantId,

                clerkOrganizationId:
                    organizationId,

                billingPeriod:
                    hasRecurringItems
                        ? Array.from(
                              recurringBillingModes,
                          )[0]
                        : "one_time",

                itemCount:
                    String(
                        pricedItems.length,
                    ),

                dealId:
                    deal.id,

                quoteId:
                    quote.id,
            };

            const stripeLineItems:
                Stripe.Checkout.SessionCreateParams.LineItem[] =
                pricedItems.map(
                    (
                        pricedItem,
                    ) => {
                        const priceData:
                            Stripe.Checkout.SessionCreateParams.LineItem.PriceData =
                            {
                                currency:
                                    pricedItem.currency.toLowerCase(),

                                unit_amount:
                                    Math.round(
                                        pricedItem.numericUnitPrice *
                                            100,
                                    ),

                                product_data: {
                                    name:
                                        pricedItem.name,

                                    description:
                                        pricedItem.description ??
                                        undefined,
                                },
                            };

                        if (
                            pricedItem.billingMode !==
                            "one_time"
                        ) {
                            priceData.recurring = {
                                interval:
                                    pricedItem.billingMode ===
                                    "annual"
                                        ? "year"
                                        : "month",
                            };
                        }

                        return {
                            quantity:
                                pricedItem.quantity,

                            price_data:
                                priceData,
                        };
                    },
                );

            if (
                !hasRecurringItems
            ) {
                checkoutSession =
                    await stripe
                        .checkout
                        .sessions
                        .create({
                            mode:
                                "payment",

                            locale:
                                "es-419",

                            billing_address_collection:
                                "required",

                            customer_email:
                                email,

                            line_items:
                                stripeLineItems,

                            metadata:
                                baseMetadata,

                            success_url:
                                `${new URL(
                                    request.url,
                                ).origin}/cloud?checkout=success&session_id={CHECKOUT_SESSION_ID}`,

                            cancel_url:
                                `${new URL(
                                    request.url,
                                ).origin}/cloud?checkout=cancelled`,

                            expires_at:
                                Math.floor(
                                    expiresAt.getTime() /
                                        1000,
                                ),
                        });
            } else {
                checkoutSession =
                    await stripe
                        .checkout
                        .sessions
                        .create({
                            mode:
                                "subscription",

                            locale:
                                "es-419",

                            billing_address_collection:
                                "required",

                            customer_email:
                                email,

                            line_items:
                                stripeLineItems,

                            metadata:
                                baseMetadata,

                            subscription_data: {
                                metadata:
                                    baseMetadata,
                            },

                            success_url:
                                `${new URL(
                                    request.url,
                                ).origin}/cloud?checkout=success&session_id={CHECKOUT_SESSION_ID}`,

                            cancel_url:
                                `${new URL(
                                    request.url,
                                ).origin}/cloud?checkout=cancelled`,

                            expires_at:
                                Math.floor(
                                    expiresAt.getTime() /
                                        1000,
                                ),
                        });
            }
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

        return NextResponse.json({
            success: true,

            data: {
                item,

                action:
                    "checkout",

                price:
                    numericPrice,

                customerId,
                leadId,

                dealId:
                    deal.id,

                quoteId:
                    quote.id,

                purchaseId:
                    purchase.id,

                checkoutSessionId:
                    checkoutSession.id,

                checkoutUrl:
                    checkoutSession.url,
            },
        });
    } catch (error) {
        if (
            error instanceof
            ApiError
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
            "Cloud checkout validation error:",
            error,
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "No fue posible preparar la contratación de Datara Cloud.",
            },
            {
                status: 500,
            },
        );
    }
}