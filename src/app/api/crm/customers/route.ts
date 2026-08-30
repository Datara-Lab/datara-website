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

import { NextResponse } from "next/server";

import { db } from "@/db";

import {
  crmCustomers,
  crmLeads,
  crmProducts,
  tenantBranches,
  tenantMembers,
  tenants,
} from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
  validateCRMBranchId,
} from "@/lib/crm/branch-access";

import {
  executeCRMAutomations,
} from "@/lib/crm/automation-engine";

import {
  CRMPermissionError,
  type CRMModulePermission,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";
import {
  isSatCatalogValue,
  isValidMexicanPostalCode,
  isValidMexicanTaxId,
  SAT_CFDI_USES,
  SAT_TAX_REGIMES,
} from "@/lib/fiscal/catalogs";

export const dynamic = "force-dynamic";

type CustomerFormPayload = {
  id?: unknown;
  branchId?: unknown;
  customerType?: unknown;
  name?: unknown;
  lastName?: unknown;
  companyName?: unknown;
  legalName?: unknown;
  taxId?: unknown;
  fiscalTaxRegime?: unknown;
  cfdiUse?: unknown;
  email?: unknown;
  phone?: unknown;
  mobile?: unknown;
  status?: unknown;
  sourceLeadId?: unknown;
  productId?: unknown;
  ownerClerkUserId?: unknown;
  addressLine?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  country?: unknown;
  commercialConsent?: unknown;
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

function getBoolean(
  value: unknown,
): boolean {
  return value === true;
}

function normalizeEmail(
  value: unknown,
): string | undefined {
  return getOptionalString(value)
    ?.toLowerCase();
}

function validateEmail(
  email?: string,
): boolean {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function validatePayload(
  values: CustomerFormPayload,
): string | null {
  const customerType =
    getOptionalString(
      values.customerType,
    ) ?? "Persona";

  if (
    customerType !== "Persona" &&
    customerType !== "Empresa"
  ) {
    return "El tipo de cliente no es válido.";
  }

  const name =
    getOptionalString(values.name);

  const companyName =
    getOptionalString(
      values.companyName,
    );

  if (!name) {
    return customerType === "Empresa"
      ? "El nombre del contacto principal es obligatorio."
      : "El nombre del cliente es obligatorio.";
  }

  if (
    customerType === "Empresa" &&
    !companyName
  ) {
    return "El nombre comercial de la empresa es obligatorio.";
  }

  const email =
    normalizeEmail(values.email);

  if (!validateEmail(email)) {
    return "El correo electrónico no tiene un formato válido.";
  }

  const phone =
    getOptionalString(values.phone);

  const mobile =
    getOptionalString(values.mobile);

  if (!email && !phone && !mobile) {
    return "Captura al menos un correo electrónico, teléfono o móvil.";
  }

  const taxId = getOptionalString(values.taxId);
  const taxRegime = getOptionalString(values.fiscalTaxRegime);
  const cfdiUse = getOptionalString(values.cfdiUse);
  const postalCode = getOptionalString(values.postalCode);

  if (taxId && !isValidMexicanTaxId(taxId)) return "El RFC fiscal no tiene un formato válido.";
  if (!isSatCatalogValue(SAT_TAX_REGIMES, taxRegime)) return "El régimen fiscal no es válido.";
  if (!isSatCatalogValue(SAT_CFDI_USES, cfdiUse)) return "El uso CFDI no es válido.";
  if (postalCode && !isValidMexicanPostalCode(postalCode)) return "El código postal fiscal debe contener 5 dígitos.";

  const fiscalFields = [taxId, taxRegime, cfdiUse, postalCode];
  if (fiscalFields.some(Boolean) && !fiscalFields.every(Boolean)) {
    return "Para facturar captura RFC, régimen fiscal, uso CFDI y código postal fiscal.";
  }

  return null;
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
      "contacts",
      permission,
    ),
  ]);

  return {
    userId,
    tenantId: tenant.id,
    branchAccess,
    permissions,
  };
}

