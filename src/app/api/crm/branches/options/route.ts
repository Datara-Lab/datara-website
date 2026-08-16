import {
  auth,
} from "@clerk/nextjs/server";
import {
  and,
  asc,
  eq,
  inArray,
} from "drizzle-orm";
import {
  NextResponse,
} from "next/server";

import {
  db,
} from "@/db";
import {
  tenantBranches,
  tenants,
} from "@/db/schema";
import {
  CRMBranchAccessError,
  getCRMBranchAccess,
} from "@/lib/crm/branch-access";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const {
      userId,
      orgId,
    } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No autenticado.",
        },
        {
          status: 401,
        },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No hay una organización activa.",
        },
        {
          status: 400,
        },
      );
    }

    const [tenant] =
      await db
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
      return NextResponse.json(
        {
          success: false,
          error:
            "La empresa aún no está sincronizada.",
        },
        {
          status: 404,
        },
      );
    }

    const branchAccess =
      await getCRMBranchAccess(
        tenant.id,
        userId,
      );

    if (
      !branchAccess.allBranches &&
      branchAccess.branchIds.length ===
        0
    ) {
      return NextResponse.json({
        success: true,
        data: [],
        primaryBranchId: null,
      });
    }

    const branches =
      await db
        .select({
          id:
            tenantBranches.id,
          name:
            tenantBranches.name,
          code:
            tenantBranches.code,
          regionId:
            tenantBranches.regionId,
        })
        .from(tenantBranches)
        .where(
          branchAccess.allBranches
            ? and(
                eq(
                  tenantBranches.tenantId,
                  tenant.id,
                ),
                eq(
                  tenantBranches.active,
                  true,
                ),
              )
            : and(
                eq(
                  tenantBranches.tenantId,
                  tenant.id,
                ),
                eq(
                  tenantBranches.active,
                  true,
                ),
                inArray(
                  tenantBranches.id,
                  branchAccess.branchIds,
                ),
              ),
        )
        .orderBy(
          asc(
            tenantBranches.name,
          ),
        );

    return NextResponse.json({
      success: true,

      data:
        branches.map(
          (branch) => ({
            id: branch.id,
            value: branch.id,
            name: branch.name,
            code: branch.code,
            regionId:
              branch.regionId,

            label: branch.code
              ? `${branch.name} (${branch.code})`
              : branch.name,

            isPrimary:
              branch.id ===
              branchAccess.primaryBranchId,
          }),
        ),

      primaryBranchId:
        branchAccess.primaryBranchId,
    });
  } catch (error) {
    if (
      error instanceof
      CRMBranchAccessError
    ) {
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
      "No fue posible cargar las sucursales autorizadas:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "No fue posible cargar las sucursales autorizadas.",
      },
      {
        status: 500,
      },
    );
  }
}