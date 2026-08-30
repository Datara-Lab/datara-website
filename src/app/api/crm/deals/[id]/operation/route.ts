import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import {
  getCRMBranchAccess,
  type CRMBranchAccessContext,
} from "@/lib/crm/branch-access";
import {
  CRMIndustryCapabilityError,
  requireCRMIndustryCapability,
} from "@/lib/crm/industry-capabilities";
import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function canAccessBranch(
  branchId: string | null,
  branchAccess: CRMBranchAccessContext,
) {
  return branchAccess.allBranches ||
    (branchId !== null && branchAccess.branchIds.includes(branchId));
}

function createErrorResponse(error: unknown) {
  if (
    error instanceof ApiError ||
    error instanceof CRMIndustryCapabilityError ||
    error instanceof CRMPermissionError
  ) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  console.error(
    "No fue posible consultar el ciclo comercial de la oportunidad:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error: "No fue posible consultar el ciclo comercial de la oportunidad.",
    },
    { status: 500 },
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id: dealId } = await context.params;
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

    await requireCRMIndustryCapability(
      tenant.id,
      "motorcycle_commercial_cycle",
    );

    const [branchAccess] = await Promise.all([
      getCRMBranchAccess(tenant.id, userId),
      requireCRMModulePermission(tenant.id, userId, "deals", "view"),
    ]);

    const dealResult = await db.execute<{
      id: string;
      name: string;
      branchId: string | null;
      customerName: string | null;
      operationType: string;
      status: string;
      stage: string | null;
      totalAmount: string;
      currency: string;
    }>(sql`
      SELECT
        deal.id,
        deal.name,
        deal.branch_id AS "branchId",
        COALESCE(
          NULLIF(customer.company_name, ''),
          NULLIF(TRIM(CONCAT_WS(' ', customer.name, customer.last_name)), '')
        ) AS "customerName",
        deal.operation_type AS "operationType",
        deal.status,
        deal.stage,
        deal.total_amount AS "totalAmount",
        deal.currency
      FROM crm_deals AS deal
      LEFT JOIN crm_customers AS customer
        ON customer.tenant_id = deal.tenant_id
        AND customer.id = deal.customer_id
      WHERE deal.tenant_id = ${tenant.id}
        AND deal.id = ${dealId}
      LIMIT 1
    `);

    const deal = dealResult.rows[0];

    if (!deal) {
      throw new ApiError("La oportunidad no existe.", 404);
    }

    if (!canAccessBranch(deal.branchId, branchAccess)) {
      throw new ApiError("No tienes acceso a esta oportunidad.", 403);
    }

    const [paymentsResult, financingResult, reservationsResult, eventsResult] =
      await Promise.all([
        db.execute<{
          id: string;
          paymentType: string;
          status: string;
          amount: string;
          currency: string;
          paymentMethod: string | null;
          reference: string | null;
          receivedAt: Date;
        }>(sql`
          SELECT id, payment_type AS "paymentType", status, amount, currency,
            payment_method AS "paymentMethod", reference,
            received_at AS "receivedAt"
          FROM commercial_payments
          WHERE tenant_id = ${tenant.id} AND deal_id = ${dealId}
          ORDER BY received_at DESC
        `),
        db.execute<{
          id: string;
          providerName: string;
          productName: string | null;
          folio: string | null;
          status: string;
          requiredDownPaymentAmount: string;
          requestedAmount: string;
          approvedAmount: string | null;
          termMonths: number | null;
          monthlyPayment: string | null;
          updatedAt: Date;
        }>(sql`
          SELECT application.id, provider.name AS "providerName",
            product.name AS "productName", application.folio,
            application.status,
            application.required_down_payment_amount AS "requiredDownPaymentAmount",
            application.requested_amount AS "requestedAmount",
            application.approved_amount AS "approvedAmount",
            application.term_months AS "termMonths",
            application.monthly_payment AS "monthlyPayment",
            application.updated_at AS "updatedAt"
          FROM financing_applications AS application
          INNER JOIN financing_providers AS provider
            ON provider.tenant_id = application.tenant_id
            AND provider.id = application.provider_id
          LEFT JOIN financing_products AS product
            ON product.tenant_id = application.tenant_id
            AND product.id = application.product_id
          WHERE application.tenant_id = ${tenant.id}
            AND application.deal_id = ${dealId}
          ORDER BY application.created_at DESC
        `),
        db.execute<{
          id: string;
          status: string;
          inventoryUnitId: string;
          vin: string | null;
          serialNumber: string | null;
          productName: string;
          requiredDownPaymentAmount: string;
          eligiblePaymentAmount: string;
          reservedByName: string | null;
          reservedAt: Date;
          releasedAt: Date | null;
        }>(sql`
          SELECT reservation.id, reservation.status,
            reservation.inventory_unit_id AS "inventoryUnitId",
            unit.vin, unit.serial_number AS "serialNumber",
            product.name AS "productName",
            reservation.required_down_payment_amount AS "requiredDownPaymentAmount",
            reservation.eligible_payment_amount AS "eligiblePaymentAmount",
            reservation.reserved_by_name AS "reservedByName",
            reservation.reserved_at AS "reservedAt",
            reservation.released_at AS "releasedAt"
          FROM inventory_unit_reservations AS reservation
          INNER JOIN inventory_units AS unit
            ON unit.tenant_id = reservation.tenant_id
            AND unit.id = reservation.inventory_unit_id
          INNER JOIN crm_products AS product
            ON product.tenant_id = unit.tenant_id
            AND product.id = unit.product_id
          WHERE reservation.tenant_id = ${tenant.id}
            AND reservation.deal_id = ${dealId}
          ORDER BY reservation.reserved_at DESC
        `),
        db.execute<{
          id: string;
          eventType: string;
          entityType: string;
          entityId: string;
          summary: string;
          actorName: string | null;
          occurredAt: Date;
        }>(sql`
          SELECT id, event_type AS "eventType", entity_type AS "entityType",
            entity_id AS "entityId", summary,
            actor_name AS "actorName", occurred_at AS "occurredAt"
          FROM commercial_operation_events
          WHERE tenant_id = ${tenant.id} AND deal_id = ${dealId}
          ORDER BY occurred_at DESC, created_at DESC
          LIMIT 100
        `),
      ]);

    const receivedAmount = paymentsResult.rows.reduce(
      (total, payment) =>
        payment.status === "received" &&
        (payment.paymentType === "down_payment" ||
          payment.paymentType === "payment")
          ? total + Number(payment.amount)
          : total,
      0,
    );

    const activeReservation =
      reservationsResult.rows.find((reservation) => reservation.status === "active") ??
      null;
    const latestFinancing = financingResult.rows[0] ?? null;
    const requiredDownPayment = activeReservation
      ? Number(activeReservation.requiredDownPaymentAmount)
      : latestFinancing
        ? Number(latestFinancing.requiredDownPaymentAmount)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        deal: {
          ...deal,
          totalAmount: Number(deal.totalAmount),
        },
        summary: {
          receivedAmount: Math.round(receivedAmount * 100) / 100,
          requiredDownPayment,
          downPaymentCovered:
            requiredDownPayment > 0 && receivedAmount >= requiredDownPayment,
          hasActiveReservation: Boolean(activeReservation),
        },
        payments: paymentsResult.rows.map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
        })),
        financingApplications: financingResult.rows.map((application) => ({
          ...application,
          requiredDownPaymentAmount: Number(application.requiredDownPaymentAmount),
          requestedAmount: Number(application.requestedAmount),
          approvedAmount:
            application.approvedAmount === null ? null : Number(application.approvedAmount),
          monthlyPayment:
            application.monthlyPayment === null ? null : Number(application.monthlyPayment),
        })),
        reservations: reservationsResult.rows.map((reservation) => ({
          ...reservation,
          requiredDownPaymentAmount: Number(reservation.requiredDownPaymentAmount),
          eligiblePaymentAmount: Number(reservation.eligiblePaymentAmount),
        })),
        events: eventsResult.rows,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
