import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";

import {
  memberBranchAccess,
  memberRegionAccess,
  tenantBranches,
  tenantRegions,
} from "@/db/schema";

import {
  AdministrationAuthError,
  requireAdminContext,
} from "@/lib/administration/require-admin-context";

import { getTenantCommercialCapacity } from "@/lib/commercial/tenant-capacity";

import { syncBranchInventoryLocations } from "@/lib/crm/sync-branch-inventory-locations";

export const dynamic = "force-dynamic";

type EntityType = "region" | "branch";

type StructurePayload = {
  id?: unknown;
  type?: unknown;
  name?: unknown;
  code?: unknown;
  description?: unknown;
  regionId?: unknown;
  folioPrefix?: unknown;
  phone?: unknown;
  email?: unknown;
  timezone?: unknown;
  address?: unknown;
  active?: unknown;
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

function getNullableString(value: unknown): string | null {
  return getOptionalString(value) ?? null;
}

function getBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getEntityType(value: unknown): EntityType {
  if (value === "region" || value === "branch") {
    return value;
  }

  throw new ApiError("El tipo de registro no es válido.", 400);
}

function getAddress(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  return {
    country: getOptionalString(value.country),

    state: getOptionalString(value.state),

    city: getOptionalString(value.city),

    postalCode: getOptionalString(value.postalCode),

    street: getOptionalString(value.street),

    exteriorNumber: getOptionalString(value.exteriorNumber),

    interiorNumber: getOptionalString(value.interiorNumber),

    neighborhood: getOptionalString(value.neighborhood),

    reference: getOptionalString(value.reference),
  };
}

function createErrorResponse(error: unknown) {
  if (error instanceof ApiError || error instanceof AdministrationAuthError) {
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
    "No fue posible administrar la estructura organizacional:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error: "No fue posible administrar la estructura organizacional.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
  try {
    const { tenantId } = await requireAdminContext();

    const regions = await db
      .select()
      .from(tenantRegions)
      .where(eq(tenantRegions.tenantId, tenantId))
      .orderBy(asc(tenantRegions.name));

    const branches = await db
      .select({
        id: tenantBranches.id,

        tenantId: tenantBranches.tenantId,

        regionId: tenantBranches.regionId,

        regionName: tenantRegions.name,

        name: tenantBranches.name,

        code: tenantBranches.code,

        folioPrefix: tenantBranches.folioPrefix,

        phone: tenantBranches.phone,

        email: tenantBranches.email,

        timezone: tenantBranches.timezone,

        address: tenantBranches.address,

        active: tenantBranches.active,

        metadata: tenantBranches.metadata,

        createdAt: tenantBranches.createdAt,

        updatedAt: tenantBranches.updatedAt,
      })
      .from(tenantBranches)
      .leftJoin(
        tenantRegions,
        and(
          eq(tenantBranches.regionId, tenantRegions.id),
          eq(tenantRegions.tenantId, tenantId),
        ),
      )
      .where(eq(tenantBranches.tenantId, tenantId))
      .orderBy(asc(tenantBranches.name));

    const commercialCapacity = await getTenantCommercialCapacity(
      tenantId,
      "crm",
    );

    const branchLimit = commercialCapacity.branches;

    const branchUsage = {
      used: branches.length,
      limit: branchLimit,

      available:
        branchLimit > 0 ? Math.max(0, branchLimit - branches.length) : null,

      atLimit: branchLimit > 0 && branches.length >= branchLimit,
    };

    return NextResponse.json({
      success: true,

      data: {
        regions,
        branches,
        branchUsage,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await requireAdminContext();

    const requestBody: unknown = await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values = requestBody as StructurePayload;

    const type = getEntityType(values.type);

    const name = getOptionalString(values.name);

    const code = getOptionalString(values.code)?.toUpperCase();

    if (!name) {
      throw new ApiError("El nombre es obligatorio.", 400);
    }

    if (!code) {
      throw new ApiError("El código es obligatorio.", 400);
    }

    if (type === "region") {
      const [region] = await db
        .insert(tenantRegions)
        .values({
          tenantId,
          name,
          code,

          description: getNullableString(values.description),

          active: getBoolean(values.active),
        })
        .returning();

      return NextResponse.json(
        {
          success: true,

          message: "La región fue creada correctamente.",

          data: region,
        },
        {
          status: 201,
        },
      );
    }

    const regionId = getNullableString(values.regionId);

    if (regionId) {
      const [region] = await db
        .select({
          id: tenantRegions.id,
        })
        .from(tenantRegions)
        .where(
          and(
            eq(tenantRegions.id, regionId),
            eq(tenantRegions.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!region) {
        throw new ApiError("La región seleccionada no existe.", 400);
      }
    }

    const commercialCapacity = await getTenantCommercialCapacity(
      tenantId,
      "crm",
    );

    if (commercialCapacity.branches > 0) {
      const existingBranches = await db
        .select({
          id: tenantBranches.id,
        })
        .from(tenantBranches)
        .where(eq(tenantBranches.tenantId, tenantId));

      if (existingBranches.length >= commercialCapacity.branches) {
        throw new ApiError(
          "Tu plan alcanzó el límite de sucursales. Contrata una expansión para registrar otra.",
          409,
        );
      }
    }

    const [branch] = await db
      .insert(tenantBranches)
      .values({
        tenantId,
        regionId,
        name,
        code,

        folioPrefix:
          getNullableString(values.folioPrefix)?.toUpperCase() ?? null,

        phone: getNullableString(values.phone),

        email: getNullableString(values.email),

        timezone: getNullableString(values.timezone),

        address: getAddress(values.address),

        active: getBoolean(values.active),
      })
      .returning();

    await syncBranchInventoryLocations(tenantId);

    return NextResponse.json(
      {
        success: true,

        message: "La sucursal fue creada correctamente.",

        data: branch,
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
    const { tenantId } = await requireAdminContext();

    const requestBody: unknown = await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values = requestBody as StructurePayload;

    const id = getOptionalString(values.id);

    const type = getEntityType(values.type);

    const name = getOptionalString(values.name);

    const code = getOptionalString(values.code)?.toUpperCase();

    if (!id) {
      throw new ApiError("No fue posible identificar el registro.", 400);
    }

    if (!name || !code) {
      throw new ApiError("El nombre y el código son obligatorios.", 400);
    }

    if (type === "region") {
      const [region] = await db
        .update(tenantRegions)
        .set({
          name,
          code,

          description: getNullableString(values.description),

          active: getBoolean(values.active),

          updatedAt: new Date(),
        })
        .where(
          and(eq(tenantRegions.id, id), eq(tenantRegions.tenantId, tenantId)),
        )
        .returning();

      if (!region) {
        throw new ApiError("La región no existe.", 404);
      }

      return NextResponse.json({
        success: true,

        message: "La región fue actualizada correctamente.",

        data: region,
      });
    }

    const regionId = getNullableString(values.regionId);

    if (regionId) {
      const [region] = await db
        .select({
          id: tenantRegions.id,
        })
        .from(tenantRegions)
        .where(
          and(
            eq(tenantRegions.id, regionId),
            eq(tenantRegions.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!region) {
        throw new ApiError("La región seleccionada no existe.", 400);
      }
    }

    const [branch] = await db
      .update(tenantBranches)
      .set({
        regionId,
        name,
        code,

        folioPrefix:
          getNullableString(values.folioPrefix)?.toUpperCase() ?? null,

        phone: getNullableString(values.phone),

        email: getNullableString(values.email),

        timezone: getNullableString(values.timezone),

        address: getAddress(values.address),

        active: getBoolean(values.active),

        updatedAt: new Date(),
      })
      .where(
        and(eq(tenantBranches.id, id), eq(tenantBranches.tenantId, tenantId)),
      )
      .returning();

    await syncBranchInventoryLocations(tenantId);

    if (!branch) {
      throw new ApiError("La sucursal no existe.", 404);
    }

    return NextResponse.json({
      success: true,

      message: "La sucursal fue actualizada correctamente.",

      data: branch,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenantId } = await requireAdminContext();

    const requestBody: unknown = await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const id = getOptionalString(requestBody.id);

    const type = getEntityType(requestBody.type);

    if (!id) {
      throw new ApiError("No fue posible identificar el registro.", 400);
    }

    if (type === "region") {
      const [region] = await db
        .select({
          id: tenantRegions.id,

          name: tenantRegions.name,
        })
        .from(tenantRegions)
        .where(
          and(eq(tenantRegions.id, id), eq(tenantRegions.tenantId, tenantId)),
        )
        .limit(1);

      if (!region) {
        throw new ApiError("La región no existe.", 404);
      }

      const [relatedBranch] = await db
        .select({
          id: tenantBranches.id,
        })
        .from(tenantBranches)
        .where(
          and(
            eq(tenantBranches.tenantId, tenantId),
            eq(tenantBranches.regionId, id),
          ),
        )
        .limit(1);

      const [regionAssignment] = await db
        .select({
          memberId: memberRegionAccess.memberId,
        })
        .from(memberRegionAccess)
        .where(
          and(
            eq(memberRegionAccess.tenantId, tenantId),
            eq(memberRegionAccess.regionId, id),
          ),
        )
        .limit(1);

      if (relatedBranch || regionAssignment) {
        throw new ApiError(
          "No puedes eliminar una región que tiene sucursales o usuarios asignados.",
          409,
        );
      }

      await db
        .delete(tenantRegions)
        .where(
          and(eq(tenantRegions.id, id), eq(tenantRegions.tenantId, tenantId)),
        );

      return NextResponse.json({
        success: true,

        message: `La región "${region.name}" fue eliminada correctamente.`,
      });
    }

    const [branch] = await db
      .select({
        id: tenantBranches.id,

        name: tenantBranches.name,
      })
      .from(tenantBranches)
      .where(
        and(eq(tenantBranches.id, id), eq(tenantBranches.tenantId, tenantId)),
      )
      .limit(1);

    if (!branch) {
      throw new ApiError("La sucursal no existe.", 404);
    }

    const [branchAssignment] = await db
      .select({
        memberId: memberBranchAccess.memberId,
      })
      .from(memberBranchAccess)
      .where(
        and(
          eq(memberBranchAccess.tenantId, tenantId),
          eq(memberBranchAccess.branchId, id),
        ),
      )
      .limit(1);

    if (branchAssignment) {
      throw new ApiError(
        "No puedes eliminar una sucursal que tiene usuarios asignados.",
        409,
      );
    }

    await db
      .delete(tenantBranches)
      .where(
        and(eq(tenantBranches.id, id), eq(tenantBranches.tenantId, tenantId)),
      );

    return NextResponse.json({
      success: true,

      message: `La sucursal "${branch.name}" fue eliminada correctamente.`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
