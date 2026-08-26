import {
    getCRMAllModulePermissions,
    type CRMModulePermissions,
} from "@/lib/crm/permissions";

import {
  getEnabledCRMModuleIds,
} from "@/lib/crm/module-entitlements";

export type CRMAssistantAccess = {
    enabled: boolean;

    isAdministrator: boolean;
    isReadOnly: boolean;

    allowedModuleIds: string[];
};

function hasViewAccess(
    permissions:
        CRMModulePermissions,
): boolean {
    return permissions.canView;
}

function hasOperationalAccess(
    permissions:
        CRMModulePermissions,
): boolean {
    return (
        permissions.canCreate ||
        permissions.canEdit ||
        permissions.canDelete ||
        permissions.canManage
    );
}

export async function getCRMAssistantAccess(
    tenantId: string,
    clerkUserId: string,
): Promise<CRMAssistantAccess> {
    const permissionsByModule =
        await getCRMAllModulePermissions(
            tenantId,
            clerkUserId,
        );

    const permissions =
        Array.from(
            permissionsByModule.values(),
        );

    const enabledModuleIds =
        new Set(
        await getEnabledCRMModuleIds(
            tenantId,
            Array.from(
            permissionsByModule.keys(),
            ),
        ),
        );

    const isAdministrator =
        permissions.some(
            (permission) =>
                permission
                    .isGlobalAdministrator,
        );

    const allowedModuleIds =
        Array.from(
            permissionsByModule.entries(),
        )
            .filter(
                (
                [
                    moduleId,
                    permission,
                ],
                ) =>
                enabledModuleIds.has(
                    moduleId,
                ) &&
                hasViewAccess(
                    permission,
                ),
            )
            .map(
                (
                    [
                        moduleId,
                    ],
                ) =>
                    moduleId,
            );

    const hasAnyViewAccess =
        allowedModuleIds.length > 0;

    const hasAnyOperationalAccess =
        permissions.some(
            (permission) =>
                hasOperationalAccess(
                    permission,
                ),
        );

    const isReadOnly =
        !isAdministrator &&
        hasAnyViewAccess &&
        !hasAnyOperationalAccess;

    const enabled =
        isAdministrator ||
        (
            hasAnyViewAccess &&
            hasAnyOperationalAccess
        );

    return {
        enabled,

        isAdministrator,
        isReadOnly,

        allowedModuleIds,
    };
}