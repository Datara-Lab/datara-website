import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import { sql } from "drizzle-orm";

import { NextResponse } from "next/server";

import { db } from "@/db";

import {
  getCRMBranchAccess,
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
  params: Promise<{
    id: string;
    reservationId: string;
  }>;
};

type ReleasePayload = {
  reason?: unknown;
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
) {
  return typeof value === "string"
    ? value.trim() || undefined
    : undefined;
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
    error instanceof
      CRMIndustryCapabilityError ||
    error instanceof
      CRMPermissionError
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
    "No fue posible liberar el apartado:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible liberar el apartado.",
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
      reservationId,
    } = await context.params;

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

    const tenants =
      await db.execute<{
        id: string;
      }>(sql`
        SELECT id
        FROM tenants
        WHERE clerk_organization_id = ${orgId}
        LIMIT 1
      `);

    const tenantId =
      tenants.rows[0]?.id;

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
          "inventory",
          "edit",
        ),
      ]);

    const payload =
      (await request.json()) as
        ReleasePayload;

    const reason =
      getString(payload.reason);

    if (!reason) {
      throw new ApiError(
        "Captura el motivo de liberación del apartado.",
        400,
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

    const allowedBranchIds =
      branchAccess.branchIds;

    const result =
      await db.execute<{
        reservationId: string;
        inventoryUnitId: string;
        unitStatus: string;
      }>(sql`
        WITH locked_reservation AS MATERIALIZED (
          SELECT
            reservation.id,
            reservation.inventory_unit_id,
            unit.branch_id,
            unit.vin,
            unit.serial_number
          FROM inventory_unit_reservations AS reservation
          INNER JOIN inventory_units AS unit
            ON unit.id = reservation.inventory_unit_id
            AND unit.tenant_id = ${tenantId}
          WHERE
            reservation.id = ${reservationId}
            AND reservation.tenant_id = ${tenantId}
            AND reservation.deal_id = ${dealId}
            AND reservation.status = 'active'
            AND unit.status = 'reserved'
            AND (
              ${branchAccess.allBranches} = TRUE OR
              unit.branch_id = ANY(${allowedBranchIds}::uuid[])
            )
          FOR UPDATE OF reservation, unit
        ),
        released_reservation AS (
          UPDATE inventory_unit_reservations AS reservation
          SET
            status = 'released',
            released_by_clerk_user_id = ${userId},
            released_at = NOW(),
            release_reason = ${reason},
            updated_at = NOW()
          FROM locked_reservation
          WHERE reservation.id = locked_reservation.id
          RETURNING
            reservation.id,
            reservation.inventory_unit_id
        ),
        released_unit AS (
          UPDATE inventory_units AS unit
          SET
            status = 'available',
            updated_at = NOW()
          FROM locked_reservation
          WHERE
            unit.id = locked_reservation.inventory_unit_id
            AND EXISTS (
              SELECT 1
              FROM released_reservation
            )
          RETURNING
            unit.id,
            unit.status
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
            'inventory_unit_released',
            'inventory_unit_reservation',
            released_reservation.id::text,
            CONCAT(
              'Apartado de unidad ',
              COALESCE(
                locked_reservation.vin,
                locked_reservation.serial_number,
                locked_reservation.inventory_unit_id::text
              ),
              ' liberado.'
            ),
            'user',
            ${userId},
            ${actorName},
            CONCAT(
              'inventory-unit-released:',
              released_reservation.id::text
            ),
            jsonb_build_object(
              'inventoryUnitId',
              released_reservation.inventory_unit_id,
              'reason',
              ${reason}
            ),
            NOW(),
            NOW()
          FROM released_reservation
          INNER JOIN locked_reservation
            ON locked_reservation.id = released_reservation.id
          WHERE EXISTS (
            SELECT 1
            FROM released_unit
          )
          RETURNING id
        )
        SELECT
          released_reservation.id AS "reservationId",
          released_reservation.inventory_unit_id AS "inventoryUnitId",
          released_unit.status AS "unitStatus"
        FROM released_reservation
        INNER JOIN released_unit
          ON released_unit.id = released_reservation.inventory_unit_id
        WHERE EXISTS (
          SELECT 1
          FROM created_event
        )
      `);

    const released =
      result.rows[0];

    if (!released) {
      throw new ApiError(
        "El apartado no está activo, la unidad cambió o no tienes acceso a su sucursal.",
        409,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "El apartado fue liberado y la unidad volvió a estar disponible.",
      data: released,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
