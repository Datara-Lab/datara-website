import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { permissionModules } from "@/lib/administration/permission-modules";
import { getCRMBranchAccess } from "@/lib/crm/branch-access";
import { hasCRMModuleEntitlement } from "@/lib/crm/module-entitlements";
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
  if (error instanceof ApiError || error instanceof CRMPermissionError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error("No fue posible consultar las facturas:", error);
  return NextResponse.json(
    { success: false, error: "No fue posible consultar las facturas." },
    { status: 500 },
  );
}

export async function GET() {
  try {
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
        "view",
      ),
    ]);

    const availableModuleIds = permissionModules
      .filter((module) => module.product === "crm")
      .map((module) => module.id);

    const [result, ordersResult, cfdiStampingEnabled] = await Promise.all([
      db.execute<{
        id: string;
        branchId: string | null;
        branchName: string | null;
        dealId: string | null;
        dealName: string | null;
        customerName: string | null;
        salesOrderId: string;
        salesOrderReference: string;
        status: string;
        invoiceNumber: string | null;
        invoiceDate: Date | null;
        amount: string;
        currency: string;
        documentReference: string | null;
        externalSystem: string | null;
        externalReference: string | null;
        series: string | null;
        folio: string | null;
        paymentForm: string | null;
        paymentMethod: string | null;
        fiscalProvider: string | null;
        fiscalEnvironment: string | null;
        fiscalUuid: string | null;
        stampedAt: Date | null;
        cancellationReasonCode: string | null;
        replacementUuid: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>(sql`
        SELECT
          invoice.id,
          invoice.branch_id AS "branchId",
          branch.name AS "branchName",
          invoice.deal_id AS "dealId",
          deal.name AS "dealName",
          COALESCE(
            NULLIF(customer.company_name, ''),
            NULLIF(TRIM(CONCAT_WS(' ', customer.name, customer.last_name)), '')
          ) AS "customerName",
          invoice.sales_order_id AS "salesOrderId",
          sales_order.reference AS "salesOrderReference",
          invoice.status,
          invoice.invoice_number AS "invoiceNumber",
          invoice.invoice_date AS "invoiceDate",
          invoice.amount,
          invoice.currency,
          invoice.document_reference AS "documentReference",
          invoice.external_system AS "externalSystem",
          invoice.external_reference AS "externalReference",
          invoice.series,
          invoice.folio,
          invoice.payment_form AS "paymentForm",
          invoice.payment_method AS "paymentMethod",
          invoice.fiscal_provider AS "fiscalProvider",
          invoice.fiscal_environment AS "fiscalEnvironment",
          invoice.fiscal_uuid AS "fiscalUuid",
          invoice.stamped_at AS "stampedAt",
          invoice.cancellation_reason_code AS "cancellationReasonCode",
          invoice.replacement_uuid AS "replacementUuid",
          invoice.created_at AS "createdAt",
          invoice.updated_at AS "updatedAt"
        FROM sales_invoices AS invoice
        INNER JOIN crm_sales_orders AS sales_order
          ON sales_order.tenant_id = invoice.tenant_id
          AND sales_order.id = invoice.sales_order_id
        LEFT JOIN crm_deals AS deal
          ON deal.tenant_id = invoice.tenant_id
          AND deal.id = invoice.deal_id
        LEFT JOIN crm_customers AS customer
          ON customer.tenant_id = invoice.tenant_id
          AND customer.id = invoice.customer_id
        LEFT JOIN tenant_branches AS branch
          ON branch.tenant_id = invoice.tenant_id
          AND branch.id = invoice.branch_id
        WHERE invoice.tenant_id = ${tenant.id}
        ORDER BY COALESCE(invoice.invoice_date, invoice.created_at) DESC
        LIMIT 500
      `),
      db.execute<{
        id: string;
        branchId: string | null;
        dealId: string;
        dealName: string;
        customerName: string | null;
        reference: string;
        totalAmount: string;
        currency: string;
        status: string;
        createdAt: Date;
      }>(sql`
        SELECT
          sales_order.id,
          sales_order.branch_id AS "branchId",
          sales_order.deal_id AS "dealId",
          deal.name AS "dealName",
          COALESCE(
            NULLIF(customer.company_name, ''),
            NULLIF(TRIM(CONCAT_WS(' ', customer.name, customer.last_name)), '')
          ) AS "customerName",
          sales_order.reference,
          sales_order.total_amount AS "totalAmount",
          sales_order.currency,
          sales_order.status,
          sales_order.created_at AS "createdAt"
        FROM crm_sales_orders AS sales_order
        INNER JOIN crm_deals AS deal
          ON deal.tenant_id = sales_order.tenant_id
          AND deal.id = sales_order.deal_id
        LEFT JOIN crm_customers AS customer
          ON customer.tenant_id = sales_order.tenant_id
          AND customer.id = sales_order.customer_id
        WHERE sales_order.tenant_id = ${tenant.id}
        ORDER BY sales_order.created_at DESC
        LIMIT 500
      `),
      hasCRMModuleEntitlement(
        tenant.id,
        "cfdi-stamping",
        availableModuleIds,
      ),
    ]);

    const invoices = result.rows
      .filter(
        (invoice) =>
          branchAccess.allBranches ||
          (invoice.branchId !== null &&
            branchAccess.branchIds.includes(invoice.branchId)),
      )
      .map((invoice) => ({
        ...invoice,
        amount: Number(invoice.amount),
      }));

    const salesOrders = ordersResult.rows
      .filter(
        (order) =>
          branchAccess.allBranches ||
          (order.branchId !== null &&
            branchAccess.branchIds.includes(order.branchId)),
      )
      .map((order) => ({
        ...order,
        totalAmount: Number(order.totalAmount),
      }));

    const totals = invoices.reduce(
      (summary, invoice) => {
        summary.total += invoice.amount;
        summary.byStatus[invoice.status] =
          (summary.byStatus[invoice.status] ?? 0) + 1;
        return summary;
      },
      {
        count: invoices.length,
        total: 0,
        byStatus: {} as Record<string, number>,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        invoices,
        salesOrders,
        summary: totals,
        capabilities: {
          invoiceControl: true,
          cfdiStamping: cfdiStampingEnabled,
        },
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
