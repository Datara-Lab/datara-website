import {
  auth,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  crmDeals,
  tenants,
} from "@/db/schema";

import {
  getCRMBranchAccess,
  CRMBranchAccessError,
} from "@/lib/crm/branch-access";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function createErrorResponse(error: unknown) {
  if (
    error instanceof ApiError ||
    error instanceof CRMBranchAccessError ||
    error instanceof CRMPermissionError
  ) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error(
    "No fue posible cambiar la etapa de la oportunidad:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error: "No fue posible cambiar la etapa de la oportunidad.",
    },
    { status: 500 },
  );
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      throw new ApiError("No autenticado.", 401);
    }

    if (!orgId) {
      throw new ApiError("No hay una organización activa.", 400);
    }

    const { id } = await context.params;
    const payload = await request.json() as { stage?: unknown };
    const stage =
      typeof payload.stage === "string"
        ? payload.stage.trim()
        : "";

    if (!stage || stage.length > 100) {
      throw new ApiError("Selecciona una etapa válida.", 400);
    }

    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.clerkOrganizationId, orgId))
      .limit(1);

    if (!tenant) {
      throw new ApiError("La empresa aún no está sincronizada.", 404);
    }

    const [branchAccess] = await Promise.all([
      getCRMBranchAccess(tenant.id, userId),
      requireCRMModulePermission(
        tenant.id,
        userId,
        "deals",
        "edit",
      ),
    ]);

    const [deal] = await db
      .select({
        id: crmDeals.id,
        branchId: crmDeals.branchId,
      })
      .from(crmDeals)
      .where(
        and(
          eq(crmDeals.id, id),
          eq(crmDeals.tenantId, tenant.id),
        ),
      )
      .limit(1);

    if (!deal) {
      throw new ApiError("La oportunidad no existe.", 404);
    }

    if (
      !branchAccess.allBranches &&
      (
        !deal.branchId ||
        !branchAccess.branchIds.includes(deal.branchId)
      )
    ) {
      throw new ApiError(
        "No tienes acceso a la sucursal de esta oportunidad.",
        403,
      );
    }

    const [updated] = await db
      .update(crmDeals)
      .set({
        stage,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmDeals.id, id),
          eq(crmDeals.tenantId, tenant.id),
        ),
      )
      .returning({
        id: crmDeals.id,
        stage: crmDeals.stage,
      });

    return NextResponse.json({
      success: true,
      message: "La oportunidad cambió de etapa.",
      data: updated,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
