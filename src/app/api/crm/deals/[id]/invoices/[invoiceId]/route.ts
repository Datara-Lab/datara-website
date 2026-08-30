import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import {
  getCRMBranchAccess,
  type CRMBranchAccessContext,
} from "@/lib/crm/branch-access";
import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; invoiceId: string }>;
};

type UpdatePayload = {
  action?: unknown;
  status?: unknown;
  invoiceNumber?: unknown;
  invoiceDate?: unknown;
  amount?: unknown;
  currency?: unknown;
  documentReference?: unknown;
  externalSystem?: unknown;
  externalId?: unknown;
  externalReference?: unknown;
  reason?: unknown;
};

type InvoiceRow = {
  id: string;
  branchId: string | null;
  status: string;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  amount: string;
  currency: string;
  documentReference: string | null;
  externalSystem: string | null;
  externalId: string | null;
  externalReference: string | null;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function getNullableString(value: unknown) {
  return value === null || value === "" ? null : getString(value);
}

function getMoney(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100) / 100
    : undefined;
}

function getDate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const normalized = getString(value);
  const parsed = normalized ? new Date(normalized) : null;

  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
}

function canAccessBranch(
  branchId: string | null,
  access: CRMBranchAccessContext,
) {
  return access.allBranches ||
    (branchId !== null && access.branchIds.includes(branchId));
}

function createErrorResponse(error: unknown) {
  if (error instanceof ApiError || error instanceof CRMPermissionError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "code" in error.cause &&
    error.cause.code === "23505"
  ) {
    return NextResponse.json(
      { success: false, error: "Ya existe una factura con ese folio o referencia externa." },
      { status: 409 },
    );
  }

  console.error("No fue posible actualizar la factura:", error);
  return NextResponse.json(
    { success: false, error: "No fue posible actualizar la factura." },
    { status: 500 },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: dealId, invoiceId } = await context.params;
    const payload = (await request.json()) as UpdatePayload;
    const { userId, orgId } = await auth();

    if (!userId) {
      throw new ApiError("No autenticado.", 401);
    }

    if (!orgId) {
      throw new ApiError("No hay una organización activa.", 400);
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
        "invoice-control",
        "edit",
      ),
    ]);

    const invoiceResult = await db.execute<InvoiceRow>(sql`
      SELECT id, branch_id AS "branchId", status,
        invoice_number AS "invoiceNumber", invoice_date AS "invoiceDate",
        amount, currency, document_reference AS "documentReference",
        external_system AS "externalSystem", external_id AS "externalId",
        external_reference AS "externalReference"
      FROM sales_invoices
      WHERE tenant_id = ${tenant.id} AND deal_id = ${dealId}
        AND id = ${invoiceId}
      LIMIT 1
    `);
    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      throw new ApiError("La factura no existe.", 404);
    }

    if (!canAccessBranch(invoice.branchId, branchAccess)) {
      throw new ApiError("No tienes acceso a esta factura.", 403);
    }

    const action = getString(payload.action) ?? "update";

    if (action !== "update" && action !== "cancel") {
      throw new ApiError("La acción solicitada no es válida.", 400);
    }

    if (invoice.status === "cancelled") {
      throw new ApiError("Una factura cancelada ya no puede modificarse.", 409);
    }

    const reason = getString(payload.reason);

    if (action === "cancel" && !reason) {
      throw new ApiError("Captura el motivo de cancelación.", 400);
    }

    const nextStatus =
      action === "cancel" ? "cancelled" : getString(payload.status) ?? invoice.status;

    if (!["pending", "requested", "issued", "cancelled", "error"].includes(nextStatus)) {
      throw new ApiError("El estado de la factura no es válido.", 400);
    }

    const invoiceNumber =
      payload.invoiceNumber === undefined
        ? invoice.invoiceNumber
        : getNullableString(payload.invoiceNumber) ?? null;
    const invoiceDate =
      payload.invoiceDate === undefined ? invoice.invoiceDate : getDate(payload.invoiceDate);
    const amount =
      payload.amount === undefined ? Number(invoice.amount) : getMoney(payload.amount);
    const currency =
      payload.currency === undefined
        ? invoice.currency
        : (getString(payload.currency) ?? "").toLowerCase();

    if (invoiceDate === undefined || amount === undefined || !/^[a-z]{3}$/.test(currency)) {
      throw new ApiError("La fecha, monto o moneda no son válidos.", 400);
    }

    if (nextStatus === "issued" && !invoiceNumber) {
      throw new ApiError("Una factura emitida debe tener folio.", 400);
    }

    const user = await currentUser();
    const actorName = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || user?.emailAddresses[0]?.emailAddress || "Usuario";

    const result = await db.execute<{
      id: string;
      status: string;
      invoiceNumber: string | null;
    }>(sql`
      WITH updated_invoice AS (
        UPDATE sales_invoices
        SET status = ${nextStatus}, invoice_number = ${invoiceNumber},
          invoice_date = ${invoiceDate}, amount = ${amount}, currency = ${currency},
          document_reference = ${
            payload.documentReference === undefined
              ? invoice.documentReference
              : getNullableString(payload.documentReference) ?? null
          },
          external_system = ${
            payload.externalSystem === undefined
              ? invoice.externalSystem
              : getNullableString(payload.externalSystem) ?? null
          },
          external_id = ${
            payload.externalId === undefined
              ? invoice.externalId
              : getNullableString(payload.externalId) ?? null
          },
          external_reference = ${
            payload.externalReference === undefined
              ? invoice.externalReference
              : getNullableString(payload.externalReference) ?? null
          },
          metadata = metadata || jsonb_build_object(
            'lastAction', ${action}, 'lastReason', ${reason ?? null}
          ),
          updated_at = NOW()
        WHERE tenant_id = ${tenant.id} AND deal_id = ${dealId}
          AND id = ${invoiceId} AND status = ${invoice.status}
        RETURNING id, status, invoice_number
      ), created_event AS (
        INSERT INTO commercial_operation_events (
          tenant_id, deal_id, event_type, entity_type, entity_id,
          summary, source, actor_clerk_user_id, actor_name, payload
        )
        SELECT ${tenant.id}, ${dealId},
          ${action === "cancel" ? "invoice_cancelled" : "invoice_updated"},
          'sales_invoice', updated_invoice.id::text,
          ${
            action === "cancel"
              ? `Factura ${invoice.invoiceNumber ?? invoice.id} cancelada — ${reason}.`
              : `Factura ${invoiceNumber ?? invoice.id} actualizada.`
          },
          'user', ${userId}, ${actorName},
          jsonb_build_object('beforeStatus', ${invoice.status}, 'status', updated_invoice.status)
        FROM updated_invoice
      )
      SELECT id, status, invoice_number AS "invoiceNumber"
      FROM updated_invoice
    `);

    if (!result.rows[0]) {
      throw new ApiError(
        "La factura cambió mientras se procesaba la solicitud. Actualiza e inténtalo nuevamente.",
        409,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        action === "cancel"
          ? "La factura fue cancelada en el control de Datara."
          : "La factura fue actualizada correctamente.",
      data: result.rows[0],
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
