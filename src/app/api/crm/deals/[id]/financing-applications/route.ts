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
    }>;
};

type ApplicationPayload = {
  providerId?: unknown;
  productId?: unknown;
  quoteId?: unknown;
  folio?: unknown;
  currency?: unknown;
  unitPrice?: unknown;
  requiredDownPaymentPercent?: unknown;
  requiredDownPaymentAmount?: unknown;
  requestedAmount?: unknown;
  termMonths?: unknown;
  monthlyPayment?: unknown;
  action?: unknown;
};

type DealAccessRow = {
  id: string;
  branchId: string | null;
  customerId: string | null;
};

type FinancingApplicationRow = {
  id: string;
  providerId: string;
  providerName: string;
  productId: string | null;
  productName: string | null;
  folio: string | null;
  status: string;
  currency: string;
  unitPrice: string;
  requiredDownPaymentPercent: string | null;
  requiredDownPaymentAmount: string;
  requestedAmount: string;
  approvedAmount: string | null;
  termMonths: number | null;
  monthlyPayment: string | null;
  requestedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
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

function getMoney(
  value: unknown,
  label: string,
  required = false,
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      throw new ApiError(
        `${label} es obligatorio.`,
        400,
      );
    }

    return undefined;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    throw new ApiError(
      `${label} no es válido.`,
      400,
    );
  }

  return Math.round(parsed * 100) / 100;
}

function getPercent(
  value: unknown,
): number | undefined {
  const parsed = getMoney(
    value,
    "El porcentaje de enganche",
  );

  if (
    parsed !== undefined &&
    parsed > 100
  ) {
    throw new ApiError(
      "El porcentaje de enganche debe estar entre 0 y 100.",
      400,
    );
  }

  return parsed;
}

