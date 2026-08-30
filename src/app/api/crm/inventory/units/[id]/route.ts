import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
} from "drizzle-orm";

import { NextResponse } from "next/server";

import { db } from "@/db";

import {
  crmProducts,
  inventoryLocations,
  inventoryUnits,
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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdatePayload = {
  action?: unknown;
  vin?: unknown;
  serialNumber?: unknown;
  modelYear?: unknown;
  color?: unknown;
  receivedAt?: unknown;
  unitCost?: unknown;
  listPrice?: unknown;
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

function getNullableString(
  value: unknown,
) {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  return getString(value);
}

function getMoney(
  value: unknown,
) {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? Math.round(parsed * 100) /
        100
    : undefined;
}

function getYear(
  value: unknown,
) {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (value === undefined) {
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
) {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

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
          "Ya existe otra unidad con ese VIN o número de serie.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(
    "No fue posible actualizar la unidad física:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible actualizar la unidad física.",
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
      id: unitId,
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
          "edit",
        ),
      ]);

    const [unit] =
      await db
        .select({
          id: inventoryUnits.id,
          branchId:
            inventoryUnits.branchId,
          locationId:
            inventoryUnits.locationId,
          productId:
            inventoryUnits.productId,
          productName:
            crmProducts.name,
          vin: inventoryUnits.vin,
          serialNumber:
            inventoryUnits.serialNumber,
          modelYear:
            inventoryUnits.modelYear,
          color:
            inventoryUnits.color,
          receivedAt:
            inventoryUnits.receivedAt,
          unitCost:
            inventoryUnits.unitCost,
          listPrice:
            inventoryUnits.listPrice,
          status:
            inventoryUnits.status,
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
              tenant.id,
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
              tenant.id,
            ),
          ),
        )
        .where(
          and(
            eq(
              inventoryUnits.id,
              unitId,
            ),
            eq(
              inventoryUnits.tenantId,
              tenant.id,
            ),
          ),
        )
        .limit(1);

    if (!unit) {
      throw new ApiError(
        "La unidad física no existe.",
        404,
      );
    }

    if (
      !unit.branchId ||
      (!branchAccess.allBranches &&
        !branchAccess.branchIds.includes(
          unit.branchId,
        ))
    ) {
      throw new ApiError(
        "No tienes acceso a la sucursal de esta unidad.",
        403,
      );
    }

    const payload =
      (await request.json()) as
        UpdatePayload;

    const action =
      getString(payload.action) ??
      "update_details";

    if (
      action === "update_details"
    ) {
      if (
        unit.status !== "available" &&
        unit.status !== "unavailable"
      ) {
        throw new ApiError(
          "Una unidad apartada, vendida o entregada no puede editarse desde inventarios.",
          409,
        );
      }
    } else if (
      action === "set_unavailable"
    ) {
      if (unit.status !== "available") {
        throw new ApiError(
          "Solo una unidad disponible puede marcarse como no disponible.",
          409,
        );
      }

      if (!getString(payload.reason)) {
        throw new ApiError(
          "Captura el motivo por el que la unidad deja de estar disponible.",
          400,
        );
      }
    } else if (
      action === "restore_available"
    ) {
      if (
        unit.status !== "unavailable"
      ) {
        throw new ApiError(
          "Solo una unidad no disponible puede restaurarse.",
          409,
        );
      }
    } else {
      throw new ApiError(
        "La acción solicitada no es válida.",
        400,
      );
    }

    const vin =
      getNullableString(
        payload.vin,
      );

    const serialNumber =
      getNullableString(
        payload.serialNumber,
      );

    const modelYear =
      getYear(payload.modelYear);

    const receivedAt =
      getDate(payload.receivedAt);

    const unitCost =
      getMoney(payload.unitCost);

    const listPrice =
      getMoney(payload.listPrice);

    if (
      payload.modelYear !==
        undefined &&
      modelYear === undefined
    ) {
      throw new ApiError(
        "El año del modelo no es válido.",
        400,
      );
    }

    if (
      payload.receivedAt !==
        undefined &&
      receivedAt === undefined
    ) {
      throw new ApiError(
        "La fecha de ingreso no es válida.",
        400,
      );
    }

    if (
      payload.unitCost !== undefined &&
      unitCost === undefined
    ) {
      throw new ApiError(
        "El costo de la unidad no es válido.",
        400,
      );
    }

    if (
      payload.listPrice !==
        undefined &&
      listPrice === undefined
    ) {
      throw new ApiError(
        "El precio de la unidad no es válido.",
        400,
      );
    }

    const nextStatus =
      action === "set_unavailable"
        ? "unavailable"
        : action ===
            "restore_available"
          ? "available"
          : unit.status;

    const updateValues =
      action === "update_details"
        ? {
            vin:
              vin === undefined
                ? unit.vin
                : vin?.toUpperCase() ??
                  null,
            serialNumber:
              serialNumber === undefined
                ? unit.serialNumber
                : serialNumber
                    ?.toUpperCase() ??
                  null,
            modelYear:
              modelYear === undefined
                ? unit.modelYear
                : modelYear,
            color:
              payload.color ===
              undefined
                ? unit.color
                : getNullableString(
                    payload.color,
                  ) ?? null,
            receivedAt:
              receivedAt === undefined
                ? unit.receivedAt
                : receivedAt,
            unitCost:
              unitCost === undefined
                ? unit.unitCost
                : unitCost === null
                  ? null
                  : String(unitCost),
            listPrice:
              listPrice === undefined
                ? unit.listPrice
                : listPrice === null
                  ? null
                  : String(listPrice),
            updatedAt: new Date(),
          }
        : {
            status: nextStatus,
            updatedAt: new Date(),
          };

    const [updatedUnit] =
      await db
        .update(inventoryUnits)
        .set(updateValues)
        .where(
          and(
            eq(
              inventoryUnits.id,
              unit.id,
            ),
            eq(
              inventoryUnits.tenantId,
              tenant.id,
            ),
            eq(
              inventoryUnits.status,
              unit.status,
            ),
          ),
        )
        .returning({
          id: inventoryUnits.id,
          status:
            inventoryUnits.status,
        });

    if (!updatedUnit) {
      throw new ApiError(
        "La unidad cambió mientras se procesaba la solicitud. Actualiza e inténtalo nuevamente.",
        409,
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
        tenantId: tenant.id,
        branchId: unit.branchId,
        locationId:
          unit.locationId,
        productId:
          unit.productId,
        entityType:
          "Unidad física",
        entityId: unit.id,
        action:
          action ===
          "update_details"
            ? "Actualizar ficha"
            : action ===
                "set_unavailable"
              ? "Marcar no disponible"
              : "Restaurar disponibilidad",
        summary:
          `Se actualizó la unidad ${unit.vin ?? unit.serialNumber ?? unit.id} de ${unit.productName}.`,
        reason:
          getString(
            payload.reason,
          ),
        actorClerkUserId:
          userId,
        actorName,
        before: {
          vin: unit.vin,
          serialNumber:
            unit.serialNumber,
          modelYear:
            unit.modelYear,
          color: unit.color,
          receivedAt:
            unit.receivedAt,
          unitCost:
            unit.unitCost,
          listPrice:
            unit.listPrice,
          status: unit.status,
        },
        after: {
          ...updateValues,
          status: nextStatus,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        action === "update_details"
          ? "La ficha de la unidad fue actualizada correctamente."
          : action ===
              "set_unavailable"
            ? "La unidad fue marcada como no disponible."
            : "La unidad volvió a estar disponible.",
      data: updatedUnit,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
