import { auth, currentUser } from "@clerk/nextjs/server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { NextResponse } from "next/server";

import { db } from "@/db";

import { inventoryLocations, tenantBranches, tenants } from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
  validateCRMBranchId,
  type CRMBranchAccessContext,
} from "@/lib/crm/branch-access";

import { createInventoryAuditQuery } from "@/lib/crm/inventory-audit";

import {
  CRMPermissionError,
  requireCRMModulePermission,
  type CRMModulePermissions,
} from "@/lib/crm/permissions";

import { syncBranchInventoryLocations } from "@/lib/crm/sync-branch-inventory-locations";

export const dynamic = "force-dynamic";

type LocationPayload = {
  id?: unknown;

  branchId?: unknown;

  name?: unknown;
  code?: unknown;
  type?: unknown;

  active?: unknown;
  isDefault?: unknown;

  addressLine?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  country?: unknown;
};

type InventoryContext = {
  tenantId: string;
  userId: string;

  branchAccess: CRMBranchAccessContext;

  permissions: CRMModulePermissions;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function getBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCode(value: unknown): string | null {
  return getOptionalString(value)?.toUpperCase() ?? null;
}

async function getInventoryContext(
  requiredPermission: "view" | "manage",
): Promise<InventoryContext> {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new ApiError("No autenticado.", 401);
  }

  if (!orgId) {
    throw new ApiError("No hay una organización activa.", 400);
  }

  const [tenant] = await db
    .select({
      id: tenants.id,
    })
    .from(tenants)
    .where(eq(tenants.clerkOrganizationId, orgId))
    .limit(1);

  if (!tenant) {
    throw new ApiError("La empresa aún no está sincronizada.", 404);
  }

  const [branchAccess, permissions] = await Promise.all([
    getCRMBranchAccess(tenant.id, userId),

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

function createErrorResponse(error: unknown) {
  if (
    error instanceof ApiError ||
    error instanceof CRMBranchAccessError ||
    error instanceof CRMPermissionError
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

  const databaseError = error as {
    cause?: {
      code?: string;
    };
    code?: string;
  };

  const code = databaseError.cause?.code ?? databaseError.code;

  if (code === "23505") {
    return NextResponse.json(
      {
        success: false,
        error: "Ya existe una ubicación con ese código.",
      },
      {
        status: 409,
      },
    );
  }

  console.error("No fue posible procesar la ubicación de inventario:", error);

  return NextResponse.json(
    {
      success: false,
      error: "No fue posible procesar la ubicación de inventario.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
  try {
    const { tenantId, branchAccess, permissions } =
      await getInventoryContext("view");

    await syncBranchInventoryLocations(tenantId);

    const locationAccessCondition = branchAccess.allBranches
      ? eq(inventoryLocations.tenantId, tenantId)
      : and(
          eq(inventoryLocations.tenantId, tenantId),

          branchAccess.branchIds.length > 0
            ? inArray(inventoryLocations.branchId, branchAccess.branchIds)
            : sql<boolean>`false`,
        );

    const records = await db
      .select({
        id: inventoryLocations.id,

        branchId: inventoryLocations.branchId,

        branchName: tenantBranches.name,

        branchCode: tenantBranches.code,

        name: inventoryLocations.name,

        code: inventoryLocations.code,

        type: inventoryLocations.type,

        source: inventoryLocations.source,

        active: inventoryLocations.active,

        isDefault: inventoryLocations.isDefault,

        addressLine: inventoryLocations.addressLine,

        city: inventoryLocations.city,

        state: inventoryLocations.state,

        postalCode: inventoryLocations.postalCode,

        country: inventoryLocations.country,

        createdAt: inventoryLocations.createdAt,

        updatedAt: inventoryLocations.updatedAt,
      })
      .from(inventoryLocations)
      .leftJoin(
        tenantBranches,
        and(
          eq(inventoryLocations.branchId, tenantBranches.id),
          eq(tenantBranches.tenantId, tenantId),
        ),
      )
      .where(
        and(
          locationAccessCondition,

          permissions.canManage
            ? sql<boolean>`true`
            : eq(inventoryLocations.active, true),
        ),
      )
      .orderBy(asc(inventoryLocations.name));

    return NextResponse.json({
      success: true,

      data: records.map((record) => ({
        ...record,

        value: record.id,

        branchLabel: record.branchName
          ? record.branchCode
            ? `${record.branchName} (${record.branchCode})`
            : record.branchName
          : null,

        label: record.code ? `${record.name} (${record.code})` : record.name,

        createdAt: record.createdAt.toISOString(),

        updatedAt: record.updatedAt.toISOString(),
      })),

      permissions: {
        canView: permissions.canView,

        canCreate: permissions.canCreate,

        canEdit: permissions.canEdit,

        canManage: permissions.canManage,

        canViewCost: permissions.canManage,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, userId, branchAccess } =
      await getInventoryContext("manage");

    const body: unknown = await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values = body as LocationPayload;

    const name = getOptionalString(values.name);

    if (!name) {
      throw new ApiError("El nombre de la ubicación es obligatorio.", 400);
    }

    const requestedBranchId = getOptionalString(values.branchId);

    const branchId = requestedBranchId
      ? await validateCRMBranchId(tenantId, branchAccess, requestedBranchId)
      : null;

    const isDefault = getBoolean(values.isDefault);

    if (isDefault && !branchId) {
      throw new ApiError(
        "Una ubicación predeterminada debe pertenecer a una sucursal.",
        400,
      );
    }

    if (branchId && isDefault) {
      await db
        .update(inventoryLocations)
        .set({
          isDefault: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryLocations.tenantId, tenantId),
            eq(inventoryLocations.branchId, branchId),
          ),
        );
    }

    const [location] = await db
      .insert(inventoryLocations)
      .values({
        tenantId,
        branchId,

        name,

        code: normalizeCode(values.code),

        type: getOptionalString(values.type) ?? "Bodega",

        active: getBoolean(values.active, true),

        isDefault,

        addressLine: getOptionalString(values.addressLine) ?? null,

        city: getOptionalString(values.city) ?? null,

        state: getOptionalString(values.state) ?? null,

        postalCode: getOptionalString(values.postalCode) ?? null,

        country: getOptionalString(values.country)?.toUpperCase() ?? "MX",

        createdAt: new Date(),

        updatedAt: new Date(),
      })
      .returning({
        id: inventoryLocations.id,

        name: inventoryLocations.name,
      });

    const user = await currentUser();

    const actorName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.emailAddresses[0]?.emailAddress ||
      "Usuario";

    await createInventoryAuditQuery({
      tenantId,
      branchId,

      locationId: location.id,

      productId: null,

      entityType: "Ubicación de inventario",

      entityId: location.id,

      action: "Crear",

      summary: `Se creó la ubicación "${location.name}".`,

      actorClerkUserId: userId,

      actorName,

      before: null,

      after: {
        name,

        code: normalizeCode(values.code),

        type: getOptionalString(values.type) ?? "Bodega",

        active: getBoolean(values.active, true),

        isDefault,

        addressLine: getOptionalString(values.addressLine) ?? null,

        city: getOptionalString(values.city) ?? null,

        state: getOptionalString(values.state) ?? null,

        postalCode: getOptionalString(values.postalCode) ?? null,

        country: getOptionalString(values.country)?.toUpperCase() ?? "MX",
      },
    });

    return NextResponse.json(
      {
        success: true,

        message: "La ubicación fue creada correctamente.",

        data: location,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenantId, userId, branchAccess } =
      await getInventoryContext("manage");

    const body: unknown = await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values = body as LocationPayload;

    const locationId = getOptionalString(values.id);

    if (!locationId) {
      throw new ApiError("No fue posible identificar la ubicación.", 400);
    }

    const [existingLocation] = await db
      .select({
        id: inventoryLocations.id,

        branchId: inventoryLocations.branchId,

        name: inventoryLocations.name,

        code: inventoryLocations.code,

        type: inventoryLocations.type,

        source: inventoryLocations.source,
        active: inventoryLocations.active,

        isDefault: inventoryLocations.isDefault,

        addressLine: inventoryLocations.addressLine,

        city: inventoryLocations.city,

        state: inventoryLocations.state,

        postalCode: inventoryLocations.postalCode,

        country: inventoryLocations.country,
      })
      .from(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.id, locationId),
          eq(inventoryLocations.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!existingLocation) {
      throw new ApiError("La ubicación no existe.", 404);
    }

    if (existingLocation.source === "branch") {
      throw new ApiError(
        "Esta ubicación se administra desde la configuración de sucursales.",
        409,
      );
    }

    const requestedBranchId = getOptionalString(values.branchId);

    const branchId = requestedBranchId
      ? await validateCRMBranchId(tenantId, branchAccess, requestedBranchId)
      : null;

    const name = getOptionalString(values.name) ?? existingLocation.name;

    const isDefault =
      typeof values.isDefault === "boolean"
        ? values.isDefault
        : existingLocation.isDefault;

    if (isDefault && !branchId) {
      throw new ApiError(
        "Una ubicación predeterminada debe pertenecer a una sucursal.",
        400,
      );
    }

    if (branchId && isDefault) {
      await db
        .update(inventoryLocations)
        .set({
          isDefault: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryLocations.tenantId, tenantId),
            eq(inventoryLocations.branchId, branchId),
          ),
        );
    }

    const [location] = await db
      .update(inventoryLocations)
      .set({
        branchId,
        name,

        code:
          values.code === undefined
            ? existingLocation.code
            : normalizeCode(values.code),

        type: getOptionalString(values.type) ?? existingLocation.type,

        active:
          typeof values.active === "boolean"
            ? values.active
            : existingLocation.active,

        isDefault,

        addressLine:
          values.addressLine === undefined
            ? existingLocation.addressLine
            : (getOptionalString(values.addressLine) ?? null),

        city:
          values.city === undefined
            ? existingLocation.city
            : (getOptionalString(values.city) ?? null),

        state:
          values.state === undefined
            ? existingLocation.state
            : (getOptionalString(values.state) ?? null),

        postalCode:
          values.postalCode === undefined
            ? existingLocation.postalCode
            : (getOptionalString(values.postalCode) ?? null),

        country:
          getOptionalString(values.country)?.toUpperCase() ??
          existingLocation.country,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryLocations.id, locationId),
          eq(inventoryLocations.tenantId, tenantId),
        ),
      )
      .returning({
        id: inventoryLocations.id,

        name: inventoryLocations.name,
      });

    const user = await currentUser();

    const actorName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.emailAddresses[0]?.emailAddress ||
      "Usuario";

    await createInventoryAuditQuery({
      tenantId,
      branchId,

      locationId: location.id,

      productId: null,

      entityType: "Ubicación de inventario",

      entityId: location.id,

      action: "Actualizar",

      summary: `Se actualizó la ubicación "${location.name}".`,

      actorClerkUserId: userId,

      actorName,

      before: {
        branchId: existingLocation.branchId,

        name: existingLocation.name,

        code: existingLocation.code,

        type: existingLocation.type,

        active: existingLocation.active,

        isDefault: existingLocation.isDefault,

        addressLine: existingLocation.addressLine,

        city: existingLocation.city,

        state: existingLocation.state,

        postalCode: existingLocation.postalCode,

        country: existingLocation.country,
      },

      after: {
        branchId,
        name,

        code:
          values.code === undefined
            ? existingLocation.code
            : normalizeCode(values.code),

        type: getOptionalString(values.type) ?? existingLocation.type,

        active:
          typeof values.active === "boolean"
            ? values.active
            : existingLocation.active,

        isDefault,

        addressLine:
          values.addressLine === undefined
            ? existingLocation.addressLine
            : (getOptionalString(values.addressLine) ?? null),

        city:
          values.city === undefined
            ? existingLocation.city
            : (getOptionalString(values.city) ?? null),

        state:
          values.state === undefined
            ? existingLocation.state
            : (getOptionalString(values.state) ?? null),

        postalCode:
          values.postalCode === undefined
            ? existingLocation.postalCode
            : (getOptionalString(values.postalCode) ?? null),

        country:
          getOptionalString(values.country)?.toUpperCase() ??
          existingLocation.country,
      },
    });

    return NextResponse.json({
      success: true,

      message: "La ubicación fue actualizada correctamente.",

      data: location,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
