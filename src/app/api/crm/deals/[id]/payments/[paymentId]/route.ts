import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";

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

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params:
    Promise<{
      id: string;
      paymentId: string;
    }>;
};

type CancellationPayload = {
  action?: unknown;
  reason?: unknown;
};

type PaymentAccessRow = {
  id: string;
  dealId: string;
  branchId: string | null;
  status: string;
  amount: string;
  currency: string;
  activeReservationCount: number;
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

function getString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function canAccessBranch(
  branchId: string | null,
  branchAccess: CRMBranchAccessContext,
) {
  return (
    branchAccess.allBranches ||
    (
      Boolean(branchId) &&
      branchAccess.branchIds.includes(
        branchId as string,
      )
    )
  );
}

async function getContext() {
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

  const tenantResult =
    await db.execute<{
      id: string;
    }>(sql`
      SELECT id
      FROM tenants
      WHERE clerk_organization_id = ${orgId}
      LIMIT 1
    `);

  const tenantId =
    tenantResult.rows[0]?.id;

  if (!tenantId) {
    throw new ApiError(
      "La empresa aún no está sincronizada.",
      404,
    );
  }

  await requireCRMIndustryCapability(

    tenantId,

    "motorcycle_commercial_cycle",

  );


  const [branchAccess] =
    await Promise.all([
      getCRMBranchAccess(
        tenantId,
        userId,
      ),

      requireCRMModulePermission(
        tenantId,
        userId,
        "deals",
        "edit",
      ),
    ]);

  return {
    tenantId,
    userId,
    branchAccess,
  };
}

async function getPaymentAccess(
  tenantId: string,
  dealId: string,
  paymentId: string,
) {
  const result =
    await db.execute<PaymentAccessRow>(sql`
      SELECT
        payment.id,
        payment.deal_id AS "dealId",
        payment.branch_id AS "branchId",
        payment.status,
        payment.amount,
        payment.currency,
        COUNT(reservation.id)::integer AS "activeReservationCount"
      FROM commercial_payments AS payment
      LEFT JOIN inventory_unit_reservation_payments AS link
        ON link.tenant_id = payment.tenant_id
        AND link.payment_id = payment.id
      LEFT JOIN inventory_unit_reservations AS reservation
        ON reservation.tenant_id = payment.tenant_id
        AND reservation.id = link.reservation_id
        AND reservation.status = 'active'
      WHERE
        payment.tenant_id = ${tenantId}
        AND payment.deal_id = ${dealId}
        AND payment.id = ${paymentId}
      GROUP BY payment.id
      LIMIT 1
    `);

  return result.rows[0];
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
    error instanceof CRMIndustryCapabilityError ||
    error instanceof CRMPermissionError
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
    "No fue posible cancelar el pago:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible cancelar el pago.",
    },
    {
      status: 500,
    },
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const {
      id: dealId,
      paymentId,
    } = await context.params;

    const payload =
      (await request.json()) as
        CancellationPayload;

    if (
      getString(payload.action) !==
      "cancel"
    ) {
      throw new ApiError(
        "La acción solicitada no es válida.",
        400,
      );
    }

    const reason =
      getString(payload.reason);

    if (!reason) {
      throw new ApiError(
        "Indica el motivo de cancelación.",
        400,
      );
    }

    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext();

    const payment =
      await getPaymentAccess(
        tenantId,
        dealId,
        paymentId,
      );

    if (!payment) {
      throw new ApiError(
        "El pago no existe.",
        404,
      );
    }

    if (!canAccessBranch(
      payment.branchId,
      branchAccess,
    )) {
      throw new ApiError(
        "No tienes acceso a este pago.",
        403,
      );
    }

    if (payment.status !== "received") {
      throw new ApiError(
        "Solamente pueden cancelarse pagos recibidos.",
        409,
      );
    }

    if (
      payment.activeReservationCount > 0
    ) {
      throw new ApiError(
        "Este pago sostiene un apartado activo. Libera primero la unidad antes de cancelar el pago.",
        409,
      );
    }

    const user =
      await currentUser();

    const actorName =
      [
        user?.firstName,
        user?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      user?.emailAddresses[0]
        ?.emailAddress ||
      "Usuario";

    const result =
      await db.execute<{
        id: string;
        status: string;
        cancelledAt: Date;
      }>(sql`
        WITH cancelled_payment AS (
          UPDATE commercial_payments AS payment
          SET
            status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = ${reason},
            updated_at = NOW()
          WHERE
            payment.tenant_id = ${tenantId}
            AND payment.deal_id = ${dealId}
            AND payment.id = ${paymentId}
            AND payment.status = 'received'
            AND NOT EXISTS (
              SELECT 1
              FROM inventory_unit_reservation_payments AS link
              INNER JOIN inventory_unit_reservations AS reservation
                ON reservation.tenant_id = link.tenant_id
                AND reservation.id = link.reservation_id
              WHERE
                link.tenant_id = payment.tenant_id
                AND link.payment_id = payment.id
                AND reservation.status = 'active'
            )
          RETURNING *
        ),
        created_event AS (
          INSERT INTO commercial_operation_events (
            tenant_id,
            deal_id,
            event_type,
            entity_type,
            entity_id,
            summary,
            source,
            actor_clerk_user_id,
            actor_name,
            idempotency_key,
            payload,
            occurred_at,
            created_at
          )
          SELECT
            ${tenantId},
            ${dealId},
            'commercial_payment_cancelled',
            'commercial_payment',
            payment.id::text,
            CONCAT(
              'Pago cancelado: ',
              payment.amount,
              ' ',
              UPPER(payment.currency),
              ' — ',
              ${reason}
            ),
            'user',
            ${userId},
            ${actorName},
            CONCAT(
              'commercial-payment-cancelled:',
              payment.id::text
            ),
            jsonb_build_object(
              'paymentId', payment.id,
              'amount', payment.amount,
              'currency', payment.currency,
              'reason', ${reason}
            ),
            NOW(),
            NOW()
          FROM cancelled_payment AS payment
          RETURNING id
        )
        SELECT
          payment.id,
          payment.status,
          payment.cancelled_at AS "cancelledAt"
        FROM cancelled_payment AS payment
        WHERE EXISTS (
          SELECT 1
          FROM created_event
        )
      `);

    const cancelledPayment =
      result.rows[0];

    if (!cancelledPayment) {
      throw new ApiError(
        "El pago cambió o quedó relacionado con un apartado activo. Actualiza e inténtalo nuevamente.",
        409,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "El pago fue cancelado correctamente.",
      data: cancelledPayment,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
