import {
    neon,
} from "@neondatabase/serverless";

import {
    config,
} from "dotenv";

import {
    asc,
    eq,
} from "drizzle-orm";

import {
    drizzle,
} from "drizzle-orm/neon-http";

import Stripe from "stripe";

import {
    commercialCatalogItems,
} from "../src/db/schema";

import {
    synchronizeStripeCatalogItem,
} from "../src/lib/commercial/synchronize-stripe-catalog-item";

const environmentFile =
    process.env
        .DATARA_ENV_FILE
        ?.trim() ||
    ".env.development.local";

const expectedDatabaseHost =
    process.env
        .DATARA_EXPECTED_DATABASE_HOST
        ?.trim() ||
    "ep-aged-wildflower-audj25dr-pooler.c-10.us-east-1.aws.neon.tech";

config({
    path:
        environmentFile,

    override:
        true,
});

function getRequiredEnvironment(
    name: string,
): string {
    const value =
        process.env[
            name
        ]?.trim();

    if (!value) {
        throw new Error(
            `La variable ${name} no está configurada.`,
        );
    }

    return value;
}

function validateDatabaseUrl(
    databaseUrl: string,
): void {
    let databaseHost:
        string;

    try {
        databaseHost =
            new URL(
                databaseUrl,
            ).hostname;
    } catch {
        throw new Error(
            "DATABASE_URL no contiene una URL válida.",
        );
    }

    if (
        databaseHost !==
        expectedDatabaseHost
    ) {
        throw new Error(
            [
                "Sincronización bloqueada.",
                `Endpoint recibido: ${databaseHost}`,
                `Endpoint permitido: ${expectedDatabaseHost}`,
            ].join(
                " ",
            ),
        );
    }
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

    validateDatabaseUrl(
        databaseUrl,
    );

    if (
        !stripeSecretKey.startsWith(
            "sk_test_",
        )
    ) {
        throw new Error(
            "Este script solamente puede ejecutarse con una clave de Stripe Test.",
        );
    }

    const sql =
        neon(
            databaseUrl,
        );

    const database =
        drizzle(
            sql,
        );

    const stripe =
        new Stripe(
            stripeSecretKey,
        );

    const catalogItems =
        await database
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

                installmentsEnabled:
                    commercialCatalogItems
                        .installmentsEnabled,

                annualInstallmentsPrice:
                    commercialCatalogItems
                        .annualInstallmentsPrice,

                currency:
                    commercialCatalogItems
                        .currency,

                active:
                    commercialCatalogItems.active,

                stripeProductId:
                    commercialCatalogItems
                        .stripeProductId,

                stripeMonthlyPriceId:
                    commercialCatalogItems
                        .stripeMonthlyPriceId,

                stripeAnnualPriceId:
                    commercialCatalogItems
                        .stripeAnnualPriceId,

                stripeAnnualInstallmentsPriceId:
                    commercialCatalogItems
                        .stripeAnnualInstallmentsPriceId,
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
        `Sincronizando ${catalogItems.length} elementos con Stripe Test...`,
    );

    for (
        const item of
        catalogItems
    ) {
        const references =
            await synchronizeStripeCatalogItem({
                stripe,
                item,
            });

        await database
            .update(
                commercialCatalogItems,
            )
            .set({
                ...references,

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
            [
                "SINCRONIZADO:",
                `${item.productKey}/${item.itemKey}`,
                `producto=${references.stripeProductId}`,
                `mensual=${references.stripeMonthlyPriceId}`,
                `anual=${references.stripeAnnualPriceId}`,
                `parcialidades=${references.stripeAnnualInstallmentsPriceId ?? "no aplica"}`,
            ].join(
                " ",
            ),
        );
    }

    console.log(
        "Catálogo Stripe Test sincronizado correctamente.",
    );
}

synchronizeStripeCatalog().catch(
    (
        error: unknown,
    ) => {
        console.error(
            "No fue posible sincronizar el catálogo Stripe Test.",
        );

        console.error(
            error,
        );

        process.exit(
            1,
        );
    },
);
