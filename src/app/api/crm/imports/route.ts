import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  desc,
  eq,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  crmProductCategories,
  crmProductTypes,
  crmCustomers,
  crmImportJobs,
  crmLeads,
  crmProducts,
  tenantBranches,
  tenants,
} from "@/db/schema";

import {
  CRMPermissionError,
  getCRMModulePermissions,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

const MAX_ROWS = 5_000;
const INSERT_CHUNK_SIZE = 250;

type ImportEntity =
  | "leads"
  | "customers"
  | "catalog";

type ImportAction =
  | "validate"
  | "import";

type ImportPayload = {
  action?: unknown;
  entity?: unknown;
  fileName?: unknown;
  rows?: unknown;
};

type ImportContext = {
  tenantId: string;
  userId: string;
  userName: string;
  industry: string;
  branchIdsByCode:
    Map<string, string>;
  productTypesByKey:
    Map<string, ImportProductType>;
  categoriesByProductTypeId:
    Map<string, Set<string>>;
  catalogOptions: Array<{
    key: string;
    name: string;
    categories: string[];
  }>;
};

type ImportProductType = {
  id: string;
  key: string;
  name: string;
  inventoryTracked: boolean;
  technicalProfile: string | null;
};

type RowResult = {
  rowNumber: number;
  status:
    | "valid"
    | "duplicate"
    | "error";
  errors: string[];
  data: Record<string, unknown>;
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

function errorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
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

  console.error(
    "No fue posible procesar el Centro de carga:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar el archivo.",
    },
    {
      status: 500,
    },
  );
}

function normalizeText(
  value: unknown,
): string | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  const normalized =
    String(value).trim();

  return normalized || undefined;
}

function normalizeEmail(
  value: unknown,
): string | undefined {
  return normalizeText(value)
    ?.toLowerCase();
}

function normalizePhone(
  value: unknown,
): string | undefined {
  const digits =
    normalizeText(value)
      ?.replace(/\D/g, "");

  return digits || undefined;
}

function normalizeCode(
  value: unknown,
): string | undefined {
  return normalizeText(value)
    ?.toLowerCase();
}

function normalizeBoolean(
  value: unknown,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized =
    normalizeText(value)
      ?.toLowerCase();

  return [
    "1",
    "true",
    "sí",
    "si",
    "yes",
    "x",
  ].includes(normalized ?? "");
}

function validEmail(
  value: string | undefined,
): boolean {
  return !value ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value,
    );
}

function getEntity(
  value: unknown,
): ImportEntity {
  if (
    value === "leads" ||
    value === "customers" ||
    value === "catalog"
  ) {
    return value;
  }

  throw new ApiError(
    "Selecciona un tipo de información válido.",
    400,
  );
}

function getAction(
  value: unknown,
): ImportAction {
  if (
    value === "validate" ||
    value === "import"
  ) {
    return value;
  }

  throw new ApiError(
    "La acción solicitada no es válida.",
    400,
  );
}

function getRows(
  value: unknown,
): Array<Record<string, unknown>> {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    throw new ApiError(
      "El archivo no contiene filas para procesar.",
      400,
    );
  }

  if (value.length > MAX_ROWS) {
    throw new ApiError(
      `El archivo excede el máximo de ${MAX_ROWS.toLocaleString("es-MX")} filas.`,
      413,
    );
  }

  return value.map((row, index) => {
    if (
      typeof row !== "object" ||
      row === null ||
      Array.isArray(row)
    ) {
      throw new ApiError(
        `La fila ${index + 2} no tiene un formato válido.`,
        400,
      );
    }

    return row as
      Record<string, unknown>;
  });
}

