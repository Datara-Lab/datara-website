import {
  auth,
} from "@clerk/nextjs/server";

import {
  and,
  asc,
  eq,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  crmProductCategories,
  crmProductTypes,
  tenants,
} from "@/db/schema";

import {
  CRMPermissionError,
  type CRMModulePermission,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type CategoryPayload = {
  id?: unknown;
  productTypeId?: unknown;

  /*
   * Compatibilidad temporal
   * con la UI anterior.
   */
  itemType?: unknown;

  name?: unknown;
  active?: unknown;
  sortOrder?: unknown;
};

type LegacyItemType =
  | "model"
  | "product"
  | "service";

type StoredProductType = {
  id: string;
  key: string;
  name: string;
  inventoryTracked: boolean;
  technicalProfile:
    | string
    | null;
  active: boolean;
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

function getString(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  return (
    value.trim() ||
    null
  );
}

function getSortOrder(
  value: unknown,
): number {
  const parsed =
    Number(value ?? 0);

  if (
    !Number.isInteger(parsed) ||
    parsed < 0
  ) {
    throw new ApiError(
      "El orden debe ser un número entero igual o mayor que cero.",
      400,
    );
  }

  return parsed;
}

function getLegacyItemType(
  productType:
    StoredProductType,
): LegacyItemType {
  if (
    productType
      .technicalProfile ===
    "motorcycle_model"
  ) {
    return "model";
  }

  return productType
    .inventoryTracked
    ? "product"
    : "service";
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

  await requireCRMModulePermission(
    tenant.id,
    userId,
    "products",
    permission,
  );

  return {
    tenantId:
      tenant.id,

    userId,
  };
}

async function getProductType(
  tenantId: string,
  productTypeId:
    unknown,
  legacyKey:
    unknown,
): Promise<StoredProductType> {
  const requestedId =
    getString(
      productTypeId,
    );

  const requestedKey =
    getString(
      legacyKey,
    );

  if (
    !requestedId &&
    !requestedKey
  ) {
    throw new ApiError(
      "Selecciona un tipo de elemento.",
      400,
    );
  }

  const [productType] =
    await db
      .select({
        id:
          crmProductTypes.id,

        key:
          crmProductTypes.key,

        name:
          crmProductTypes.name,

        inventoryTracked:
          crmProductTypes
            .inventoryTracked,

        technicalProfile:
          crmProductTypes
            .technicalProfile,

        active:
          crmProductTypes.active,
      })
      .from(
        crmProductTypes,
      )
      .where(
        and(
          eq(
            crmProductTypes
              .tenantId,
            tenantId,
          ),

          requestedId
            ? eq(
                crmProductTypes.id,
                requestedId,
              )
            : eq(
                crmProductTypes.key,
                requestedKey ??
                  "",
              ),
        ),
      )
      .limit(1);

  if (!productType) {
    throw new ApiError(
      "El tipo de elemento no existe.",
      404,
    );
  }

  return productType;
}

function serializeCategory(
  category: {
    id: string;
    productTypeId:
      | string
      | null;
    itemType:
      LegacyItemType;
    name: string;
    active: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    productTypeKey: string;
    productTypeName: string;
    inventoryTracked: boolean;
    technicalProfile:
      | string
      | null;
  },
) {
  return {
    id:
      category.id,

    productTypeId:
      category
        .productTypeId,

    /*
     * `itemType` conserva temporalmente
     * la clave anterior para clientes viejos.
     */
    itemType:
      category
        .productTypeKey,

    legacyItemType:
      category.itemType,

    productTypeName:
      category
        .productTypeName,

    inventoryTracked:
      category
        .inventoryTracked,

    technicalProfile:
      category
        .technicalProfile,

    name:
      category.name,

    active:
      category.active,

    sortOrder:
      category.sortOrder,

    createdAt:
      category.createdAt
        .toISOString(),

    updatedAt:
      category.updatedAt
        .toISOString(),
  };
}

function isUniqueViolation(
  error: unknown,
): boolean {
  return (
    isRecord(error) &&
    error.code ===
      "23505"
  );
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
    error instanceof
      CRMPermissionError
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message,
      },
      {
        status:
          error.status,
      },
    );
  }

  if (
    isUniqueViolation(
      error,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe una categoría con ese nombre para el tipo seleccionado.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(
    "No fue posible administrar las categorías del catálogo.",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible administrar las categorías del catálogo.",
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
    } =
      await getTenantContext(
        "view",
      );

    const categories =
      await db
        .select({
          id:
            crmProductCategories.id,

          productTypeId:
            crmProductCategories
              .productTypeId,

          itemType:
            crmProductCategories
              .itemType,

          name:
            crmProductCategories.name,

          active:
            crmProductCategories.active,

          sortOrder:
            crmProductCategories
              .sortOrder,

          createdAt:
            crmProductCategories
              .createdAt,

          updatedAt:
            crmProductCategories
              .updatedAt,

          productTypeKey:
            crmProductTypes.key,

          productTypeName:
            crmProductTypes.name,

          inventoryTracked:
            crmProductTypes
              .inventoryTracked,

          technicalProfile:
            crmProductTypes
              .technicalProfile,
        })
        .from(
          crmProductCategories,
        )
        .innerJoin(
          crmProductTypes,
          eq(
            crmProductTypes.id,
            crmProductCategories
              .productTypeId,
          ),
        )
        .where(
          eq(
            crmProductCategories
              .tenantId,
            tenantId,
          ),
        )
        .orderBy(
          asc(
            crmProductTypes
              .sortOrder,
          ),
          asc(
            crmProductCategories
              .sortOrder,
          ),
          asc(
            crmProductCategories
              .name,
          ),
        );

    return NextResponse.json({
      success: true,

      data:
        categories.map(
          serializeCategory,
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
    } =
      await getTenantContext(
        "create",
      );

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no es válida.",
        400,
      );
    }

    const payload =
      body as
        CategoryPayload;

    const productType =
      await getProductType(
        tenantId,
        payload.productTypeId,
        payload.itemType,
      );

    const name =
      getString(
        payload.name,
      );

    if (!name) {
      throw new ApiError(
        "El nombre de la categoría es obligatorio.",
        400,
      );
    }

    if (
      name.length >
      100
    ) {
      throw new ApiError(
        "La categoría no puede superar los 100 caracteres.",
        400,
      );
    }

    const [category] =
      await db
        .insert(
          crmProductCategories,
        )
        .values({
          tenantId,

          productTypeId:
            productType.id,

          itemType:
            getLegacyItemType(
              productType,
            ),

          name,

          sortOrder:
            getSortOrder(
              payload.sortOrder,
            ),

          createdByClerkUserId:
            userId,

          updatedByClerkUserId:
            userId,
        })
        .returning();

    return NextResponse.json(
      {
        success: true,

        message:
          "La categoría fue creada correctamente.",

        data:
          serializeCategory({
            ...category,

            productTypeKey:
              productType.key,

            productTypeName:
              productType.name,

            inventoryTracked:
              productType
                .inventoryTracked,

            technicalProfile:
              productType
                .technicalProfile,
          }),
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
    } =
      await getTenantContext(
        "edit",
      );

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no es válida.",
        400,
      );
    }

    const payload =
      body as
        CategoryPayload;

    const id =
      getString(
        payload.id,
      );

    const name =
      getString(
        payload.name,
      );

    if (!id) {
      throw new ApiError(
        "No fue posible identificar la categoría.",
        400,
      );
    }

    if (!name) {
      throw new ApiError(
        "El nombre de la categoría es obligatorio.",
        400,
      );
    }

    const [existing] =
      await db
        .select({
          id:
            crmProductCategories.id,

          productTypeId:
            crmProductCategories
              .productTypeId,

          active:
            crmProductCategories.active,
        })
        .from(
          crmProductCategories,
        )
        .where(
          and(
            eq(
              crmProductCategories.id,
              id,
            ),
            eq(
              crmProductCategories
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!existing) {
      throw new ApiError(
        "La categoría no existe.",
        404,
      );
    }

    const productType =
      await getProductType(
        tenantId,
        payload.productTypeId ??
          existing.productTypeId,
        payload.itemType,
      );

    const active =
      typeof payload.active ===
        "boolean"
        ? payload.active
        : existing.active;

    const [category] =
      await db
        .update(
          crmProductCategories,
        )
        .set({
          productTypeId:
            productType.id,

          itemType:
            getLegacyItemType(
              productType,
            ),

          name,
          active,

          sortOrder:
            getSortOrder(
              payload.sortOrder,
            ),

          updatedByClerkUserId:
            userId,

          updatedAt:
            new Date(),
        })
        .where(
          and(
            eq(
              crmProductCategories.id,
              id,
            ),
            eq(
              crmProductCategories
                .tenantId,
              tenantId,
            ),
          ),
        )
        .returning();

    return NextResponse.json({
      success: true,

      message:
        "La categoría fue actualizada correctamente.",

      data:
        serializeCategory({
          ...category,

          productTypeKey:
            productType.key,

          productTypeName:
            productType.name,

          inventoryTracked:
            productType
              .inventoryTracked,

          technicalProfile:
            productType
              .technicalProfile,
        }),
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}
