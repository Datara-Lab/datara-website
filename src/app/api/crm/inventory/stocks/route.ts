import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  asc,
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
  crmProductTypes,
  inventoryLocations,
  inventoryStocks,
  tenantBranches,
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

type StockConfigurationPayload = {
  stockId?: unknown;
  minimumQuantity?: unknown;
  maximumQuantity?: unknown;
  reorderPoint?: unknown;
  binLocation?: unknown;
};

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getOptionalInteger(
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

  return Number.isInteger(
    numberValue,
  )
    ? numberValue
    : undefined;
}

function getOptionalString(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  return (
    value.trim() ||
    undefined
  );
}

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

function toNumber(
  value:
    | string
    | number
    | null
    | undefined,
): number {
  const numberValue =
    Number(value ?? 0);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : 0;
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
    "No fue posible cargar el inventario:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible cargar el inventario.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
  try {
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
        "view",
      ),
    ]);

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

          code:
            inventoryLocations.code,

          type:
            inventoryLocations.type,

          isDefault:
            inventoryLocations
              .isDefault,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          regionId:
            tenantBranches.regionId,
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
              tenantBranches.tenantId,
              tenant.id,
            ),
          ),
        )
        .where(
          and(
            eq(
              inventoryLocations
                .tenantId,
              tenant.id,
            ),

            eq(
              inventoryLocations
                .active,
              true,
            ),

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
                : sql<boolean>`false`,
          ),
        )
        .orderBy(
          asc(
            inventoryLocations.name,
          ),
        );

    const products =
      await db
        .select({
          id: crmProducts.id,
          name: crmProducts.name,
          code: crmProducts.code,
          productTypeId:
            crmProductTypes.id,
          productTypeName:
            crmProductTypes.name,
          category:
            crmProducts.category,
          unitPrice:
            crmProducts.unitPrice,
          currency:
            crmProducts.currency,
        })
        .from(crmProducts)
        .innerJoin(
          crmProductTypes,
          and(
            eq(
              crmProductTypes.id,
              crmProducts.productTypeId,
            ),

            eq(
              crmProductTypes.tenantId,
              tenant.id,
            ),
          ),
        )
        .where(
          and(
            eq(
              crmProducts.tenantId,
              tenant.id,
            ),

            eq(
              crmProducts.active,
              true,
            ),

            eq(
              crmProductTypes.inventoryTracked,
              true,
            ),
          ),
        )
        .orderBy(
          asc(
            crmProducts.name,
          ),
        );

    const locationIds =
      locations.map(
        (location) =>
          location.id,
      );

    const stocks =
      locationIds.length > 0
        ? await db
            .select()
            .from(
              inventoryStocks,
            )
            .where(
              and(
                eq(
                  inventoryStocks
                    .tenantId,
                  tenant.id,
                ),
                inArray(
                  inventoryStocks
                    .locationId,
                  locationIds,
                ),
              ),
            )
        : [];

    const stockByKey =
      new Map(
        stocks.map(
          (stock) => [
            `${stock.locationId}:${stock.productId}`,
            stock,
          ],
        ),
      );

    const data =
      locations.flatMap(
        (location) =>
          products.map(
            (product) => {
              const stock =
                stockByKey.get(
                  `${location.id}:${product.id}`,
                );

              const quantity =
                stock?.quantity ??
                0;

              const reservedQuantity =
                stock
                  ?.reservedQuantity ??
                0;

              const availableQuantity =
                quantity -
                reservedQuantity;

              const minimumQuantity =
                stock
                  ?.minimumQuantity ??
                0;

              const averageUnitCost =
                toNumber(
                  stock
                    ?.averageUnitCost,
                );

              const unitPrice =
                toNumber(
                  product.unitPrice,
                );

              const status =
                !stock
                  ? "Sin inicializar"
                  : availableQuantity <=
                      0
                    ? "Agotado"
                    : minimumQuantity >
                          0 &&
                        availableQuantity <=
                          minimumQuantity
                      ? "Bajo"
                      : "Disponible";

              const branchLabel =
                location.branchName
                  ? location.branchCode
                    ? `${location.branchName} (${location.branchCode})`
                    : location.branchName
                  : null;

              const locationLabel =
                location.code
                  ? `${location.name} (${location.code})`
                  : location.name;

              return {
                id:
                  stock?.id ??
                  `${location.id}:${product.id}`,

                stockId:
                  stock?.id ??
                  null,

                initialized:
                  Boolean(stock),

                branchId:
                  location.branchId,

                branchName:
                  branchLabel ??
                  "Ubicación independiente",

                regionId:
                  location.regionId,

                locationId:
                  location.id,

                locationName:
                  location.name,

                locationLabel,

                locationType:
                  location.type,

                isDefaultLocation:
                  location.isDefault,

                productId:
                  product.id,

                productName:
                  product.name,

                productCode:
                  product.code,

                productTypeId:
                  product.productTypeId,

                productTypeName:
                  product.productTypeName,

                category:
                  product.category,

                quantity,

                reservedQuantity,

                availableQuantity,

                minimumQuantity,

                maximumQuantity:
                  stock
                    ?.maximumQuantity ??
                  null,

                reorderPoint:
                  stock
                    ?.reorderPoint ??
                  null,

                binLocation:
                  stock?.location ??
                  null,

                currency:
                  product.currency,

                averageUnitCost:
                  permissions.canManage
                    ? averageUnitCost
                    : null,

                lastUnitCost:
                  permissions.canManage
                    ? toNumber(
                        stock
                          ?.lastUnitCost,
                      )
                    : null,

                inventoryValue:
                  permissions.canManage
                    ? quantity *
                      averageUnitCost
                    : null,

                unitPrice,

                commercialValue:
                  quantity *
                  unitPrice,

                status,

                updatedAt:
                  stock?.updatedAt
                    ?.toISOString() ??
                  null,
              };
            },
          ),
      );

    const calculatedSummary =
      data.reduce(
        (
          totals,
          item,
        ) => {
          totals.totalUnits +=
            item.quantity;

          totals.availableUnits +=
            item.availableQuantity;

          totals.reservedUnits +=
            item.reservedQuantity;

          totals.commercialValue +=
            item.commercialValue;

          if (
            item.inventoryValue !==
            null
          ) {
            totals.inventoryValue +=
              item.inventoryValue;
          }

          if (
            item.status ===
            "Agotado"
          ) {
            totals.outOfStock +=
              1;
          }

          if (
            item.status ===
            "Bajo"
          ) {
            totals.lowStock +=
              1;
          }

          if (
            item.status ===
            "Sin inicializar"
          ) {
            totals.uninitialized +=
              1;
          }

          return totals;
        },
        {
          totalUnits: 0,
          availableUnits: 0,
          reservedUnits: 0,
          inventoryValue: 0,
          commercialValue: 0,
          lowStock: 0,
          outOfStock: 0,
          uninitialized: 0,
        },
      );

    const alertsByProduct =
      new Map<
        string,
        {
          initialized: boolean;
          availableQuantity:
            number;
          minimumQuantity:
            number;
        }
      >();

    for (const item of data) {
      const current =
        alertsByProduct.get(
          item.productId,
        ) ?? {
          initialized: false,
          availableQuantity: 0,
          minimumQuantity: 0,
        };

      if (item.initialized) {
        current.initialized =
          true;

        current.availableQuantity +=
          item.availableQuantity;

        current.minimumQuantity +=
          item.minimumQuantity;
      }

      alertsByProduct.set(
        item.productId,
        current,
      );
    }

    calculatedSummary.lowStock =
      0;

    calculatedSummary.outOfStock =
      0;

    calculatedSummary.uninitialized =
      0;

    for (
      const productAlert of
        alertsByProduct.values()
    ) {
      if (
        !productAlert.initialized
      ) {
        calculatedSummary
          .uninitialized += 1;

        continue;
      }

      if (
        productAlert
          .availableQuantity <= 0
      ) {
        calculatedSummary
          .outOfStock += 1;

        continue;
      }

      if (
        productAlert
          .availableQuantity <=
        productAlert
          .minimumQuantity
      ) {
        calculatedSummary
          .lowStock += 1;
      }
    }

    const branchesById =
      new Map<
        string,
        {
          value: string;
          label: string;
        }
      >();

    for (
      const location of
      locations
    ) {
      if (
        !location.branchId ||
        !location.branchName
      ) {
        continue;
      }

      branchesById.set(
        location.branchId,
        {
          value:
            location.branchId,

          label:
            location.branchCode
              ? `${location.branchName} (${location.branchCode})`
              : location.branchName,
        },
      );
    }

    return NextResponse.json({
      success: true,

      data,

      summary: {
        ...calculatedSummary,

        inventoryValue:
          permissions.canManage
            ? calculatedSummary
                .inventoryValue
            : null,
      },

      locations:
        locations.map(
          (location) => ({
            value:
              location.id,

            label:
              location.code
                ? `${location.name} (${location.code})`
                : location.name,

            branchId:
              location.branchId,

            type:
              location.type,

            isDefault:
              location.isDefault,
          }),
        ),

      branches:
        Array.from(
          branchesById.values(),
        ),

      primaryBranchId:
        branchAccess
          .primaryBranchId,

      permissions: {
        canView:
          permissions.canView,

        canCreate:
          permissions.canCreate,

        canEdit:
          permissions.canEdit,

        canManage:
          permissions.canManage,

        canViewCost:
          permissions.canManage,
      },
    });
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

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values =
      body as
        StockConfigurationPayload;

    const stockId =
      getOptionalString(
        values.stockId,
      );

    if (!stockId) {
      throw new ApiError(
        "No fue posible identificar la existencia.",
        400,
      );
    }

    const minimumQuantity =
      getOptionalInteger(
        values.minimumQuantity,
      );

    const maximumQuantity =
      getOptionalInteger(
        values.maximumQuantity,
      );

    const reorderPoint =
      getOptionalInteger(
        values.reorderPoint,
      );

    if (
      minimumQuantity ===
        undefined ||
      minimumQuantity < 0
    ) {
      throw new ApiError(
        "La existencia mínima debe ser un entero igual o mayor que cero.",
        400,
      );
    }

    if (
      maximumQuantity !==
        undefined &&
      maximumQuantity < 0
    ) {
      throw new ApiError(
        "La existencia máxima debe ser un entero igual o mayor que cero.",
        400,
      );
    }

    if (
      maximumQuantity !==
        undefined &&
      maximumQuantity <
        minimumQuantity
    ) {
      throw new ApiError(
        "La existencia máxima no puede ser menor que la mínima.",
        400,
      );
    }

    if (
      reorderPoint !==
        undefined &&
      reorderPoint < 0
    ) {
      throw new ApiError(
        "El punto de reorden debe ser un entero igual o mayor que cero.",
        400,
      );
    }

    if (
      maximumQuantity !==
        undefined &&
      reorderPoint !==
        undefined &&
      reorderPoint >
        maximumQuantity
    ) {
      throw new ApiError(
        "El punto de reorden no puede superar la existencia máxima.",
        400,
      );
    }

    const [existingStock] =
      await db
        .select({
          id:
            inventoryStocks.id,

          branchId:
            inventoryLocations
              .branchId,

          locationId:
            inventoryStocks
              .locationId,

          productId:
            inventoryStocks
              .productId,

          minimumQuantity:
            inventoryStocks
              .minimumQuantity,

          maximumQuantity:
            inventoryStocks
              .maximumQuantity,

          reorderPoint:
            inventoryStocks
              .reorderPoint,

          binLocation:
            inventoryStocks
              .location,
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
              tenant.id,
            ),
          ),
        )
        .where(
          and(
            eq(
              inventoryStocks.id,
              stockId,
            ),
            eq(
              inventoryStocks
                .tenantId,
              tenant.id,
            ),
          ),
        )
        .limit(1);

    if (!existingStock) {
      throw new ApiError(
        "La existencia no existe.",
        404,
      );
    }

    if (
      !branchAccess.allBranches &&
      (
        !existingStock.branchId ||
        !branchAccess.branchIds.includes(
          existingStock.branchId,
        )
      )
    ) {
      throw new ApiError(
        "No tienes acceso a esta ubicación de inventario.",
        403,
      );
    }

    const normalizedBinLocation =
      getOptionalString(
        values.binLocation,
      ) ?? null;

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

    const now =
      new Date();

    const stockQuery =
      db
        .update(
          inventoryStocks,
        )
        .set({
          minimumQuantity,

          maximumQuantity:
            maximumQuantity ??
            null,

          reorderPoint:
            reorderPoint ??
            null,

          location:
            normalizedBinLocation,

          updatedAt:
            now,
        })
        .where(
          and(
            eq(
              inventoryStocks.id,
              stockId,
            ),
            eq(
              inventoryStocks
                .tenantId,
              tenant.id,
            ),
          ),
        );

    const auditQuery =
      createInventoryAuditQuery({
        tenantId:
          tenant.id,

        branchId:
          existingStock.branchId,

        locationId:
          existingStock.locationId,

        productId:
          existingStock.productId,

        entityType:
          "Configuración de stock",

        entityId:
          stockId,

        action:
          "Actualizar parámetros",

        summary:
          "Se actualizó la configuración operativa del inventario.",

        actorClerkUserId:
          userId,

        actorName,

        before: {
          minimumQuantity:
            existingStock
              .minimumQuantity,

          maximumQuantity:
            existingStock
              .maximumQuantity,

          reorderPoint:
            existingStock
              .reorderPoint,

          binLocation:
            existingStock
              .binLocation,
        },

        after: {
          minimumQuantity,

          maximumQuantity:
            maximumQuantity ??
            null,

          reorderPoint:
            reorderPoint ??
            null,

          binLocation:
            normalizedBinLocation,
        },
      });

    await db.batch([
      stockQuery,
      auditQuery,
    ]);

    const updatedStock = {
      id:
        stockId,

      minimumQuantity,

      maximumQuantity:
        maximumQuantity ??
        null,

      reorderPoint:
        reorderPoint ??
        null,

      binLocation:
        normalizedBinLocation,
    };

    return NextResponse.json({
      success: true,

      message:
        "La configuración de inventario fue actualizada correctamente.",

      data:
        updatedStock,
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}
