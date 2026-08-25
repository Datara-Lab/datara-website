import Stripe from "stripe";

type StripeCatalogItem = {
    id: string;
    productKey: string;
    itemKey: string;
    name: string;
    description: string | null;
    monthlyPrice: string;
    annualPrice: string;
    installmentsEnabled: boolean;
    annualInstallmentsPrice: string;
    currency: string;
    active: boolean;
    stripeProductId: string | null;
    stripeMonthlyPriceId: string | null;
    stripeAnnualPriceId: string | null;
    stripeAnnualInstallmentsPriceId:
        string | null;
};

type StripeCatalogReferences = {
    stripeProductId: string;
    stripeMonthlyPriceId: string;
    stripeAnnualPriceId: string;
    stripeAnnualInstallmentsPriceId:
        string | null;
};

function getAmountInCents(
    amount: string,
): number {
    const amountInCents =
        Math.round(
            Number(amount) *
            100,
        );

    if (
        !Number.isFinite(
            amountInCents,
        ) ||
        amountInCents < 0
    ) {
        throw new Error(
            `El importe ${amount} no es válido.`,
        );
    }

    return amountInCents;
}

function getStripeObjectId(
    value:
        | string
        | {
            id: string;
        },
): string {
    return typeof value ===
        "string"
        ? value
        : value.id;
}

async function synchronizePrice({
    stripe,
    currentPriceId,
    productId,
    item,
    billingPeriod,
}: {
    stripe: Stripe;
    currentPriceId:
    string | null;
    productId: string;
    item: StripeCatalogItem;
    billingPeriod:
    | "monthly"
    | "annual";
}): Promise<string> {
    const amount =
        billingPeriod ===
            "monthly"
            ? item.monthlyPrice
            : item.annualPrice;

    const interval =
        billingPeriod ===
            "monthly"
            ? "month"
            : "year";

    const unitAmount =
        getAmountInCents(
            amount,
        );

    const currency =
        item.currency
            .trim()
            .toLowerCase();

    if (currentPriceId) {
        try {
            const currentPrice =
                await stripe.prices
                    .retrieve(
                        currentPriceId,
                    );

            const priceMatches =
                currentPrice.active &&
                currentPrice.unit_amount ===
                unitAmount &&
                currentPrice.currency ===
                currency &&
                currentPrice.recurring
                    ?.interval ===
                interval &&
                getStripeObjectId(
                    currentPrice.product,
                ) === productId;

            if (priceMatches) {
                return currentPrice.id;
            }
        } catch (error) {
            if (
                !(
                    error instanceof
                        Stripe.errors
                            .StripeInvalidRequestError &&
                    error.code ===
                        "resource_missing"
                )
            ) {
                throw error;
            }
        }
    }

    const createdPrice =
        await stripe.prices
            .create({
                product:
                    productId,

                currency,

                unit_amount:
                    unitAmount,

                tax_behavior:
                    "inclusive",

                recurring: {
                    interval,
                },

                nickname:
                    `${item.name} ${billingPeriod ===
                        "monthly"
                        ? "mensual"
                        : "anual"
                    }`,

                metadata: {
                    catalogItemId:
                        item.id,

                    productKey:
                        item.productKey,

                    itemKey:
                        item.itemKey,

                    billingPeriod,
                },
            });

    return createdPrice.id;
}

async function synchronizeInstallmentsPrice({
    stripe,
    currentPriceId,
    productId,
    item,
}: {
    stripe: Stripe;
    currentPriceId:
        string | null;
    productId: string;
    item: StripeCatalogItem;
}): Promise<string | null> {
    if (!item.installmentsEnabled) {
        if (currentPriceId) {
            try {
                await stripe.prices
                    .update(
                        currentPriceId,
                        {
                            active:
                                false,
                        },
                    );
            } catch (error) {
                const isMissing =
                    error instanceof
                        Stripe.errors
                            .StripeInvalidRequestError &&
                    error.code ===
                        "resource_missing";

                if (!isMissing) {
                    throw error;
                }
            }
        }

        return null;
    }

    const unitAmount =
        getAmountInCents(
            item.annualInstallmentsPrice,
        );

    const currency =
        item.currency
            .trim()
            .toLowerCase();

    if (currentPriceId) {
        try {
            const currentPrice =
                await stripe.prices
                    .retrieve(
                        currentPriceId,
                    );

            const priceMatches =
                currentPrice.active &&
                currentPrice.unit_amount ===
                    unitAmount &&
                currentPrice.currency ===
                    currency &&
                currentPrice.recurring ===
                    null &&
                getStripeObjectId(
                    currentPrice.product,
                ) === productId;

            if (priceMatches) {
                return currentPrice.id;
            }
        } catch (error) {
            if (
                !(
                    error instanceof
                        Stripe.errors
                            .StripeInvalidRequestError &&
                    error.code ===
                        "resource_missing"
                )
            ) {
                throw error;
            }
        }
    }

    const createdPrice =
        await stripe.prices
            .create({
                product:
                    productId,

                currency,

                unit_amount:
                    unitAmount,

                tax_behavior:
                    "inclusive",

                nickname:
                    `${item.name} anual MSI`,

                metadata: {
                    catalogItemId:
                        item.id,

                    productKey:
                        item.productKey,

                    itemKey:
                        item.itemKey,

                    billingPeriod:
                        "annual_installments",
                },
            });

    return createdPrice.id;
}

export async function synchronizeStripeCatalogItem({
    stripe,
    item,
}: {
    stripe: Stripe;
    item: StripeCatalogItem;
}): Promise<
    StripeCatalogReferences
> {
    const createProduct =
        () =>
            stripe.products.create({
                name:
                    item.name,

                description:
                    item.description ??
                    undefined,

                active:
                    item.active,

                metadata: {
                    catalogItemId:
                        item.id,

                    productKey:
                        item.productKey,

                    itemKey:
                        item.itemKey,
                },
            });

    let stripeProduct:
        Stripe.Product;

    if (item.stripeProductId) {
        try {
            stripeProduct =
                await stripe.products
                    .update(
                        item.stripeProductId,
                        {
                            name:
                                item.name,

                            description:
                                item.description ??
                                undefined,

                            active:
                                item.active,

                            metadata: {
                                catalogItemId:
                                    item.id,

                                productKey:
                                    item.productKey,

                                itemKey:
                                    item.itemKey,
                            },
                        },
                    );
        } catch (error) {
            const isMissing =
                error instanceof
                    Stripe.errors
                        .StripeInvalidRequestError &&
                error.code ===
                    "resource_missing";

            if (!isMissing) {
                throw error;
            }

            stripeProduct =
                await createProduct();
        }
    } else {
        stripeProduct =
            await createProduct();
    }

    const stripeMonthlyPriceId =
        await synchronizePrice({
            stripe,

            currentPriceId:
                item.stripeMonthlyPriceId,

            productId:
                stripeProduct.id,

            item,

            billingPeriod:
                "monthly",
        });

    const stripeAnnualPriceId =
        await synchronizePrice({
            stripe,

            currentPriceId:
                item.stripeAnnualPriceId,

            productId:
                stripeProduct.id,

            item,

            billingPeriod:
                "annual",
        });

    const stripeAnnualInstallmentsPriceId =
        await synchronizeInstallmentsPrice({
            stripe,

            currentPriceId:
                item
                    .stripeAnnualInstallmentsPriceId,

            productId:
                stripeProduct.id,

            item,
        });

    return {
        stripeProductId:
            stripeProduct.id,

        stripeMonthlyPriceId,

        stripeAnnualPriceId,

        stripeAnnualInstallmentsPriceId,
    };
}