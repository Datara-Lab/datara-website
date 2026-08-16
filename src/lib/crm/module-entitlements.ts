import {
    and,
    eq,
    gt,
    isNull,
    or,
} from "drizzle-orm";

import { db } from "@/db";

import {
    tenantModuleEntitlements,
} from "@/db/schema";

import {
    CRM_PLATFORM_MODULE_IDS,
} from "@/lib/crm/module-catalog";

export type CRMModuleEntitlement = {
    moduleId: string;
    enabled: boolean;
};

export async function getCRMModuleEntitlements(
    tenantId: string,
): Promise<CRMModuleEntitlement[]> {
    const now = new Date();

    const records =
        await db
            .select({
                moduleId:
                    tenantModuleEntitlements
                        .moduleId,

                enabled:
                    tenantModuleEntitlements
                        .enabled,
            })
            .from(
                tenantModuleEntitlements,
            )
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
                    or(
                        isNull(
                            tenantModuleEntitlements
                                .expiresAt,
                        ),
                        gt(
                            tenantModuleEntitlements
                                .expiresAt,
                            now,
                        ),
                    ),
                ),
            );

    return records;
}

export async function getEnabledCRMModuleIds(
    tenantId: string,
    availableModuleIds: string[],
): Promise<string[]> {
    const entitlements =
        await getCRMModuleEntitlements(
            tenantId,
        );

    /*
     * Compatibilidad con empresas existentes:
     * mientras no tengan contratación modular
     * configurada, conservan todos los módulos.
     */
    if (
        entitlements.length === 0
    ) {
        return availableModuleIds;
    }

    const enabledModuleIds =
        new Set<string>([
            ...CRM_PLATFORM_MODULE_IDS,

            ...entitlements
                .filter(
                    (entitlement) =>
                        entitlement.enabled,
                )
                .map(
                    (entitlement) =>
                        entitlement.moduleId,
                ),
        ]);

    return availableModuleIds.filter(
        (moduleId) =>
            enabledModuleIds.has(
                moduleId,
            ),
    );
}

export async function hasCRMModuleEntitlement(
    tenantId: string,
    moduleId: string,
    availableModuleIds: string[],
): Promise<boolean> {
    const enabledModuleIds =
        await getEnabledCRMModuleIds(
            tenantId,
            availableModuleIds,
        );

    return enabledModuleIds.includes(
        moduleId,
    );
}