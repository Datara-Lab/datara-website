import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  desc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";

import { NextResponse } from "next/server";

import { db } from "@/db";

import {
  crmProducts,
  inventoryLocations,
  inventoryMovements,
  inventoryStocks,
  tenantBranches,
  tenants,
} from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
  validateCRMBranchId,
} from "@/lib/crm/branch-access";

import {
  createInventoryAuditQuery,
} from "@/lib/crm/inventory-audit";

import {
  isInventoryTrackedProduct,
} from "@/lib/crm/inventory-products";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type MovementType =
  | "Entrada"
  | "Salida"
  | "Ajuste";

type MovementPayload = {
  branchId?: unknown;
  locationId?: unknown;
  productId?: unknown;
  type?: unknown;
  quantity?: unknown;
  reason?: unknown;
  reference?: unknown;
  unitCost?: unknown;
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
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized ||
    undefined;
}

function getInteger(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const numberValue =
    Number(value);

  if (
    !Number.isInteger(
      numberValue,
    )
  ) {
    return undefined;
  }

  return numberValue;
}

function getNumber(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const numberValue =
    Number(value);

  if (
    !Number.isFinite(
      numberValue,
    )
  ) {
    return undefined;
  }

  return numberValue;
}

function getMovementType(
  value: unknown,
): MovementType {
  if (
    value === "Entrada" ||
    value === "Salida" ||
    value === "Ajuste"
  ) {
    return value;
  }

  throw new ApiError(
    "Selecciona un tipo de movimiento válido.",
    400,
  );
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
    "No fue posible procesar los movimientos de inventario:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar los movimientos de inventario.",
    },
    {
      status: 500,
    },
  );
}

async function getContext(
  requiredPermission:
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
    permissions,
  ] = await Promise.all([
    getCRMBranchAccess(
      tenant.id,
      userId,
    ),

    requireCRMModulePermission(
      tenant.id,
      userId,
      "inventory",
      requiredPermission,
    ),
  ]);

  return {
    tenantId: tenant.id,
    userId,
    branchAccess,
    permissions,
  };
}

