import {
    asc,
    eq,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    db,
} from "@/db";

import {
    cloudCatalogItems,
} from "@/db/schema";

export const dynamic =
    "force-dynamic";

export async function GET() {
    try {
        const items =
            await db
                .select({
                    id:
                        cloudCatalogItems.id,

                    itemKey:
                        cloudCatalogItems
                            .itemKey,

                    itemType:
                        cloudCatalogItems
                            .itemType,

                    billingMode:
                        cloudCatalogItems
                            .billingMode,

                    name:
                        cloudCatalogItems.name,

                    description:
                        cloudCatalogItems
                            .description,

                    monthlyPrice:
                        cloudCatalogItems
                            .monthlyPrice,

                    annualPrice:
                        cloudCatalogItems
                            .annualPrice,

                    oneTimePrice:
                        cloudCatalogItems
                            .oneTimePrice,

                    currency:
                        cloudCatalogItems.currency,

                    vcpu:
                        cloudCatalogItems.vcpu,

                    ramGb:
                        cloudCatalogItems.ramGb,

                    storageGb:
                        cloudCatalogItems
                            .storageGb,

                    transferTb:
                        cloudCatalogItems
                            .transferTb,

                    serviceCategory:
                        cloudCatalogItems
                            .serviceCategory,

                    features:
                        cloudCatalogItems
                            .features,

                    recommended:
                        cloudCatalogItems
                            .recommended,

                    requiresQuote:
                        cloudCatalogItems
                            .requiresQuote,

                    sortOrder:
                        cloudCatalogItems
                            .sortOrder,
                })
                .from(
                    cloudCatalogItems,
                )
                .where(
                    eq(
                        cloudCatalogItems.active,
                        true,
                    ),
                )
                .orderBy(
                    asc(
                        cloudCatalogItems
                            .sortOrder,
                    ),
                    asc(
                        cloudCatalogItems.name,
                    ),
                );

        return NextResponse.json({
            success: true,

            data: {
                items,
            },
        });
    } catch (error) {
        console.error(
            "No fue posible consultar el catálogo público Cloud:",
            error,
        );

        return NextResponse.json(
            {
                success: false,

                error:
                    "No fue posible consultar el catálogo Cloud.",
            },
            {
                status: 500,
            },
        );
    }
}