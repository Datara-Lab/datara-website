import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import {
    asc,
    eq,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import Stripe from "stripe";

import {
    commercialCatalogItems,
} from "../src/db/schema";

config({
    path: ".env.local",
    override: true,
});

function getRequiredEnvironment(
    name: string,
): string {
    const value =
        process.env[name];

    if (!value) {
        throw new Error(
            `La variable ${name} no está configurada.`,
        );
    }

    return value;
}

function getAmountInCents(
    amount: string,
): number {
    const amountInCents =
        Math.round(
            Number(amount) * 100,
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

async function synchronizeStripeCatalog() {
    const databaseUrl =
        getRequiredEnvironment(
            "DATABASE_URL",
        );

    const stripeSecretKey =
        getRequiredEnvironment(
            "STRIPE_SECRET_KEY",
        );

    if (
        !stripeSecretKey.startsWith(
            "sk_test_",
        )
    ) {
        throw new Error(
            "Este script solamente puede ejecutarse con una clave de Stripe Sandbox.",
        );
    }

    const sql =
        neon(
            databaseUrl,
        );

    const db =
        drizzle(
            sql,
        );

    const stripe =
        new Stripe(
            stripeSecretKey,
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

                currency:
                    commercialCatalogItems
                        .currency,

                stripeProductId:
                    commercialCatalogItems
                        .stripeProductId,

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
                eq(
                    commercialCatalogItems.active,
                    true,
                ),
            )
            .orderBy(
                asc(
                    commercialCatalogItems
                        .productKey,
                ),

                asc(
                    commercialCatalogItems
                        .sortOrder,
                ),
            );

    console.log(
        `Sincronizando ${catalogItems.length} elementos comerciales con Stripe Sandbox...`,
    );

    for (
        const item of
        catalogItems
    ) {
        let stripeProductId =
            item.stripeProductId;

        if (!stripeProductId) {
            const stripeProduct =
                await stripe.products
                    .create({
                        name:
                            item.name,

                        description:
                            item.description ??
                            undefined,

                        metadata: {
                            catalogItemId:
                                item.id,

                            productKey:
                                item.productKey,

                            itemKey:
                                item.itemKey,
                        },
                    });

            stripeProductId =
                stripeProduct.id;

            await db
                .update(
                    commercialCatalogItems,
                )
                .set({
                    stripeProductId,
                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        commercialCatalogItems.id,
                        item.id,
                    ),
                );

            console.log(
                `Producto creado: ${item.name} → ${stripeProductId}`,
            );
        } else {
            await stripe.products
                .update(
                    stripeProductId,
                    {
                        name:
                            item.name,

                        description:
                            item.description ??
                            undefined,

                        active:
                            true,

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

            console.log(
                `Producto actualizado: ${item.name} → ${stripeProductId}`,
            );
        }

        if (
            !item.stripeMonthlyPriceId
        ) {
            const monthlyPrice =
                await stripe.prices
                    .create({
                        product:
                            stripeProductId,

                        currency:
                            item.currency
                                .toLowerCase(),

                        unit_amount:
                            getAmountInCents(
                                item.monthlyPrice,
                            ),

                        tax_behavior:
                            "inclusive",

                        recurring: {
                            interval:
                                "month",
                        },

                        nickname:
                            `${item.name} mensual`,

                        metadata: {
                            catalogItemId:
                                item.id,

                            productKey:
                                item.productKey,

                            itemKey:
                                item.itemKey,

                            billingPeriod:
                                "monthly",
                        },
                    });

            await db
                .update(
                    commercialCatalogItems,
                )
                .set({
                    stripeMonthlyPriceId:
                        monthlyPrice.id,

                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        commercialCatalogItems.id,
                        item.id,
                    ),
                );

            console.log(
                `Precio mensual creado: ${item.name} → ${monthlyPrice.id}`,
            );
        }

        if (
            !item.stripeAnnualPriceId
        ) {
            const annualPrice =
                await stripe.prices
                    .create({
                        product:
                            stripeProductId,

                        currency:
                            item.currency
                                .toLowerCase(),

                        unit_amount:
                            getAmountInCents(
                                item.annualPrice,
                            ),

                        tax_behavior:
                            "inclusive",

                        recurring: {
                            interval:
                                "year",
                        },

                        nickname:
                            `${item.name} anual`,

                        metadata: {
                            catalogItemId:
                                item.id,

                            productKey:
                                item.productKey,

                            itemKey:
                                item.itemKey,

                            billingPeriod:
                                "annual",
                        },
                    });

            await db
                .update(
                    commercialCatalogItems,
                )
                .set({
                    stripeAnnualPriceId:
                        annualPrice.id,

                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        commercialCatalogItems.id,
                        item.id,
                    ),
                );

            console.log(
                `Precio anual creado: ${item.name} → ${annualPrice.id}`,
            );
        }
    }

    console.log(
        "Catálogo de Stripe Sandbox sincronizado correctamente.",
    );
}

synchronizeStripeCatalog().catch(
    (error: unknown) => {
        console.error(
            "No fue posible sincronizar el catálogo con Stripe Sandbox.",
        );

        console.error(error);
        process.exit(1);
    },
);