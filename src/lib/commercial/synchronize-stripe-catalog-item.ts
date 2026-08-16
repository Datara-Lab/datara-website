import Stripe from "stripe";

type StripeCatalogItem = {
    id: string;
    productKey: string;
    itemKey: string;
    name: string;
    description: string | null;
    monthlyPrice: string;
    annualPrice: string;
    currency: string;
    active: boolean;
    stripeProductId: string | null;
    stripeMonthlyPriceId: string | null;
    stripeAnnualPriceId: string | null;
};

type StripeCatalogReferences = {
    stripeProductId: string;
    stripeMonthlyPriceId: string;
    stripeAnnualPriceId: string;
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

export async function synchronizeStripeCatalogItem({
    stripe,
    item,
}: {
    stripe: Stripe;
    item: StripeCatalogItem;
}): Promise<
    StripeCatalogReferences
> {
    const stripeProduct =
        item.stripeProductId
            ? await stripe.products
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
                )
            : await stripe.products
                .create({
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

    return {
        stripeProductId:
            stripeProduct.id,

        stripeMonthlyPriceId,

        stripeAnnualPriceId,
    };
}