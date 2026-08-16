import { auth } from "@clerk/nextjs/server";
import {
  and,
  asc,
  desc,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmProducts,
  tenants,
} from "@/db/schema";

import {
  CRMPermissionError,
  type CRMModulePermission,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";

type ProductFormPayload = {
  id?: unknown;

  name?: unknown;
  code?: unknown;
  description?: unknown;
  category?: unknown;

  unitPrice?: unknown;
  currency?: unknown;
  active?: unknown;

  modelYear?: unknown;
  colors?: unknown;

  engine?: unknown;
  displacement?: unknown;
  power?: unknown;
  coolingSystem?: unknown;
  transmission?: unknown;

  fuelCapacity?: unknown;
  loadCapacity?: unknown;
  passengerCapacity?: unknown;

  warranty?: unknown;
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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getOptionalString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function getOptionalNumber(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const normalized =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(normalized)
    ? normalized
    : undefined;
}

function getBoolean(
  value: unknown,
  defaultValue: boolean,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return defaultValue;
}

function validateProduct(
  values: ProductFormPayload,
): string | null {
  const name = getOptionalString(
    values.name,
  );

  if (!name) {
    return "El nombre del producto es obligatorio.";
  }

  const unitPrice = getOptionalNumber(
    values.unitPrice,
  );

  if (
    unitPrice !== undefined &&
    unitPrice < 0
  ) {
    return "El precio no puede ser negativo.";
  }

  return null;
}

function mapProductValues(
  values: ProductFormPayload,
  currentMetadata:
    Record<string, unknown> = {},
) {
  const unitPrice =
    getOptionalNumber(
      values.unitPrice,
    );

  const currentTechnical =
    isRecord(
      currentMetadata
        .technicalSpecifications,
    )
      ? currentMetadata
          .technicalSpecifications
      : {};

  const colorsValue =
    getOptionalString(
      values.colors,
    );

  const colors =
    colorsValue
      ? Array.from(
          new Set(
            colorsValue
              .split(",")
              .map(
                (color) =>
                  color.trim(),
              )
              .filter(Boolean),
          ),
        )
      : [];

  return {
    name:
      getOptionalString(
        values.name,
      ) ?? "",

    code:
      getOptionalString(
        values.code,
      ) ?? null,

    description:
      getOptionalString(
        values.description,
      ) ?? null,

    category:
      getOptionalString(
        values.category,
      ) ?? null,

    unitPrice:
      String(
        unitPrice ?? 0,
      ),

    currency:
      getOptionalString(
        values.currency,
      )?.toLowerCase() ??
      "mxn",

    active:
      getBoolean(
        values.active,
        true,
      ),

    metadata: {
      ...currentMetadata,

      technicalSpecifications: {
        ...currentTechnical,

        modelYear:
          getOptionalNumber(
            values.modelYear,
          ) ?? null,

        colors,

        engine:
          getOptionalString(
            values.engine,
          ) ?? null,

        displacement:
          getOptionalString(
            values.displacement,
          ) ?? null,

        power:
          getOptionalString(
            values.power,
          ) ?? null,

        coolingSystem:
          getOptionalString(
            values.coolingSystem,
          ) ?? null,

        transmission:
          getOptionalString(
            values.transmission,
          ) ?? null,

        fuelCapacity:
          getOptionalString(
            values.fuelCapacity,
          ) ?? null,

        loadCapacity:
          getOptionalString(
            values.loadCapacity,
          ) ?? null,

        passengerCapacity:
          getOptionalString(
            values.passengerCapacity,
          ) ?? null,

        warranty:
          getOptionalString(
            values.warranty,
          ) ?? null,
      },
    },
  };
}

async function getTenantContext(
  permission:
    CRMModulePermission,
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

  const [tenant] = await db
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

  const permissions =
    await requireCRMModulePermission(
      tenant.id,
      userId,
      "products",
      permission,
    );

  return {
    userId,
    tenantId: tenant.id,
    permissions,
  };
}

function isUniqueViolation(
  error: unknown,
): boolean {
  return (
    isRecord(error) &&
    error.code === "23505"
  );
}

function createErrorResponse(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof ApiError ||
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

  if (isUniqueViolation(error)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe un producto con ese código.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(fallback, error);

  return NextResponse.json(
    {
      success: false,
      error: fallback,
    },
    {
      status: 500,
    },
  );
}

function serializeProduct(
  product: typeof crmProducts.$inferSelect,
) {
  const baseLabel = product.code
    ? `${product.name} (${product.code})`
    : product.name;

  const label =
    product.active
      ? baseLabel
      : `${baseLabel} · Inactivo`;

  const technicalSpecifications =
    isRecord(
      product.metadata
        ?.technicalSpecifications,
    )
      ? product.metadata
          .technicalSpecifications
      : {};

  const technicalString = (
    key: string,
  ): string => {
    const value =
      technicalSpecifications[key];

    return typeof value ===
      "string"
      ? value
      : "";
  };

  const technicalColors =
    Array.isArray(
      technicalSpecifications.colors,
    )
      ? technicalSpecifications.colors
          .map(String)
          .filter(Boolean)
          .join(", ")
      : "";

  return {
    id: product.id,

    name: product.name,
    code: product.code,
    description: product.description,

    hasImage:
      Boolean(
        product.imageObjectKey,
      ),

    imageUrl:
      product.imageObjectKey
        ? `/api/crm/products/${product.id}/image`
        : null,

    category:
      product.category,

    modelYear:
      typeof technicalSpecifications
        .modelYear === "number" ||
      typeof technicalSpecifications
        .modelYear === "string"
        ? String(
            technicalSpecifications
              .modelYear,
          )
        : "",

    colors:
      technicalColors,

    engine:
      technicalString(
        "engine",
      ),

    displacement:
      technicalString(
        "displacement",
      ),

    power:
      technicalString(
        "power",
      ),

    coolingSystem:
      technicalString(
        "coolingSystem",
      ),

    transmission:
      technicalString(
        "transmission",
      ),

    fuelCapacity:
      technicalString(
        "fuelCapacity",
      ),

    loadCapacity:
      technicalString(
        "loadCapacity",
      ),

    passengerCapacity:
      technicalString(
        "passengerCapacity",
      ),

    warranty:
      technicalString(
        "warranty",
      ),

    unitPrice: Number(
      product.unitPrice,
    ),

    currency:
      product.currency.toUpperCase(),

    active: product.active,

    createdAt:
      product.createdAt.toISOString(),

    updatedAt:
      product.updatedAt.toISOString(),

    value: product.id,
    label,

    disabled: !product.active,
  };
}

export async function GET(
  request: Request,
) {
  try {
    const {
      tenantId,
      permissions,
    } = await getTenantContext(
      "view",
    );

    const url = new URL(request.url);

    const includeInactive =
      url.searchParams.get(
        "includeInactive",
      ) === "true";

    const whereClause =
      includeInactive
        ? eq(
            crmProducts.tenantId,
            tenantId,
          )
        : and(
            eq(
              crmProducts.tenantId,
              tenantId,
            ),
            eq(
              crmProducts.active,
              true,
            ),
          );

    const products = await db
      .select()
      .from(crmProducts)
      .where(whereClause)
      .orderBy(
        desc(crmProducts.active),
        asc(crmProducts.name),
      );

    return NextResponse.json({
      success: true,
      data: products.map(
        serializeProduct,
      ),
      permissions,
      meta: {
        count: products.length,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible cargar el catálogo de productos.",
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const {
      tenantId,
    } = await getTenantContext(
      "create",
    );

    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values =
      requestBody as ProductFormPayload;

    const validationError =
      validateProduct(values);

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

    const productValues =
      mapProductValues(values);

    const [product] = await db
      .insert(crmProducts)
      .values({
        tenantId,
        ...productValues,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message:
          "El producto fue creado correctamente.",
        data: serializeProduct(
          product,
        ),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible crear el producto.",
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const {
      tenantId,
    } = await getTenantContext(
      "edit",
    );

    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values =
      requestBody as ProductFormPayload;

    const productId =
      getOptionalString(values.id);

    if (!productId) {
      throw new ApiError(
        "No fue posible identificar el producto.",
        400,
      );
    }

    const [existingProduct] =
      await db
        .select({
          metadata:
            crmProducts.metadata,
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
          ),
        )
        .limit(1);

    if (!existingProduct) {
      throw new ApiError(
        "El producto no existe o no pertenece a la empresa.",
        404,
      );
    }

    const validationError =
      validateProduct(values);

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

    const productValues =
      mapProductValues(
        values,
        existingProduct.metadata,
      );

    const [product] = await db
      .update(crmProducts)
      .set({
        ...productValues,
        updatedAt: new Date(),
      })
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
        ),
      )
      .returning();

    if (!product) {
      throw new ApiError(
        "El producto no existe o no pertenece a la empresa.",
        404,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        product.active
          ? "El producto fue actualizado correctamente."
          : "El producto fue desactivado correctamente.",
      data: serializeProduct(
        product,
      ),
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible actualizar el producto.",
    );
  }
}