async function validateProductId(
  tenantId: string,
  productId?: string,
) {
  if (!productId) {
    return null;
  }

  const [product] = await db
    .select({
      id: crmProducts.id,
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

  if (!product) {
    throw new ApiError(
      "El modelo relacionado no pertenece a la empresa.",
      400,
    );
  }

  return product.id;
}

async function validateLeadId(
  tenantId: string,
  leadId?: string,
) {
  if (!leadId) {
    return null;
  }

  const [lead] = await db
    .select({
      id: crmLeads.id,
    })
    .from(crmLeads)
    .where(
      and(
        eq(
          crmLeads.id,
          leadId,
        ),
        eq(
          crmLeads.tenantId,
          tenantId,
        ),
      ),
    )
    .limit(1);

  if (!lead) {
    throw new ApiError(
      "El prospecto de origen no pertenece a la empresa.",
      400,
    );
  }

  return lead.id;
}

async function resolveOwner(
  tenantId: string,
  requestedOwnerId: string | undefined,
  currentUserId: string,
) {
  const ownerId =
    requestedOwnerId ??
    currentUserId;

  const [member] = await db
    .select({
      clerkUserId:
        tenantMembers.clerkUserId,
      firstName:
        tenantMembers.firstName,
      lastName:
        tenantMembers.lastName,
      email: tenantMembers.email,
    })
    .from(tenantMembers)
    .where(
      and(
        eq(
          tenantMembers.tenantId,
          tenantId,
        ),
        eq(
          tenantMembers.clerkUserId,
          ownerId,
        ),
        eq(
          tenantMembers.status,
          "active",
        ),
      ),
    )
    .limit(1);

  if (member) {
    const memberName = [
      member.firstName,
      member.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id: member.clerkUserId,
      name:
        memberName ||
        member.email,
      email: member.email,
    };
  }

  if (requestedOwnerId) {
    throw new ApiError(
      "El responsable seleccionado no es un miembro activo de la empresa.",
      400,
    );
  }

  const clerkUser =
    await currentUser();

  const email =
    clerkUser
      ?.primaryEmailAddress
      ?.emailAddress ??
    "";

  const name = [
    clerkUser?.firstName,
    clerkUser?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: currentUserId,
    name:
      name ||
      email ||
      "Usuario",
    email,
  };
}

function normalizePhone(
  value: unknown,
): string | null {
  const normalized =
    getOptionalString(value)
      ?.replace(
        /[^0-9]/g,
        "",
      ) ?? "";

  return normalized || null;
}

async function ensureCustomerIdentifiersUnique(
  tenantId: string,
  values: CustomerFormPayload,
  excludedCustomerId?: string,
) {
  const email =
    getOptionalString(
      values.email,
    )?.toLowerCase() ?? null;

  const taxId =
    getOptionalString(
      values.taxId,
    )?.toUpperCase() ?? null;

  const phoneNumbers =
    Array.from(
      new Set(
        [
          normalizePhone(
            values.phone,
          ),
          normalizePhone(
            values.mobile,
          ),
        ].filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
      ),
    );

  const isAnotherCustomer = (
    customerId: string,
  ) =>
    !excludedCustomerId ||
    customerId !== excludedCustomerId;

  if (email) {
    const matches =
      await db
        .select({
          id: crmCustomers.id,
        })
        .from(crmCustomers)
        .where(
          and(
            eq(
              crmCustomers.tenantId,
              tenantId,
            ),
            eq(
              crmCustomers.email,
              email,
            ),
          ),
        );

    if (
      matches.some(
        (customer) =>
          isAnotherCustomer(
            customer.id,
          ),
      )
    ) {
      throw new ApiError(
        "Ya existe un cliente con ese correo electrónico.",
        409,
      );
    }
  }

  if (taxId) {
    const matches =
      await db
        .select({
          id: crmCustomers.id,
        })
        .from(crmCustomers)
        .where(
          and(
            eq(
              crmCustomers.tenantId,
              tenantId,
            ),
            eq(
              crmCustomers.taxId,
              taxId,
            ),
          ),
        );

    if (
      matches.some(
        (customer) =>
          isAnotherCustomer(
            customer.id,
          ),
      )
    ) {
      throw new ApiError(
        "Ya existe un cliente con ese RFC o identificación fiscal.",
        409,
      );
    }
  }

  for (
    const phoneNumber of
    phoneNumbers
  ) {
    const matches =
      await db
        .select({
          id: crmCustomers.id,
        })
        .from(crmCustomers)
        .where(
          and(
            eq(
              crmCustomers.tenantId,
              tenantId,
            ),
            sql<boolean>`
              (
                regexp_replace(
                  coalesce(
                    ${crmCustomers.phone},
                    ''
                  ),
                  '[^0-9]',
                  '',
                  'g'
                ) = ${phoneNumber}
                OR
                regexp_replace(
                  coalesce(
                    ${crmCustomers.mobile},
                    ''
                  ),
                  '[^0-9]',
                  '',
                  'g'
                ) = ${phoneNumber}
              )
            `,
          ),
        );

    if (
      matches.some(
        (customer) =>
          isAnotherCustomer(
            customer.id,
          ),
      )
    ) {
      throw new ApiError(
        "Ya existe un cliente con ese número de teléfono.",
        409,
      );
    }
  }
}

function createErrorResponse(
  error: unknown,
  fallback: string,
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

  const databaseError =
    error as {
      cause?: {
        code?: string;
        constraint?: string;
      };
      code?: string;
      constraint?: string;
    };

  const errorCode =
    databaseError.cause?.code ??
    databaseError.code;

  const constraint =
    databaseError.cause
      ?.constraint ??
    databaseError.constraint;

  if (
    errorCode === "23505" &&
    constraint ===
      "crm_customers_tenant_email_unique"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe un cliente con ese correo electrónico.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    errorCode === "23505" &&
    constraint ===
      "crm_customers_tenant_tax_id_unique"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe un cliente con ese RFC o identificación fiscal.",
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

export async function GET() {
  try {
    const {
      tenantId,
      branchAccess,
      permissions,
    } = await getTenantContext(
      "view",
    );

    const customerAccessCondition =
      branchAccess.allBranches
        ? eq(
            crmCustomers.tenantId,
            tenantId,
          )
        : and(
            eq(
              crmCustomers.tenantId,
              tenantId,
            ),

            branchAccess.branchIds.length >
            0
              ? inArray(
                  crmCustomers.branchId,
                  branchAccess.branchIds,
                )
              : sql<boolean>`false`,
          );

    const records = await db
            .select({
        id: crmCustomers.id,

        branchId:
          crmCustomers.branchId,

        branchName:
          tenantBranches.name,

        branchCode:
          tenantBranches.code,

        customerType:
          crmCustomers.customerType,
        name: crmCustomers.name,
        lastName:
          crmCustomers.lastName,
        companyName:
          crmCustomers.companyName,
        legalName:
          crmCustomers.legalName,
        taxId: crmCustomers.taxId,
        fiscalTaxRegime: crmCustomers.fiscalTaxRegime,
        cfdiUse: crmCustomers.cfdiUse,
        email: crmCustomers.email,
        phone: crmCustomers.phone,
        mobile: crmCustomers.mobile,
        status: crmCustomers.status,

        sourceLeadId:
          crmCustomers.sourceLeadId,
        sourceLeadFirstName:
          crmLeads.firstName,
        sourceLeadLastName:
          crmLeads.lastName,
        sourceLeadEmail:
          crmLeads.email,

        productId:
          crmCustomers.productId,
        productName:
          crmProducts.name,
        productCode:
          crmProducts.code,

        ownerClerkUserId:
          crmCustomers
            .ownerClerkUserId,
        ownerName:
          crmCustomers.ownerName,
        ownerEmail:
          crmCustomers.ownerEmail,

        addressLine:
          crmCustomers.addressLine,
        city: crmCustomers.city,
        state: crmCustomers.state,
        postalCode:
          crmCustomers.postalCode,
        country: crmCustomers.country,

        commercialConsent:
          crmCustomers
            .commercialConsent,
        notes: crmCustomers.notes,
        createdAt:
          crmCustomers.createdAt,
        updatedAt:
          crmCustomers.updatedAt,
      })
      .from(crmCustomers)
      .leftJoin(
        tenantBranches,
        and(
          eq(
            crmCustomers.branchId,
            tenantBranches.id,
          ),
          eq(
            tenantBranches.tenantId,
            tenantId,
          ),
        ),
      )
      .leftJoin(
        crmProducts,
        and(
          eq(
            crmCustomers.productId,
            crmProducts.id,
          ),
          eq(
            crmProducts.tenantId,
            tenantId,
          ),
        ),
      )
      .leftJoin(
        crmLeads,
        and(
          eq(
            crmCustomers.sourceLeadId,
            crmLeads.id,
          ),
          eq(
            crmLeads.tenantId,
            tenantId,
          ),
        ),
      )
      .where(
        customerAccessCondition,
      )
      .orderBy(
        desc(
          crmCustomers.createdAt,
        ),
      );

    const data = records.map(
      (record) => {
        const personName = [
          record.name,
          record.lastName,
        ]
          .filter(Boolean)
          .join(" ");

        const sourceLeadName = [
          record.sourceLeadFirstName,
          record.sourceLeadLastName,
        ]
          .filter(Boolean)
          .join(" ");

        return {
          id: record.id,

          branchId:
            record.branchId
              ? {
                  id:
                    record.branchId,

                  value:
                    record.branchId,

                  name:
                    record.branchName ??
                    "Sucursal",

                  label:
                    record.branchCode
                      ? `${record.branchName ?? "Sucursal"} (${record.branchCode})`
                      : record.branchName ??
                        "Sucursal",

                  code:
                    record.branchCode,
                }
              : null,

          customerType:
            record.customerType,

          displayName:
            record.customerType ===
            "Empresa"
              ? record.companyName ??
                record.name
              : personName,

          name: record.name,
          lastName:
            record.lastName,
          companyName:
            record.companyName,
          legalName:
            record.legalName,
          taxId: record.taxId,
          fiscalTaxRegime: record.fiscalTaxRegime,
          cfdiUse: record.cfdiUse,
          email: record.email,
          phone: record.phone,
          mobile: record.mobile,
          status: record.status,

          sourceLeadId:
            record.sourceLeadId
              ? {
                  id:
                    record.sourceLeadId,
                  name:
                    sourceLeadName ||
                    record.sourceLeadEmail ||
                    "Prospecto",
                  email:
                    record.sourceLeadEmail ??
                    undefined,
                }
              : null,

          productId:
            record.productId
              ? {
                  id:
                    record.productId,
                  name:
                    record.productCode
                      ? `${record.productName} (${record.productCode})`
                      : record.productName ??
                        "Modelo relacionado",
                }
              : null,

          ownerClerkUserId:
            record.ownerClerkUserId
              ? {
                  id:
                    record.ownerClerkUserId,
                  name:
                    record.ownerName ??
                    record.ownerEmail ??
                    "Responsable",
                  email:
                    record.ownerEmail ??
                    undefined,
                }
              : null,

          addressLine:
            record.addressLine,
          city: record.city,
          state: record.state,
          postalCode:
            record.postalCode,
          country: record.country,

          commercialConsent:
            record.commercialConsent,
          notes: record.notes,

          createdTime:
            record.createdAt
              .toISOString(),
          modifiedTime:
            record.updatedAt
              .toISOString(),
        };
      },
    );

    return NextResponse.json({
      success: true,
      data,
      permissions,
      meta: {
        count: data.length,
        page: 1,
        perPage: data.length,
        moreRecords: false,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible consultar los clientes.",
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
    } = await getTenantContext(
      "create",
    );

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values =
      body as CustomerFormPayload;

    const branchId =
      await validateCRMBranchId(
        tenantId,
        branchAccess,
        getOptionalString(
          values.branchId,
        ),
      );

    const validationError =
      validatePayload(values);

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

    await ensureCustomerIdentifiersUnique(
      tenantId,
      values,
    );

    const customerType =
      getOptionalString(
        values.customerType,
      ) ?? "Persona";

    const companyName =
      getOptionalString(
        values.companyName,
      );

    const customerName =
      getOptionalString(
        values.name,
      ) as string;

    const productId =
      await validateProductId(
        tenantId,
        getOptionalString(
          values.productId,
        ),
      );

    const sourceLeadId =
      await validateLeadId(
        tenantId,
        getOptionalString(
          values.sourceLeadId,
        ),
      );

    const owner =
      await resolveOwner(
        tenantId,
        getOptionalString(
          values.ownerClerkUserId,
        ),
        userId,
      );

    const [customer] = await db
      .insert(crmCustomers)
      .values({
        tenantId,
        branchId,
        customerType,
        name: customerName,
        lastName:
          getOptionalString(
            values.lastName,
          ) ?? null,
        companyName:
          companyName ?? null,
        legalName:
          getOptionalString(
            values.legalName,
          ) ?? null,
        taxId:
          getOptionalString(
            values.taxId,
          )?.toUpperCase() ??
          null,
        fiscalTaxRegime:
          getOptionalString(values.fiscalTaxRegime) ?? null,
        cfdiUse:
          getOptionalString(values.cfdiUse) ?? null,
        email:
          normalizeEmail(
            values.email,
          ) ?? null,
        phone:
          getOptionalString(
            values.phone,
          ) ?? null,
        mobile:
          getOptionalString(
            values.mobile,
          ) ?? null,
        status:
          getOptionalString(
            values.status,
          ) ?? "Activo",
        sourceLeadId,
        productId,
        ownerClerkUserId:
          owner.id,
        ownerName: owner.name,
        ownerEmail:
          owner.email || null,
        addressLine:
          getOptionalString(
            values.addressLine,
          ) ?? null,
        city:
          getOptionalString(
            values.city,
          ) ?? null,
        state:
          getOptionalString(
            values.state,
          ) ?? null,
        postalCode:
          getOptionalString(
            values.postalCode,
          ) ?? null,
        country:
          getOptionalString(
            values.country,
          )?.toUpperCase() ??
          "MX",
        commercialConsent:
          getBoolean(
            values.commercialConsent,
          ),
        notes:
          getOptionalString(
            values.notes,
          ) ?? null,
        updatedAt: new Date(),
      })
      .returning();

    if (!customer) {
      throw new ApiError(
        "No fue posible crear el cliente.",
        500,
      );
    }

    try {
      await executeCRMAutomations({
        eventKey:
          `customer:${customer.id}:created:${crypto.randomUUID()}`,

        tenantId,
        branchId:
          customer.branchId,

        entityType:
          "customer",

        entityId:
          customer.id,

        triggerType:
          "record_created",

        actorClerkUserId:
          userId,

        previousRecord:
          null,

        nextRecord:
          customer,
      });
    } catch (
      automationError
    ) {
      console.error(
        `No fue posible ejecutar las automatizaciones del cliente ${customer.id}:`,
        automationError,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "El cliente fue creado correctamente.",
        data: {
          id: customer.id,
          createdTime:
            customer.createdAt
              .toISOString(),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible crear el cliente.",
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
      branchAccess,
    } = await getTenantContext(
      "edit",
    );

    const customerAccessCondition =
      branchAccess.allBranches
        ? eq(
            crmCustomers.tenantId,
            tenantId,
          )
        : and(
            eq(
              crmCustomers.tenantId,
              tenantId,
            ),

            branchAccess.branchIds.length >
            0
              ? inArray(
                  crmCustomers.branchId,
                  branchAccess.branchIds,
                )
              : sql<boolean>`false`,
          );

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values =
      body as CustomerFormPayload;

    const recordId =
      getOptionalString(values.id);

    if (!recordId) {
      throw new ApiError(
        "No fue posible identificar el cliente.",
        400,
      );
    }

    const validationError =
      validatePayload(values);

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

    const [existingCustomer] =
      await db
        .select()
        .from(crmCustomers)
        .where(
          and(
            eq(
              crmCustomers.id,
              recordId,
            ),

            customerAccessCondition,
          ),
        )
        .limit(1);

    if (!existingCustomer) {
      throw new ApiError(
        "El cliente no existe o no pertenece a la empresa.",
        404,
      );
    }

    const branchId =
      await validateCRMBranchId(
        tenantId,
        branchAccess,
        getOptionalString(
          values.branchId,
        ) ??
          existingCustomer.branchId,
      );

    await ensureCustomerIdentifiersUnique(
      tenantId,
      values,
      recordId,
    );

    const customerType =
      getOptionalString(
        values.customerType,
      ) ?? "Persona";

    const companyName =
      getOptionalString(
        values.companyName,
      );

    const customerName =
      getOptionalString(
        values.name,
      ) as string;

    const productId =
      await validateProductId(
        tenantId,
        getOptionalString(
          values.productId,
        ),
      );

    const sourceLeadId =
      await validateLeadId(
        tenantId,
        getOptionalString(
          values.sourceLeadId,
        ),
      );

    const owner =
      await resolveOwner(
        tenantId,
        getOptionalString(
          values.ownerClerkUserId,
        ),
        userId,
      );

    const [customer] = await db
      .update(crmCustomers)
      .set({
        branchId,
        customerType,
        name: customerName,
        lastName:
          getOptionalString(
            values.lastName,
          ) ?? null,
        companyName:
          companyName ?? null,
        legalName:
          getOptionalString(
            values.legalName,
          ) ?? null,
        taxId:
          getOptionalString(
            values.taxId,
          )?.toUpperCase() ??
          null,
        fiscalTaxRegime:
          getOptionalString(values.fiscalTaxRegime) ?? null,
        cfdiUse:
          getOptionalString(values.cfdiUse) ?? null,
        email:
          normalizeEmail(
            values.email,
          ) ?? null,
        phone:
          getOptionalString(
            values.phone,
          ) ?? null,
        mobile:
          getOptionalString(
            values.mobile,
          ) ?? null,
        status:
          getOptionalString(
            values.status,
          ) ?? "Activo",
        sourceLeadId,
        productId,
        ownerClerkUserId:
          owner.id,
        ownerName: owner.name,
        ownerEmail:
          owner.email || null,
        addressLine:
          getOptionalString(
            values.addressLine,
          ) ?? null,
        city:
          getOptionalString(
            values.city,
          ) ?? null,
        state:
          getOptionalString(
            values.state,
          ) ?? null,
        postalCode:
          getOptionalString(
            values.postalCode,
          ) ?? null,
        country:
          getOptionalString(
            values.country,
          )?.toUpperCase() ??
          "MX",
        commercialConsent:
          getBoolean(
            values.commercialConsent,
          ),
        notes:
          getOptionalString(
            values.notes,
          ) ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            crmCustomers.id,
            recordId,
          ),

          customerAccessCondition,
        ),
      )
      .returning();

    if (!customer) {
      throw new ApiError(
        "No fue posible actualizar el cliente.",
        404,
      );
    }

    const automationEventId =
      crypto.randomUUID();

    try {
      await executeCRMAutomations({
        eventKey:
          `customer:${customer.id}:updated:${automationEventId}`,

        tenantId,
        branchId:
          customer.branchId,

        entityType:
          "customer",

        entityId:
          customer.id,

        triggerType:
          "record_updated",

        actorClerkUserId:
          userId,

        previousRecord:
          existingCustomer,

        nextRecord:
          customer,
      });

      await executeCRMAutomations({
        eventKey:
          `customer:${customer.id}:status:${automationEventId}`,

        tenantId,
        branchId:
          customer.branchId,

        entityType:
          "customer",

        entityId:
          customer.id,

        triggerType:
          "status_changed",

        actorClerkUserId:
          userId,

        previousRecord:
          existingCustomer,

        nextRecord:
          customer,
      });
    } catch (
      automationError
    ) {
      console.error(
        `No fue posible ejecutar las automatizaciones del cliente ${customer.id}:`,
        automationError,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "El cliente fue actualizado correctamente.",
      data: {
        id: customer.id,
        modifiedTime:
          customer.updatedAt
            .toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible actualizar el cliente.",
    );
  }
}
