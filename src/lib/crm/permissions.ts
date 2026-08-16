import {
  and,
  eq,
} from "drizzle-orm";

import { db } from "@/db";

import {
  memberProductRoles,
  rolePermissions,
  roles,
  tenantMembers,
} from "@/db/schema";

import {
  permissionModules,
} from "@/lib/administration/permission-modules";

import {
  hasCRMModuleEntitlement,
} from "@/lib/crm/module-entitlements";

export type CRMModulePermission =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "manage";

export type CRMModulePermissions = {
  memberId: string;
  roleId: string | null;

  isGlobalAdministrator:
    boolean;

  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
};

export class CRMPermissionError
  extends Error {
  status: number;

  constructor(
    message: string,
    status = 403,
  ) {
    super(message);
    this.status = status;
  }
}

function getAllowedPermissions(
  memberId: string,
  roleId: string | null,
): CRMModulePermissions {
  return {
    memberId,
    roleId,

    isGlobalAdministrator:
      true,

    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManage: true,
  };
}

export async function getCRMModulePermissions(
  tenantId: string,
  clerkUserId: string,
  moduleId: string,
): Promise<CRMModulePermissions> {
  const [member] =
    await db
      .select({
        id: tenantMembers.id,

        globalRoleId:
          tenantMembers.roleId,

        globalRoleKey:
          roles.key,

        globalRoleProduct:
          roles.product,
      })
      .from(tenantMembers)
      .leftJoin(
        roles,
        and(
          eq(
            tenantMembers.roleId,
            roles.id,
          ),
          eq(
            roles.tenantId,
            tenantId,
          ),
        ),
      )
      .where(
        and(
          eq(
            tenantMembers.tenantId,
            tenantId,
          ),
          eq(
            tenantMembers
              .clerkUserId,
            clerkUserId,
          ),
          eq(
            tenantMembers.status,
            "active",
          ),
        ),
      )
      .limit(1);

  if (!member) {
    throw new CRMPermissionError(
      "Tu usuario no pertenece a la organización activa.",
    );
  }

  const isGlobalOwner =
    member.globalRoleProduct ===
      null &&
    member.globalRoleKey ===
      "owner";

  const isGlobalAdministrator =
    member.globalRoleProduct ===
      null &&
    member.globalRoleKey ===
      "admin";

  if (isGlobalOwner) {
    return getAllowedPermissions(
      member.id,
      member.globalRoleId,
    );
  }

  const [productRole] =
    await db
      .select({
        roleId:
          memberProductRoles.roleId,

        enabled:
          memberProductRoles.enabled,
      })
      .from(
        memberProductRoles,
      )
      .where(
        and(
          eq(
            memberProductRoles
              .tenantId,
            tenantId,
          ),
          eq(
            memberProductRoles
              .memberId,
            member.id,
          ),
          eq(
            memberProductRoles.product,
            "crm",
          ),
        ),
      )
      .limit(1);

  if (!productRole) {
    if (
      isGlobalAdministrator
    ) {
      return getAllowedPermissions(
        member.id,
        member.globalRoleId,
      );
    }

    throw new CRMPermissionError(
      "No tienes acceso asignado a Datara CRM.",
    );
  }

  if (!productRole.enabled) {
    throw new CRMPermissionError(
      "No tienes acceso activo a Datara CRM.",
    );
  }

  const roleId =
    productRole.roleId;

  if (!roleId) {
    return {
      memberId: member.id,
      roleId: null,

      isGlobalAdministrator:
        false,

      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canManage: false,
    };
  }

  const [permission] =
    await db
      .select({
        canView:
          rolePermissions.canView,

        canCreate:
          rolePermissions.canCreate,

        canEdit:
          rolePermissions.canEdit,

        canDelete:
          rolePermissions.canDelete,

        canManage:
          rolePermissions.canManage,
      })
      .from(rolePermissions)
      .where(
        and(
          eq(
            rolePermissions.roleId,
            roleId,
          ),
          eq(
            rolePermissions.moduleId,
            moduleId,
          ),
        ),
      )
      .limit(1);

  return {
    memberId: member.id,
    roleId,

    isGlobalAdministrator:
      false,

    canView:
      permission?.canView ??
      false,

    canCreate:
      permission?.canCreate ??
      false,

    canEdit:
      permission?.canEdit ??
      false,

    canDelete:
      permission?.canDelete ??
      false,

    canManage:
      permission?.canManage ??
      false,
  };
}

export async function requireCRMModulePermission(
  tenantId: string,
  clerkUserId: string,
  moduleId: string,
  requiredPermission:
    CRMModulePermission,
): Promise<CRMModulePermissions> {
    const availableModuleIds =
    permissionModules
      .filter(
        (module) =>
          module.product ===
          "crm",
      )
      .map(
        (module) =>
          module.id,
      );

  const hasEntitlement =
    await hasCRMModuleEntitlement(
      tenantId,
      moduleId,
      availableModuleIds,
    );

  if (!hasEntitlement) {
    throw new CRMPermissionError(
      "Este módulo no está incluido en la contratación activa de la empresa.",
      403,
    );
  }

  const permissions =
    await getCRMModulePermissions(
      tenantId,
      clerkUserId,
      moduleId,
    );

  const allowed =
    requiredPermission === "view"
      ? permissions.canView
      : requiredPermission ===
          "create"
        ? permissions.canCreate
        : requiredPermission ===
            "edit"
          ? permissions.canEdit
          : requiredPermission ===
              "delete"
            ? permissions.canDelete
            : permissions.canManage;

  if (!allowed) {
    throw new CRMPermissionError(
      "No tienes permisos para realizar esta operación.",
    );
  }

  return permissions;
}