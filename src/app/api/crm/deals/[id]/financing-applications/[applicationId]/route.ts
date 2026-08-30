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
      applicationId: string;
    }>;
};

type UpdatePayload = {
  action?: unknown;
  folio?: unknown;
  approvedAmount?: unknown;
  termMonths?: unknown;
  monthlyPayment?: unknown;
  reason?: unknown;
};

type ApplicationAccessRow = {
  id: string;
  dealId: string;
  branchId: string | null;
  status: string;
  providerName: string;
  activeReservationCount: number;
};

type Action =
  | "submit"
  | "review"
  | "approve"
  | "reject"
  | "cancel";

const ACTION_STATUS: Record<
  Action,
  string
> = {
  submit: "submitted",
  review: "under_review",
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled",
};

const ALLOWED_TRANSITIONS:
  Record<string, Action[]> = {
    draft: [
      "submit",
      "cancel",
    ],
    submitted: [
      "review",
      "approve",
      "reject",
      "cancel",
    ],
    under_review: [
      "approve",
      "reject",
      "cancel",
    ],
    approved: [
      "cancel",
    ],
    rejected: [],
    cancelled: [],
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

function getAction(
  value: unknown,
): Action {
  const action = getString(value);

  if (
    action !== "submit" &&
    action !== "review" &&
    action !== "approve" &&
    action !== "reject" &&
    action !== "cancel"
  ) {
    throw new ApiError(
      "La acción solicitada no es válida.",
      400,
    );
  }

  return action;
}

function getMoney(
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

async function getApplicationAccess(
  tenantId: string,
  dealId: string,
  applicationId: string,
) {
  const result =
    await db.execute<ApplicationAccessRow>(sql`
      SELECT
        application.id,
        application.deal_id AS "dealId",
        application.branch_id AS "branchId",
        application.status,
        provider.name AS "providerName",
        COUNT(reservation.id)::integer AS "activeReservationCount"
      FROM financing_applications AS application
      INNER JOIN financing_providers AS provider
        ON provider.tenant_id = application.tenant_id
        AND provider.id = application.provider_id
      LEFT JOIN inventory_unit_reservations AS reservation
        ON reservation.tenant_id = application.tenant_id
        AND reservation.deal_id = application.deal_id
        AND reservation.status = 'active'
        AND reservation.rule_snapshot ->> 'financingApplicationId' =
          application.id::text
      WHERE
        application.tenant_id = ${tenantId}
        AND application.deal_id = ${dealId}
        AND application.id = ${applicationId}
      GROUP BY
        application.id,
        provider.name
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
    "No fue posible actualizar la solicitud de financiamiento:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible actualizar la solicitud de financiamiento.",
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
      applicationId,
    } = await context.params;

    const payload =
      (await request.json()) as
        UpdatePayload;

    const action =
      getAction(payload.action);

    const folio =
      getString(payload.folio);

    const approvedAmount =
      getMoney(
        payload.approvedAmount,
        "El monto aprobado",
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

    const reason =
      getString(payload.reason);

    if (
      action === "approve" &&
      (
        approvedAmount === undefined ||
        approvedAmount <= 0
      )
    ) {
      throw new ApiError(
        "Captura un monto aprobado mayor que cero.",
        400,
      );
    }

    if (
      action === "reject" &&
      !reason
    ) {
      throw new ApiError(
        "Indica el motivo de rechazo.",
        400,
      );
    }

    if (
      action === "cancel" &&
      !reason
    ) {
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

    const application =
      await getApplicationAccess(
        tenantId,
        dealId,
        applicationId,
      );

    if (!application) {
      throw new ApiError(
        "La solicitud de financiamiento no existe.",
        404,
      );
    }

    if (!canAccessBranch(
      application.branchId,
      branchAccess,
    )) {
      throw new ApiError(
        "No tienes acceso a esta solicitud.",
        403,
      );
    }

    if (
      !ALLOWED_TRANSITIONS[
        application.status
      ]?.includes(action)
    ) {
      throw new ApiError(
        "La solicitud no puede cambiar al estado indicado desde su estado actual.",
        409,
      );
    }

    if (
      action === "cancel" &&
      application.activeReservationCount > 0
    ) {
      throw new ApiError(
        "Esta aprobación sostiene un apartado activo. Libera primero la unidad antes de cancelar el financiamiento.",
        409,
      );
    }

    const nextStatus =
      ACTION_STATUS[action];

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
        previousStatus: string;
        status: string;
        updatedAt: Date;
      }>(sql`
        WITH locked_application AS MATERIALIZED (
          SELECT application.*
          FROM financing_applications AS application
          WHERE
            application.tenant_id = ${tenantId}
            AND application.deal_id = ${dealId}
            AND application.id = ${applicationId}
            AND application.status = ${application.status}
            AND NOT (
              ${action} = 'cancel'
              AND EXISTS (
                SELECT 1
                FROM inventory_unit_reservations AS reservation
                WHERE
                  reservation.tenant_id = application.tenant_id
                  AND reservation.deal_id = application.deal_id
                  AND reservation.status = 'active'
                  AND reservation.rule_snapshot ->> 'financingApplicationId' =
                    application.id::text
              )
            )
          FOR UPDATE
        ),
        updated_application AS (
          UPDATE financing_applications AS application
          SET
            status = ${nextStatus},
            folio = COALESCE(
              ${folio ?? null},
              application.folio
            ),
            approved_amount = CASE
              WHEN ${action} = 'approve'
                THEN ${approvedAmount ?? null}
              ELSE application.approved_amount
            END,
            term_months = COALESCE(
              ${termMonths ?? null},
              application.term_months
            ),
            monthly_payment = COALESCE(
              ${monthlyPayment ?? null},
              application.monthly_payment
            ),
            requested_at = CASE
              WHEN ${action} = 'submit'
                THEN NOW()
              ELSE application.requested_at
            END,
            approved_at = CASE
              WHEN ${action} = 'approve'
                THEN NOW()
              ELSE application.approved_at
            END,
            rejected_at = CASE
              WHEN ${action} = 'reject'
                THEN NOW()
              ELSE application.rejected_at
            END,
            rejection_reason = CASE
              WHEN ${action} = 'reject'
                THEN ${reason ?? null}
              ELSE application.rejection_reason
            END,
            cancelled_at = CASE
              WHEN ${action} = 'cancel'
                THEN NOW()
              ELSE application.cancelled_at
            END,
            metadata = application.metadata ||
              jsonb_build_object(
                'lastStatusChangeReason',
                ${reason ?? null},
                'lastStatusChangedBy',
                ${userId}
              ),
            updated_at = NOW()
          FROM locked_application AS locked
          WHERE application.id = locked.id
          RETURNING
            application.*,
            locked.status AS previous_status
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
            CONCAT(
              'financing_application_',
              application.status
            ),
            'financing_application',
            application.id::text,
            CONCAT(
              'Solicitud de ',
              ${application.providerName},
              ': ',
              application.previous_status,
              ' → ',
              application.status,
              CASE
                WHEN ${reason ?? null}::text IS NULL
                  THEN ''
                ELSE CONCAT(' — ', ${reason ?? null})
              END
            ),
            'user',
            ${userId},
            ${actorName},
            CONCAT(
              'financing-application-status:',
              application.id::text,
              ':',
              application.status,
              ':',
              EXTRACT(EPOCH FROM application.updated_at)::text
            ),
            jsonb_build_object(
              'applicationId', application.id,
              'previousStatus', application.previous_status,
              'status', application.status,
              'approvedAmount', application.approved_amount,
              'termMonths', application.term_months,
              'monthlyPayment', application.monthly_payment,
              'reason', ${reason ?? null}
            ),
            NOW(),
            NOW()
          FROM updated_application AS application
          RETURNING id
        )
        SELECT
          application.id,
          application.previous_status AS "previousStatus",
          application.status,
          application.updated_at AS "updatedAt"
        FROM updated_application AS application
        WHERE EXISTS (
          SELECT 1
          FROM created_event
        )
      `);

    const updated =
      result.rows[0];

    if (!updated) {
      throw new ApiError(
        "La solicitud cambió o quedó relacionada con un apartado activo. Actualiza e inténtalo nuevamente.",
        409,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "La solicitud de financiamiento fue actualizada.",
      data: updated,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
