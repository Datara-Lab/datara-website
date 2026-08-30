import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

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
    }>;
};

type PaymentPayload = {
  amount?: unknown;
  paymentType?: unknown;
  currency?: unknown;
  paymentMethod?: unknown;
  reference?: unknown;
  receivedAt?: unknown;
  quoteId?: unknown;
  salesOrderId?: unknown;
  financingApplicationId?: unknown;
};

type DealAccessRow = {
  id: string;
  branchId: string | null;
  customerId: string | null;
};

type PaymentRow = {
  id: string;
  branchId: string | null;
  paymentType: string;
  status: string;
  amount: string;
  currency: string;
  paymentMethod: string | null;
  reference: string | null;
  receivedAt: Date;
  receivedByClerkUserId: string;
  createdAt: Date;
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

function getAmount(
  value: unknown,
): number | undefined {
  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed > 0
    ? Math.round(parsed * 100) / 100
    : undefined;
}

function getDate(
  value: unknown,
): Date {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return new Date();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(
      "La fecha de recepción no es válida.",
      400,
    );
  }

  return parsed;
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

async function getContext(
  permission:
    | "view"
    | "create"
    | "edit",
) {
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
        permission,
      ),
    ]);

  return {
    tenantId,
    userId,
    branchAccess,
  };
}

