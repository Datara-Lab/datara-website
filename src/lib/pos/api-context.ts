import { and, eq, gt, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  memberBranchAccess,
  memberProductRoles,
  rolePermissions,
  roles,
  tenantMembers,
  tenantModuleEntitlements,
  tenantProducts,
} from "@/db/schema";
import { getAuthorizationContext } from "@/lib/auth/session";

export type POSPermission = "view" | "create" | "edit" | "manage";

export class POSApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "POSApiError";
  }
}

export async function getPOSApiContext(
  moduleId: string,
  permission: POSPermission,
) {
  const context = await getAuthorizationContext();
  const [member] = await db
    .select({
      globalRoleKey: roles.key,
      globalRoleProduct: roles.product,
    })
    .from(tenantMembers)
    .leftJoin(roles, eq(tenantMembers.roleId, roles.id))
    .where(eq(tenantMembers.id, context.memberId))
    .limit(1);
  const isGlobalAdministrator =
    member?.globalRoleProduct === null &&
    ["owner", "admin"].includes(member.globalRoleKey ?? "");

  const [product] = await db
    .select({ enabled: tenantProducts.enabled })
    .from(tenantProducts)
    .where(
      and(
        eq(tenantProducts.tenantId, context.tenantId),
        eq(tenantProducts.product, "pos"),
        eq(tenantProducts.enabled, true),
      ),
    )
    .limit(1);
  if (!product) throw new POSApiError("Datara POS no está activo para esta empresa.", 403);

  const [entitlement] = await db
    .select({ enabled: tenantModuleEntitlements.enabled })
    .from(tenantModuleEntitlements)
    .where(
      and(
        eq(tenantModuleEntitlements.tenantId, context.tenantId),
        eq(tenantModuleEntitlements.product, "pos"),
        eq(tenantModuleEntitlements.moduleId, moduleId),
        eq(tenantModuleEntitlements.enabled, true),
        or(
          isNull(tenantModuleEntitlements.expiresAt),
          gt(tenantModuleEntitlements.expiresAt, new Date()),
        ),
      ),
    )
    .limit(1);
  if (!entitlement) throw new POSApiError("El módulo POS no está incluido en la contratación activa.", 403);

  const [productRole] = await db
    .select({
      roleId: memberProductRoles.roleId,
      enabled: memberProductRoles.enabled,
      allBranches: memberProductRoles.allBranches,
    })
    .from(memberProductRoles)
    .where(
      and(
        eq(memberProductRoles.tenantId, context.tenantId),
        eq(memberProductRoles.memberId, context.memberId),
        eq(memberProductRoles.product, "pos"),
      ),
    )
    .limit(1);

  if (!isGlobalAdministrator && !productRole?.enabled) {
    throw new POSApiError("No tienes acceso activo a Datara POS.", 403);
  }

  let allowed = isGlobalAdministrator;
  if (!allowed && productRole?.roleId) {
    const [record] = await db
      .select({
        canView: rolePermissions.canView,
        canCreate: rolePermissions.canCreate,
        canEdit: rolePermissions.canEdit,
        canManage: rolePermissions.canManage,
      })
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, productRole.roleId),
          eq(rolePermissions.moduleId, moduleId),
        ),
      )
      .limit(1);
    allowed = permission === "view" ? Boolean(record?.canView)
      : permission === "create" ? Boolean(record?.canCreate)
        : permission === "edit" ? Boolean(record?.canEdit)
          : Boolean(record?.canManage);
  }
  if (!allowed) throw new POSApiError("No tienes permisos para realizar esta operación.", 403);

  const branches = isGlobalAdministrator || productRole?.allBranches
    ? []
    : await db
        .select({ branchId: memberBranchAccess.branchId })
        .from(memberBranchAccess)
        .where(
          and(
            eq(memberBranchAccess.tenantId, context.tenantId),
            eq(memberBranchAccess.memberId, context.memberId),
            eq(memberBranchAccess.product, "pos"),
          ),
        );

  return {
    tenantId: context.tenantId,
    userId: context.clerkUserId,
    allBranches: Boolean(isGlobalAdministrator || productRole?.allBranches),
    branchIds: branches.map((branch) => branch.branchId),
  };
}

export function assertPOSBranchAccess(
  context: { allBranches: boolean; branchIds: string[] },
  branchId: string,
) {
  if (!context.allBranches && !context.branchIds.includes(branchId)) {
    throw new POSApiError("No tienes acceso a la sucursal seleccionada.", 403);
  }
}

export function createPOSApiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof POSApiError) {
    return Response.json({ success: false, error: error.message }, { status: error.status });
  }
  const code = (error as { cause?: { code?: string }; code?: string }).cause?.code
    ?? (error as { code?: string }).code;
  if (code === "23505") {
    return Response.json({ success: false, error: "Ya existe un registro POS con esos datos." }, { status: 409 });
  }
  console.error(fallback, error);
  return Response.json({ success: false, error: fallback }, { status: 500 });
}

export function requiredString(value: unknown, label: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new POSApiError(`${label} es obligatorio.`);
  return normalized;
}

export function money(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new POSApiError(`${label} no es válido.`);
  return Math.round(parsed * 100) / 100;
}
