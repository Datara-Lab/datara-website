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
  inventoryCountItems,
  inventoryCounts,
  inventoryLocations,
  inventoryMovements,
  inventoryStocks,
  tenants,
} from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
} from "@/lib/crm/branch-access";

import {
  createInventoryAuditQuery,
} from "@/lib/crm/inventory-audit";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type ReviewPayload = {
  action?: unknown;
  reason?: unknown;
};

type RouteContext = {
  params:
    Promise<{
      id: string;
    }>;
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

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
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
    "No fue posible revisar el conteo físico:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible revisar el conteo físico.",
    },
    {
      status: 500,
    },
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

  const [tenant] =
    await db
      .select({
        id: tenants.id,
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
      "inventory",
      "edit",
    ),
  ]);

  const user =
    await currentUser();

  const userName =
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

  return {
    tenantId: tenant.id,
    userId,
    userName,
    branchAccess,
  };
}

async function getReviewRecord(
  countId: string,
  tenantId: string,
) {
  const [count] =
    await db
      .select({
        id:
          inventoryCounts.id,

        reference:
          inventoryCounts
            .reference,

        status:
          inventoryCounts.status,

        branchId:
          inventoryCounts
            .branchId,

        locationId:
          inventoryCounts
            .locationId,

        locationName:
          inventoryLocations.name,

        locationCode:
          inventoryLocations.code,
      })
      .from(
        inventoryCounts,
      )
      .innerJoin(
        inventoryLocations,
        and(
          eq(
            inventoryCounts
              .locationId,
            inventoryLocations.id,
          ),
          eq(
            inventoryLocations
              .tenantId,
            tenantId,
          ),
        ),
      )
      .where(
        and(
          eq(
            inventoryCounts.id,
            countId,
          ),
          eq(
            inventoryCounts
              .tenantId,
            tenantId,
          ),
        ),
      )
      .limit(1);

  if (!count) {
    throw new ApiError(
      "No fue posible identificar el conteo físico.",
      404,
    );
  }

  return count;
}