async function getDealAccess(
  tenantId: string,
  dealId: string,
) {
  const result =
    await db.execute<DealAccessRow>(sql`
      SELECT
        id,
        branch_id AS "branchId",
        customer_id AS "customerId"
      FROM crm_deals
      WHERE
        tenant_id = ${tenantId}
        AND id = ${dealId}
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

  const databaseError = error as {
    code?: string;
    cause?: {
      code?: string;
    };
  };

  if (
    databaseError.code === "23505" ||
    databaseError.cause?.code === "23505"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe un pago con esa referencia externa.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(
    "No fue posible procesar los pagos de la operación:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar los pagos de la operación.",
    },
    {
      status: 500,
    },
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const {
      id: dealId,
    } = await context.params;

    const {
      tenantId,
      branchAccess,
    } = await getContext(
      "view",
    );

    const deal =
      await getDealAccess(
        tenantId,
        dealId,
      );

    if (!deal) {
      throw new ApiError(
        "La oportunidad no existe.",
        404,
      );
    }

    if (!canAccessBranch(
      deal.branchId,
      branchAccess,
    )) {
      throw new ApiError(
        "No tienes acceso a esta oportunidad.",
        403,
      );
    }

    const result =
      await db.execute<PaymentRow>(sql`
        SELECT
          payment.id,
          payment.branch_id AS "branchId",
          payment.payment_type AS "paymentType",
          payment.status,
          payment.amount,
          payment.currency,
          payment.payment_method AS "paymentMethod",
          payment.reference,
          payment.received_at AS "receivedAt",
          payment.received_by_clerk_user_id AS "receivedByClerkUserId",
          payment.created_at AS "createdAt"
        FROM commercial_payments AS payment
        WHERE
          payment.tenant_id = ${tenantId}
          AND payment.deal_id = ${dealId}
        ORDER BY
          payment.received_at DESC,
          payment.created_at DESC
      `);

    const payments =
      result.rows;

    const receivedAmount =
      payments.reduce(
        (total, payment) =>
          payment.status === "received" &&
          (
            payment.paymentType ===
              "down_payment" ||
            payment.paymentType ===
              "payment"
          )
            ? total +
              Number(payment.amount)
            : total,
        0,
      );

    return NextResponse.json({
      success: true,
      data: {
        payments,
        summary: {
          receivedAmount:
            Math.round(
              receivedAmount * 100,
            ) / 100,
          paymentCount:
            payments.length,
        },
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const {
      id: dealId,
    } = await context.params;

    const payload =
      (await request.json()) as
        PaymentPayload;

    const amount =
      getAmount(payload.amount);

    if (amount === undefined) {
      throw new ApiError(
        "El monto debe ser mayor que cero.",
        400,
      );
    }

    const paymentType =
      getString(
        payload.paymentType,
      ) ?? "down_payment";

    if (
      paymentType !==
        "down_payment" &&
      paymentType !== "payment"
    ) {
      throw new ApiError(
        "El tipo de pago no es válido.",
        400,
      );
    }

    const currency =
      (
        getString(payload.currency) ??
        "mxn"
      ).toLowerCase();

    if (!/^[a-z]{3}$/.test(currency)) {
      throw new ApiError(
        "La moneda no es válida.",
        400,
      );
    }

    const receivedAt =
      getDate(payload.receivedAt);

    const paymentMethod =
      getString(
        payload.paymentMethod,
      );

    const reference =
      getString(payload.reference);

    const quoteId =
      getString(payload.quoteId);

    const salesOrderId =
      getString(
        payload.salesOrderId,
      );

    const financingApplicationId =
      getString(
        payload.financingApplicationId,
      );

    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext(
      "edit",
    );

    const deal =
      await getDealAccess(
        tenantId,
        dealId,
      );

    if (!deal) {
      throw new ApiError(
        "La oportunidad no existe.",
        404,
      );
    }

    if (!canAccessBranch(
      deal.branchId,
      branchAccess,
    )) {
      throw new ApiError(
        "No tienes acceso a esta oportunidad.",
        403,
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
        amount: string;
        paymentType: string;
        status: string;
        receivedAt: Date;
      }>(sql`
        WITH selected_deal AS MATERIALIZED (
          SELECT
            deal.id,
            deal.branch_id,
            deal.customer_id
          FROM crm_deals AS deal
          WHERE
            deal.tenant_id = ${tenantId}
            AND deal.id = ${dealId}
          FOR UPDATE
        ),
        valid_references AS (
          SELECT deal.*
          FROM selected_deal AS deal
          WHERE
            (
              ${quoteId ?? null}::uuid IS NULL OR
              EXISTS (
                SELECT 1
                FROM crm_quotes AS quote
                WHERE
                  quote.tenant_id = ${tenantId}
                  AND quote.id = ${quoteId ?? null}
                  AND quote.deal_id = deal.id
              )
            )
            AND (
              ${salesOrderId ?? null}::uuid IS NULL OR
              EXISTS (
                SELECT 1
                FROM crm_sales_orders AS sales_order
                WHERE
                  sales_order.tenant_id = ${tenantId}
                  AND sales_order.id = ${salesOrderId ?? null}
                  AND sales_order.deal_id = deal.id
              )
            )
            AND (
              ${financingApplicationId ?? null}::uuid IS NULL OR
              EXISTS (
                SELECT 1
                FROM financing_applications AS application
                WHERE
                  application.tenant_id = ${tenantId}
                  AND application.id = ${financingApplicationId ?? null}
                  AND application.deal_id = deal.id
              )
            )
        ),
        created_payment AS (
          INSERT INTO commercial_payments (
            tenant_id,
            branch_id,
            deal_id,
            customer_id,
            quote_id,
            sales_order_id,
            financing_application_id,
            payment_type,
            status,
            amount,
            currency,
            payment_method,
            reference,
            received_at,
            received_by_clerk_user_id,
            metadata,
            created_at,
            updated_at
          )
          SELECT
            ${tenantId},
            deal.branch_id,
            deal.id,
            deal.customer_id,
            ${quoteId ?? null},
            ${salesOrderId ?? null},
            ${financingApplicationId ?? null},
            ${paymentType},
            'received',
            ${String(amount)},
            ${currency},
            ${paymentMethod ?? null},
            ${reference ?? null},
            ${receivedAt},
            ${userId},
            '{}'::jsonb,
            NOW(),
            NOW()
          FROM valid_references AS deal
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
            CASE
              WHEN payment.payment_type = 'down_payment'
                THEN 'down_payment_received'
              ELSE 'payment_received'
            END,
            'commercial_payment',
            payment.id::text,
            CONCAT(
              CASE
                WHEN payment.payment_type = 'down_payment'
                  THEN 'Enganche recibido: '
                ELSE 'Pago recibido: '
              END,
              payment.amount,
              ' ',
              UPPER(payment.currency),
              CASE
                WHEN payment.reference IS NULL
                  THEN ''
                ELSE CONCAT(' — ', payment.reference)
              END
            ),
            'user',
            ${userId},
            ${actorName},
            CONCAT(
              'commercial-payment-created:',
              payment.id::text
            ),
            jsonb_build_object(
              'paymentId', payment.id,
              'paymentType', payment.payment_type,
              'amount', payment.amount,
              'currency', payment.currency,
              'paymentMethod', payment.payment_method,
              'reference', payment.reference,
              'receivedAt', payment.received_at
            ),
            payment.received_at,
            NOW()
          FROM created_payment AS payment
          RETURNING id
        )
        SELECT
          payment.id,
          payment.amount,
          payment.payment_type AS "paymentType",
          payment.status,
          payment.received_at AS "receivedAt"
        FROM created_payment AS payment
        WHERE EXISTS (
          SELECT 1
          FROM created_event
        )
      `);

    const payment =
      result.rows[0];

    if (!payment) {
      throw new ApiError(
        "Alguna referencia no pertenece a esta oportunidad.",
        400,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          paymentType ===
            "down_payment"
            ? "El enganche fue registrado correctamente."
            : "El pago fue registrado correctamente.",
        data: payment,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
