import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { getCRMBranchAccess } from "@/lib/crm/branch-access";
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

type OperationRow = {
  id: string;
  name: string;
  branchId: string | null;
  branchName: string | null;
  leadName: string | null;
  customerName: string | null;
  ownerName: string | null;
  dealStage: string;
  dealStatus: string;
  totalAmount: string;
  currency: string;
  updatedAt: Date;
  quoteCount: number;
  financingCount: number;
  approvedFinancingCount: number;
  receivedPaymentCount: number;
  activeReservationCount: number;
  salesOrderCount: number;
  invoiceCount: number;
  issuedInvoiceCount: number;
  deliveryCount: number;
  milestoneOverride: string | null;
  kanbanPosition: number | null;
};

function createErrorResponse(error: unknown) {
  if (error instanceof ApiError || error instanceof CRMPermissionError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error("No fue posible consultar las operaciones comerciales:", error);
  return NextResponse.json(
    { success: false, error: "No fue posible consultar las operaciones comerciales." },
    { status: 500 },
  );
}

const validMilestones = new Set([
  "opportunity",
  "quote",
  "payment_financing",
  "reservation",
  "sales_order",
  "invoice",
  "delivery",
]);

function resolveMilestone(row: OperationRow) {
  if (row.milestoneOverride && validMilestones.has(row.milestoneOverride)) {
    return row.milestoneOverride;
  }
  if (row.deliveryCount > 0) return "delivery";
  if (row.issuedInvoiceCount > 0 || row.invoiceCount > 0) return "invoice";
  if (row.salesOrderCount > 0) return "sales_order";
  if (row.activeReservationCount > 0) return "reservation";
  if (row.receivedPaymentCount > 0 || row.approvedFinancingCount > 0) return "payment_financing";
  if (row.quoteCount > 0) return "quote";
  return "opportunity";
}

export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId) throw new ApiError("No autenticado.", 401);
    if (!orgId) throw new ApiError("No hay una organización activa.", 400);

    const [tenant] = await db
      .select({ id: tenants.id, industry: tenants.industry })
      .from(tenants)
      .where(eq(tenants.clerkOrganizationId, orgId))
      .limit(1);

    if (!tenant) throw new ApiError("La empresa aún no está sincronizada.", 404);

    const [branchAccess] = await Promise.all([
      getCRMBranchAccess(tenant.id, userId),
      requireCRMModulePermission(tenant.id, userId, "deals", "view"),
    ]);

    const branchFilter = branchAccess.allBranches
      ? sql``
      : branchAccess.branchIds.length > 0
        ? sql`AND deal.branch_id IN (${sql.join(
            branchAccess.branchIds.map((branchId) => sql`${branchId}`),
            sql`, `,
          )})`
        : sql`AND FALSE`;

    const result = await db.execute<OperationRow>(sql`
      SELECT
        deal.id,
        deal.name,
        deal.branch_id AS "branchId",
        branch.name AS "branchName",
        NULLIF(TRIM(CONCAT_WS(' ', lead.first_name, lead.last_name)), '') AS "leadName",
        COALESCE(
          NULLIF(customer.company_name, ''),
          NULLIF(TRIM(CONCAT_WS(' ', customer.name, customer.last_name)), '')
        ) AS "customerName",
        deal.owner_name AS "ownerName",
        deal.stage AS "dealStage",
        deal.status AS "dealStatus",
        deal.total_amount AS "totalAmount",
        deal.currency,
        deal.updated_at AS "updatedAt",
        deal.metadata ->> 'commercialMilestoneOverride' AS "milestoneOverride",
        CASE
          WHEN (deal.metadata ->> 'commercialKanbanPosition') ~ '^[0-9]+$'
          THEN (deal.metadata ->> 'commercialKanbanPosition')::int
          ELSE NULL
        END AS "kanbanPosition",
        (SELECT COUNT(*)::int FROM crm_quotes quote
          WHERE quote.tenant_id = deal.tenant_id AND quote.deal_id = deal.id) AS "quoteCount",
        (SELECT COUNT(*)::int FROM financing_applications financing
          WHERE financing.tenant_id = deal.tenant_id AND financing.deal_id = deal.id) AS "financingCount",
        (SELECT COUNT(*)::int FROM financing_applications financing
          WHERE financing.tenant_id = deal.tenant_id AND financing.deal_id = deal.id
            AND financing.status = 'approved') AS "approvedFinancingCount",
        (SELECT COUNT(*)::int FROM commercial_payments payment
          WHERE payment.tenant_id = deal.tenant_id AND payment.deal_id = deal.id
            AND payment.status = 'received') AS "receivedPaymentCount",
        (SELECT COUNT(*)::int FROM inventory_unit_reservations reservation
          WHERE reservation.tenant_id = deal.tenant_id AND reservation.deal_id = deal.id
            AND reservation.status = 'active') AS "activeReservationCount",
        (SELECT COUNT(*)::int FROM crm_sales_orders sales_order
          WHERE sales_order.tenant_id = deal.tenant_id AND sales_order.deal_id = deal.id) AS "salesOrderCount",
        (SELECT COUNT(*)::int FROM sales_invoices invoice
          WHERE invoice.tenant_id = deal.tenant_id AND invoice.deal_id = deal.id) AS "invoiceCount",
        (SELECT COUNT(*)::int FROM sales_invoices invoice
          WHERE invoice.tenant_id = deal.tenant_id AND invoice.deal_id = deal.id
            AND invoice.status = 'issued') AS "issuedInvoiceCount",
        (SELECT COUNT(*)::int FROM commercial_operation_events event
          WHERE event.tenant_id = deal.tenant_id AND event.deal_id = deal.id
            AND event.event_type IN ('unit_delivered', 'delivery_confirmed')) AS "deliveryCount"
      FROM crm_deals deal
      LEFT JOIN tenant_branches branch
        ON branch.tenant_id = deal.tenant_id AND branch.id = deal.branch_id
      LEFT JOIN crm_leads lead
        ON lead.tenant_id = deal.tenant_id AND lead.id = deal.source_lead_id
      LEFT JOIN crm_customers customer
        ON customer.tenant_id = deal.tenant_id AND customer.id = deal.customer_id
      WHERE deal.tenant_id = ${tenant.id}
      ${branchFilter}
      ORDER BY deal.updated_at DESC
    `);

    const operations = result.rows.map((row) => ({
      ...row,
      totalAmount: Number(row.totalAmount),
      milestone: resolveMilestone(row),
    }));

    return NextResponse.json({
      success: true,
      data: {
        operations,
        total: operations.length,
        industry: tenant.industry,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { updates?: unknown };
    if (!Array.isArray(body.updates) || body.updates.length === 0 || body.updates.length > 500) {
      throw new ApiError("La actualización del Kanban no es válida.", 400);
    }
    const updates = body.updates.map((value) => {
      const item = value as Record<string, unknown>;
      const operationId = typeof item.operationId === "string" ? item.operationId.trim() : "";
      const milestone = typeof item.milestone === "string" ? item.milestone.trim() : "";
      const position = typeof item.position === "number" ? Math.trunc(item.position) : NaN;
      if (!operationId || !validMilestones.has(milestone) || !Number.isFinite(position) || position < 0) {
        throw new ApiError("Una operación contiene una etapa o posición inválida.", 400);
      }
      return { operationId, milestone, position };
    });

    const { userId, orgId } = await auth();
    if (!userId) throw new ApiError("No autenticado.", 401);
    if (!orgId) throw new ApiError("No hay una organización activa.", 400);

    const [tenant] = await db
      .select({ id: tenants.id, industry: tenants.industry })
      .from(tenants)
      .where(eq(tenants.clerkOrganizationId, orgId))
      .limit(1);
    if (!tenant) throw new ApiError("La empresa aún no está sincronizada.", 404);

    const [branchAccess] = await Promise.all([
      getCRMBranchAccess(tenant.id, userId),
      requireCRMModulePermission(tenant.id, userId, "deals", "edit"),
    ]);
    const branchFilter = branchAccess.allBranches
      ? sql``
      : branchAccess.branchIds.length > 0
        ? sql`AND deal.branch_id IN (${sql.join(
            branchAccess.branchIds.map((branchId) => sql`${branchId}`),
            sql`, `,
          )})`
        : sql`AND FALSE`;

    const serializedUpdates = JSON.stringify(updates);
    const result = await db.execute<{ id: string }>(sql`
      WITH requested AS (
        SELECT *
        FROM jsonb_to_recordset(${serializedUpdates}::jsonb)
          AS item("operationId" text, milestone text, position int)
      ), eligible AS (
        SELECT
          deal.id,
          deal.metadata ->> 'commercialMilestoneOverride' AS "previousMilestone",
          requested.milestone,
          requested.position
        FROM crm_deals AS deal
        INNER JOIN requested
          ON requested."operationId"::uuid = deal.id
        WHERE deal.tenant_id = ${tenant.id}
          ${branchFilter}
      ), updated AS (
        UPDATE crm_deals AS deal
        SET metadata = jsonb_set(
          jsonb_set(
            COALESCE(deal.metadata, '{}'::jsonb),
            '{commercialMilestoneOverride}',
            to_jsonb(eligible.milestone),
            true
          ),
          '{commercialKanbanPosition}',
          to_jsonb(eligible.position),
          true
        ), updated_at = NOW()
        FROM eligible
        WHERE deal.id = eligible.id
        RETURNING deal.id
      ), recorded_events AS (
        INSERT INTO commercial_operation_events (
          tenant_id,
          deal_id,
          event_type,
          entity_type,
          entity_id,
          summary,
          source,
          actor_clerk_user_id,
          payload,
          occurred_at,
          created_at
        )
        SELECT
          ${tenant.id},
          eligible.id,
          'commercial_milestone_changed',
          'deal',
          eligible.id::text,
          CONCAT(
            'Etapa comercial actualizada',
            CASE
              WHEN eligible."previousMilestone" IS NULL THEN ''
              ELSE CONCAT(' de ', eligible."previousMilestone")
            END,
            ' a ', eligible.milestone
          ),
          'user',
          ${userId},
          jsonb_build_object(
            'previousMilestone', eligible."previousMilestone",
            'milestone', eligible.milestone,
            'position', eligible.position
          ),
          NOW(),
          NOW()
        FROM eligible
        WHERE eligible."previousMilestone" IS DISTINCT FROM eligible.milestone
        RETURNING id
      )
      SELECT id FROM updated
    `);

    if (result.rows.length !== updates.length) {
      throw new ApiError("Una o más operaciones no existen o no están disponibles.", 404);
    }

    return NextResponse.json({
      success: true,
      data: { updated: result.rows.length },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
