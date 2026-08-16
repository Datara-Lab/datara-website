import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import {
    commercialPurchases,
    subscriptions,
} from "../src/db/schema";

config({
    path: ".env.local",
    override: true,
});

function getDatabaseUrl(): string {
    const databaseUrl =
        process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error(
            "La variable DATABASE_URL no está configurada.",
        );
    }

    return databaseUrl;
}

async function backfillSubscriptionCatalog() {
    const sql =
        neon(
            getDatabaseUrl(),
        );

    const db =
        drizzle(
            sql,
        );

    const subscriptionPurchases =
        await db
            .select({
                subscriptionId:
                    subscriptions.id,

                productKey:
                    commercialPurchases
                        .productKey,

                billingPeriod:
                    commercialPurchases
                        .billingPeriod,

                catalogItemIds:
                    commercialPurchases
                        .catalogItemIds,
            })
            .from(
                subscriptions,
            )
            .innerJoin(
                commercialPurchases,
                eq(
                    commercialPurchases
                        .stripeSubscriptionId,
                    subscriptions
                        .providerSubscriptionId,
                ),
            );

    console.log(
        `Actualizando ${subscriptionPurchases.length} suscripciones...`,
    );

    for (
        const record of
        subscriptionPurchases
    ) {
        await db
            .update(
                subscriptions,
            )
            .set({
                productKey:
                    record.productKey,

                billingPeriod:
                    record.billingPeriod,

                catalogItemIds:
                    record.catalogItemIds,

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    subscriptions.id,
                    record.subscriptionId,
                ),
            );
    }

    console.log(
        "Suscripciones actualizadas correctamente.",
    );
}

backfillSubscriptionCatalog().catch(
    (error: unknown) => {
        console.error(
            "No fue posible actualizar las suscripciones.",
        );

        console.error(error);
        process.exit(1);
    },
);