async function getContext(): Promise<ImportContext> {
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
      industry: tenants.industry,
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
    await getCRMModulePermissions(
      tenant.id,
      userId,
      "crm",
    );

  if (
    !permissions
      .isGlobalAdministrator
  ) {
    throw new ApiError(
      "El Centro de carga es exclusivo para administradores de la empresa.",
      403,
    );
  }

  const [
    user,
    branches,
    productTypes,
    productCategories,
  ] =
    await Promise.all([
      currentUser(),
      db
        .select({
          id: tenantBranches.id,
          code: tenantBranches.code,
        })
        .from(tenantBranches)
        .where(
          eq(
            tenantBranches.tenantId,
            tenant.id,
          ),
        ),
      db
        .select({
          id: crmProductTypes.id,
          key: crmProductTypes.key,
          name: crmProductTypes.name,
          inventoryTracked:
            crmProductTypes
              .inventoryTracked,
          technicalProfile:
            crmProductTypes
              .technicalProfile,
        })
        .from(crmProductTypes)
        .where(
          eq(
            crmProductTypes.tenantId,
            tenant.id,
          ),
        ),
      db
        .select({
          productTypeId:
            crmProductCategories
              .productTypeId,
          name:
            crmProductCategories.name,
        })
        .from(
          crmProductCategories,
        )
        .where(
          eq(
            crmProductCategories
              .tenantId,
            tenant.id,
          ),
        ),
    ]);

  const productTypesByKey =
    new Map<
      string,
      ImportProductType
    >();

  for (
    const productType of
    productTypes
  ) {
    productTypesByKey.set(
      normalizeCode(
        productType.key,
      ) ?? "",
      productType,
    );
    productTypesByKey.set(
      normalizeCode(
        productType.name,
      ) ?? "",
      productType,
    );
  }

  const categoriesByProductTypeId =
    new Map<string, Set<string>>();

  for (
    const category of
    productCategories
  ) {
    if (!category.productTypeId) {
      continue;
    }

    const categories =
      categoriesByProductTypeId.get(
        category.productTypeId,
      ) ?? new Set<string>();

    categories.add(
      normalizeCode(
        category.name,
      ) ?? "",
    );
    categoriesByProductTypeId.set(
      category.productTypeId,
      categories,
    );
  }

  const userName = [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() ||
    user?.emailAddresses[0]
      ?.emailAddress ||
    "Administrador";

  return {
    tenantId: tenant.id,
    userId,
    userName,
    industry:
      tenant.industry ?? "other",
    branchIdsByCode:
      new Map(
        branches.map((branch) => [
          branch.code.toLowerCase(),
          branch.id,
        ]),
      ),
    productTypesByKey,
    categoriesByProductTypeId,
    catalogOptions:
      productTypes.map(
        (productType) => ({
          key: productType.key,
          name: productType.name,
          categories:
            productCategories
              .filter(
                (category) =>
                  category
                    .productTypeId ===
                  productType.id,
              )
              .map(
                (category) =>
                  category.name,
              ),
        }),
      ),
  };
}

function getBranchId(
  row: Record<string, unknown>,
  context: ImportContext,
  errors: string[],
): string | null {
  const branchCode =
    normalizeCode(row.branchCode);

  if (!branchCode) {
    return null;
  }

  const branchId =
    context.branchIdsByCode.get(
      branchCode,
    );

  if (!branchId) {
    errors.push(
      `La sucursal ${normalizeText(row.branchCode)} no existe.`,
    );
  }

  return branchId ?? null;
}

async function validateLeads(
  rows: Array<Record<string, unknown>>,
  context: ImportContext,
): Promise<RowResult[]> {
  const existing = await db
    .select({
      email: crmLeads.email,
      phone: crmLeads.phone,
      mobile: crmLeads.mobile,
    })
    .from(crmLeads)
    .where(
      eq(
        crmLeads.tenantId,
        context.tenantId,
      ),
    );

  const emails = new Set(
    existing
      .map((item) =>
        normalizeEmail(item.email),
      )
      .filter(Boolean),
  );
  const phones = new Set(
    existing
      .flatMap((item) => [
        normalizePhone(item.phone),
        normalizePhone(item.mobile),
      ])
      .filter(Boolean),
  );

  return rows.map((row, index) => {
    const errors: string[] = [];
    const firstName =
      normalizeText(row.firstName);
    const email =
      normalizeEmail(row.email);
    const phone =
      normalizePhone(row.phone);
    const mobile =
      normalizePhone(row.mobile);
    const branchId =
      getBranchId(
        row,
        context,
        errors,
      );

    if (!firstName) {
      errors.push(
        "El nombre es obligatorio.",
      );
    }

    if (!email && !phone && !mobile) {
      errors.push(
        "Captura correo, teléfono o celular.",
      );
    }

    if (!validEmail(email)) {
      errors.push(
        "El correo no tiene un formato válido.",
      );
    }

    const duplicate =
      Boolean(email && emails.has(email)) ||
      Boolean(phone && phones.has(phone)) ||
      Boolean(mobile && phones.has(mobile));

    const data = {
      tenantId: context.tenantId,
      branchId,
      firstName: firstName ?? "",
      lastName:
        normalizeText(row.lastName) ?? null,
      email: email ?? null,
      phone: phone ?? null,
      mobile: mobile ?? null,
      company:
        normalizeText(row.company) ?? null,
      source:
        normalizeText(row.source) ?? null,
      status:
        normalizeText(row.status) ??
        "Nuevo",
      commercialConsent:
        normalizeBoolean(
          row.commercialConsent,
        ),
      notes:
        normalizeText(row.notes) ?? null,
      metadata: {
        importedBy:
          context.userId,
      },
    };

    if (!duplicate && errors.length === 0) {
      if (email) emails.add(email);
      if (phone) phones.add(phone);
      if (mobile) phones.add(mobile);
    }

    return {
      rowNumber: index + 2,
      status:
        errors.length > 0
          ? "error"
          : duplicate
            ? "duplicate"
            : "valid",
      errors:
        duplicate
          ? [
              "Ya existe un prospecto con el mismo correo o teléfono.",
            ]
          : errors,
      data,
    };
  });
}

async function validateCustomers(
  rows: Array<Record<string, unknown>>,
  context: ImportContext,
): Promise<RowResult[]> {
  const existing = await db
    .select({
      taxId: crmCustomers.taxId,
      email: crmCustomers.email,
      phone: crmCustomers.phone,
      mobile: crmCustomers.mobile,
    })
    .from(crmCustomers)
    .where(
      eq(
        crmCustomers.tenantId,
        context.tenantId,
      ),
    );

  const taxIds = new Set(
    existing
      .map((item) =>
        normalizeCode(item.taxId),
      )
      .filter(Boolean),
  );
  const emails = new Set(
    existing
      .map((item) =>
        normalizeEmail(item.email),
      )
      .filter(Boolean),
  );
  const phones = new Set(
    existing
      .flatMap((item) => [
        normalizePhone(item.phone),
        normalizePhone(item.mobile),
      ])
      .filter(Boolean),
  );

  return rows.map((row, index) => {
    const errors: string[] = [];
    const customerType =
      normalizeText(row.customerType) ??
      "Persona";
    const name =
      normalizeText(row.name);
    const companyName =
      normalizeText(row.companyName);
    const taxId =
      normalizeCode(row.taxId);
    const email =
      normalizeEmail(row.email);
    const phone =
      normalizePhone(row.phone);
    const mobile =
      normalizePhone(row.mobile);
    const branchId =
      getBranchId(
        row,
        context,
        errors,
      );

    if (
      customerType !== "Persona" &&
      customerType !== "Empresa"
    ) {
      errors.push(
        "El tipo debe ser Persona o Empresa.",
      );
    }

    if (
      customerType === "Persona" &&
      !name
    ) {
      errors.push(
        "El nombre es obligatorio.",
      );
    }

    if (
      customerType === "Empresa" &&
      !companyName
    ) {
      errors.push(
        "La empresa es obligatoria.",
      );
    }

    if (!validEmail(email)) {
      errors.push(
        "El correo no tiene un formato válido.",
      );
    }

    const duplicate =
      Boolean(taxId && taxIds.has(taxId)) ||
      Boolean(email && emails.has(email)) ||
      Boolean(phone && phones.has(phone)) ||
      Boolean(mobile && phones.has(mobile));

    const data = {
      tenantId: context.tenantId,
      branchId,
      customerType,
      name:
        name ?? companyName ?? "",
      lastName:
        normalizeText(row.lastName) ?? null,
      companyName:
        companyName ?? null,
      legalName:
        normalizeText(row.legalName) ?? null,
      taxId:
        normalizeText(row.taxId) ?? null,
      email: email ?? null,
      phone: phone ?? null,
      mobile: mobile ?? null,
      status:
        normalizeText(row.status) ??
        "Activo",
      addressLine:
        normalizeText(row.addressLine) ?? null,
      city:
        normalizeText(row.city) ?? null,
      state:
        normalizeText(row.state) ?? null,
      postalCode:
        normalizeText(row.postalCode) ?? null,
      country:
        normalizeText(row.country) ?? "MX",
      commercialConsent:
        normalizeBoolean(
          row.commercialConsent,
        ),
      notes:
        normalizeText(row.notes) ?? null,
      metadata: {
        importedBy:
          context.userId,
      },
    };

    if (!duplicate && errors.length === 0) {
      if (taxId) taxIds.add(taxId);
      if (email) emails.add(email);
      if (phone) phones.add(phone);
      if (mobile) phones.add(mobile);
    }

    return {
      rowNumber: index + 2,
      status:
        errors.length > 0
          ? "error"
          : duplicate
            ? "duplicate"
            : "valid",
      errors:
        duplicate
          ? [
              "Ya existe un cliente con el mismo RFC, correo o teléfono.",
            ]
          : errors,
      data,
    };
  });
}

function getItemType(
  value: unknown,
): "model" | "product" | "service" | undefined {
  const normalized =
    normalizeText(value)
      ?.toLowerCase();

  if (
    normalized === "modelo" ||
    normalized === "model"
  ) {
    return "model";
  }

  if (
    normalized === "producto" ||
    normalized === "product"
  ) {
    return "product";
  }

  if (
    normalized === "servicio" ||
    normalized === "service"
  ) {
    return "service";
  }

  return undefined;
}

function getLegacyItemType(
  productType: ImportProductType,
): "model" | "product" | "service" {
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

async function validateCatalog(
  rows: Array<Record<string, unknown>>,
  context: ImportContext,
): Promise<RowResult[]> {
  const existing = await db
    .select({
      code: crmProducts.code,
    })
    .from(crmProducts)
    .where(
      eq(
        crmProducts.tenantId,
        context.tenantId,
      ),
    );

  const codes = new Set(
    existing
      .map((item) =>
        normalizeCode(item.code),
      )
      .filter(Boolean),
  );

  return rows.map((row, index) => {
    const errors: string[] = [];
    const name =
      normalizeText(row.name);
    const code =
      normalizeText(row.code);
    const normalizedCode =
      normalizeCode(code);
    const requestedProductType =
      normalizeCode(
        row.productType ??
        row.itemType,
      );
    const productType =
      requestedProductType
        ? context
            .productTypesByKey
            .get(
              requestedProductType,
            )
        : undefined;
    const itemType =
      productType
        ? getLegacyItemType(
            productType,
          )
        : getItemType(
            row.itemType,
          );
    const category =
      normalizeText(row.category);
    const modelYear =
      normalizeText(row.modelYear);
    const technicalValues = [
      modelYear,
      normalizeText(row.colors),
      normalizeText(row.engine),
      normalizeText(
        row.displacement,
      ),
      normalizeText(row.power),
      normalizeText(
        row.coolingSystem,
      ),
      normalizeText(
        row.transmission,
      ),
      normalizeText(
        row.fuelCapacity,
      ),
      normalizeText(
        row.loadCapacity,
      ),
      normalizeText(
        row.passengerCapacity,
      ),
      normalizeText(row.warranty),
    ];
    const unitPrice =
      Number(row.unitPrice ?? 0);

    if (!name) {
      errors.push(
        "El nombre es obligatorio.",
      );
    }

    if (!code) {
      errors.push(
        "El código es obligatorio para detectar duplicados.",
      );
    }

    if (!productType) {
      errors.push(
        "El tipo de elemento no existe en la configuración de la empresa.",
      );
    }

    if (!category) {
      errors.push(
        "La categoría es obligatoria.",
      );
    } else if (
      productType &&
      !context
        .categoriesByProductTypeId
        .get(productType.id)
        ?.has(
          normalizeCode(category) ??
          "",
        )
    ) {
      errors.push(
        "La categoría no corresponde al tipo de elemento.",
      );
    }

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      errors.push(
        "El precio debe ser un número igual o mayor que cero.",
      );
    }

    if (
      modelYear &&
      !/^(19|20|21)\d{2}$/.test(
        modelYear,
      )
    ) {
      errors.push(
        "El año del modelo debe tener cuatro dígitos.",
      );
    }

    if (
      productType &&
      productType.technicalProfile !==
        "motorcycle_model" &&
      technicalValues.some(Boolean)
    ) {
      errors.push(
        "La ficha técnica de motocicleta sólo aplica al tipo Modelo.",
      );
    }

    const duplicate =
      Boolean(
        normalizedCode &&
        codes.has(normalizedCode),
      );

    const data = {
      tenantId: context.tenantId,
      productTypeId:
        productType?.id ?? null,
      name: name ?? "",
      code: code ?? null,
      description:
        normalizeText(row.description) ?? null,
      itemType:
        itemType ?? "product",
      category:
        category ?? null,
      unitPrice:
        Number.isFinite(unitPrice)
          ? unitPrice.toFixed(2)
          : "0.00",
      currency:
        normalizeText(row.currency)
          ?.toLowerCase() ?? "mxn",
      active:
        row.active === undefined
          ? true
          : normalizeBoolean(row.active),
      metadata: {
        importedBy:
          context.userId,
        technicalSpecifications: {
          modelYear:
            modelYear
              ? Number(
                  modelYear,
                )
              : null,
          colors:
            normalizeText(row.colors)
              ?.split(",")
              .map((color) =>
                color.trim(),
              )
              .filter(Boolean) ?? [],
          engine:
            normalizeText(row.engine) ??
            null,
          displacement:
            normalizeText(
              row.displacement,
            ) ?? null,
          power:
            normalizeText(row.power) ??
            null,
          coolingSystem:
            normalizeText(
              row.coolingSystem,
            ) ?? null,
          transmission:
            normalizeText(
              row.transmission,
            ) ?? null,
          fuelCapacity:
            normalizeText(
              row.fuelCapacity,
            ) ?? null,
          loadCapacity:
            normalizeText(
              row.loadCapacity,
            ) ?? null,
          passengerCapacity:
            normalizeText(
              row.passengerCapacity,
            ) ?? null,
          warranty:
            normalizeText(
              row.warranty,
            ) ?? null,
        },
      },
    };

    if (!duplicate && errors.length === 0) {
      if (normalizedCode) {
        codes.add(normalizedCode);
      }
    }

    return {
      rowNumber: index + 2,
      status:
        errors.length > 0
          ? "error"
          : duplicate
            ? "duplicate"
            : "valid",
      errors:
        duplicate
          ? [
              "Ya existe un elemento del catálogo con el mismo código.",
            ]
          : errors,
      data,
    };
  });
}

async function validateRows(
  entity: ImportEntity,
  rows: Array<Record<string, unknown>>,
  context: ImportContext,
): Promise<RowResult[]> {
  switch (entity) {
    case "leads":
      return validateLeads(
        rows,
        context,
      );

    case "customers":
      return validateCustomers(
        rows,
        context,
      );

    case "catalog":
      return validateCatalog(
        rows,
        context,
      );
  }
}

function summarize(
  results: RowResult[],
) {
  return {
    totalRows: results.length,
    validRows: results.filter(
      (row) => row.status === "valid",
    ).length,
    duplicateRows: results.filter(
      (row) =>
        row.status === "duplicate",
    ).length,
    errorRows: results.filter(
      (row) => row.status === "error",
    ).length,
  };
}

function chunk<T>(
  values: T[],
  size: number,
): T[][] {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index + size,
      ),
    );
  }

  return chunks;
}

