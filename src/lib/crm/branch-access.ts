import {
  and,
  asc,
  eq,
  inArray,
} from "drizzle-orm";

import { db } from "@/db";

import {
  memberBranchAccess,
  memberProductRoles,
  memberRegionAccess,
  roles,
  tenantBranches,
  tenantMembers,
} from "@/db/schema";

export class CRMBranchAccessError
  extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

export type CRMBranchAccessContext = {
  memberId: string;

  allBranches: boolean;

  branchIds: string[];

  primaryBranchId:
    | string
    | null;
};

export async function getCRMBranchAccess(
  tenantId: string,
  clerkUserId: string,
): Promise<CRMBranchAccessContext> {
  const [member] = await db
    .select({
      id: tenantMembers.id,

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
          tenantMembers.clerkUserId,
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
    throw new CRMBranchAccessError(
      "Tu usuario no pertenece a la organización activa.",
      403,
    );
  }

  const [productAccess] =
    await db
      .select({
        enabled:
          memberProductRoles.enabled,

        allBranches:
          memberProductRoles.allBranches,
      })
      .from(
        memberProductRoles,
      )
      .where(
        and(
          eq(
            memberProductRoles.tenantId,
            tenantId,
          ),
          eq(
            memberProductRoles.memberId,
            member.id,
          ),
          eq(
            memberProductRoles.product,
            "crm",
          ),
        ),
      )
      .limit(1);

  const directBranches =
    await db
      .select({
        branchId:
          memberBranchAccess.branchId,

        isPrimary:
          memberBranchAccess.isPrimary,
      })
      .from(
        memberBranchAccess,
      )
      .where(
        and(
          eq(
            memberBranchAccess.tenantId,
            tenantId,
          ),
          eq(
            memberBranchAccess.memberId,
            member.id,
          ),
          eq(
            memberBranchAccess.product,
            "crm",
          ),
        ),
      );

  const primaryBranchId =
    directBranches.find(
      (branch) =>
        branch.isPrimary,
    )?.branchId ??
    directBranches[0]
      ?.branchId ??
    null;

  const isGlobalAdministrator =
    member.globalRoleProduct ===
      null &&
    (
      member.globalRoleKey ===
        "owner" ||
      member.globalRoleKey ===
        "admin"
    );

  if (
    isGlobalAdministrator ||
    (
      productAccess?.enabled &&
      productAccess.allBranches
    )
  ) {
    const [defaultBranch] =
      primaryBranchId
        ? []
        : await db
            .select({
              id:
                tenantBranches.id,
            })
            .from(
              tenantBranches,
            )
            .where(
              and(
                eq(
                  tenantBranches.tenantId,
                  tenantId,
                ),
                eq(
                  tenantBranches.active,
                  true,
                ),
              ),
            )
            .orderBy(
              asc(
                tenantBranches.name,
              ),
            )
            .limit(1);

    return {
      memberId: member.id,
      allBranches: true,
      branchIds: [],
      primaryBranchId:
        primaryBranchId ??
        defaultBranch?.id ??
        null,
    };
  }

  if (
    !productAccess?.enabled
  ) {
    throw new CRMBranchAccessError(
      "No tienes acceso activo a Datara CRM.",
      403,
    );
  }

  const assignedRegions =
    await db
      .select({
        regionId:
          memberRegionAccess.regionId,
      })
      .from(
        memberRegionAccess,
      )
      .where(
        and(
          eq(
            memberRegionAccess.tenantId,
            tenantId,
          ),
          eq(
            memberRegionAccess.memberId,
            member.id,
          ),
          eq(
            memberRegionAccess.product,
            "crm",
          ),
        ),
      );

  const regionIds =
    assignedRegions.map(
      (region) =>
        region.regionId,
    );

  const regionalBranches =
    regionIds.length > 0
      ? await db
          .select({
            id:
              tenantBranches.id,
          })
          .from(
            tenantBranches,
          )
          .where(
            and(
              eq(
                tenantBranches.tenantId,
                tenantId,
              ),
              inArray(
                tenantBranches.regionId,
                regionIds,
              ),
            ),
          )
      : [];

  const branchIds =
    Array.from(
      new Set([
        ...directBranches.map(
          (branch) =>
            branch.branchId,
        ),

        ...regionalBranches.map(
          (branch) =>
            branch.id,
        ),
      ]),
    );

  /*
   * Un producto habilitado sin regiones ni sucursales
   * explícitas representa acceso a todas las sucursales.
   */
  return {
    memberId: member.id,
    allBranches:
      branchIds.length === 0,
    branchIds,
    primaryBranchId:
      primaryBranchId ??
      branchIds[0] ??
      null,
  };
}

export async function validateCRMBranchId(
  tenantId: string,
  branchAccess:
    CRMBranchAccessContext,
  requestedBranchId?:
    | string
    | null,
): Promise<string> {
  const branchId =
    requestedBranchId?.trim() ||
    branchAccess.primaryBranchId;

  if (!branchId) {
    throw new CRMBranchAccessError(
      "Selecciona una sucursal para continuar.",
      400,
    );
  }

  if (
    !branchAccess.allBranches &&
    !branchAccess.branchIds.includes(
      branchId,
    )
  ) {
    throw new CRMBranchAccessError(
      "No tienes acceso a la sucursal seleccionada.",
      403,
    );
  }

  const [branch] =
    await db
      .select({
        id: tenantBranches.id,
      })
      .from(tenantBranches)
      .where(
        and(
          eq(
            tenantBranches.id,
            branchId,
          ),
          eq(
            tenantBranches.tenantId,
            tenantId,
          ),
          eq(
            tenantBranches.active,
            true,
          ),
        ),
      )
      .limit(1);

  if (!branch) {
    throw new CRMBranchAccessError(
      "La sucursal seleccionada no existe o está inactiva.",
      400,
    );
  }

  return branch.id;
}