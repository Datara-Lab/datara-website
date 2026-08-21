import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
  inArray,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

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
  type CRMBranchAccessContext,
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

type TransferPayload = {
  sourceLocationId?: unknown;
  destinationLocationId?: unknown;
  productId?: unknown;
  quantity?: unknown;
  reason?: unknown;
  reference?: unknown;
};

type TransferLocation = {
  id: string;

  branchId:
    | string
    | null;

  name: string;

  branchName:
    | string
    | null;

  branchCode:
    | string
    | null;
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

function getPositiveInteger(
  value: unknown,
): number | undefined {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return undefined;
  }

  return parsed;
}

function toNumber(
  value:
    | string
    | number
    | null
    | undefined,
): number {
  const parsed =
    Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function canAccessLocation(
  location: TransferLocation,
  branchAccess:
    CRMBranchAccessContext,
): boolean {
  if (
    branchAccess.allBranches
  ) {
    return true;
  }

  if (!location.branchId) {
    return false;
  }

  return branchAccess.branchIds.includes(
    location.branchId,
  );
}

function getLocationLabel(
  location: TransferLocation,
): string {
  const branchLabel =
    location.branchName
      ? location.branchCode
        ? `${location.branchName} (${location.branchCode})`
        : location.branchName
      : "Bodega independiente";

  return `${location.name} · ${branchLabel}`;
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
    "No fue posible transferir el inventario:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible transferir el inventario.",
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

  return {
    tenantId: tenant.id,
    userId,
    branchAccess,
  };
}

export async function POST(
  request: Request,
) {
  try {
    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext();

    const payload =
      (await request.json()) as
        TransferPayload;

    const sourceLocationId =
      getString(
        payload.sourceLocationId,
      );

    const destinationLocationId =
      getString(
        payload.destinationLocationId,
      );

    const productId =
      getString(
        payload.productId,
      );

    const quantity =
      getPositiveInteger(
        payload.quantity,
      );

    if (
      !sourceLocationId ||
      !destinationLocationId
    ) {
      throw new ApiError(
        "Selecciona las ubicaciones de origen y destino.",
        400,
      );
    }

    if (
      sourceLocationId ===
      destinationLocationId
    ) {
      throw new ApiError(
        "La ubicación de destino debe ser diferente a la de origen.",
        400,
      );
    }

    if (!productId) {
      throw new ApiError(
        "Selecciona un producto.",
        400,
      );
    }

    if (!quantity) {
      throw new ApiError(
        "La cantidad debe ser un entero mayor que cero.",
        400,
      );
    }

    const locations =
      await db
        .select({
          id:
            inventoryLocations.id,

          branchId:
            inventoryLocations
              .branchId,

          name:
            inventoryLocations.name,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,
        })
        .from(
          inventoryLocations,
        )
        .leftJoin(
          tenantBranches,
          and(
            eq(
              inventoryLocations
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
        .where(
          and(
            eq(
              inventoryLocations
                .tenantId,
              tenantId,
            ),
            eq(
              inventoryLocations.active,
              true,
            ),
            inArray(
              inventoryLocations.id,
              [
                sourceLocationId,
                destinationLocationId,
              ],
            ),
          ),
        );

    const sourceLocation =
      locations.find(
        (location) =>
          location.id ===
          sourceLocationId,
      );

    const destinationLocation =
      locations.find(
        (location) =>
          location.id ===
          destinationLocationId,
      );

    if (
      !sourceLocation ||
      !destinationLocation
    ) {
      throw new ApiError(
        "Alguna de las ubicaciones seleccionadas no existe o está inactiva.",
        404,
      );
    }

    if (
      !canAccessLocation(
        sourceLocation,
        branchAccess,
      ) ||
      !canAccessLocation(
        destinationLocation,
        branchAccess,
      )
    ) {
      throw new ApiError(
        "No tienes acceso a alguna de las ubicaciones seleccionadas.",
        403,
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

    const stockRecords =
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
                .productId,
              productId,
            ),
            inArray(
              inventoryStocks
                .locationId,
              [
                sourceLocationId,
                destinationLocationId,
              ],
            ),
          ),
        );

    const sourceStock =
      stockRecords.find(
        (stock) =>
          stock.locationId ===
          sourceLocationId,
      );

    const destinationStock =
      stockRecords.find(
        (stock) =>
          stock.locationId ===
          destinationLocationId,
      );

    if (!sourceStock) {
      throw new ApiError(
        "El producto no tiene existencias inicializadas en la ubicación de origen.",
        400,
      );
    }

    const sourceAvailable =
      sourceStock.quantity -
      sourceStock.reservedQuantity;

    if (
      quantity >
      sourceAvailable
    ) {
      throw new ApiError(
        `Solo hay ${sourceAvailable} unidades disponibles para transferir.`,
        400,
      );
    }

    const sourceResultingQuantity =
      sourceStock.quantity -
      quantity;

    const destinationPreviousQuantity =
      destinationStock?.quantity ??
      0;

    const destinationResultingQuantity =
      destinationPreviousQuantity +
      quantity;

    const transferredUnitCost =
      toNumber(
        sourceStock
          .averageUnitCost,
      );

    const destinationPreviousAverageCost =
      toNumber(
        destinationStock
          ?.averageUnitCost,
      );

    const destinationAverageCost =
      destinationResultingQuantity >
      0
        ? (
            (
              destinationPreviousQuantity *
              destinationPreviousAverageCost
            ) +
            (
              quantity *
              transferredUnitCost
            )
          ) /
          destinationResultingQuantity
        : 0;

    const normalizedUnitCost =
      Math.round(
        transferredUnitCost *
          100,
      ) / 100;

    const normalizedDestinationAverageCost =
      Math.round(
        destinationAverageCost *
          100,
      ) / 100;

    const normalizedTotalCost =
      Math.round(
        quantity *
          normalizedUnitCost *
          100,
      ) / 100;

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

    const transferId =
      crypto.randomUUID();

    const transferReference =
      getString(
        payload.reference,
      ) ??
      `TRF-${transferId
        .slice(0, 8)
        .toUpperCase()}`;

    const reason =
      getString(
        payload.reason,
      ) ??
      "Transferencia entre ubicaciones";

    const destinationStockId =
      destinationStock?.id ??
      crypto.randomUUID();

    const sourceMovementId =
      crypto.randomUUID();

    const destinationMovementId =
      crypto.randomUUID();

    const now =
      new Date();

    const sourceStockQuery =
      db
        .update(
          inventoryStocks,
        )
        .set({
          quantity:
            sourceResultingQuantity,

          updatedAt: now,
        })
        .where(
          and(
            eq(
              inventoryStocks.id,
              sourceStock.id,
            ),
            eq(
              inventoryStocks
                .tenantId,
              tenantId,
            ),
          ),
        );

    const destinationStockQuery =
      destinationStock
        ? db
            .update(
              inventoryStocks,
            )
            .set({
              quantity:
                destinationResultingQuantity,

              averageUnitCost:
                String(
                  normalizedDestinationAverageCost,
                ),

              lastUnitCost:
                String(
                  normalizedUnitCost,
                ),

              updatedAt: now,
            })
            .where(
              and(
                eq(
                  inventoryStocks.id,
                  destinationStock.id,
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
              id:
                destinationStockId,

              tenantId,

              branchId:
                destinationLocation
                  .branchId,

              locationId:
                destinationLocation.id,

              productId,

              quantity,

              reservedQuantity:
                0,

              minimumQuantity:
                0,

              averageUnitCost:
                String(
                  normalizedUnitCost,
                ),

              lastUnitCost:
                String(
                  normalizedUnitCost,
                ),

              location: null,

              createdAt: now,
              updatedAt: now,
            });

    const sourceMovementQuery =
      db
        .insert(
          inventoryMovements,
        )
        .values({
          id:
            sourceMovementId,

          tenantId,

          branchId:
            sourceLocation
              .branchId,

          locationId:
            sourceLocation.id,

          productId,

          stockId:
            sourceStock.id,

          type:
            "Transferencia salida",

          quantity:
            -quantity,

          previousQuantity:
            sourceStock.quantity,

          resultingQuantity:
            sourceResultingQuantity,

          reason,
          reference:
            transferReference,

          unitCost:
            String(
              normalizedUnitCost,
            ),

          totalCost:
            String(
              -normalizedTotalCost,
            ),

          resultingAverageCost:
            String(
              normalizedUnitCost,
            ),

          performedByClerkUserId:
            userId,

          performedByName,

          metadata: {
            transferId,

            direction:
              "outbound",

            counterpartLocationId:
              destinationLocation.id,

            counterpartLocationName:
              getLocationLabel(
                destinationLocation,
              ),

            productName:
              product.name,
          },

          createdAt: now,
        });

    const destinationMovementQuery =
      db
        .insert(
          inventoryMovements,
        )
        .values({
          id:
            destinationMovementId,

          tenantId,

          branchId:
            destinationLocation
              .branchId,

          locationId:
            destinationLocation.id,

          productId,

          stockId:
            destinationStockId,

          type:
            "Transferencia entrada",

          quantity,

          previousQuantity:
            destinationPreviousQuantity,

          resultingQuantity:
            destinationResultingQuantity,

          reason,
          reference:
            transferReference,

          unitCost:
            String(
              normalizedUnitCost,
            ),

          totalCost:
            String(
              normalizedTotalCost,
            ),

          resultingAverageCost:
            String(
              normalizedDestinationAverageCost,
            ),

          performedByClerkUserId:
            userId,

          performedByName,

          metadata: {
            transferId,

            direction:
              "inbound",

            counterpartLocationId:
              sourceLocation.id,

            counterpartLocationName:
              getLocationLabel(
                sourceLocation,
              ),

            productName:
              product.name,
          },

          createdAt: now,
        });

    const sourceAuditQuery =
      createInventoryAuditQuery({
        tenantId,

        branchId:
          sourceLocation.branchId,

        locationId:
          sourceLocation.id,

        productId,

        entityType:
          "Transferencia",

        entityId:
          transferId,

        action:
          "Salida por transferencia",

        summary:
          `Se transfirieron ${quantity} unidad(es) de ${product.name} hacia ${getLocationLabel(destinationLocation)}.`,

        reason,

        actorClerkUserId:
          userId,

        actorName:
          performedByName,

        before: {
          quantity:
            sourceStock.quantity,

          reservedQuantity:
            sourceStock
              .reservedQuantity,
        },

        after: {
          quantity:
            sourceResultingQuantity,

          transferredQuantity:
            quantity,

          destination:
            getLocationLabel(
              destinationLocation,
            ),

          reference:
            transferReference,
        },
      });

    const destinationAuditQuery =
      createInventoryAuditQuery({
        tenantId,

        branchId:
          destinationLocation
            .branchId,

        locationId:
          destinationLocation.id,

        productId,

        entityType:
          "Transferencia",

        entityId:
          transferId,

        action:
          "Entrada por transferencia",

        summary:
          `Se recibieron ${quantity} unidad(es) de ${product.name} desde ${getLocationLabel(sourceLocation)}.`,

        reason,

        actorClerkUserId:
          userId,

        actorName:
          performedByName,

        before: {
          quantity:
            destinationPreviousQuantity,

          averageUnitCost:
            destinationPreviousAverageCost,
        },

        after: {
          quantity:
            destinationResultingQuantity,

          transferredQuantity:
            quantity,

          averageUnitCost:
            normalizedDestinationAverageCost,

          source:
            getLocationLabel(
              sourceLocation,
            ),

          reference:
            transferReference,
        },
      });

    await db.batch([
      sourceStockQuery,
      destinationStockQuery,
      sourceMovementQuery,
      destinationMovementQuery,
      sourceAuditQuery,
      destinationAuditQuery,
    ]);

    return NextResponse.json(
      {
        success: true,

        message:
          "La transferencia fue registrada correctamente.",

        data: {
          transferId,

          reference:
            transferReference,

          productId,
          quantity,

          sourceLocationId:
            sourceLocation.id,

          destinationLocationId:
            destinationLocation.id,

          sourceResultingQuantity,

          destinationResultingQuantity,
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