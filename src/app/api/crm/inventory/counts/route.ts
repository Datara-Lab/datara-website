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
  inventoryCountItems,
  inventoryCounts,
  inventoryLocations,
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
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type CountPayload = {
  locationId?: unknown;
  notes?: unknown;
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

function canAccessLocation(
  branchId:
    | string
    | null,
  branchAccess:
    CRMBranchAccessContext,
): boolean {
  if (
    branchAccess.allBranches
  ) {
    return true;
  }

  return Boolean(
    branchId &&
      branchAccess.branchIds.includes(
        branchId,
      ),
  );
}

function isOpenCountConflict(
  error: unknown,
): boolean {
  let currentError =
    error;

  while (
    currentError &&
    typeof currentError ===
      "object"
  ) {
    const errorRecord =
      currentError as
        Record<string, unknown>;

    if (
      errorRecord.constraint ===
      "inventory_counts_location_open_unique"
    ) {
      return true;
    }

    currentError =
      errorRecord.cause;
  }

  return false;
}

function createErrorResponse(
  error: unknown,
) {
  if (
    isOpenCountConflict(
      error,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe un conteo abierto para esta ubicación.",
      },
      {
        status: 409,
      },
    );
  }

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
    "No fue posible procesar los conteos físicos:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar los conteos físicos.",
    },
    {
      status: 500,
    },
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
      permission,
    ),
  ]);

  return {
    tenantId: tenant.id,
    userId,
    branchAccess,
  };
}