async function importRows(
  entity: ImportEntity,
  results: RowResult[],
  context: ImportContext,
  fileName: string,
) {
  const validRows = results
    .filter(
      (row) => row.status === "valid",
    )
    .map((row) => row.data);

  if (validRows.length === 0) {
    throw new ApiError(
      "No hay filas válidas para importar.",
      409,
    );
  }

  const summary =
    summarize(results);

  const queries: unknown[] =
    chunk(
      validRows,
      INSERT_CHUNK_SIZE,
    ).map((values) => {
      switch (entity) {
        case "leads":
          return db
            .insert(crmLeads)
            .values(
              values as Array<
                typeof crmLeads.$inferInsert
              >,
            );

        case "customers":
          return db
            .insert(crmCustomers)
            .values(
              values as Array<
                typeof crmCustomers.$inferInsert
              >,
            );

        case "catalog":
          return db
            .insert(crmProducts)
            .values(
              values as Array<
                typeof crmProducts.$inferInsert
              >,
            );
      }
    });

  queries.push(
    db
      .insert(crmImportJobs)
      .values({
        tenantId: context.tenantId,
        entityType: entity,
        fileName,
        status:
          summary.duplicateRows > 0 ||
          summary.errorRows > 0
            ? "completed_with_errors"
            : "completed",
        totalRows:
          summary.totalRows,
        validRows:
          summary.validRows,
        importedRows:
          validRows.length,
        duplicateRows:
          summary.duplicateRows,
        errorRows:
          summary.errorRows,
        performedByClerkUserId:
          context.userId,
        performedByName:
          context.userName,
        summary: {
          mode:
            "create_only_skip_duplicates",
        },
        completedAt:
          new Date(),
      }),
  );

  await db.batch(
    queries as unknown as
      Parameters<
        typeof db.batch
      >[0],
  );

  return {
    ...summary,
    importedRows:
      validRows.length,
  };
}

