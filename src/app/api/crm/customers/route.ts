import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";
import {
  and,
  desc,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmCustomers,
  crmLeads,
  crmProducts,
  tenantMembers,
  tenants,
} from "@/db/schema";

export const dynamic = "force-dynamic";

type CustomerFormPayload = {
  id?: unknown;
  customerType?: unknown;
  name?: unknown;
  lastName?: unknown;
  companyName?: unknown;
  legalName?: unknown;
  taxId?: unknown;
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

  return null;
}

async function getTenantContext() {
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

  return {
    userId,
    tenantId: tenant.id,
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

function createErrorResponse(
  error: unknown,
  fallback: string,
) {
  if (error instanceof ApiError) {
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
    } = await getTenantContext();

    const records = await db
      .select({
        id: crmCustomers.id,
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
        eq(
          crmCustomers.tenantId,
          tenantId,
        ),
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
    } = await getTenantContext();

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

    const validationError =
      validatePayload(values);

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

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
      .returning({
        id: crmCustomers.id,
        createdAt:
          crmCustomers.createdAt,
      });

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
    } = await getTenantContext();

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
        .select({
          id: crmCustomers.id,
        })
        .from(crmCustomers)
        .where(
          and(
            eq(
              crmCustomers.id,
              recordId,
            ),
            eq(
              crmCustomers.tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!existingCustomer) {
      throw new ApiError(
        "El cliente no existe o no pertenece a la empresa.",
        404,
      );
    }

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
          eq(
            crmCustomers.tenantId,
            tenantId,
          ),
        ),
      )
      .returning({
        id: crmCustomers.id,
        updatedAt:
          crmCustomers.updatedAt,
      });

    if (!customer) {
      throw new ApiError(
        "No fue posible actualizar el cliente.",
        404,
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