export async function GET() {
  try {
    const {
      tenantId,
      branchAccess,
    } = await getContext(
      "view",
    );

    const locationAccessCondition =
      branchAccess.allBranches
        ? sql<boolean>`true`
        : branchAccess
              .branchIds
              .length > 0
          ? inArray(
              inventoryLocations
                .branchId,
              branchAccess
                .branchIds,
            )
          : sql<boolean>`false`;

    const countRecords =
      await db
        .select({
          id:
            inventoryCounts.id,

          reference:
            inventoryCounts
              .reference,

          status:
            inventoryCounts.status,

          notes:
            inventoryCounts.notes,

          locationId:
            inventoryCounts
              .locationId,

          locationName:
            inventoryLocations.name,

          locationCode:
            inventoryLocations.code,

          branchId:
            inventoryCounts
              .branchId,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          createdByName:
            inventoryCounts
              .createdByName,

          submittedByName:
            inventoryCounts
              .submittedByName,

          submittedAt:
            inventoryCounts
              .submittedAt,

          approvedByName:
            inventoryCounts
              .approvedByName,

          approvedAt:
            inventoryCounts
              .approvedAt,

          cancelledByName:
            inventoryCounts
              .cancelledByName,

          cancelledAt:
            inventoryCounts
              .cancelledAt,

          cancellationReason:
            inventoryCounts
              .cancellationReason,

          createdAt:
            inventoryCounts
              .createdAt,

          updatedAt:
            inventoryCounts
              .updatedAt,
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
        .leftJoin(
          tenantBranches,
          and(
            eq(
              inventoryCounts
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
              inventoryCounts
                .tenantId,
              tenantId,
            ),
            locationAccessCondition,
          ),
        )
        .orderBy(
          desc(
            inventoryCounts
              .createdAt,
          ),
        )
        .limit(100);

    const countIds =
      countRecords.map(
        (count) =>
          count.id,
      );

    const itemRecords =
      countIds.length > 0
        ? await db
            .select({
              id:
                inventoryCountItems.id,

              countId:
                inventoryCountItems
                  .countId,

              stockId:
                inventoryCountItems
                  .stockId,

              productId:
                inventoryCountItems
                  .productId,

              productName:
                crmProducts.name,

              productCode:
                crmProducts.code,

              expectedQuantity:
                inventoryCountItems
                  .expectedQuantity,

              countedQuantity:
                inventoryCountItems
                  .countedQuantity,

              difference:
                inventoryCountItems
                  .difference,

              notes:
                inventoryCountItems
                  .notes,
            })
            .from(
              inventoryCountItems,
            )
            .innerJoin(
              crmProducts,
              and(
                eq(
                  inventoryCountItems
                    .productId,
                  crmProducts.id,
                ),
                eq(
                  crmProducts
                    .tenantId,
                  tenantId,
                ),
              ),
            )
            .where(
              and(
                eq(
                  inventoryCountItems
                    .tenantId,
                  tenantId,
                ),
                inArray(
                  inventoryCountItems
                    .countId,
                  countIds,
                ),
              ),
            )
        : [];

    const itemsByCountId =
      new Map<
        string,
        typeof itemRecords
      >();

    for (
      const item of
      itemRecords
    ) {
      const currentItems =
        itemsByCountId.get(
          item.countId,
        ) ?? [];

      currentItems.push(
        item,
      );

      itemsByCountId.set(
        item.countId,
        currentItems,
      );
    }

    return NextResponse.json({
      success: true,

      data:
        countRecords.map(
          (count) => {
            const items =
              itemsByCountId.get(
                count.id,
              ) ?? [];

            return {
              ...count,

              locationLabel:
                count.locationCode
                  ? `${count.locationName} (${count.locationCode})`
                  : count.locationName,

              branchLabel:
                count.branchName
                  ? count.branchCode
                    ? `${count.branchName} (${count.branchCode})`
                    : count.branchName
                  : "Bodega independiente",

              itemCount:
                items.length,

              countedItemCount:
                items.filter(
                  (item) =>
                    item.countedQuantity !==
                    null,
                ).length,

              differenceCount:
                items.filter(
                  (item) =>
                    item.difference !==
                      null &&
                    item.difference !==
                      0,
                ).length,

              items,

              submittedAt:
                count.submittedAt
                  ?.toISOString() ??
                null,

              approvedAt:
                count.approvedAt
                  ?.toISOString() ??
                null,

              cancelledAt:
                count.cancelledAt
                  ?.toISOString() ??
                null,

              createdAt:
                count.createdAt
                  .toISOString(),

              updatedAt:
                count.updatedAt
                  .toISOString(),
            };
          },
        ),

      meta: {
        count:
          countRecords.length,

        limit: 100,
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
    } = await getContext(
      "create",
    );

    const payload =
      (await request.json()) as
        CountPayload;

    const locationId =
      getString(
        payload.locationId,
      );

    if (!locationId) {
      throw new ApiError(
        "Selecciona una ubicación para iniciar el conteo.",
        400,
      );
    }

    const notes =
      getString(
        payload.notes,
      );

    const [location] =
      await db
        .select({
          id:
            inventoryLocations.id,

          branchId:
            inventoryLocations
              .branchId,

          name:
            inventoryLocations.name,

          code:
            inventoryLocations.code,

          active:
            inventoryLocations.active,
        })
        .from(
          inventoryLocations,
        )
        .where(
          and(
            eq(
              inventoryLocations.id,
              locationId,
            ),
            eq(
              inventoryLocations
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!location) {
      throw new ApiError(
        "La ubicación seleccionada no existe.",
        404,
      );
    }

    if (!location.active) {
      throw new ApiError(
        "No puedes iniciar un conteo en una ubicación inactiva.",
        400,
      );
    }

    if (
      !canAccessLocation(
        location.branchId,
        branchAccess,
      )
    ) {
      throw new ApiError(
        "No tienes acceso a esta ubicación.",
        403,
      );
    }

    const stockRecords =
      await db
        .select({
          stockId:
            inventoryStocks.id,

          productId:
            inventoryStocks
              .productId,

          quantity:
            inventoryStocks
              .quantity,

          reservedQuantity:
            inventoryStocks
              .reservedQuantity,

          productName:
            crmProducts.name,
        })
        .from(
          inventoryStocks,
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
            eq(
              inventoryStocks
                .locationId,
              location.id,
            ),
          ),
        );

    if (
      stockRecords.length ===
      0
    ) {
      throw new ApiError(
        "La ubicación no tiene existencias inicializadas para contar.",
        400,
      );
    }

    const user =
      await currentUser();

    const createdByName =
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

    const countId =
      crypto.randomUUID();

    const now =
      new Date();

    const reference =
      `CNT-${now
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "")}-${countId
        .slice(0, 8)
        .toUpperCase()}`;

    const countQuery =
      db
        .insert(
          inventoryCounts,
        )
        .values({
          id: countId,
          tenantId,

          branchId:
            location.branchId,

          locationId:
            location.id,

          reference,

          status:
            "Borrador",

          notes:
            notes ?? null,

          createdByClerkUserId:
            userId,

          createdByName,

          metadata: {
            locationName:
              location.name,

            locationCode:
              location.code,

            initialItemCount:
              stockRecords.length,
          },

          createdAt: now,
          updatedAt: now,
        });

    const itemsQuery =
      db
        .insert(
          inventoryCountItems,
        )
        .values(
          stockRecords.map(
            (stock) => ({
              id:
                crypto.randomUUID(),

              tenantId,
              countId,

              stockId:
                stock.stockId,

              productId:
                stock.productId,

              expectedQuantity:
                stock.quantity,

              countedQuantity:
                null,

              difference:
                null,

              notes:
                null,

              metadata: {
                reservedQuantityAtStart:
                  stock
                    .reservedQuantity,

                productName:
                  stock.productName,
              },

              createdAt: now,
              updatedAt: now,
            }),
          ),
        );

    const auditQuery =
      createInventoryAuditQuery({
        tenantId,

        branchId:
          location.branchId,

        locationId:
          location.id,

        entityType:
          "Conteo físico",

        entityId:
          countId,

        action:
          "Crear",

        summary:
          `Se inició el conteo físico ${reference}.`,

        reason:
          notes ?? null,

        actorClerkUserId:
          userId,

        actorName:
          createdByName,

        before:
          null,

        after: {
          status:
            "Borrador",

          reference,

          itemCount:
            stockRecords.length,

          locationName:
            location.name,
        },
      });

    await db.batch(
      [
        countQuery,
        itemsQuery,
        auditQuery,
      ],
    );

    return NextResponse.json(
      {
        success: true,

        message:
          "El conteo físico fue iniciado correctamente.",

        data: {
          id: countId,
          reference,

          status:
            "Borrador",

          itemCount:
            stockRecords.length,
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