export async function GET() {
  try {
    const context =
      await getContext();

    const jobs = await db
      .select()
      .from(crmImportJobs)
      .where(
        eq(
          crmImportJobs.tenantId,
          context.tenantId,
        ),
      )
      .orderBy(
        desc(
          crmImportJobs.createdAt,
        ),
      )
      .limit(20);

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        maximumRows:
          MAX_ROWS,
        industry:
          context.industry,
        catalogOptions:
          context.catalogOptions,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
) {
  try {
    const context =
      await getContext();
    const payload =
      await request.json() as
        ImportPayload;
    const action =
      getAction(payload.action);
    const entity =
      getEntity(payload.entity);
    const rows =
      getRows(payload.rows);
    const results =
      await validateRows(
        entity,
        rows,
        context,
      );
    const summary =
      summarize(results);

    if (action === "validate") {
      return NextResponse.json({
        success: true,
        data: {
          results,
          summary,
        },
      });
    }

    const fileName =
      normalizeText(
        payload.fileName,
      );

    if (!fileName) {
      throw new ApiError(
        "No fue posible identificar el archivo.",
        400,
      );
    }

    const imported =
      await importRows(
        entity,
        results,
        context,
        fileName.slice(0, 255),
      );

    return NextResponse.json({
      success: true,
      message:
        "La importación terminó correctamente.",
      data: imported,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
