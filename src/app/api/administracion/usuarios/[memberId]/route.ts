import {
  auth,
  clerkClient,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
  inArray,
} from "drizzle-orm";

import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  memberBranchAccess,
  memberProductRoles,
  memberRegionAccess,
  roles,
  tenantBranches,
  tenantMembers,
  tenantProducts,
  tenantRegions,
  tenants,
} from "@/db/schema";

import {
  requireAdminContext,
} from "@/lib/administration/require-admin-context";

export const dynamic = "force-dynamic";

type Product =
  | "crm"
  | "analytics"
  | "cloud";

type UpdateAccessRequest = {
  globalRoleId?: string | null;
  products: Array<{
    product: Product;
    roleId: string | null;

    allBranches?: boolean;

    regionIds?: string[];

    branches?: Array<{
      branchId: string;
      isPrimary?: boolean;
    }>;
  }>;
};

class ApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

async function getTenantContext() {
  const {
    userId,
    orgId,
  } = await auth();

  if (!userId) {
    throw new ApiError(
      "No autenticado.",
      401,
    );
  }

  if (!orgId) {
    throw new ApiError(
      "No hay una organización activa.",
      400,
    );
  }

  const [tenant] = await db
    .select({
      id: tenants.id,
    })
    .from(tenants)
    .where(
      eq(
        tenants.clerkOrganizationId,
        orgId,
      ),
    )
    .limit(1);

  if (!tenant) {
    throw new ApiError(
      "La empresa aún no está sincronizada.",
      404,
    );
  }

  return {
    tenantId: tenant.id,
    currentUserId: userId,
  };
}