export async function PATCH(
  request: Request,
  routeContext:
    RouteContext,
) {
  try {
    const {
      id: countId,
    } =
      await routeContext.params;

    const payload =
      (await request.json()) as
        ReviewPayload;

    const action =
      getString(
        payload.action,
      );

    if (
      action !== "Cancelar" &&
      action !== "Aprobar"
    ) {
      throw new ApiError(
        "Selecciona una acción válida para revisar el conteo.",
        400,
      );
    }

    const {
      tenantId,
      userId,
      userName,
      branchAccess,
    } = await getContext();

    const count =
      await getReviewRecord(
        countId,
        tenantId,
      );

    if (
      !branchAccess.allBranches &&
      (
        !count.branchId ||
        !branchAccess.branchIds.includes(
          count.branchId,
        )
      )
    ) {
      throw new ApiError(
        "No tienes acceso a la ubicación de este conteo.",
        403,
      );
    }

    if (
      count.status !==
        "Borrador" &&
      count.status !==
        "En revisión"
    ) {
      throw new ApiError(
        "Este conteo ya no puede cancelarse.",
        409,
      );
    }

    if (
      action === "Aprobar"
    ) {
      if (
        count.status !==
        "En revisión"
      ) {
        throw new ApiError(
          "Solo los conteos enviados a revisión pueden aprobarse.",
          409,
        );
      }

      const approvalReason =
        getString(
          payload.reason,
        ) ??
        "Ajuste por conteo físico";

      const now =
        new Date();

      await db.execute(
        sql`
          WITH locked_count AS (
            SELECT
              count_record.id
            FROM ${inventoryCounts}
              AS count_record
            WHERE
              count_record.id =
                ${count.id}
              AND count_record.tenant_id =
                ${tenantId}
              AND count_record.status =
                'En revisión'
              AND NOT EXISTS (
                SELECT 1
                FROM ${inventoryCountItems}
                  AS invalid_item
                INNER JOIN ${inventoryStocks}
                  AS invalid_stock
                  ON invalid_stock.id =
                    invalid_item.stock_id
                  AND invalid_stock.tenant_id =
                    ${tenantId}
                WHERE
                  invalid_item.count_id =
                    count_record.id
                  AND (
                    invalid_item.counted_quantity
                      IS NULL
                    OR
                    invalid_item.counted_quantity <
                      invalid_stock.reserved_quantity
                    OR
                    invalid_stock.quantity <>
                      invalid_item.expected_quantity
                  )
              )
            FOR UPDATE
          ),
          adjusted_stocks AS (
            UPDATE ${inventoryStocks}
              AS stock
            SET
              quantity =
                item.counted_quantity,
              updated_at =
                ${now}
            FROM ${inventoryCountItems}
              AS item,
              locked_count
            WHERE
              item.count_id =
                locked_count.id
              AND stock.id =
                item.stock_id
              AND stock.tenant_id =
                ${tenantId}
              AND item.counted_quantity
                IS NOT NULL
            RETURNING
              stock.id,
              stock.tenant_id,
              stock.branch_id,
              stock.location_id,
              stock.product_id,
              stock.average_unit_cost,
              item.expected_quantity
                AS previous_quantity,
              item.counted_quantity
                AS resulting_quantity,
              item.difference
          ),
          movement_rows AS (
            INSERT INTO ${inventoryMovements} (
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
              unit_cost,
              total_cost,
              resulting_average_cost,
              reason,
              reference,
              performed_by_clerk_user_id,
              performed_by_name,
              metadata,
              created_at
            )
            SELECT
              gen_random_uuid(),
              adjusted.tenant_id,
              adjusted.branch_id,
              adjusted.location_id,
              adjusted.product_id,
              adjusted.id,
              'Ajuste',
              adjusted.difference,
              adjusted.previous_quantity,
              adjusted.resulting_quantity,
              adjusted.average_unit_cost,
              (
                adjusted.difference *
                adjusted.average_unit_cost
              ),
              adjusted.average_unit_cost,
              ${approvalReason},
              ${count.reference},
              ${userId},
              ${userName},
              jsonb_build_object(
                'inventoryCountId',
                ${count.id}::text,
                'source',
                'Conteo físico'
              ),
              ${now}
            FROM adjusted_stocks
              AS adjusted
            WHERE
              adjusted.difference <>
                0
            RETURNING id
          )
          UPDATE ${inventoryCounts}
            AS count_record
          SET
            status =
              'Aprobado',
            approved_by_clerk_user_id =
              ${userId},
            approved_by_name =
              ${userName},
            approved_at =
              ${now},
            updated_at =
              ${now},
            metadata =
              coalesce(
                count_record.metadata,
                '{}'::jsonb
              ) ||
              jsonb_build_object(
                'approvalReason',
                ${approvalReason}::text,
                'adjustmentMovementCount',
                (
                  SELECT count(*)
                  FROM movement_rows
                )
              )
          FROM locked_count
          WHERE
            count_record.id =
              locked_count.id
        `,
      );

      const [approvedCount] =
        await db
          .select({
            status:
              inventoryCounts.status,

            approvedAt:
              inventoryCounts
                .approvedAt,
          })
          .from(
            inventoryCounts,
          )
          .where(
            and(
              eq(
                inventoryCounts.id,
                count.id,
              ),
              eq(
                inventoryCounts
                  .tenantId,
                tenantId,
              ),
            ),
          )
          .limit(1);

      if (
        approvedCount?.status !==
        "Aprobado"
      ) {
        throw new ApiError(
          "No fue posible aprobar el conteo. Verifica que todas las partidas estén capturadas, que las existencias no hayan cambiado y que ninguna cantidad contada sea menor que las unidades reservadas.",
          409,
        );
      }

      await createInventoryAuditQuery({
        tenantId,

        branchId:
          count.branchId,

        locationId:
          count.locationId,

        entityType:
          "Conteo físico",

        entityId:
          count.id,

        action:
          "Aprobar y ajustar",

        summary:
          `Se aprobó el conteo ${count.reference} y se ajustaron las diferencias.`,

        reason:
          approvalReason,

        actorClerkUserId:
          userId,

        actorName:
          userName,

        before: {
          status:
            "En revisión",
        },

        after: {
          status:
            "Aprobado",

          approvedAt:
            approvedCount
              .approvedAt
              ?.toISOString() ??
            now.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,

        message:
          "El conteo fue aprobado y las diferencias quedaron registradas en el Kardex.",

        data: {
          id:
            count.id,

          status:
            "Aprobado",

          approvedAt:
            approvedCount
              .approvedAt
              ?.toISOString() ??
            now.toISOString(),
        },
      });
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

    const now =
      new Date();

    const cancelCountQuery =
      db
        .update(
          inventoryCounts,
        )
        .set({
          status:
            "Cancelado",

          cancelledByClerkUserId:
            userId,

          cancelledByName:
            userName,

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
              inventoryCounts.id,
              count.id,
            ),
            eq(
              inventoryCounts
                .tenantId,
              tenantId,
            ),
          ),
        );

    const auditQuery =
      createInventoryAuditQuery({
        tenantId,

        branchId:
          count.branchId,

        locationId:
          count.locationId,

        entityType:
          "Conteo físico",

        entityId:
          count.id,

        action:
          "Cancelar",

        summary:
          `Se canceló el conteo ${count.reference}.`,

        reason,

        actorClerkUserId:
          userId,

        actorName:
          userName,

        before: {
          status:
            count.status,
        },

        after: {
          status:
            "Cancelado",

          cancelledAt:
            now.toISOString(),
        },
      });

    await db.batch([
      cancelCountQuery,
      auditQuery,
    ]);

    return NextResponse.json({
      success: true,
      message:
        "El conteo físico fue cancelado correctamente.",

      data: {
        id:
          count.id,

        status:
          "Cancelado",

        cancelledAt:
          now.toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}