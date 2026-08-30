import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { salesInvoices, tenants } from "@/db/schema";

import { getCRMBranchAccess } from "@/lib/crm/branch-access";
import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";
import {
  cancelFiscalInvoice,
  FiscalRuntimeError,
} from "@/lib/fiscal/runtime";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ invoiceId: string }>;
};

type CancellationPayload = {
  reasonCode?: unknown;
  replacementUuid?: unknown;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function getIdempotencyKey(request: Request): string {
  const value = request.headers.get("idempotency-key")?.trim() ?? "";

  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(value)) {
    throw new ApiError("Envía una llave de idempotencia válida.", 400);
  }

  return value;
}

function createErrorResponse(error: unknown) {
  if (
    error instanceof ApiError ||
    error instanceof FiscalRuntimeError ||
    error instanceof CRMPermissionError
  ) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error("No fue posible cancelar el CFDI:", error);

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible confirmar la cancelación. Revisa el historial antes de reintentar.",
    },
    { status: 500 },
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { invoiceId } = await context.params;
    const payload = (await request.json()) as CancellationPayload;
    const idempotencyKey = getIdempotencyKey(request);
    const reasonCode = getString(payload.reasonCode);
    const replacementUuid = getString(payload.replacementUuid)?.toUpperCase();
    const { userId, orgId } = await auth();

    if (!userId) throw new ApiError("No autenticado.", 401);
    if (!orgId) throw new ApiError("No hay una organización activa.", 400);

    if (!reasonCode || !["01", "02", "03", "04"].includes(reasonCode)) {
      throw new ApiError("Selecciona un motivo SAT válido.", 400);
    }

    if (reasonCode === "01" && !replacementUuid) {
      throw new ApiError("El motivo 01 requiere el UUID sustituto.", 400);
    }

    const [invoice] = await db
      .select({
        tenantId: salesInvoices.tenantId,
        branchId: salesInvoices.branchId,
      })
      .from(salesInvoices)
      .innerJoin(tenants, eq(tenants.id, salesInvoices.tenantId))
      .where(
        and(
          eq(salesInvoices.id, invoiceId),
          eq(tenants.clerkOrganizationId, orgId),
        ),
      )
      .limit(1);

    if (!invoice) throw new ApiError("La factura no existe.", 404);

    const [branchAccess] = await Promise.all([
      getCRMBranchAccess(invoice.tenantId, userId),
      requireCRMModulePermission(
        invoice.tenantId,
        userId,
        "cfdi-stamping",
        "edit",
      ),
    ]);

    if (
      !branchAccess.allBranches &&
      (!invoice.branchId || !branchAccess.branchIds.includes(invoice.branchId))
    ) {
      throw new ApiError("No tienes acceso a esta factura.", 403);
    }

    const user = await currentUser();
    const actorName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.emailAddresses[0]?.emailAddress ||
      "Usuario";
    const result = await cancelFiscalInvoice({
      tenantId: invoice.tenantId,
      invoiceId,
      actorClerkUserId: userId,
      actorName,
      reasonCode,
      replacementUuid,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      message:
        result.result.status === "cancelled"
          ? "El CFDI fue cancelado correctamente."
          : "La solicitud de cancelación fue registrada.",
      data: {
        invoiceId,
        requestId: result.requestId,
        uuid: result.result.uuid,
        status: result.result.status,
        providerMessage: result.result.providerMessage,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