export async function GET(
  request: Request,
) {
  try {
    const {
      tenantId,
      branchAccess,
    } = await getContext(
      "view",
    );

    const url =
      new URL(request.url);

    const requestedBranchId =
      url.searchParams.get(
        "branchId",
      );

    const requestedProductId =
      url.searchParams.get(
        "productId",
      );

    const authorizedBranchCondition =
      branchAccess.allBranches
        ? sql<boolean>`true`
        : branchAccess
              .branchIds
              .length > 0
          ? inArray(
              inventoryMovements
                .branchId,
              branchAccess
                .branchIds,
            )
          : sql<boolean>`false`;

    const records =
      await db
        .select({
          id:
            inventoryMovements.id,

          type:
            inventoryMovements.type,

          quantity:
            inventoryMovements
              .quantity,

          previousQuantity:
            inventoryMovements
              .previousQuantity,

          resultingQuantity:
            inventoryMovements
              .resultingQuantity,

          reason:
            inventoryMovements.reason,

          reference:
            inventoryMovements
              .reference,

          performedByName:
            inventoryMovements
              .performedByName,

          performedByClerkUserId:
            inventoryMovements
              .performedByClerkUserId,

          createdAt:
            inventoryMovements
              .createdAt,

          branchId:
            inventoryMovements
              .branchId,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          locationId:
            inventoryMovements
              .locationId,

          locationName:
            inventoryLocations.name,

          locationCode:
            inventoryLocations.code,

          locationType:
            inventoryLocations.type,

          productId:
            inventoryMovements
              .productId,

          productName:
            crmProducts.name,

          productCode:
            crmProducts.code,
        })
        .from(
          inventoryMovements,
        )
                .innerJoin(
          inventoryLocations,
          and(
            eq(
              inventoryMovements
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
        .leftJoin(
          tenantBranches,
          and(
            eq(
              inventoryMovements
                .branchId,
              tenantBranches.id,
            ),
            eq(
              tenantBranches
                .tenantId,
              tenantId,
            ),
          ),
        )
        .innerJoin(
          crmProducts,
          and(
            eq(
              inventoryMovements
                .productId,
              crmProducts.id,
            ),
            eq(
              crmProducts.tenantId,
              tenantId,
            ),
          ),
        )
        .where(
          and(
            eq(
              inventoryMovements
                .tenantId,
              tenantId,
            ),

            authorizedBranchCondition,

            requestedBranchId
              ? eq(
                  inventoryMovements
                    .branchId,
                  requestedBranchId,
                )
              : sql<boolean>`true`,

            requestedProductId
              ? eq(
                  inventoryMovements
                    .productId,
                  requestedProductId,
                )
              : sql<boolean>`true`,
          ),
        )
        .orderBy(
          desc(
            inventoryMovements
              .createdAt,
          ),
        )
        .limit(250);

    return NextResponse.json({
      success: true,

      data: records.map(
        (record) => ({
          ...record,

          branchName:
            record.branchName
              ? record.branchCode
                ? `${record.branchName} (${record.branchCode})`
                : record.branchName
              : "Bodega independiente",

          locationName:
            record.locationCode
              ? `${record.locationName} (${record.locationCode})`
              : record.locationName,

          createdAt:
            record.createdAt
              .toISOString(),
        }),
      ),

      meta: {
        count:
          records.length,

        limit: 250,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const {
      tenantId,
      userId,
      branchAccess,
      permissions,
    } = await getContext(
      "create",
    );

    const payload =
      (await request.json()) as
        MovementPayload;

    const requestedBranchId =
      getString(
        payload.branchId,
      );

    let branchId =
      requestedBranchId
        ? await validateCRMBranchId(
            tenantId,
            branchAccess,
            requestedBranchId,
          )
        : null;

    const productId =
      getString(
        payload.productId,
      );

    if (!productId) {
      throw new ApiError(
        "Selecciona un producto.",
        400,
      );
    }

    const [product] =
      await db
        .select({
          id: crmProducts.id,
          name:
            crmProducts.name,
        })
        .from(crmProducts)
        .where(
          and(
            eq(
              crmProducts.id,
              productId,
            ),
            eq(
              crmProducts.tenantId,
              tenantId,
            ),
            eq(
              crmProducts.active,
              true,
            ),
          ),
        )
        .limit(1);

    if (!product) {
      throw new ApiError(
        "El producto no existe o está inactivo.",
        404,
      );
    }

    const inventoryTracked =
      await isInventoryTrackedProduct(
        tenantId,
        productId,
      );

    if (!inventoryTracked) {
      throw new ApiError(
        "El elemento seleccionado pertenece a un tipo que no administra inventario.",
        400,
      );
    }

    const type =
      getMovementType(
        payload.type,
      );

    const requestedQuantity =
      getInteger(
        payload.quantity,
      );

    if (
      requestedQuantity ===
        undefined ||
      requestedQuantity < 0
    ) {
      throw new ApiError(
        type === "Ajuste"
          ? "La existencia final debe ser un entero igual o mayor que cero."
          : "La cantidad debe ser un entero mayor que cero.",
        400,
      );
    }

    if (
      type !== "Ajuste" &&
      requestedQuantity === 0
    ) {
      throw new ApiError(
        "La cantidad debe ser mayor que cero.",
        400,
      );
    }

        const requestedUnitCost =
      getNumber(
        payload.unitCost,
      );

    if (
      requestedUnitCost !==
        undefined &&
      requestedUnitCost < 0
    ) {
      throw new ApiError(
        "El costo unitario no puede ser negativo.",
        400,
      );
    }

    if (
      requestedUnitCost !==
        undefined &&
      !permissions.canManage
    ) {
      throw new ApiError(
        "No tienes permisos para capturar o modificar costos.",
        403,
      );
    }

    if (
      requestedUnitCost !==
        undefined &&
      type !== "Entrada"
    ) {
      throw new ApiError(
        "El costo unitario únicamente se captura en entradas.",
        400,
      );
    }

    const reason =
      getString(
        payload.reason,
      );

    if (!reason) {
      throw new ApiError(
        "Captura el motivo del movimiento.",
        400,
      );
    }

    const reference =
      getString(
        payload.reference,
      );

    const requestedLocationId =
      getString(
        payload.locationId,
      );

    const locationCondition =
      requestedLocationId
        ? eq(
            inventoryLocations.id,
            requestedLocationId,
          )
        : branchId
          ? and(
              eq(
                inventoryLocations
                  .branchId,
                branchId,
              ),
              eq(
                inventoryLocations
                  .isDefault,
                true,
              ),
            )
          : sql<boolean>`false`;

    const [inventoryLocation] =
      await db
        .select({
          id:
            inventoryLocations.id,

          branchId:
            inventoryLocations
              .branchId,

          name:
            inventoryLocations.name,
        })
        .from(
          inventoryLocations,
        )
        .where(
          and(
            eq(
              inventoryLocations
                .tenantId,
              tenantId,
            ),
            eq(
              inventoryLocations
                .active,
              true,
            ),
            locationCondition,
          ),
        )
        .limit(1);

    if (!inventoryLocation) {
      throw new ApiError(
        "Selecciona una ubicación de inventario válida.",
        400,
      );
    }

    if (
      inventoryLocation.branchId
    ) {
      const authorizedBranchId =
        await validateCRMBranchId(
          tenantId,
          branchAccess,
          inventoryLocation.branchId,
        );

      if (
        branchId &&
        branchId !==
          authorizedBranchId
      ) {
        throw new ApiError(
          "La ubicación no pertenece a la sucursal seleccionada.",
          400,
        );
      }

      branchId =
        authorizedBranchId;
    } else {
      if (
        !branchAccess.allBranches
      ) {
        throw new ApiError(
          "No tienes acceso a esta bodega independiente.",
          403,
        );
      }

      branchId = null;
    }

    const locationId =
      inventoryLocation.id;

    const [existingStock] =
      await db
        .select()
        .from(
          inventoryStocks,
        )
        .where(
          and(
            eq(
              inventoryStocks
                .tenantId,
              tenantId,
            ),
            eq(
              inventoryStocks
                .locationId,
              locationId,
            ),
            eq(
              inventoryStocks
                .productId,
              productId,
            ),
          ),
        )
        .limit(1);

    const previousQuantity =
      existingStock?.quantity ??
      0;

    const movementQuantity =
      type === "Entrada"
        ? requestedQuantity
        : type === "Salida"
          ? -requestedQuantity
          : requestedQuantity -
            previousQuantity;

    const resultingQuantity =
      previousQuantity +
      movementQuantity;

    const previousAverageUnitCost =
      Number(
        existingStock
          ?.averageUnitCost ??
          0,
      );

    const resultingAverageUnitCost =
      type === "Entrada" &&
      requestedUnitCost !==
        undefined &&
      resultingQuantity > 0
        ? previousQuantity > 0 &&
          previousAverageUnitCost > 0
          ? (
              (
                previousQuantity *
                previousAverageUnitCost
              ) +
              (
                requestedQuantity *
                requestedUnitCost
              )
            ) /
            resultingQuantity
          : requestedUnitCost
        : previousAverageUnitCost;

    const movementUnitCost =
      type === "Entrada"
        ? requestedUnitCost ??
          previousAverageUnitCost
        : previousAverageUnitCost;

    const movementTotalCost =
      movementQuantity *
      movementUnitCost;

    const normalizedAverageUnitCost =
      Math.round(
        resultingAverageUnitCost *
          100,
      ) / 100;

    const normalizedMovementUnitCost =
      Math.round(
        movementUnitCost * 100,
      ) / 100;

    const normalizedMovementTotalCost =
      Math.round(
        movementTotalCost * 100,
      ) / 100;

    const reservedQuantity =
      existingStock
        ?.reservedQuantity ??
      0;

    if (
      resultingQuantity < 0
    ) {
      throw new ApiError(
        "La salida supera la existencia actual.",
        400,
      );
    }

    if (
      resultingQuantity <
      reservedQuantity
    ) {
      throw new ApiError(
        "La existencia final no puede ser menor que la cantidad reservada.",
        400,
      );
    }

    if (
      movementQuantity === 0
    ) {
      throw new ApiError(
        "El ajuste no modifica la existencia actual.",
        400,
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

    const stockId =
      existingStock?.id ??
      crypto.randomUUID();

    const movementId =
      crypto.randomUUID();

    const now =
      new Date();

    const stockQuery =
      existingStock
        ? db
            .update(
              inventoryStocks,
            )
            .set({
              quantity:
                resultingQuantity,

              averageUnitCost:
                String(
                  normalizedAverageUnitCost,
                ),

              lastUnitCost:
                type === "Entrada" &&
                requestedUnitCost !==
                  undefined
                  ? String(
                      requestedUnitCost,
                    )
                  : existingStock
                      .lastUnitCost,

              updatedAt: now,
            })
            .where(
              and(
                eq(
                  inventoryStocks.id,
                  existingStock.id,
                ),
                eq(
                  inventoryStocks
                    .tenantId,
                  tenantId,
                ),
              ),
            )
        : db
            .insert(
              inventoryStocks,
            )
            .values({
              id: stockId,
              tenantId,
              branchId,
              locationId,
              productId,

              quantity:
                resultingQuantity,

              averageUnitCost:
                String(
                  normalizedAverageUnitCost,
                ),

              lastUnitCost:
                requestedUnitCost !==
                undefined
                  ? String(
                      requestedUnitCost,
                    )
                  : null,

              reservedQuantity:
                0,

              minimumQuantity:
                0,

              location:
                null,

              createdAt: now,
              updatedAt: now,
            });

    const movementQuery =
      db
        .insert(
          inventoryMovements,
        )
        .values({
          id: movementId,
          tenantId,
          branchId,
          locationId,
          productId,
          stockId,
          type,

          quantity:
            movementQuantity,

          previousQuantity,

          resultingQuantity,

                    unitCost:
            String(
              normalizedMovementUnitCost,
            ),

          totalCost:
            String(
              normalizedMovementTotalCost,
            ),

          resultingAverageCost:
            String(
              normalizedAverageUnitCost,
            ),

          reason,

          reference:
            reference ??
            null,

          performedByClerkUserId:
            userId,

          performedByName,

          metadata: {
            productName:
              product.name,
          },

          createdAt: now,
        });

    const auditQuery =
      createInventoryAuditQuery({
        tenantId,
        branchId,
        locationId,
        productId,

        entityType:
          "Movimiento",

        entityId:
          movementId,

        action:
          type,

        summary:
          `Se registró ${type.toLowerCase()} de ${Math.abs(movementQuantity)} unidad(es) de ${product.name}.`,

        reason,

        actorClerkUserId:
          userId,

        actorName:
          performedByName,

        before: {
          quantity:
            previousQuantity,

          averageUnitCost:
            previousAverageUnitCost,
        },

        after: {
          quantity:
            resultingQuantity,

          movementQuantity,

          averageUnitCost:
            normalizedAverageUnitCost,

          reference:
            reference ?? null,
        },
      });

    await db.batch([
      stockQuery,
      movementQuery,
      auditQuery,
    ]);

    return NextResponse.json(
      {
        success: true,

        message:
          type === "Entrada"
            ? "La entrada fue registrada correctamente."
            : type === "Salida"
              ? "La salida fue registrada correctamente."
              : "El inventario fue ajustado correctamente.",

        data: {
          movementId,
          stockId,
          branchId,
          locationId,
          productId,
          type,
          quantity:
            movementQuantity,
          previousQuantity,
          resultingQuantity,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}