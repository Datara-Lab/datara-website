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

type LifecyclePayload = {
  action?: unknown;
  salesOrderId?: unknown;
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
    "No fue posible actualizar el ciclo comercial de la unidad:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible actualizar el ciclo comercial de la unidad.",
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
          "sales",
          "edit",
        ),
      ]);

    const payload =
      (await request.json()) as
        LifecyclePayload;

    const action =
      getString(payload.action);

    if (
      action !== "mark_sold" &&
      action !== "mark_delivered"
    ) {
      throw new ApiError(
        "La acción comercial solicitada no es válida.",
        400,
      );
    }

    const salesOrderId =
      getString(
        payload.salesOrderId,
      );

    if (!salesOrderId) {
      throw new ApiError(
        "Selecciona la orden de venta relacionada.",
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
      action === "mark_sold"
        ? await db.execute<{
            reservationId: string;
            inventoryUnitId: string;
            unitStatus: string;
          }>(sql`
            WITH qualified AS MATERIALIZED (
              SELECT
                reservation.id AS reservation_id,
                reservation.inventory_unit_id,
                unit.vin,
                unit.serial_number,
                sales_order.id AS sales_order_id,
                sales_order.reference AS sales_order_reference
              FROM inventory_unit_reservations AS reservation
              INNER JOIN inventory_units AS unit
                ON unit.id = reservation.inventory_unit_id
                AND unit.tenant_id = ${tenantId}
              INNER JOIN crm_sales_orders AS sales_order
                ON sales_order.id = ${salesOrderId}
                AND sales_order.tenant_id = ${tenantId}
                AND sales_order.deal_id = ${dealId}
                AND sales_order.status NOT IN ('Borrador', 'Cancelada')
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
            converted_reservation AS (
              UPDATE inventory_unit_reservations AS reservation
              SET
                status = 'converted',
                sales_order_id = qualified.sales_order_id,
                updated_at = NOW()
              FROM qualified
              WHERE reservation.id = qualified.reservation_id
              RETURNING
                reservation.id,
                reservation.inventory_unit_id
            ),
            sold_unit AS (
              UPDATE inventory_units AS unit
              SET
                status = 'sold',
                sold_at = NOW(),
                updated_at = NOW()
              FROM qualified
              WHERE
                unit.id = qualified.inventory_unit_id
                AND EXISTS (
                  SELECT 1
                  FROM converted_reservation
                )
              RETURNING unit.id, unit.status
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
                'inventory_unit_sold',
                'inventory_unit',
                sold_unit.id::text,
                CONCAT(
                  'Unidad ',
                  COALESCE(
                    qualified.vin,
                    qualified.serial_number,
                    sold_unit.id::text
                  ),
                  ' vinculada a la venta ',
                  qualified.sales_order_reference,
                  '.'
                ),
                'user',
                ${userId},
                ${actorName},
                CONCAT(
                  'inventory-unit-sold:',
                  converted_reservation.id::text
                ),
                jsonb_build_object(
                  'inventoryUnitId', sold_unit.id,
                  'reservationId', converted_reservation.id,
                  'salesOrderId', qualified.sales_order_id
                ),
                NOW(),
                NOW()
              FROM sold_unit
              CROSS JOIN qualified
              CROSS JOIN converted_reservation
              RETURNING id
            )
            SELECT
              converted_reservation.id AS "reservationId",
              sold_unit.id AS "inventoryUnitId",
              sold_unit.status AS "unitStatus"
            FROM converted_reservation
            INNER JOIN sold_unit
              ON sold_unit.id = converted_reservation.inventory_unit_id
            WHERE EXISTS (
              SELECT 1
              FROM created_event
            )
          `)
        : await db.execute<{
            reservationId: string;
            inventoryUnitId: string;
            unitStatus: string;
          }>(sql`
            WITH qualified AS MATERIALIZED (
              SELECT
                reservation.id AS reservation_id,
                reservation.inventory_unit_id,
                unit.vin,
                unit.serial_number,
                sales_order.id AS sales_order_id,
                sales_order.reference AS sales_order_reference
              FROM inventory_unit_reservations AS reservation
              INNER JOIN inventory_units AS unit
                ON unit.id = reservation.inventory_unit_id
                AND unit.tenant_id = ${tenantId}
              INNER JOIN crm_sales_orders AS sales_order
                ON sales_order.id = ${salesOrderId}
                AND sales_order.tenant_id = ${tenantId}
                AND sales_order.deal_id = ${dealId}
                AND sales_order.status = 'Entregada'
              WHERE
                reservation.id = ${reservationId}
                AND reservation.tenant_id = ${tenantId}
                AND reservation.deal_id = ${dealId}
                AND reservation.status = 'converted'
                AND reservation.sales_order_id = sales_order.id
                AND unit.status = 'sold'
                AND (
                  ${branchAccess.allBranches} = TRUE OR
                  unit.branch_id = ANY(${allowedBranchIds}::uuid[])
                )
              FOR UPDATE OF unit
            ),
            delivered_unit AS (
              UPDATE inventory_units AS unit
              SET
                status = 'delivered',
                delivered_at = NOW(),
                updated_at = NOW()
              FROM qualified
              WHERE unit.id = qualified.inventory_unit_id
              RETURNING unit.id, unit.status
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
                'inventory_unit_delivered',
                'inventory_unit',
                delivered_unit.id::text,
                CONCAT(
                  'Unidad ',
                  COALESCE(
                    qualified.vin,
                    qualified.serial_number,
                    delivered_unit.id::text
                  ),
                  ' entregada mediante ',
                  qualified.sales_order_reference,
                  '.'
                ),
                'user',
                ${userId},
                ${actorName},
                CONCAT(
                  'inventory-unit-delivered:',
                  qualified.reservation_id::text
                ),
                jsonb_build_object(
                  'inventoryUnitId', delivered_unit.id,
                  'reservationId', qualified.reservation_id,
                  'salesOrderId', qualified.sales_order_id
                ),
                NOW(),
                NOW()
              FROM delivered_unit
              CROSS JOIN qualified
              RETURNING id
            )
            SELECT
              qualified.reservation_id AS "reservationId",
              delivered_unit.id AS "inventoryUnitId",
              delivered_unit.status AS "unitStatus"
            FROM delivered_unit
            CROSS JOIN qualified
            WHERE EXISTS (
              SELECT 1
              FROM created_event
            )
          `);

    const updated =
      result.rows[0];

    if (!updated) {
      throw new ApiError(
        action === "mark_sold"
          ? "La unidad no está apartada o la orden de venta todavía no permite confirmar la venta."
          : "La unidad no está vendida o la orden de venta todavía no figura como entregada.",
        409,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        action === "mark_sold"
          ? "La unidad fue vinculada a la venta correctamente."
          : "La entrega de la unidad fue confirmada correctamente.",
      data: updated,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
