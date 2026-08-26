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

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  crmProducts,
  inventoryLocations,
  inventoryMovements,
  inventoryReplenishmentRequestItems,
  inventoryReplenishmentRequests,
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
  getInventoryTrackedProductIds,
} from "@/lib/crm/inventory-products";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type ReplenishmentItemPayload = {
  stockId?: unknown;
  quantity?: unknown;
};

type ReplenishmentPayload = {
  supplierName?: unknown;
  supplierReference?: unknown;
  currency?: unknown;
  notes?: unknown;
  items?: unknown;
};

type ReplenishmentReceiptPayload = {
  id?: unknown;
  action?: unknown;
  reference?: unknown;
  notes?: unknown;

  items?: Array<{
    id?: unknown;
    receivedQuantity?: unknown;
    unitCost?: unknown;
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

function getPositiveInteger(
  value: unknown,
): number | undefined {
  const parsed =
    Number(value);

  return Number.isInteger(
    parsed,
  ) &&
    parsed > 0
    ? parsed
    : undefined;
}

function canAccessBranch(
  branchId: string | null,
  branchAccess:
    CRMBranchAccessContext,
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
    | "manage",
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
      permission,
    ),
  ]);

  return {
    tenantId:
      tenant.id,

    userId,
    branchAccess,
    permissions,
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

  const databaseError =
    error as {
      cause?: {
        code?: string;
      };
      code?: string;
    };

  const code =
    databaseError.cause?.code ??
    databaseError.code;

  if (code === "23505") {
    return NextResponse.json(
      {
        success: false,

        error:
          "Ya existe una solicitud de reposición con esa referencia.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(
    "No fue posible procesar la solicitud de reposición:",
    error,
  );

  return NextResponse.json(
    {
      success: false,

      error:
        "No fue posible procesar la solicitud de reposición.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
  try {
    const {
      tenantId,
      branchAccess,
      permissions,
    } = await getContext(
      "view",
    );

    if (
      !branchAccess.allBranches &&
      branchAccess.branchIds.length ===
        0
    ) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const requests =
      await db
        .select({
          id:
            inventoryReplenishmentRequests
              .id,

          reference:
            inventoryReplenishmentRequests
              .reference,

          status:
            inventoryReplenishmentRequests
              .status,

          branchId:
            inventoryReplenishmentRequests
              .branchId,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          supplierName:
            inventoryReplenishmentRequests
              .supplierName,

          supplierReference:
            inventoryReplenishmentRequests
              .supplierReference,

          currency:
            inventoryReplenishmentRequests
              .currency,

          notes:
            inventoryReplenishmentRequests
              .notes,

          externalSystem:
            inventoryReplenishmentRequests
              .externalSystem,

          externalId:
            inventoryReplenishmentRequests
              .externalId,

          externalReference:
            inventoryReplenishmentRequests
              .externalReference,

          syncStatus:
            inventoryReplenishmentRequests
              .syncStatus,

          syncError:
            inventoryReplenishmentRequests
              .syncError,

          requestedByName:
            inventoryReplenishmentRequests
              .requestedByName,

          requestedAt:
            inventoryReplenishmentRequests
              .requestedAt,

          createdAt:
            inventoryReplenishmentRequests
              .createdAt,

          updatedAt:
            inventoryReplenishmentRequests
              .updatedAt,
        })
        .from(
          inventoryReplenishmentRequests,
        )
        .leftJoin(
          tenantBranches,
          and(
            eq(
              inventoryReplenishmentRequests
                .branchId,
              tenantBranches.id,
            ),
            eq(
              tenantBranches.tenantId,
              tenantId,
            ),
          ),
        )
        .where(
          branchAccess.allBranches
            ? eq(
                inventoryReplenishmentRequests
                  .tenantId,
                tenantId,
              )
            : and(
                eq(
                  inventoryReplenishmentRequests
                    .tenantId,
                  tenantId,
                ),
                inArray(
                  inventoryReplenishmentRequests
                    .branchId,
                  branchAccess.branchIds,
                ),
              ),
        )
        .orderBy(
          desc(
            inventoryReplenishmentRequests
              .createdAt,
          ),
        );

    const requestIds =
      requests.map(
        (request) =>
          request.id,
      );

    const items =
      requestIds.length > 0
        ? await db
            .select({
              id:
                inventoryReplenishmentRequestItems
                  .id,

              requestId:
                inventoryReplenishmentRequestItems
                  .requestId,

              stockId:
                inventoryReplenishmentRequestItems
                  .stockId,

              productId:
                inventoryReplenishmentRequestItems
                  .productId,

              productName:
                crmProducts.name,

              productCode:
                crmProducts.code,

              locationId:
                inventoryReplenishmentRequestItems
                  .locationId,

              locationName:
                inventoryLocations.name,

              locationCode:
                inventoryLocations.code,

              requestedQuantity:
                inventoryReplenishmentRequestItems
                  .requestedQuantity,

              receivedQuantity:
                inventoryReplenishmentRequestItems
                  .receivedQuantity,

              unitCost:
                inventoryReplenishmentRequestItems
                  .unitCost,

              totalCost:
                inventoryReplenishmentRequestItems
                  .totalCost,

              notes:
                inventoryReplenishmentRequestItems
                  .notes,
            })
            .from(
              inventoryReplenishmentRequestItems,
            )
            .innerJoin(
              crmProducts,
              and(
                eq(
                  inventoryReplenishmentRequestItems
                    .productId,
                  crmProducts.id,
                ),
                eq(
                  crmProducts.tenantId,
                  tenantId,
                ),
              ),
            )
            .innerJoin(
              inventoryLocations,
              and(
                eq(
                  inventoryReplenishmentRequestItems
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
                  inventoryReplenishmentRequestItems
                    .tenantId,
                  tenantId,
                ),
                inArray(
                  inventoryReplenishmentRequestItems
                    .requestId,
                  requestIds,
                ),
              ),
            )
        : [];

    return NextResponse.json({
      success: true,

      data:
        requests.map(
          (request) => ({
            ...request,

            branchLabel:
              request.branchName
                ? request.branchCode
                  ? `${request.branchName} (${request.branchCode})`
                  : request.branchName
                : "Sin sucursal",

            items:
              items
                .filter(
                  (item) =>
                    item.requestId ===
                    request.id,
                )
                .map(
                  (item) => ({
                    ...item,

                    locationLabel:
                      item.locationCode
                        ? `${item.locationName} (${item.locationCode})`
                        : item.locationName,

                    unitCost:
                      permissions.canManage &&
                      item.unitCost !==
                        null
                        ? Number(
                            item.unitCost,
                          )
                        : null,

                    totalCost:
                      permissions.canManage &&
                      item.totalCost !==
                        null
                        ? Number(
                            item.totalCost,
                          )
                        : null,
                  }),
                ),
          }),
        ),
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
    } = await getContext(
      "manage",
    );

    const payload =
      (await request.json()) as
        ReplenishmentPayload;

    if (
      !Array.isArray(
        payload.items,
      ) ||
      payload.items.length ===
        0
    ) {
      throw new ApiError(
        "Agrega al menos una partida a la solicitud de reposición.",
        400,
      );
    }

    const requestedItems =
      payload.items.map(
        (value) => {
          if (
            !value ||
            typeof value !==
              "object" ||
            Array.isArray(value)
          ) {
            throw new ApiError(
              "Una partida de reposición no tiene un formato válido.",
              400,
            );
          }

          const item =
            value as
              ReplenishmentItemPayload;

          const stockId =
            getString(
              item.stockId,
            );

          const quantity =
            getPositiveInteger(
              item.quantity,
            );

          if (
            !stockId ||
            quantity ===
              undefined
          ) {
            throw new ApiError(
              "Cada partida debe tener una existencia y una cantidad entera mayor que cero.",
              400,
            );
          }

          return {
            stockId,
            quantity,
          };
        },
      );

    const uniqueStockIds =
      Array.from(
        new Set(
          requestedItems.map(
            (item) =>
              item.stockId,
          ),
        ),
      );

    if (
      uniqueStockIds.length !==
      requestedItems.length
    ) {
      throw new ApiError(
        "La solicitud contiene modelos y ubicaciones duplicados.",
        400,
      );
    }

    const stockRecords =
      await db
        .select({
          stockId:
            inventoryStocks.id,

          branchId:
            inventoryLocations
              .branchId,

          locationId:
            inventoryStocks
              .locationId,

          locationName:
            inventoryLocations.name,

          locationCode:
            inventoryLocations.code,

          productId:
            inventoryStocks
              .productId,

          productName:
            crmProducts.name,

          productCode:
            crmProducts.code,

          availableQuantity:
            inventoryStocks.quantity,

          reservedQuantity:
            inventoryStocks
              .reservedQuantity,

          averageUnitCost:
            inventoryStocks
              .averageUnitCost,

          maximumQuantity:
            inventoryStocks
              .maximumQuantity,

          currency:
            crmProducts.currency,
        })
        .from(
          inventoryStocks,
        )
        .innerJoin(
          inventoryLocations,
          and(
            eq(
              inventoryStocks
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
        .innerJoin(
          crmProducts,
          and(
            eq(
              inventoryStocks
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
              inventoryStocks
                .tenantId,
              tenantId,
            ),
            inArray(
              inventoryStocks.id,
              uniqueStockIds,
            ),
          ),
        );

    if (
      stockRecords.length !==
      requestedItems.length
    ) {
      throw new ApiError(
        "No fue posible identificar todas las existencias solicitadas.",
        404,
      );
    }

    const inventoryTrackedProductIds =
      await getInventoryTrackedProductIds(
        tenantId,
        stockRecords.map(
          (stock) =>
            stock.productId,
        ),
      );

    const nonInventoryStock =
      stockRecords.find(
        (stock) =>
          !inventoryTrackedProductIds.has(
            stock.productId,
          ),
      );

    if (nonInventoryStock) {
      throw new ApiError(
        `El elemento "${nonInventoryStock.productName}" pertenece a un tipo que no administra inventario.`,
        400,
      );
    }


    for (
      const stock of
      stockRecords
    ) {
      if (
        !canAccessBranch(
          stock.branchId,
          branchAccess,
        )
      ) {
        throw new ApiError(
          "No tienes acceso a una de las ubicaciones seleccionadas.",
          403,
        );
      }
    }

        const user =
      await currentUser();

    const requestedByName =
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

    const requestId =
      crypto.randomUUID();

    const reference =
      `REP-${now
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "")}-${requestId
        .slice(0, 8)
        .toUpperCase()}`;

    const branchIds =
      Array.from(
        new Set(
          stockRecords
            .map(
              (stock) =>
                stock.branchId,
            )
            .filter(
              (
                branchId,
              ): branchId is string =>
                Boolean(branchId),
            ),
        ),
      );

    const branchId =
      branchIds.length === 1
        ? branchIds[0]
        : null;

    const currency =
      getString(
        payload.currency,
      )?.toLowerCase() ??
      stockRecords[0]
        ?.currency
        ?.toLowerCase() ??
      "mxn";

    const supplierName =
      getString(
        payload.supplierName,
      ) ?? null;

    const supplierReference =
      getString(
        payload.supplierReference,
      ) ?? null;

    const notes =
      getString(
        payload.notes,
      ) ?? null;

    const requestQuery =
      db
        .insert(
          inventoryReplenishmentRequests,
        )
        .values({
          id:
            requestId,

          tenantId,
          branchId,
          reference,

          status:
            "Solicitada",

          supplierName,
          supplierReference,
          currency,
          notes,

          syncStatus:
            "Pendiente de integración",

          requestedByClerkUserId:
            userId,

          requestedByName,

          requestedAt:
            now,

          metadata: {
            source:
              "Sugerencias de reposición",

            itemCount:
              requestedItems.length,
          },

          createdAt:
            now,

          updatedAt:
            now,
        });

    const itemRows =
      requestedItems.map(
        (requestedItem) => {
          const stock =
            stockRecords.find(
              (record) =>
                record.stockId ===
                requestedItem.stockId,
            );

          if (!stock) {
            throw new ApiError(
              "No fue posible relacionar una partida con su existencia.",
              400,
            );
          }

          const unitCost =
            Number(
              stock.averageUnitCost ??
              0,
            );

          const normalizedUnitCost =
            Number.isFinite(
              unitCost,
            )
              ? Math.round(
                  unitCost *
                    100,
                ) / 100
              : 0;

          const normalizedTotalCost =
            Math.round(
              requestedItem.quantity *
                normalizedUnitCost *
                100,
            ) / 100;

          return {
            id:
              crypto.randomUUID(),

            tenantId,
            requestId,

            branchId:
              stock.branchId,

            locationId:
              stock.locationId,

            productId:
              stock.productId,

            stockId:
              stock.stockId,

            requestedQuantity:
              requestedItem.quantity,

            receivedQuantity:
              0,

            unitCost:
              String(
                normalizedUnitCost,
              ),

            totalCost:
              String(
                normalizedTotalCost,
              ),

            notes:
              null,

            metadata: {
              productName:
                stock.productName,

              productCode:
                stock.productCode,

              locationName:
                stock.locationName,

              locationCode:
                stock.locationCode,

              availableQuantity:
                stock.availableQuantity -
                stock.reservedQuantity,

              maximumQuantity:
                stock.maximumQuantity,
            },

            createdAt:
              now,

            updatedAt:
              now,
          };
        },
      );

    const itemsQuery =
      db
        .insert(
          inventoryReplenishmentRequestItems,
        )
        .values(
          itemRows,
        );

    const auditQuery =
      createInventoryAuditQuery({
        tenantId,
        branchId,

        locationId:
          itemRows.length === 1
            ? itemRows[0]
                .locationId
            : null,

        productId:
          itemRows.length === 1
            ? itemRows[0]
                .productId
            : null,

        entityType:
          "Solicitud de reposición",

        entityId:
          requestId,

        action:
          "Crear",

        summary:
          `Se creó la solicitud ${reference} con ${itemRows.length} partida(s).`,

        actorClerkUserId:
          userId,

        actorName:
          requestedByName,

        before:
          null,

        after: {
          reference,

          status:
            "Solicitada",

          itemCount:
            itemRows.length,

          supplierName,

          currency,
        },

        metadata: {
          requestId,
          reference,
        },
      });

    await db.batch([
      requestQuery,
      itemsQuery,
      auditQuery,
    ]);

    return NextResponse.json(
      {
        success: true,

        message:
          "La solicitud de reposición fue creada correctamente.",

        data: {
          id:
            requestId,

          reference,

          status:
            "Solicitada",

          syncStatus:
            "Pendiente de integración",

          itemCount:
            itemRows.length,
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

export async function PATCH(
  request: Request,
) {
  try {
    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext(
      "manage",
    );

    const payload =
      (await request.json()) as
        ReplenishmentReceiptPayload;

    const requestId =
      getString(
        payload.id,
      );

    const action =
      getString(
        payload.action,
      );

    if (!requestId) {
      throw new ApiError(
        "No fue posible identificar la solicitud de reposición.",
        400,
      );
    }

    if (action !== "Recibir") {
      throw new ApiError(
        "La acción solicitada no es válida.",
        400,
      );
    }

    const [replenishmentRequest] =
      await db
        .select({
          id:
            inventoryReplenishmentRequests
              .id,

          status:
            inventoryReplenishmentRequests
              .status,

          branchId:
            inventoryReplenishmentRequests
              .branchId,

          reference:
            inventoryReplenishmentRequests
              .reference,

          currency:
            inventoryReplenishmentRequests
              .currency,
        })
        .from(
          inventoryReplenishmentRequests,
        )
        .where(
          and(
            eq(
              inventoryReplenishmentRequests
                .id,
              requestId,
            ),

            eq(
              inventoryReplenishmentRequests
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!replenishmentRequest) {
      throw new ApiError(
        "La solicitud de reposición no existe.",
        404,
      );
    }

    if (
      !canAccessBranch(
        replenishmentRequest.branchId,
        branchAccess,
      )
    ) {
      throw new ApiError(
        "No tienes acceso a esta solicitud de reposición.",
        403,
      );
    }

    if (
      replenishmentRequest.status ===
      "Recibida"
    ) {
      throw new ApiError(
        "La solicitud ya fue recibida.",
        409,
      );
    }

    if (
      replenishmentRequest.status ===
      "Cancelada"
    ) {
      throw new ApiError(
        "No es posible recibir una solicitud cancelada.",
        409,
      );
    }

        if (
      !Array.isArray(
        payload.items,
      ) ||
      payload.items.length ===
        0
    ) {
      throw new ApiError(
        "Captura al menos una partida para recibir.",
        400,
      );
    }

    const requestItems =
      await db
        .select({
          id:
            inventoryReplenishmentRequestItems
              .id,

          stockId:
            inventoryReplenishmentRequestItems
              .stockId,

          branchId:
            inventoryReplenishmentRequestItems
              .branchId,

          locationId:
            inventoryReplenishmentRequestItems
              .locationId,

          productId:
            inventoryReplenishmentRequestItems
              .productId,

          productName:
            crmProducts.name,

          requestedQuantity:
            inventoryReplenishmentRequestItems
              .requestedQuantity,

          receivedQuantity:
            inventoryReplenishmentRequestItems
              .receivedQuantity,

          currentUnitCost:
            inventoryReplenishmentRequestItems
              .unitCost,

          stockQuantity:
            inventoryStocks.quantity,

          stockAverageUnitCost:
            inventoryStocks
              .averageUnitCost,

          stockLastUnitCost:
            inventoryStocks
              .lastUnitCost,
        })
        .from(
          inventoryReplenishmentRequestItems,
        )
        .innerJoin(
          inventoryStocks,
          and(
            eq(
              inventoryReplenishmentRequestItems
                .stockId,
              inventoryStocks.id,
            ),
            eq(
              inventoryStocks
                .tenantId,
              tenantId,
            ),
          ),
        )
        .innerJoin(
          crmProducts,
          and(
            eq(
              inventoryReplenishmentRequestItems
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
              inventoryReplenishmentRequestItems
                .tenantId,
              tenantId,
            ),
            eq(
              inventoryReplenishmentRequestItems
                .requestId,
              requestId,
            ),
          ),
        );

    const requestItemsById =
      new Map(
        requestItems.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      );

    const receiptItems =
      payload.items.map(
        (
          rawItem,
          index,
        ) => {
          if (
            !rawItem ||
            typeof rawItem !==
              "object" ||
            Array.isArray(
              rawItem,
            )
          ) {
            throw new ApiError(
              `La partida ${index + 1} no tiene un formato válido.`,
              400,
            );
          }

          const itemId =
            getString(
              rawItem.id,
            );

          const receivedQuantity =
            getPositiveInteger(
              rawItem.receivedQuantity,
            );

          const unitCostValue =
            rawItem.unitCost ===
              null ||
            rawItem.unitCost ===
              undefined ||
            rawItem.unitCost ===
              ""
              ? undefined
              : Number(
                  rawItem.unitCost,
                );

          if (!itemId) {
            throw new ApiError(
              `No fue posible identificar la partida ${index + 1}.`,
              400,
            );
          }

          if (
            receivedQuantity ===
              undefined
          ) {
            throw new ApiError(
              `La cantidad recibida de la partida ${index + 1} debe ser un entero mayor que cero.`,
              400,
            );
          }

          if (
            unitCostValue !==
              undefined &&
            (
              !Number.isFinite(
                unitCostValue,
              ) ||
              unitCostValue < 0
            )
          ) {
            throw new ApiError(
              `El costo unitario de la partida ${index + 1} no es válido.`,
              400,
            );
          }

          const existingItem =
            requestItemsById.get(
              itemId,
            );

          if (!existingItem) {
            throw new ApiError(
              `La partida ${index + 1} no pertenece a esta solicitud.`,
              400,
            );
          }

          const pendingQuantity =
            existingItem
              .requestedQuantity -
            existingItem
              .receivedQuantity;

          if (
            receivedQuantity >
            pendingQuantity
          ) {
            throw new ApiError(
              `"${existingItem.productName}" tiene ${pendingQuantity} unidad(es) pendientes por recibir.`,
              409,
            );
          }

          const fallbackUnitCost =
            Number(
              existingItem
                .currentUnitCost ??
              existingItem
                .stockLastUnitCost ??
              existingItem
                .stockAverageUnitCost ??
              0,
            );

          const unitCost =
            unitCostValue ??
            (
              Number.isFinite(
                fallbackUnitCost,
              )
                ? fallbackUnitCost
                : 0
            );

          return {
            ...existingItem,

            receivedNow:
              receivedQuantity,

            unitCost:
              Math.round(
                unitCost *
                  100,
              ) / 100,
          };
        },
      );

    const receiptItemIds =
      receiptItems.map(
        (item) =>
          item.id,
      );

    if (
      new Set(
        receiptItemIds,
      ).size !==
      receiptItemIds.length
    ) {
      throw new ApiError(
        "La recepción contiene partidas duplicadas.",
        400,
      );
    }

    const user =
      await currentUser();

    const receivedByName =
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

    const receiptReference =
      getString(
        payload.reference,
      ) ??
      replenishmentRequest
        .reference;

    const receiptNotes =
      getString(
        payload.notes,
      );

    const stockQueries =
      receiptItems.map(
        (item) => {
          const previousQuantity =
            Number(
              item.stockQuantity,
            );

          const previousAverageCost =
            Number(
              item.stockAverageUnitCost ??
              0,
            );

          const nextQuantity =
            previousQuantity +
            item.receivedNow;

          const nextAverageCost =
            nextQuantity > 0
              ? (
                  (
                    previousQuantity *
                    (
                      Number.isFinite(
                        previousAverageCost,
                      )
                        ? previousAverageCost
                        : 0
                    )
                  ) +
                  (
                    item.receivedNow *
                    item.unitCost
                  )
                ) /
                nextQuantity
              : item.unitCost;

          const normalizedAverageCost =
            Math.round(
              nextAverageCost *
                100,
            ) / 100;

          return db
            .update(
              inventoryStocks,
            )
            .set({
              quantity:
                sql`${inventoryStocks.quantity} + ${item.receivedNow}`,

              averageUnitCost:
                String(
                  normalizedAverageCost,
                ),

              lastUnitCost:
                String(
                  item.unitCost,
                ),

              updatedAt:
                now,
            })
            .where(
              and(
                eq(
                  inventoryStocks.id,
                  item.stockId,
                ),
                eq(
                  inventoryStocks
                    .tenantId,
                  tenantId,
                ),
              ),
            );
        },
      );

    const itemUpdateQueries =
      receiptItems.map(
        (item) => {
          const nextReceivedQuantity =
            item.receivedQuantity +
            item.receivedNow;

          const totalCost =
            nextReceivedQuantity *
            item.unitCost;

          return db
            .update(
              inventoryReplenishmentRequestItems,
            )
            .set({
              receivedQuantity:
                nextReceivedQuantity,

              unitCost:
                String(
                  item.unitCost,
                ),

              totalCost:
                String(
                  Math.round(
                    totalCost *
                      100,
                  ) / 100,
                ),

              notes:
                receiptNotes ??
                null,

              updatedAt:
                now,
            })
            .where(
              and(
                eq(
                  inventoryReplenishmentRequestItems
                    .id,
                  item.id,
                ),
                eq(
                  inventoryReplenishmentRequestItems
                    .tenantId,
                  tenantId,
                ),
                eq(
                  inventoryReplenishmentRequestItems
                    .requestId,
                  requestId,
                ),
              ),
            );
        },
      );

    const movementQueries =
      receiptItems.map(
        (item) => {
          const previousQuantity =
            Number(
              item.stockQuantity,
            );

          const resultingQuantity =
            previousQuantity +
            item.receivedNow;

          const previousAverageCost =
            Number(
              item.stockAverageUnitCost ??
              0,
            );

          const resultingAverageCost =
            resultingQuantity > 0
              ? (
                  (
                    previousQuantity *
                    (
                      Number.isFinite(
                        previousAverageCost,
                      )
                        ? previousAverageCost
                        : 0
                    )
                  ) +
                  (
                    item.receivedNow *
                    item.unitCost
                  )
                ) /
                resultingQuantity
              : item.unitCost;

          return db
            .insert(
              inventoryMovements,
            )
            .values({
              id:
                crypto.randomUUID(),

              tenantId,

              branchId:
                item.branchId,

              locationId:
                item.locationId,

              productId:
                item.productId,

              stockId:
                item.stockId,

              type:
                "Entrada",

              quantity:
                item.receivedNow,

              previousQuantity,

              resultingQuantity,

              unitCost:
                String(
                  item.unitCost,
                ),

              totalCost:
                String(
                  Math.round(
                    item.receivedNow *
                      item.unitCost *
                      100,
                  ) / 100,
                ),

              resultingAverageCost:
                String(
                  Math.round(
                    resultingAverageCost *
                      100,
                  ) / 100,
                ),

              reason:
                "Recepción de reposición",

              reference:
                receiptReference,

              performedByClerkUserId:
                userId,

              performedByName:
                receivedByName,

              metadata: {
                replenishmentRequestId:
                  requestId,

                replenishmentReference:
                  replenishmentRequest
                    .reference,

                productName:
                  item.productName,

                receivedQuantity:
                  item.receivedNow,
              },

              createdAt:
                now,
            });
        },
      );

    const receivedQuantityByItem =
      new Map(
        receiptItems.map(
          (item) => [
            item.id,
            item.receivedQuantity +
              item.receivedNow,
          ],
        ),
      );

    const fullyReceived =
      requestItems.every(
        (item) =>
          (
            receivedQuantityByItem.get(
              item.id,
            ) ??
            item.receivedQuantity
          ) >=
          item.requestedQuantity,
      );

    const nextStatus =
      fullyReceived
        ? "Recibida"
        : "Recibida parcialmente";

    const requestUpdateQuery =
      db
        .update(
          inventoryReplenishmentRequests,
        )
        .set({
          status:
            nextStatus,

          receivedAt:
            fullyReceived
              ? now
              : null,

          updatedAt:
            now,

          metadata: {
            receivedByClerkUserId:
              userId,

            receivedByName,

            lastReceiptAt:
              now.toISOString(),

            lastReceiptReference:
              receiptReference,
          },
        })
        .where(
          and(
            eq(
              inventoryReplenishmentRequests
                .id,
              requestId,
            ),
            eq(
              inventoryReplenishmentRequests
                .tenantId,
              tenantId,
            ),
          ),
        );

    const auditQueries =
      receiptItems.map(
        (item) =>
          createInventoryAuditQuery({
            tenantId,

            branchId:
              item.branchId,

            locationId:
              item.locationId,

            productId:
              item.productId,

            entityType:
              "Solicitud de reposición",

            entityId:
              requestId,

            action:
              "Recibir",

            summary:
              `Se recibieron ${item.receivedNow} unidad(es) de ${item.productName} para la solicitud ${replenishmentRequest.reference}.`,

            reason:
              receiptNotes ??
              "Recepción de reposición",

            actorClerkUserId:
              userId,

            actorName:
              receivedByName,

            before: {
              status:
                replenishmentRequest
                  .status,

              quantity:
                item.stockQuantity,

              receivedQuantity:
                item.receivedQuantity,
            },

            after: {
              status:
                nextStatus,

              quantity:
                item.stockQuantity +
                item.receivedNow,

              receivedQuantity:
                item.receivedQuantity +
                item.receivedNow,

              unitCost:
                item.unitCost,

              reference:
                receiptReference,
            },

            metadata: {
              requestId,

              replenishmentReference:
                replenishmentRequest
                  .reference,

              requestItemId:
                item.id,
            },
          }),
      );

    const batchQueries = [
      ...stockQueries,
      ...itemUpdateQueries,
      ...movementQueries,
      requestUpdateQuery,
      ...auditQueries,
    ];

    await db.batch(
      batchQueries as unknown as
        Parameters<
          typeof db.batch
        >[0],
    );

    return NextResponse.json({
      success: true,

      message:
        fullyReceived
          ? "La solicitud fue recibida completamente y el inventario fue actualizado."
          : "La recepción parcial fue registrada y el inventario fue actualizado.",

      data: {
        id:
          replenishmentRequest.id,

        reference:
          replenishmentRequest
            .reference,

        status:
          nextStatus,

        receivedAt:
          fullyReceived
            ? now.toISOString()
            : null,

        receivedItems:
          receiptItems.map(
            (item) => ({
              id:
                item.id,

              productId:
                item.productId,

              productName:
                item.productName,

              quantity:
                item.receivedNow,

              unitCost:
                item.unitCost,
            }),
          ),
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}