function getPositiveInteger(
  value: unknown,
  label: string,
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    throw new ApiError(
      `${label} debe ser un entero mayor que cero.`,
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
    | "create",
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
          "Ya existe una solicitud con ese folio para la financiera.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(
    "No fue posible procesar las solicitudes de financiamiento:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar las solicitudes de financiamiento.",
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
      await db.execute<FinancingApplicationRow>(sql`
        SELECT
          application.id,
          application.provider_id AS "providerId",
          provider.name AS "providerName",
          application.product_id AS "productId",
          product.name AS "productName",
          application.folio,
          application.status,
          application.currency,
          application.unit_price AS "unitPrice",
          application.required_down_payment_percent AS "requiredDownPaymentPercent",
          application.required_down_payment_amount AS "requiredDownPaymentAmount",
          application.requested_amount AS "requestedAmount",
          application.approved_amount AS "approvedAmount",
          application.term_months AS "termMonths",
          application.monthly_payment AS "monthlyPayment",
          application.requested_at AS "requestedAt",
          application.approved_at AS "approvedAt",
          application.rejected_at AS "rejectedAt",
          application.rejection_reason AS "rejectionReason",
          application.created_at AS "createdAt",
          application.updated_at AS "updatedAt"
        FROM financing_applications AS application
        INNER JOIN financing_providers AS provider
          ON provider.tenant_id = application.tenant_id
          AND provider.id = application.provider_id
        LEFT JOIN financing_products AS product
          ON product.tenant_id = application.tenant_id
          AND product.id = application.product_id
        WHERE
          application.tenant_id = ${tenantId}
          AND application.deal_id = ${dealId}
        ORDER BY
          application.created_at DESC
      `);

    return NextResponse.json({
      success: true,
      data: {
        applications:
          result.rows,
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
        ApplicationPayload;

    const providerId =
      getString(payload.providerId);

    if (!providerId) {
      throw new ApiError(
        "Selecciona una financiera.",
        400,
      );
    }

    const productId =
      getString(payload.productId);

    const quoteId =
      getString(payload.quoteId);

    const folio =
      getString(payload.folio);

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

    const unitPrice =
      getMoney(
        payload.unitPrice,
        "El precio de la unidad",
        true,
      )!;

    if (unitPrice <= 0) {
      throw new ApiError(
        "El precio de la unidad debe ser mayor que cero.",
        400,
      );
    }

    const explicitPercent =
      getPercent(
        payload.requiredDownPaymentPercent,
      );

    const explicitAmount =
      getMoney(
        payload.requiredDownPaymentAmount,
        "El enganche requerido",
      );

    const explicitRequestedAmount =
      getMoney(
        payload.requestedAmount,
        "El monto solicitado",
      );

    const termMonths =
      getPositiveInteger(
        payload.termMonths,
        "El plazo",
      );

    const monthlyPayment =
      getMoney(
        payload.monthlyPayment,
        "La mensualidad",
      );

    const submit =
      getString(payload.action) ===
      "submit";

    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext(
      "create",
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
        status: string;
        requiredDownPaymentAmount: string;
        requestedAmount: string;
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
        selected_provider AS MATERIALIZED (
          SELECT
            provider.id,
            provider.name
          FROM financing_providers AS provider
          WHERE
            provider.tenant_id = ${tenantId}
            AND provider.id = ${providerId}
            AND provider.active = TRUE
          LIMIT 1
        ),
        selected_product AS MATERIALIZED (
          SELECT
            product.id,
            product.name,
            product.minimum_down_payment_percent,
            product.minimum_down_payment_amount,
            product.minimum_term_months,
            product.maximum_term_months
          FROM financing_products AS product
          CROSS JOIN selected_provider AS provider
          WHERE
            ${productId ?? null}::uuid IS NOT NULL
            AND product.tenant_id = ${tenantId}
            AND product.id = ${productId ?? null}
            AND product.provider_id = provider.id
            AND product.active = TRUE
          LIMIT 1
        ),
        validated AS (
          SELECT
            deal.*,
            provider.id AS provider_id,
            provider.name AS provider_name,
            product.id AS product_id,
            product.name AS product_name,
            COALESCE(
              product.minimum_down_payment_percent,
              ${explicitPercent ?? null}::numeric
            ) AS down_payment_percent,
            GREATEST(
              COALESCE(
                product.minimum_down_payment_amount,
                ${explicitAmount ?? 0}::numeric,
                0
              ),
              ${String(unitPrice)}::numeric *
                COALESCE(
                  product.minimum_down_payment_percent,
                  ${explicitPercent ?? 0}::numeric,
                  0
                ) / 100
            ) AS down_payment_amount
          FROM selected_deal AS deal
          CROSS JOIN selected_provider AS provider
          LEFT JOIN selected_product AS product
            ON TRUE
          WHERE
            (
              ${productId ?? null}::uuid IS NULL OR
              product.id IS NOT NULL
            )
            AND (
              ${termMonths ?? null}::integer IS NULL OR
              (
                (
                  product.minimum_term_months IS NULL OR
                  ${termMonths ?? null} >= product.minimum_term_months
                )
                AND (
                  product.maximum_term_months IS NULL OR
                  ${termMonths ?? null} <= product.maximum_term_months
                )
              )
            )
            AND (
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
        ),
        created_application AS (
          INSERT INTO financing_applications (
            tenant_id,
            branch_id,
            deal_id,
            customer_id,
            quote_id,
            provider_id,
            product_id,
            folio,
            status,
            currency,
            unit_price,
            required_down_payment_percent,
            required_down_payment_amount,
            requested_amount,
            term_months,
            monthly_payment,
            requested_at,
            created_by_clerk_user_id,
            metadata,
            created_at,
            updated_at
          )
          SELECT
            ${tenantId},
            validated.branch_id,
            validated.id,
            validated.customer_id,
            ${quoteId ?? null},
            validated.provider_id,
            validated.product_id,
            ${folio ?? null},
            ${submit ? "submitted" : "draft"},
            ${currency},
            ${String(unitPrice)},
            validated.down_payment_percent,
            validated.down_payment_amount,
            COALESCE(
              ${explicitRequestedAmount ?? null}::numeric,
              GREATEST(
                ${String(unitPrice)}::numeric -
                  validated.down_payment_amount,
                0
              )
            ),
            ${termMonths ?? null},
            ${monthlyPayment ?? null},
            CASE
              WHEN ${submit}
                THEN NOW()
              ELSE NULL
            END,
            ${userId},
            jsonb_build_object(
              'providerName', validated.provider_name,
              'productName', validated.product_name,
              'rulesSource',
                CASE
                  WHEN validated.product_id IS NULL
                    THEN 'manual'
                  ELSE 'financing_product'
                END
            ),
            NOW(),
            NOW()
          FROM validated
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
              WHEN application.status = 'submitted'
                THEN 'financing_application_submitted'
              ELSE 'financing_application_created'
            END,
            'financing_application',
            application.id::text,
            CONCAT(
              CASE
                WHEN application.status = 'submitted'
                  THEN 'Solicitud de financiamiento enviada a '
                ELSE 'Solicitud de financiamiento creada para '
              END,
              provider.name,
              CASE
                WHEN application.folio IS NULL
                  THEN ''
                ELSE CONCAT(' — Folio ', application.folio)
              END
            ),
            'user',
            ${userId},
            ${actorName},
            CONCAT(
              'financing-application-created:',
              application.id::text
            ),
            jsonb_build_object(
              'applicationId', application.id,
              'providerId', application.provider_id,
              'productId', application.product_id,
              'folio', application.folio,
              'status', application.status,
              'unitPrice', application.unit_price,
              'requiredDownPaymentAmount', application.required_down_payment_amount,
              'requestedAmount', application.requested_amount,
              'termMonths', application.term_months
            ),
            NOW(),
            NOW()
          FROM created_application AS application
          INNER JOIN financing_providers AS provider
            ON provider.id = application.provider_id
          RETURNING id
        )
        SELECT
          application.id,
          application.status,
          application.required_down_payment_amount AS "requiredDownPaymentAmount",
          application.requested_amount AS "requestedAmount"
        FROM created_application AS application
        WHERE EXISTS (
          SELECT 1
          FROM created_event
        )
      `);

    const application =
      result.rows[0];

    if (!application) {
      throw new ApiError(
        "La financiera, el producto, el plazo o la cotización no son válidos para esta oportunidad.",
        400,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          submit
            ? "La solicitud fue registrada como enviada."
            : "El borrador de financiamiento fue creado.",
        data: application,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
