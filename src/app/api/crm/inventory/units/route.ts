import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  asc,
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
  inventoryStocks,
  inventoryUnits,
  tenantBranches,
  tenants,
} from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
} from "@/lib/crm/branch-access";

import {
  CRMIndustryCapabilityError,
  requireCRMIndustryCapability,
} from "@/lib/crm/industry-capabilities";

import {
  createInventoryAuditQuery,
} from "@/lib/crm/inventory-audit";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type UnitPayload = {
  stockId?: unknown;
  vin?: unknown;
  serialNumber?: unknown;
  modelYear?: unknown;
  color?: unknown;
  receivedAt?: unknown;
  unitCost?: unknown;
  listPrice?: unknown;
  externalSystem?: unknown;
  externalId?: unknown;
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
  return typeof value === "string"
    ? value.trim() || undefined
    : undefined;
}

function getMoney(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? Math.round(parsed * 100) /
        100
    : undefined;
}

function getModelYear(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed >= 1900 &&
    parsed <= 2200
    ? parsed
    : undefined;
}

function getDate(
  value: unknown,
): Date | undefined {
  const normalized =
    getString(value);

  if (!normalized) {
    return undefined;
  }

  const parsed =
    new Date(normalized);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? undefined
    : parsed;
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
    error instanceof
      CRMBranchAccessError ||
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

  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof error.cause ===
      "object" &&
    error.cause !== null &&
    "code" in error.cause &&
    error.cause.code === "23505"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe una unidad con ese VIN, número de serie o referencia externa.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(
    "No fue posible administrar las unidades físicas:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible administrar las unidades físicas.",
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
          tenants.clerkOrganizationId,
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

  await requireCRMIndustryCapability(
    tenant.id,
    "motorcycle_commercial_cycle",
  );

  const [branchAccess] =
    await Promise.all([
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

    const status =
      getString(
        url.searchParams.get(
          "status",
        ),
      );

    const branchId =
      getString(
        url.searchParams.get(
          "branchId",
        ),
      );

    const productId =
      getString(
        url.searchParams.get(
          "productId",
        ),
      );

    const allowedStatuses =
      new Set([
        "available",
        "reserved",
        "sold",
        "delivered",
        "unavailable",
      ]);

    if (
      status &&
      !allowedStatuses.has(status)
    ) {
      throw new ApiError(
        "El estado solicitado no es válido.",
        400,
      );
    }

    if (
      branchId &&
      !branchAccess.allBranches &&
      !branchAccess.branchIds.includes(
        branchId,
      )
    ) {
      throw new ApiError(
        "No tienes acceso a la sucursal solicitada.",
        403,
      );
    }

    const branchCondition =
      branchId
        ? eq(
            inventoryUnits.branchId,
            branchId,
          )
        : branchAccess.allBranches
          ? sql<boolean>`true`
          : branchAccess.branchIds
                .length > 0
            ? inArray(
                inventoryUnits.branchId,
                branchAccess.branchIds,
              )
            : sql<boolean>`false`;

    const units =
      await db
        .select({
          id: inventoryUnits.id,
          branchId:
            inventoryUnits.branchId,
          branchName:
            tenantBranches.name,
          branchCode:
            tenantBranches.code,
          locationId:
            inventoryUnits.locationId,
          locationName:
            inventoryLocations.name,
          locationCode:
            inventoryLocations.code,
          productId:
            inventoryUnits.productId,
          productName:
            crmProducts.name,
          productCode:
            crmProducts.code,
          stockId:
            inventoryUnits.stockId,
          vin: inventoryUnits.vin,
          serialNumber:
            inventoryUnits.serialNumber,
          modelYear:
            inventoryUnits.modelYear,
          color:
            inventoryUnits.color,
          status:
            inventoryUnits.status,
          receivedAt:
            inventoryUnits.receivedAt,
          unitCost:
            inventoryUnits.unitCost,
          listPrice:
            inventoryUnits.listPrice,
          soldAt:
            inventoryUnits.soldAt,
          deliveredAt:
            inventoryUnits.deliveredAt,
          externalSystem:
            inventoryUnits.externalSystem,
          externalId:
            inventoryUnits.externalId,
          createdAt:
            inventoryUnits.createdAt,
          updatedAt:
            inventoryUnits.updatedAt,
        })
        .from(inventoryUnits)
        .innerJoin(
          inventoryLocations,
          and(
            eq(
              inventoryUnits.locationId,
              inventoryLocations.id,
            ),
            eq(
              inventoryLocations.tenantId,
              tenantId,
            ),
          ),
        )
        .innerJoin(
          crmProducts,
          and(
            eq(
              inventoryUnits.productId,
              crmProducts.id,
            ),
            eq(
              crmProducts.tenantId,
              tenantId,
            ),
          ),
        )
        .leftJoin(
          tenantBranches,
          and(
            eq(
              inventoryUnits.branchId,
              tenantBranches.id,
            ),
            eq(
              tenantBranches.tenantId,
              tenantId,
            ),
          ),
        )
        .where(
          and(
            eq(
              inventoryUnits.tenantId,
              tenantId,
            ),
            branchCondition,
            status
              ? eq(
                  inventoryUnits.status,
                  status,
                )
              : undefined,
            productId
              ? eq(
                  inventoryUnits.productId,
                  productId,
                )
              : undefined,
          ),
        )
        .orderBy(
          asc(inventoryUnits.status),
          desc(
            inventoryUnits.receivedAt,
          ),
          desc(
            inventoryUnits.createdAt,
          ),
        );

    const now = Date.now();

    return NextResponse.json({
      success: true,
      data: units.map(
        (unit) => ({
          ...unit,
          unitCost:
            unit.unitCost === null
              ? null
              : Number(
                  unit.unitCost,
                ),
          listPrice:
            unit.listPrice === null
              ? null
              : Number(
                  unit.listPrice,
                ),
          daysInInventory:
            unit.receivedAt
              ? Math.max(
                  0,
                  Math.floor(
                    (now -
                      unit.receivedAt
                        .getTime()) /
                      86_400_000,
                  ),
                )
              : null,
        }),
      ),
    });
  } catch (error) {
    return createErrorResponse(error);
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
        UnitPayload;

    const stockId =
      getString(payload.stockId);

    const vin =
      getString(payload.vin)
        ?.toUpperCase();

    const serialNumber =
      getString(
        payload.serialNumber,
      )?.toUpperCase();

    if (!stockId) {
      throw new ApiError(
        "Selecciona una existencia de inventario.",
        400,
      );
    }

    if (!vin && !serialNumber) {
      throw new ApiError(
        "Captura el VIN o número de serie de la unidad.",
        400,
      );
    }

    if (vin && vin.length > 64) {
      throw new ApiError(
        "El VIN no puede exceder 64 caracteres.",
        400,
      );
    }

    const rawModelYear =
      payload.modelYear;

    const modelYear =
      getModelYear(rawModelYear);

    if (
      rawModelYear !== null &&
      rawModelYear !== undefined &&
      rawModelYear !== "" &&
      modelYear === undefined
    ) {
      throw new ApiError(
        "El año del modelo no es válido.",
        400,
      );
    }

    const unitCost =
      getMoney(payload.unitCost);

    const listPrice =
      getMoney(payload.listPrice);

    if (
      payload.unitCost !== null &&
      payload.unitCost !==
        undefined &&
      payload.unitCost !== "" &&
      unitCost === undefined
    ) {
      throw new ApiError(
        "El costo de la unidad no es válido.",
        400,
      );
    }

    if (
      payload.listPrice !== null &&
      payload.listPrice !==
        undefined &&
      payload.listPrice !== "" &&
      listPrice === undefined
    ) {
      throw new ApiError(
        "El precio de la unidad no es válido.",
        400,
      );
    }

    const rawReceivedAt =
      payload.receivedAt;

    const receivedAt =
      rawReceivedAt === null ||
      rawReceivedAt === undefined ||
      rawReceivedAt === ""
        ? new Date()
        : getDate(rawReceivedAt);

    if (!receivedAt) {
      throw new ApiError(
        "La fecha de ingreso no es válida.",
        400,
      );
    }

    const [stock] =
      await db
        .select({
          id: inventoryStocks.id,
          branchId:
            inventoryLocations.branchId,
          locationId:
            inventoryStocks.locationId,
          productId:
            inventoryStocks.productId,
          locationName:
            inventoryLocations.name,
          productName:
            crmProducts.name,
        })
        .from(inventoryStocks)
        .innerJoin(
          inventoryLocations,
          and(
            eq(
              inventoryStocks.locationId,
              inventoryLocations.id,
            ),
            eq(
              inventoryLocations.tenantId,
              tenantId,
            ),
          ),
        )
        .innerJoin(
          crmProducts,
          and(
            eq(
              inventoryStocks.productId,
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
              inventoryStocks.id,
              stockId,
            ),
            eq(
              inventoryStocks.tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!stock) {
      throw new ApiError(
        "La existencia seleccionada no existe.",
        404,
      );
    }

    if (
      !stock.branchId ||
      (!branchAccess.allBranches &&
        !branchAccess.branchIds.includes(
          stock.branchId,
        ))
    ) {
      throw new ApiError(
        "No tienes acceso a la sucursal de esta existencia.",
        403,
      );
    }

    const now = new Date();

    const [createdUnit] =
      await db
        .insert(inventoryUnits)
        .values({
          tenantId,
          branchId:
            stock.branchId,
          locationId:
            stock.locationId,
          productId:
            stock.productId,
          stockId:
            stock.id,
          vin: vin ?? null,
          serialNumber:
            serialNumber ?? null,
          modelYear:
            modelYear ?? null,
          color:
            getString(
              payload.color,
            ) ?? null,
          status: "available",
          receivedAt,
          unitCost:
            unitCost === undefined
              ? null
              : String(unitCost),
          listPrice:
            listPrice === undefined
              ? null
              : String(listPrice),
          externalSystem:
            getString(
              payload.externalSystem,
            ) ?? null,
          externalId:
            getString(
              payload.externalId,
            ) ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: inventoryUnits.id,
          status:
            inventoryUnits.status,
        });

    if (!createdUnit) {
      throw new ApiError(
        "No fue posible registrar la unidad.",
        500,
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

    await db.batch([
      createInventoryAuditQuery({
        tenantId,
        branchId:
          stock.branchId,
        locationId:
          stock.locationId,
        productId:
          stock.productId,
        entityType:
          "Unidad física",
        entityId:
          createdUnit.id,
        action:
          "Registrar",
        summary:
          `Se registró la unidad ${vin ?? serialNumber} de ${stock.productName}.`,
        actorClerkUserId:
          userId,
        actorName,
        after: {
          vin: vin ?? null,
          serialNumber:
            serialNumber ?? null,
          modelYear:
            modelYear ?? null,
          color:
            getString(
              payload.color,
            ) ?? null,
          status: "available",
          locationName:
            stock.locationName,
          unitCost:
            unitCost ?? null,
          listPrice:
            listPrice ?? null,
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message:
          "La unidad física fue registrada correctamente.",
        data: {
          id: createdUnit.id,
          status:
            createdUnit.status,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
