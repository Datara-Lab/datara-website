import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  crmProducts,
  crmSalesOrders,
  inventoryLocations,
  inventoryMovements,
  inventoryReservations,
  inventoryStocks,
  tenants,
} from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
} from "@/lib/crm/branch-access";

import {
  executeCRMAutomations,
} from "@/lib/crm/automation-engine";

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

type SalesOrderUpdatePayload = {
  action?: unknown;
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
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized ||
    undefined;
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

  const [tenant] =
    await db
      .select({
        id:
          tenants.id,
      })
      .from(tenants)
      .where(
        eq(
          tenants
            .clerkOrganizationId,
          orgId,
        ),
      )
      .limit(1);

  if (!tenant) {
    throw new ApiError(
      "La empresa aún no está sincronizada.",
      404,
    );
  }

  const [
    branchAccess,
  ] = await Promise.all([
    getCRMBranchAccess(
      tenant.id,
      userId,
    ),

    requireCRMModulePermission(
      tenant.id,
      userId,
      "sales-orders",
      "edit",
    ),
  ]);

  return {
    tenantId:
      tenant.id,

    userId,
    branchAccess,
  };
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof
      ApiError ||
    error instanceof
      CRMBranchAccessError ||
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
    "No fue posible actualizar la orden de venta:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible actualizar la orden de venta.",
    },
    {
      status: 500,
    },
  );
}

