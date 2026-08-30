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

type RouteContext = { params: Promise<{ id: string }> };

type InvoicePayload = {
  salesOrderId?: unknown;
  status?: unknown;
  invoiceNumber?: unknown;
  invoiceDate?: unknown;
  amount?: unknown;
  currency?: unknown;
  documentReference?: unknown;
  externalSystem?: unknown;
  externalId?: unknown;
  externalReference?: unknown;
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

function getMoney(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100) / 100
    : undefined;
}

function getDate(value: unknown) {
  const normalized = getString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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

  console.error("No fue posible administrar las facturas de la operación:", error);
  return NextResponse.json(
    { success: false, error: "No fue posible administrar las facturas de la operación." },
    { status: 500 },
  );
}

async function getContext(permission: "view" | "create") {
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
      permission,
    ),
  ]);

  return { tenantId: tenant.id, userId, branchAccess };
}

async function getDeal(
  tenantId: string,
  dealId: string,
) {
  const result = await db.execute<{
    id: string;
    branchId: string | null;
    customerId: string | null;
    totalAmount: string;
    currency: string;
  }>(sql`
    SELECT id, branch_id AS "branchId", customer_id AS "customerId",
      total_amount AS "totalAmount", currency
    FROM crm_deals
    WHERE tenant_id = ${tenantId} AND id = ${dealId}
    LIMIT 1
  `);

  return result.rows[0];
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    const { tenantId, branchAccess } = await getContext("view");
    const deal = await getDeal(tenantId, dealId);

    if (!deal) {
      throw new ApiError("La oportunidad no existe.", 404);
    }

    if (!canAccessBranch(deal.branchId, branchAccess)) {
      throw new ApiError("No tienes acceso a esta oportunidad.", 403);
    }

    const [ordersResult, invoicesResult] = await Promise.all([
      db.execute<{
        id: string;
        reference: string;
        status: string;
        totalAmount: string;
        currency: string;
        createdAt: Date;
      }>(sql`
        SELECT id, reference, status, total_amount AS "totalAmount",
          currency, created_at AS "createdAt"
        FROM crm_sales_orders
        WHERE tenant_id = ${tenantId} AND deal_id = ${dealId}
        ORDER BY created_at DESC
      `),
      db.execute<{
        id: string;
        salesOrderId: string;
        salesOrderReference: string;
        status: string;
        invoiceNumber: string | null;
        invoiceDate: Date | null;
        amount: string;
        currency: string;
        documentReference: string | null;
        externalSystem: string | null;
        externalId: string | null;
        externalReference: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>(sql`
        SELECT invoice.id, invoice.sales_order_id AS "salesOrderId",
          sales_order.reference AS "salesOrderReference", invoice.status,
          invoice.invoice_number AS "invoiceNumber",
          invoice.invoice_date AS "invoiceDate", invoice.amount,
          invoice.currency, invoice.document_reference AS "documentReference",
          invoice.external_system AS "externalSystem",
          invoice.external_id AS "externalId",
          invoice.external_reference AS "externalReference",
          invoice.created_at AS "createdAt", invoice.updated_at AS "updatedAt"
        FROM sales_invoices AS invoice
        INNER JOIN crm_sales_orders AS sales_order
          ON sales_order.tenant_id = invoice.tenant_id
          AND sales_order.id = invoice.sales_order_id
        WHERE invoice.tenant_id = ${tenantId} AND invoice.deal_id = ${dealId}
        ORDER BY invoice.created_at DESC
      `),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        salesOrders: ordersResult.rows.map((order) => ({
          ...order,
          totalAmount: Number(order.totalAmount),
        })),
        invoices: invoicesResult.rows.map((invoice) => ({
          ...invoice,
          amount: Number(invoice.amount),
        })),
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    const payload = (await request.json()) as InvoicePayload;
    const { tenantId, userId, branchAccess } = await getContext("create");
    const deal = await getDeal(tenantId, dealId);

    if (!deal) {
      throw new ApiError("La oportunidad no existe.", 404);
    }

    if (!canAccessBranch(deal.branchId, branchAccess)) {
      throw new ApiError("No tienes acceso a esta oportunidad.", 403);
    }

    const salesOrderId = getString(payload.salesOrderId);

    if (!salesOrderId) {
      throw new ApiError("Selecciona la orden de venta relacionada.", 400);
    }

    const status = getString(payload.status) ?? "issued";

    if (!["pending", "requested", "issued"].includes(status)) {
      throw new ApiError("El estado inicial de la factura no es válido.", 400);
    }

    const invoiceNumber = getString(payload.invoiceNumber);
    const amount = getMoney(payload.amount);
    const invoiceDate = getDate(payload.invoiceDate);
    const currency = (getString(payload.currency) ?? deal.currency).toLowerCase();

    if (status === "issued" && !invoiceNumber) {
      throw new ApiError("Captura el folio de la factura emitida.", 400);
    }

    if (amount === undefined) {
      throw new ApiError("El monto de la factura no es válido.", 400);
    }

    if (invoiceDate === undefined || !/^[a-z]{3}$/.test(currency)) {
      throw new ApiError("La fecha o moneda de la factura no es válida.", 400);
    }

    const orderResult = await db.execute<{ id: string }>(sql`
      SELECT id FROM crm_sales_orders
      WHERE tenant_id = ${tenantId} AND deal_id = ${dealId}
        AND id = ${salesOrderId}
      LIMIT 1
    `);

    if (!orderResult.rows[0]) {
      throw new ApiError("La orden seleccionada no pertenece a esta oportunidad.", 400);
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
      WITH created_invoice AS (
        INSERT INTO sales_invoices (
          tenant_id, branch_id, sales_order_id, deal_id, customer_id,
          status, invoice_number, invoice_date, amount, currency,
          document_reference, external_system, external_id,
          external_reference, metadata
        ) VALUES (
          ${tenantId}, ${deal.branchId}, ${salesOrderId}, ${dealId},
          ${deal.customerId}, ${status}, ${invoiceNumber ?? null},
          ${invoiceDate}, ${amount}, ${currency},
          ${getString(payload.documentReference) ?? null},
          ${getString(payload.externalSystem) ?? null},
          ${getString(payload.externalId) ?? null},
          ${getString(payload.externalReference) ?? null},
          jsonb_build_object('source', 'external_control')
        )
        RETURNING id, status, invoice_number
      ), created_event AS (
        INSERT INTO commercial_operation_events (
          tenant_id, deal_id, event_type, entity_type, entity_id,
          summary, source, actor_clerk_user_id, actor_name, payload
        )
        SELECT ${tenantId}, ${dealId}, 'invoice_registered', 'sales_invoice',
          created_invoice.id::text,
          CONCAT('Factura externa ', COALESCE(created_invoice.invoice_number, 'pendiente'), ' registrada.'),
          'user', ${userId}, ${actorName},
          jsonb_build_object('status', created_invoice.status, 'amount', ${amount})
        FROM created_invoice
      )
      SELECT id, status, invoice_number AS "invoiceNumber"
      FROM created_invoice
    `);

    return NextResponse.json(
      {
        success: true,
        message: "La factura externa fue registrada correctamente.",
        data: result.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
