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
  crmProductCategories,
  crmProducts,
  crmProductTypes,
  tenants,
} from "@/db/schema";

import {
  CRMPermissionError,
  type CRMModulePermission,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";
import {
  isSatCatalogValue,
  SAT_FACTOR_TYPES,
  SAT_TAX_OBJECTS,
  SAT_TRANSFERRED_TAXES,
  SAT_UNIT_CODES,
} from "@/lib/fiscal/catalogs";

export const dynamic = "force-dynamic";

type ProductFormPayload = {
  id?: unknown;

  name?: unknown;
  code?: unknown;
  description?: unknown;
  productTypeId?: unknown;

  /*
   * Compatibilidad temporal con clientes
   * que todavía envían la clave anterior.
   */
  itemType?: unknown;

  category?: unknown;

  unitPrice?: unknown;
  currency?: unknown;
  active?: unknown;
  productServiceCode?: unknown;
  unitCode?: unknown;
  taxObject?: unknown;
  transferredTaxCode?: unknown;
  transferredFactorType?: unknown;
  transferredTaxRate?: unknown;

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

type ProductItemType =
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

function getLegacyItemType(
  productType:
    StoredProductType,
): ProductItemType {
  if (
    productType.technicalProfile ===
    "motorcycle_model"
  ) {
    return "model";
  }

  return productType.inventoryTracked
    ? "product"
    : "service";
}

async function getProductType(
  tenantId: string,
  values: ProductFormPayload,
  currentProductTypeId?:
    string | null,
): Promise<StoredProductType> {
  const requestedId =
    getOptionalString(
      values.productTypeId,
    ) ??
    currentProductTypeId ??
    undefined;

  const legacyKey =
    getOptionalString(
      values.itemType,
    );

  if (
    !requestedId &&
    !legacyKey
  ) {
    throw new ApiError(
      "Selecciona un tipo de elemento.",
      400,
    );
  }

  const typeCondition =
    requestedId
      ? eq(
          crmProductTypes.id,
          requestedId,
        )
      : eq(
          crmProductTypes.key,
          legacyKey ?? "",
        );

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
      .from(crmProductTypes)
      .where(
        and(
          eq(
            crmProductTypes.tenantId,
            tenantId,
          ),
          typeCondition,
        ),
      )
      .limit(1);

  if (!productType) {
    throw new ApiError(
      "El tipo seleccionado no existe o no pertenece a la empresa.",
      400,
    );
  }

  if (
    !productType.active &&
    productType.id !==
      currentProductTypeId
  ) {
    throw new ApiError(
      "El tipo seleccionado está inactivo.",
      400,
    );
  }

  return productType;
}

async function validateProductCategory(
  tenantId: string,
  productTypeId: string,
  categoryValue: unknown,
  current?: {
    productTypeId:
      | string
      | null;
    category:
      | string
      | null;
  },
): Promise<string> {
  const category =
    getOptionalString(
      categoryValue,
    );

  if (!category) {
    throw new ApiError(
      "Selecciona una categoría.",
      400,
    );
  }

  const [storedCategory] =
    await db
      .select({
        active:
          crmProductCategories.active,
      })
      .from(
        crmProductCategories,
      )
      .where(
        and(
          eq(
            crmProductCategories
              .tenantId,
            tenantId,
          ),
          eq(
            crmProductCategories
              .productTypeId,
            productTypeId,
          ),
          eq(
            crmProductCategories.name,
            category,
          ),
        ),
      )
      .limit(1);

  if (!storedCategory) {
    throw new ApiError(
      "La categoría seleccionada no corresponde al tipo de elemento.",
      400,
    );
  }

  const preservesCurrentCategory =
    current?.productTypeId ===
      productTypeId &&
    current.category ===
      category;

  if (
    !storedCategory.active &&
    !preservesCurrentCategory
  ) {
    throw new ApiError(
      "La categoría seleccionada está inactiva.",
      400,
    );
  }

  return category;
}

function validateProduct(
  values: ProductFormPayload,
): string | null {
  const name = getOptionalString(
    values.name,
  );

  if (!name) {
    return "El nombre del elemento es obligatorio.";
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

  const productServiceCode = getOptionalString(values.productServiceCode);
  const unitCode = getOptionalString(values.unitCode);
  const taxObject = getOptionalString(values.taxObject);
  const taxCode = getOptionalString(values.transferredTaxCode);
  const factorType = getOptionalString(values.transferredFactorType);
  const taxRate = getOptionalNumber(values.transferredTaxRate);

  if (productServiceCode && !/^\d{8}$/.test(productServiceCode)) return "La clave de producto o servicio SAT debe contener 8 dígitos.";
  if (!isSatCatalogValue(SAT_UNIT_CODES, unitCode)) return "La clave de unidad SAT no es válida.";
  if (!isSatCatalogValue(SAT_TAX_OBJECTS, taxObject)) return "El objeto de impuesto no es válido.";
  if (!isSatCatalogValue(SAT_TRANSFERRED_TAXES, taxCode)) return "El impuesto trasladado no es válido.";
  if (!isSatCatalogValue(SAT_FACTOR_TYPES, factorType)) return "El tipo de factor no es válido.";
  if (taxRate !== undefined && (taxRate < 0 || taxRate > 1)) return "La tasa fiscal debe expresarse entre 0 y 1.";

  const fiscalFields = [productServiceCode, unitCode, taxObject];
  if (fiscalFields.some(Boolean) && !fiscalFields.every(Boolean)) return "Para facturar el producto captura clave SAT, unidad y objeto de impuesto.";
  if ((taxObject === "02" || taxObject === "03") && (!taxCode || !factorType || (factorType !== "Exento" && taxRate === undefined))) return "Completa la regla de impuesto trasladado del producto.";

  return null;
}

function mapProductValues(
  values: ProductFormPayload,
  productType:
    StoredProductType,
  category: string,
  currentMetadata:
    Record<string, unknown> = {},
  currentActive = true,
) {
  const transferredFactorTypeValue = getOptionalString(
    values.transferredFactorType,
  );
  const transferredFactorType =
    transferredFactorTypeValue === "Tasa" ||
    transferredFactorTypeValue === "Cuota" ||
    transferredFactorTypeValue === "Exento"
      ? transferredFactorTypeValue
      : null;
  const itemType =
    getLegacyItemType(
      productType,
    );

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

    productTypeId:
      productType.id,

    /*
     * Se conserva hasta retirar las columnas
     * de compatibilidad en una migración posterior.
     */
    itemType,

    category,

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
        currentActive,
      ),

    productServiceCode: getOptionalString(values.productServiceCode) ?? null,
    unitCode: getOptionalString(values.unitCode) ?? null,
    taxObject: getOptionalString(values.taxObject) ?? null,
    transferredTaxCode: getOptionalString(values.transferredTaxCode) ?? null,
    transferredFactorType: transferredFactorType as
      | "Tasa"
      | "Cuota"
      | "Exento"
      | null,
    transferredTaxRate:
      getOptionalNumber(values.transferredTaxRate) !== undefined
        ? String(getOptionalNumber(values.transferredTaxRate))
        : null,

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
  product:
    typeof crmProducts.$inferSelect,
  productType?:
    StoredProductType,
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
    productServiceCode: product.productServiceCode,
    unitCode: product.unitCode,
    taxObject: product.taxObject,
    transferredTaxCode: product.transferredTaxCode,
    transferredFactorType: product.transferredFactorType,
    transferredTaxRate: product.transferredTaxRate,

    hasImage:
      Boolean(
        product.imageObjectKey,
      ),

    imageUrl:
      product.imageObjectKey
        ? `/api/crm/products/${product.id}/image`
        : null,

    productTypeId:
      product.productTypeId,

    productTypeKey:
      productType?.key ??
      product.itemType,

    productTypeName:
      productType?.name ??
      product.itemType,

    inventoryTracked:
      productType
        ?.inventoryTracked ??
      false,

    technicalProfile:
      productType
        ?.technicalProfile ??
      null,

    /*
     * Compatibilidad temporal.
     */
    itemType:
      product.itemType,

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

    const requestedStatus =
      url.searchParams.get(
        "status",
      );

    const status =
      requestedStatus ===
        "inactive" ||
      requestedStatus ===
        "all"
        ? requestedStatus
        : includeInactive
          ? "all"
          : "active";

    const whereClause =
      status === "all"
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
              status === "active",
            ),
          );

    const [
      products,
      productTypes,
    ] = await Promise.all([
      db
        .select()
        .from(crmProducts)
        .where(whereClause)
        .orderBy(
          desc(crmProducts.active),
          asc(crmProducts.name),
        ),

      db
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
        .from(crmProductTypes)
        .where(
          eq(
            crmProductTypes.tenantId,
            tenantId,
          ),
        ),
    ]);

    const productTypesById =
      new Map(
        productTypes.map(
          (productType) => [
            productType.id,
            productType,
          ],
        ),
      );

    return NextResponse.json({
      success: true,
      data: products.map(
        (product) =>
          serializeProduct(
            product,
            product.productTypeId
              ? productTypesById.get(
                  product.productTypeId,
                )
              : undefined,
          ),
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

    const productType =
      await getProductType(
        tenantId,
        values,
      );

    const category =
      await validateProductCategory(
        tenantId,
        productType.id,
        values.category,
      );

    const productValues =
      mapProductValues(
        values,
        productType,
        category,
      );

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
          productType,
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
      permissions,
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

          productTypeId:
            crmProducts.productTypeId,

          category:
            crmProducts.category,

          active:
            crmProducts.active,
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

    const requestedActive =
      typeof values.active ===
        "boolean"
        ? values.active
        : existingProduct.active;

    if (
      requestedActive !==
        existingProduct.active &&
      !permissions
        .isGlobalAdministrator
    ) {
      throw new CRMPermissionError(
        "Solo un administrador puede descontinuar o reactivar elementos del catálogo.",
        403,
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

    const productType =
      await getProductType(
        tenantId,
        values,
        existingProduct
          .productTypeId,
      );

    const category =
      await validateProductCategory(
        tenantId,
        productType.id,
        values.category,
        {
          productTypeId:
            existingProduct
              .productTypeId,
          category:
            existingProduct.category,
        },
      );

    const productValues =
      mapProductValues(
        values,
        productType,
        category,
        existingProduct.metadata,
        existingProduct.active,
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
        productType,
      ),
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible actualizar el producto.",
    );
  }
}