export async function PATCH(
  request: Request,
  routeContext:
    RouteContext,
) {
  try {
    const {
      id: salesOrderId,
    } =
      await routeContext.params;

    const payload =
      (await request.json()) as
        SalesOrderUpdatePayload;

    const action =
      getString(
        payload.action,
      );

    if (
      action !== "Confirmar" &&
      action !== "Entregar" &&
      action !== "Cancelar"
    ) {
      throw new ApiError(
        "Selecciona una acción válida para la orden.",
        400,
      );
    }

    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext();

        if (
      action === "Entregar"
    ) {
      await Promise.all([
        requireCRMModulePermission(
          tenantId,
          userId,
          "sales-orders",
          "manage",
        ),

        requireCRMModulePermission(
          tenantId,
          userId,
          "inventory",
          "edit",
        ),
      ]);
    }

    const [order] =
      await db
        .select({
          id:
            crmSalesOrders.id,

          reference:
            crmSalesOrders
              .reference,

          status:
            crmSalesOrders.status,

          branchId:
            crmSalesOrders
              .branchId,

          dealId:
            crmSalesOrders.dealId,

          customerName:
            crmSalesOrders
              .customerName,
        })
        .from(
          crmSalesOrders,
        )
        .where(
          and(
            eq(
              crmSalesOrders.id,
              salesOrderId,
            ),
            eq(
              crmSalesOrders
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!order) {
      throw new ApiError(
        "La orden de venta no existe.",
        404,
      );
    }

    if (
      !branchAccess.allBranches &&
      (
        !order.branchId ||
        !branchAccess.branchIds.includes(
          order.branchId,
        )
      )
    ) {
      throw new ApiError(
        "No tienes acceso a la sucursal de esta orden.",
        403,
      );
    }

    if (
      action === "Cancelar" &&
      order.status ===
        "Confirmada"
    ) {
      await requireCRMModulePermission(
        tenantId,
        userId,
        "sales-orders",
        "manage",
      );
    }

    const user =
      await currentUser();

    const performedByName =
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

    const now =
      new Date();

    if (
      action === "Confirmar"
    ) {
      if (
        order.status !==
        "Borrador"
      ) {
        throw new ApiError(
          "Solo las órdenes en borrador pueden confirmarse.",
          409,
        );
      }

      await db
        .update(
          crmSalesOrders,
        )
        .set({
          status:
            "Confirmada",

          confirmedByClerkUserId:
            userId,

          confirmedByName:
            performedByName,

          confirmedAt:
            now,

          updatedAt:
            now,
        })
        .where(
          and(
            eq(
              crmSalesOrders.id,
              order.id,
            ),
            eq(
              crmSalesOrders
                .tenantId,
              tenantId,
            ),
            eq(
              crmSalesOrders.status,
              "Borrador",
            ),
          ),
        );

      return NextResponse.json({
        success: true,

        message:
          `La orden ${order.reference} fue confirmada correctamente.`,

        data: {
          id:
            order.id,

          status:
            "Confirmada",

          confirmedAt:
            now.toISOString(),
        },
      });
    }

        if (
      action === "Cancelar"
    ) {
      if (
        order.status !==
          "Borrador" &&
        order.status !==
          "Confirmada"
      ) {
        throw new ApiError(
          "Esta orden ya no puede cancelarse.",
          409,
        );
      }

      const reason =
        getString(
          payload.reason,
        );

      if (!reason) {
        throw new ApiError(
          "Escribe el motivo de la cancelación.",
          400,
        );
      }

      await db
        .update(
          crmSalesOrders,
        )
        .set({
          status:
            "Cancelada",

          cancelledByClerkUserId:
            userId,

          cancelledByName:
            performedByName,

          cancelledAt:
            now,

          cancellationReason:
            reason,

          updatedAt:
            now,
        })
        .where(
          and(
            eq(
              crmSalesOrders.id,
              order.id,
            ),
            eq(
              crmSalesOrders
                .tenantId,
              tenantId,
            ),
          ),
        );

      return NextResponse.json({
        success: true,

        message:
          `La orden ${order.reference} fue cancelada correctamente.`,

        data: {
          id:
            order.id,

          status:
            "Cancelada",

          cancelledAt:
            now.toISOString(),
        },
      });
    }

        if (
      order.status !==
      "Confirmada"
    ) {
      throw new ApiError(
        "Solo las órdenes confirmadas pueden marcarse como entregadas.",
        409,
      );
    }

        if (order.dealId) {
      const reservationRecords =
        await db
          .select({
            id:
              inventoryReservations.id,

            status:
              inventoryReservations
                .status,
          })
          .from(
            inventoryReservations,
          )
          .where(
            and(
              eq(
                inventoryReservations
                  .tenantId,
                tenantId,
              ),
              eq(
                inventoryReservations
                  .sourceType,
                "Oportunidad",
              ),
              eq(
                inventoryReservations
                  .sourceId,
                order.dealId,
              ),
            ),
          );

      if (
        reservationRecords.length ===
        0
      ) {
        throw new ApiError(
          "La orden no puede entregarse porque su oportunidad no tiene reservas activas.",
          409,
        );
      }

      if (
        reservationRecords.length >
          0 &&
        reservationRecords.some(
          (reservation) =>
            reservation.status !==
            "Activa",
        )
      ) {
        throw new ApiError(
          "El inventario de esta oportunidad ya fue entregado, liberado o cancelado. No puede confirmarse nuevamente desde la orden de venta.",
          409,
        );
      }
    }

    const deliveryReason =
      getString(
        payload.reason,
      ) ??
      `Entrega de ${order.reference}`;

    await db.execute(
      sql`
        WITH locked_order AS (
          SELECT
            sales_order.id,
            sales_order.deal_id
          FROM
            ${crmSalesOrders}
              AS sales_order
          WHERE
            sales_order.id =
              ${order.id}
            AND sales_order.tenant_id =
              ${tenantId}
            AND sales_order.status =
              'Confirmada'
          FOR UPDATE
        ),
        selected_reservations AS MATERIALIZED (
          SELECT
            reservation.id,
            reservation.tenant_id,
            reservation.branch_id,
            reservation.location_id,
            reservation.product_id,
            reservation.stock_id,
            reservation.quantity,
            reservation.source_type,
            reservation.source_reference,
            reservation.customer_name,
            stock.quantity AS
              stock_quantity,
            stock.reserved_quantity AS
              stock_reserved_quantity,
            stock.average_unit_cost AS
              average_unit_cost,
            product.name AS
              product_name,
            location.name AS
              location_name
          FROM
            ${inventoryReservations}
              AS reservation
          INNER JOIN
            locked_order
          ON
            locked_order.deal_id =
              reservation.source_id
          INNER JOIN
            ${inventoryStocks}
              AS stock
          ON
            stock.id =
              reservation.stock_id
            AND stock.tenant_id =
              ${tenantId}
          INNER JOIN
            ${crmProducts}
              AS product
          ON
            product.id =
              reservation.product_id
            AND product.tenant_id =
              ${tenantId}
          INNER JOIN
            ${inventoryLocations}
              AS location
          ON
            location.id =
              reservation.location_id
            AND location.tenant_id =
              ${tenantId}
          WHERE
            reservation.tenant_id =
              ${tenantId}
            AND reservation.source_type =
              'Oportunidad'
            AND reservation.status =
              'Activa'
            AND stock.quantity >=
              reservation.quantity
            AND stock.reserved_quantity >=
              reservation.quantity
          FOR UPDATE OF
            reservation,
            stock
        ),
        updated_reservations AS (
          UPDATE
            ${inventoryReservations}
              AS reservation
          SET
            status =
              'Consumida',
            released_by_clerk_user_id =
              ${userId},
            released_by_name =
              ${performedByName},
            released_at =
              ${now},
            release_reason =
              ${deliveryReason},
            updated_at =
              ${now}
          FROM
            selected_reservations
          WHERE
            reservation.id =
              selected_reservations.id
          RETURNING
            reservation.id
        ),
        updated_stocks AS (
          UPDATE
            ${inventoryStocks}
              AS stock
          SET
            quantity =
              stock.quantity -
              selected.quantity,
            reserved_quantity =
              stock.reserved_quantity -
              selected.quantity,
            updated_at =
              ${now}
          FROM
            selected_reservations
              AS selected
          WHERE
            stock.id =
              selected.stock_id
            AND stock.tenant_id =
              ${tenantId}
          RETURNING
            stock.id
        ),
        movement_rows AS (
          INSERT INTO
            ${inventoryMovements} (
              id,
              tenant_id,
              branch_id,
              location_id,
              product_id,
              stock_id,
              type,
              quantity,
              previous_quantity,
              resulting_quantity,
              reason,
              reference,
              unit_cost,
              total_cost,
              resulting_average_cost,
              performed_by_clerk_user_id,
              performed_by_name,
              metadata,
              created_at
            )
          SELECT
            gen_random_uuid(),
            selected.tenant_id,
            selected.branch_id,
            selected.location_id,
            selected.product_id,
            selected.stock_id,
            'Salida reservada',
            -selected.quantity,
            selected.stock_quantity,
            selected.stock_quantity -
              selected.quantity,
            ${deliveryReason},
            ${order.reference},
            selected.average_unit_cost,
            -(
              selected.quantity *
              selected.average_unit_cost
            ),
            selected.average_unit_cost,
            ${userId},
            ${performedByName},
            jsonb_build_object(
              'reservationId',
              selected.id,
              'salesOrderId',
              ${order.id}::text,
              'sourceType',
              selected.source_type,
              'customerName',
              selected.customer_name,
              'productName',
              selected.product_name,
              'locationName',
              selected.location_name
            ),
            ${now}
          FROM
            selected_reservations
              AS selected
          RETURNING
            id
        )
        UPDATE
          ${crmSalesOrders}
            AS sales_order
        SET
          status =
            'Entregada',
          delivered_by_clerk_user_id =
            ${userId},
          delivered_by_name =
            ${performedByName},
          delivered_at =
            ${now},
          updated_at =
            ${now},
          metadata =
            coalesce(
              sales_order.metadata,
              '{}'::jsonb
            ) ||
            jsonb_build_object(
              'deliveryReason',
              ${deliveryReason}::text,
              'consumedReservationCount',
              (
                SELECT
                  count(*)
                FROM
                  updated_reservations
              ),
              'movementCount',
              (
                SELECT
                  count(*)
                FROM
                  movement_rows
              )
            )
        FROM
          locked_order
        WHERE
          sales_order.id =
            locked_order.id
      `,
    );

    const [deliveredOrder] =
      await db
        .select()
        .from(
          crmSalesOrders,
        )
        .where(
          and(
            eq(
              crmSalesOrders.id,
              order.id,
            ),
            eq(
              crmSalesOrders
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (
      deliveredOrder?.status !==
      "Entregada"
    ) {
      throw new ApiError(
        "No fue posible confirmar la entrega de la orden.",
        409,
      );
    }

        try {
      await executeCRMAutomations({
        eventKey:
          `sales_order:${deliveredOrder.id}:delivered:${crypto.randomUUID()}`,

        tenantId,

        branchId:
          deliveredOrder.branchId,

        entityType:
          "sales_order",

        entityId:
          deliveredOrder.id,

        triggerType:
          "status_changed",

        actorClerkUserId:
          userId,

        previousRecord:
          order,

        nextRecord:
          deliveredOrder,
      });
    } catch (
      automationError
    ) {
      console.error(
        `No fue posible ejecutar las automatizaciones de la orden entregada ${deliveredOrder.id}:`,
        automationError,
      );
    }

    return NextResponse.json({
      success: true,

      message:
        `La orden ${order.reference} fue entregada correctamente.`,

      data: {
        id:
          order.id,

        status:
          "Entregada",

        deliveredAt:
          deliveredOrder
            .deliveredAt
            ?.toISOString() ??
          now.toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}