function createErrorResponse(
  error: unknown,
) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error(
    "No fue posible actualizar los accesos del usuario:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible actualizar los accesos del usuario.",
    },
    {
      status: 500,
    },
  );
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      memberId: string;
    }>;
  },
) {
  try {
    const {
      tenantId,
      currentUserId,
    } = await getTenantContext();

    const {
      memberId,
    } = await context.params;

    const payload =
      (await request.json()) as UpdateAccessRequest;

    if (
      !Array.isArray(
        payload.products,
      )
    ) {
      throw new ApiError(
        "La configuración de productos no es válida.",
        400,
      );
    }

    const [currentMember] = await db
      .select({
        id: tenantMembers.id,
        roleId: tenantMembers.roleId,
      })
      .from(tenantMembers)
      .where(
        and(
          eq(
            tenantMembers.tenantId,
            tenantId,
          ),
          eq(
            tenantMembers.clerkUserId,
            currentUserId,
          ),
          eq(
            tenantMembers.status,
            "active",
          ),
        ),
      )
      .limit(1);

    if (!currentMember) {
      throw new ApiError(
        "Tu usuario no pertenece a la organización activa.",
        403,
      );
    }

    const [currentGlobalRole] =
      currentMember.roleId
        ? await db
            .select({
              key: roles.key,
              product:
                roles.product,
            })
            .from(roles)
            .where(
              and(
                eq(
                  roles.id,
                  currentMember.roleId,
                ),
                eq(
                  roles.tenantId,
                  tenantId,
                ),
              ),
            )
            .limit(1)
        : [];

        if (
          !currentGlobalRole ||
          (
            currentGlobalRole.key !==
              "owner" &&
            currentGlobalRole.key !==
              "admin"
          ) ||
          currentGlobalRole.product !==
            null
        ) {
          throw new ApiError(
            "No tienes permisos para administrar usuarios.",
            403,
          );
        }

    const [member] = await db
      .select({
        id: tenantMembers.id,
      })
      .from(tenantMembers)
      .where(
        and(
          eq(
            tenantMembers.id,
            memberId,
          ),
          eq(
            tenantMembers.tenantId,
            tenantId,
          ),
        ),
      )
      .limit(1);

    if (!member) {
      throw new ApiError(
        "No se encontró el usuario.",
        404,
      );
    }

    if (payload.globalRoleId) {
      const [globalRole] = await db
        .select({
          id:
            roles.id,
          key:
            roles.key,
          product:
            roles.product,
        })
        .from(roles)
        .where(
          and(
            eq(
              roles.id,
              payload.globalRoleId,
            ),
            eq(
              roles.tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

      if (
        !globalRole ||
        globalRole.product !== null
      ) {
        throw new ApiError(
          "El rol global seleccionado no es válido.",
          400,
        );
      }

      if (
        globalRole.key ===
          "admin_cloud" &&
        currentGlobalRole.key !==
          "owner"
      ) {
        throw new ApiError(
          "Solo el propietario de Datara puede asignar el rol Admin Cloud.",
          403,
        );
      }
    }

    const enabledProducts =
      await db
        .select({
          product:
            tenantProducts.product,
        })
        .from(tenantProducts)
        .where(
          and(
            eq(
              tenantProducts.tenantId,
              tenantId,
            ),
            eq(
              tenantProducts.enabled,
              true,
            ),
          ),
        );

    const enabledProductSet =
      new Set<Product>(
        enabledProducts.map(
          (item) =>
            item.product as Product,
        ),
      );

          const requestedRegionIds =
      Array.from(
        new Set(
          payload.products.flatMap(
            (item) =>
              Array.isArray(
                item.regionIds,
              )
                ? item.regionIds.filter(
                    (
                      regionId,
                    ): regionId is string =>
                      typeof regionId ===
                        "string" &&
                      regionId.length > 0,
                  )
                : [],
          ),
        ),
      );

    const requestedBranchIds =
      Array.from(
        new Set(
          payload.products.flatMap(
            (item) =>
              Array.isArray(
                item.branches,
              )
                ? item.branches
                    .map(
                      (branch) =>
                        branch.branchId,
                    )
                    .filter(
                      (
                        branchId,
                      ): branchId is string =>
                        typeof branchId ===
                          "string" &&
                        branchId.length >
                          0,
                    )
                : [],
          ),
        ),
      );

    const validRegions =
      requestedRegionIds.length >
      0
        ? await db
            .select({
              id:
                tenantRegions.id,
            })
            .from(tenantRegions)
            .where(
              and(
                eq(
                  tenantRegions.tenantId,
                  tenantId,
                ),
                inArray(
                  tenantRegions.id,
                  requestedRegionIds,
                ),
              ),
            )
        : [];

    if (
      validRegions.length !==
      requestedRegionIds.length
    ) {
      throw new ApiError(
        "Una o más regiones no pertenecen a la organización.",
        400,
      );
    }

    const validBranches =
      requestedBranchIds.length >
      0
        ? await db
            .select({
              id:
                tenantBranches.id,
            })
            .from(tenantBranches)
            .where(
              and(
                eq(
                  tenantBranches.tenantId,
                  tenantId,
                ),
                inArray(
                  tenantBranches.id,
                  requestedBranchIds,
                ),
              ),
            )
        : [];

    if (
      validBranches.length !==
      requestedBranchIds.length
    ) {
      throw new ApiError(
        "Una o más sucursales no pertenecen a la organización.",
        400,
      );
    }

    for (const item of payload.products) {
      await db
        .delete(
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
              memberId,
            ),
            eq(
              memberRegionAccess.product,
              item.product,
            ),
          ),
        );

      await db
        .delete(
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
              memberId,
            ),
            eq(
              memberBranchAccess.product,
              item.product,
            ),
          ),
        );

      if (!item.roleId) {
        await db
          .delete(
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
                memberId,
              ),
              eq(
                memberProductRoles.product,
                item.product,
              ),
            ),
          );

        continue;
      }

      const allBranches =
        item.allBranches === true;

      const regionIds =
        Array.from(
          new Set(
            Array.isArray(
              item.regionIds,
            )
              ? item.regionIds
              : [],
          ),
        );

      const branches =
        Array.isArray(
          item.branches,
        )
          ? item.branches
          : [];

      const primaryBranches =
        branches.filter(
          (branch) =>
            branch.isPrimary ===
            true,
        );

      if (
        primaryBranches.length >
        1
      ) {
        throw new ApiError(
          `Solo puede existir una sucursal principal para ${item.product}.`,
          400,
        );
      }

      await db
        .insert(
          memberProductRoles,
        )
        .values({
          tenantId,
          memberId,

          product:
            item.product,

          roleId:
            item.roleId,

          enabled: true,

          allBranches,
        })
        .onConflictDoUpdate({
          target: [
            memberProductRoles.memberId,
            memberProductRoles.product,
          ],
          set: {
            roleId:
              item.roleId,

            enabled: true,

            allBranches,

            updatedAt:
              new Date(),
          },
        });

      if (
        !allBranches &&
        regionIds.length > 0
      ) {
        await db
          .insert(
            memberRegionAccess,
          )
          .values(
            regionIds.map(
              (regionId) => ({
                tenantId,
                memberId,

                product:
                  item.product,

                regionId,
              }),
            ),
          );
      }

      if (
        !allBranches &&
        branches.length > 0
      ) {
        await db
          .insert(
            memberBranchAccess,
          )
          .values(
            branches.map(
              (branch) => ({
                tenantId,
                memberId,

                product:
                  item.product,

                branchId:
                  branch.branchId,

                isPrimary:
                  branch.isPrimary ===
                  true,
              }),
            ),
          );
      }
    }

    await db
      .update(tenantMembers)
      .set({
        roleId:
          payload.globalRoleId ??
          null,

        updatedAt:
          new Date(),
      })
      .where(
        and(
          eq(
            tenantMembers.id,
            memberId,
          ),
          eq(
            tenantMembers.tenantId,
            tenantId,
          ),
        ),
      );

    return NextResponse.json({
      success: true,
      message:
        "Los accesos del usuario fueron actualizados correctamente.",
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      memberId: string;
    }>;
  },
) {
  try {
    const {
      tenantId,
      memberId: currentMemberId,
      clerkUserId: currentUserId,
    } = await requireAdminContext();

    const {
      memberId,
    } = await context.params;

    const [targetMember] = await db
      .select({
        id: tenantMembers.id,
        clerkUserId:
          tenantMembers.clerkUserId,
        roleId:
          tenantMembers.roleId,
        status:
          tenantMembers.status,
        roleKey:
          roles.key,
        roleProduct:
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
            tenantMembers.id,
            memberId,
          ),
        ),
      )
      .limit(1);

    if (!targetMember) {
      throw new ApiError(
        "El usuario no existe.",
        404,
      );
    }

    if (
      targetMember.clerkUserId ===
      currentUserId
    ) {
      throw new ApiError(
        "No puedes eliminar tu propio usuario.",
        400,
      );
    }

    if (
      targetMember.roleKey === "owner" &&
      targetMember.roleProduct === null
    ) {
      throw new ApiError(
        "El propietario de la organización no puede ser eliminado.",
        403,
      );
    }

    if (
      targetMember.status ===
      "removed"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "El usuario ya estaba eliminado.",
      });
    }

    const clerk =
      await clerkClient();

    const {
      orgId,
    } = await auth();

    if (!orgId) {
      throw new ApiError(
        "No hay una organización activa.",
        400,
      );
    }

    await clerk.organizations
      .deleteOrganizationMembership({
        organizationId: orgId,
        userId:
          targetMember.clerkUserId,
      });

    await db
      .delete(
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
            memberId,
          ),
        ),
      );

    await db
      .delete(
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
            memberId,
          ),
        ),
      );

    await db
      .delete(
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
            memberId,
          ),
        ),
      );

    await db
      .update(
        tenantMembers,
      )
      .set({
        status: "removed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            tenantMembers.tenantId,
            tenantId,
          ),
          eq(
            tenantMembers.id,
            memberId,
          ),
        ),
      );

    return NextResponse.json({
      success: true,
      message:
        "El usuario fue eliminado correctamente.",
      data: {
        memberId,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}