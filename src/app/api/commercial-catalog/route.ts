import {
    asc,
    eq,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    getCRMIndustryTemplates,
} from "@/config/crm/industries";

import { db } from "@/db";

import {
    permissionModules,
} from "@/lib/administration/permission-modules";

import {
    commercialCatalogItems,
} from "@/db/schema";

export const dynamic =
    "force-dynamic";

export async function GET(
    request: Request,
) {
    try {
        const requestUrl =
            new URL(
                request.url,
            );

        const requestedIndustry =
            requestUrl.searchParams
                .get(
                    "industry",
                )
                ?.trim() ??
            "";

        const availableTemplates =
            getCRMIndustryTemplates()
                .filter(
                    (template) =>
                        template
                            .defaultModules
                            .length >
                        0,
                );

        const industries =
            availableTemplates.map(
                (template) => ({
                    id:
                        template.id,

                    name:
                        template.name,

                    description:
                        template.description,
                }),
            );

        if (!requestedIndustry) {
            return NextResponse.json({
                success: true,

                data: {
                    industries,
                    items: [],
                },
            });
        }

        const selectedTemplate =
            availableTemplates.find(
                (template) =>
                    template.id ===
                    requestedIndustry,
            );

        if (!selectedTemplate) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Selecciona una industria disponible.",
                },
                {
                    status: 400,
                },
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

                    itemType:
                        commercialCatalogItems
                            .itemType,

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

                    annualDiscountPercent:
                        commercialCatalogItems
                            .annualDiscountPercent,

                    installmentsEnabled:
                        commercialCatalogItems
                            .installmentsEnabled,

                    installmentsDiscountPercent:
                        commercialCatalogItems
                            .installmentsDiscountPercent,

                    annualInstallmentsPrice:
                        commercialCatalogItems
                            .annualInstallmentsPrice,

                    currency:
                        commercialCatalogItems
                            .currency,

                    includedUsers:
                        commercialCatalogItems
                            .includedUsers,

                    includedStorageGb:
                        commercialCatalogItems
                            .includedStorageGb,

                    includedAiMessages:
                        commercialCatalogItems
                            .includedAiMessages,

                    moduleIds:
                        commercialCatalogItems
                            .moduleIds,

                    features:
                        commercialCatalogItems
                            .features,

                    required:
                        commercialCatalogItems
                            .required,

                    recommended:
                        commercialCatalogItems
                            .recommended,

                    sortOrder:
                        commercialCatalogItems
                            .sortOrder,
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
                    asc(
                        commercialCatalogItems.name,
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

        const moduleCatalog =
            new Map(
                permissionModules
                    .filter(
                        (module) =>
                            module.product ===
                            "crm",
                    )
                    .map(
                        (module) => [
                            module.id,
                            module,
                        ],
                    ),
            );

        const items =
            compatibleItems.map(
                (item) => ({
                    ...item,

                    includedModules:
                        item.moduleIds.map(
                            (moduleId) => {
                                const terminology =
                                    selectedTemplate
                                        .terminology
                                        .modules[
                                            moduleId
                                        ];

                                const catalogModule =
                                    moduleCatalog.get(
                                        moduleId,
                                    );

                                return {
                                    id:
                                        moduleId,

                                    label:
                                        terminology
                                            ?.plural ??
                                        catalogModule
                                            ?.label ??
                                        moduleId,

                                    description:
                                        terminology
                                            ?.description ??
                                        catalogModule
                                            ?.description ??
                                        null,
                                };
                            },
                        ),
                }),
            );

        return NextResponse.json({
            success: true,

            data: {
                industries,
                selectedIndustry: {
                    id:
                        selectedTemplate.id,

                    name:
                        selectedTemplate.name,

                    description:
                        selectedTemplate
                            .description,
                },

                items,
            },
        });
    } catch (error) {
        console.error(
            "No fue posible consultar el catálogo comercial público:",
            error,
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "No fue posible cargar las opciones de contratación.",
            },
            {
                status: 500,
            },
        );
    }
}