import {
    and,
    eq,
    notInArray,
} from "drizzle-orm";

import {
    getCRMIndustryTemplate,
} from "@/config/crm/industries";

import { db } from "@/db";

import {
    tenantModuleEntitlements,
} from "@/db/schema";

import {
    CRM_MODULE_PACKAGES,
    CRM_PLATFORM_MODULE_IDS,
    type CRMModulePackageKey,
} from "@/lib/crm/module-catalog";

import type {
    CRMIndustry,
} from "@/types/crm-config";

export type CRMProvisioningMode =
    | "trial"
    | "subscription";

type ProvisionCRMModuleEntitlementsOptions = {
    tenantId: string;
    industry: CRMIndustry;
    mode: CRMProvisioningMode;

    packageKeys?:
    CRMModulePackageKey[];

    expiresAt?:
    Date | null;
};

export class CRMModuleProvisioningError
    extends Error {
    constructor(message: string) {
        super(message);

        this.name =
            "CRMModuleProvisioningError";
    }
}

function getKnownCRMModuleIds():
    Set<string> {
    return new Set([
        ...CRM_PLATFORM_MODULE_IDS,

        ...Object.values(
            CRM_MODULE_PACKAGES,
        ).flatMap(
            (modulePackage) => [
                ...modulePackage.moduleIds,
            ],
        ),
    ]);
}

export function resolveCRMModuleIds({
    industry,
    mode,
    packageKeys = [],
}: Pick<
    ProvisionCRMModuleEntitlementsOptions,
    | "industry"
    | "mode"
    | "packageKeys"
>): string[] {
    const template =
        getCRMIndustryTemplate(
            industry,
        );

    if (
        template.defaultModules.length ===
        0
    ) {
        throw new CRMModuleProvisioningError(
            `La edición "${template.name}" aún no está disponible.`,
        );
    }

    const knownModuleIds =
        getKnownCRMModuleIds();

    const invalidTemplateModuleIds =
        template.defaultModules.filter(
            (moduleId) =>
                !knownModuleIds.has(
                    moduleId,
                ),
        );

    if (
        invalidTemplateModuleIds.length >
        0
    ) {
        throw new CRMModuleProvisioningError(
            `El template contiene módulos inválidos: ${invalidTemplateModuleIds.join(", ")}.`,
        );
    }

    const industryModuleIds =
        new Set(
            template.defaultModules,
        );

    const selectedModuleIds =
        mode === "trial"
            ? template.defaultModules
            : packageKeys.flatMap(
                (packageKey) => [
                    ...CRM_MODULE_PACKAGES[
                        packageKey
                    ].moduleIds,
                ],
            );

    if (
        mode === "subscription" &&
        packageKeys.length === 0
    ) {
        throw new CRMModuleProvisioningError(
            "Selecciona al menos un paquete para contratar Datara CRM.",
        );
    }

    return Array.from(
        new Set([
            ...CRM_PLATFORM_MODULE_IDS,

            ...selectedModuleIds.filter(
                (moduleId) =>
                    industryModuleIds.has(
                        moduleId,
                    ),
            ),
        ]),
    );
}

export async function provisionCRMModuleEntitlements({
    tenantId,
    industry,
    mode,
    packageKeys = [],
    expiresAt = null,
}: ProvisionCRMModuleEntitlementsOptions):
    Promise<string[]> {
    const moduleIds =
        resolveCRMModuleIds({
            industry,
            mode,
            packageKeys,
        });

    const now = new Date();

    await db
        .insert(
            tenantModuleEntitlements,
        )
        .values(
            moduleIds.map(
                (moduleId) => ({
                    tenantId,
                    product: "crm" as const,
                    moduleId,
                    enabled: true,

                    source:
                        mode === "trial"
                            ? "trial"
                            : "subscription",

                    grantedAt: now,
                    expiresAt,

                    configuration: {
                        industry,
                        mode,
                        packageKeys,
                    },
                }),
            ),
        )
        .onConflictDoUpdate({
            target: [
                tenantModuleEntitlements
                    .tenantId,

                tenantModuleEntitlements
                    .product,

                tenantModuleEntitlements
                    .moduleId,
            ],

            set: {
                enabled: true,

                source:
                    mode === "trial"
                        ? "trial"
                        : "subscription",

                grantedAt: now,
                expiresAt,

                configuration: {
                    industry,
                    mode,
                    packageKeys,
                },
            },
        });

    await db
        .update(
            tenantModuleEntitlements,
        )
        .set({
            enabled: false,
        })
        .where(
            and(
                eq(
                    tenantModuleEntitlements
                        .tenantId,
                    tenantId,
                ),

                eq(
                    tenantModuleEntitlements
                        .product,
                    "crm",
                ),

                notInArray(
                    tenantModuleEntitlements
                        .moduleId,
                    moduleIds,
                ),
            ),
        );

    return moduleIds;
}