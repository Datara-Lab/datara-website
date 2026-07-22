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
  crmLeads,
  crmProducts,
  tenantMembers,
  tenants,
} from "@/db/schema";

export const dynamic = "force-dynamic";

type LeadPayload = {
  id?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  mobile?: unknown;
  company?: unknown;
  leadSource?: unknown;
  leadStatus?: unknown;
  productId?: unknown;
  ownerClerkUserId?: unknown;
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

function validatePayload(
  values: LeadPayload,
): string | null {
  if (!getOptionalString(values.firstName)) {
    return "El nombre del prospecto es obligatorio.";
  }

  const email =
    normalizeEmail(values.email);

  const phone =
    getOptionalString(values.phone);

  const mobile =
    getOptionalString(values.mobile);

  if (!email && !phone && !mobile) {
    return "Captura al menos un correo electrónico o teléfono de contacto.";
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return "El correo electrónico no tiene un formato válido.";
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

async function validateProduct(
  tenantId: string,
  productId?: string,
  currentProductId?: string | null,
) {
  if (!productId) {
    return null;
  }

  const [product] = await db
    .select({
      id: crmProducts.id,
      active: crmProducts.active,
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
      "El producto seleccionado no pertenece al catálogo de la empresa.",
      400,
    );
  }

  if (
    !product.active &&
    product.id !== currentProductId
  ) {
    throw new ApiError(
      "El producto seleccionado está inactivo.",
      400,
    );
  }

  return product.id;
}

async function validateOwner(
  tenantId: string,
  ownerClerkUserId?: string,
) {
  if (!ownerClerkUserId) {
    return {
      id: null,
      name: null,
      email: null,
    };
  }

  const [member] = await db
    .select({
      clerkUserId:
        tenantMembers.clerkUserId,
      firstName:
        tenantMembers.firstName,
      lastName:
        tenantMembers.lastName,
      email:
        tenantMembers.email,
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
          ownerClerkUserId,
        ),
        eq(
          tenantMembers.status,
          "active",
        ),
      ),
    )
    .limit(1);

  if (!member) {
    throw new ApiError(
      "El responsable seleccionado no pertenece a la empresa o está inactivo.",
      400,
    );
  }

  const name = [
    member.firstName,
    member.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: member.clerkUserId,
    name:
      name ||
      member.email,
    email:
      member.email,
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
        id: crmLeads.id,
        firstName:
          crmLeads.firstName,
        lastName:
          crmLeads.lastName,
        email:
          crmLeads.email,
        phone:
          crmLeads.phone,
        mobile:
          crmLeads.mobile,
        company:
          crmLeads.company,
        leadSource:
          crmLeads.source,
        leadStatus:
          crmLeads.status,
        productId:
          crmLeads.productId,
        productName:
          crmProducts.name,
        productCode:
          crmProducts.code,
        productActive:
          crmProducts.active,
        ownerClerkUserId:
          crmLeads.ownerClerkUserId,
        ownerName:
          crmLeads.ownerName,
        ownerEmail:
          crmLeads.ownerEmail,
        commercialConsent:
          crmLeads.commercialConsent,
        notes:
          crmLeads.notes,
        createdAt:
          crmLeads.createdAt,
        updatedAt:
          crmLeads.updatedAt,
      })
      .from(crmLeads)
      .leftJoin(
        crmProducts,
        and(
          eq(
            crmLeads.productId,
            crmProducts.id,
          ),
          eq(
            crmProducts.tenantId,
            tenantId,
          ),
        ),
      )
      .where(
        eq(
          crmLeads.tenantId,
          tenantId,
        ),
      )
      .orderBy(
        desc(crmLeads.createdAt),
      );

    const data = records.map(
      (record) => ({
        id: record.id,
        firstName:
          record.firstName,
        lastName:
          record.lastName,
        email:
          record.email,
        phone:
          record.phone,
        mobile:
          record.mobile,
        company:
          record.company,
        leadSource:
          record.leadSource,
        leadStatus:
          record.leadStatus,

        productId:
          record.productId
            ? {
                id:
                  record.productId,
                value:
                  record.productId,
                name:
                  record.productName ??
                  "Producto relacionado",
                label:
                  record.productCode
                    ? `${record.productName} (${record.productCode})`
                    : record.productName ??
                      "Producto relacionado",
                active:
                  record.productActive ??
                  false,
              }
            : null,

        ownerClerkUserId:
          record.ownerClerkUserId
            ? {
                id:
                  record.ownerClerkUserId,
                value:
                  record.ownerClerkUserId,
                name:
                  record.ownerName ??
                  record.ownerEmail ??
                  "Usuario",
                label:
                  record.ownerName ??
                  record.ownerEmail ??
                  "Usuario",
                email:
                  record.ownerEmail,
              }
            : null,

        commercialConsent:
          record.commercialConsent,
        notes:
          record.notes,

        createdTime:
          record.createdAt.toISOString(),
        modifiedTime:
          record.updatedAt.toISOString(),
      }),
    );

    return NextResponse.json({
      success: true,
      data,
      meta: {
        count: data.length,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible consultar los prospectos.",
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
      body as LeadPayload;

    const validationError =
      validatePayload(values);

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

    const productId =
      await validateProduct(
        tenantId,
        getOptionalString(
          values.productId,
        ),
      );

    const selectedOwnerId =
      getOptionalString(
        values.ownerClerkUserId,
      );

    let owner: {
      id: string | null;
      name: string | null;
      email: string | null;
    } | null = selectedOwnerId
      ? await validateOwner(
          tenantId,
          selectedOwnerId,
        )
      : null;

    if (!owner) {
      const clerkUser =
        await currentUser();

      const ownerName = [
        clerkUser?.firstName,
        clerkUser?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      owner = {
        id: userId,
        name:
          ownerName ||
          clerkUser
            ?.primaryEmailAddress
            ?.emailAddress ||
          "Usuario",
        email:
          clerkUser
            ?.primaryEmailAddress
            ?.emailAddress ??
          null,
      };
    }

    const now = new Date();

    const [lead] = await db
      .insert(crmLeads)
      .values({
        tenantId,

        firstName:
          getOptionalString(
            values.firstName,
          ) as string,

        lastName:
          getOptionalString(
            values.lastName,
          ) ?? null,

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

        company:
          getOptionalString(
            values.company,
          ) ?? null,

        source:
          getOptionalString(
            values.leadSource,
          ) ?? null,

        status:
          getOptionalString(
            values.leadStatus,
          ) ?? "Nuevo",

        productId,

        ownerClerkUserId:
          owner.id,

        ownerName:
          owner.name,

        ownerEmail:
          owner.email,

        commercialConsent:
          getBoolean(
            values.commercialConsent,
          ),

        notes:
          getOptionalString(
            values.notes,
          ) ?? null,

        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: crmLeads.id,
        createdAt:
          crmLeads.createdAt,
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "El prospecto fue creado correctamente.",
        data: {
          id: lead.id,
          createdTime:
            lead.createdAt.toISOString(),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible crear el prospecto.",
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const {
      tenantId,
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
      body as LeadPayload;

    const recordId =
      getOptionalString(values.id);

    if (!recordId) {
      throw new ApiError(
        "No fue posible identificar el prospecto.",
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

    const [existingLead] =
      await db
        .select({
          id: crmLeads.id,
          productId:
            crmLeads.productId,
        })
        .from(crmLeads)
        .where(
          and(
            eq(
              crmLeads.id,
              recordId,
            ),
            eq(
              crmLeads.tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!existingLead) {
      throw new ApiError(
        "El prospecto no existe o no pertenece a la empresa.",
        404,
      );
    }

    const productId =
      await validateProduct(
        tenantId,
        getOptionalString(
          values.productId,
        ),
        existingLead.productId,
      );

    const owner =
      await validateOwner(
        tenantId,
        getOptionalString(
          values.ownerClerkUserId,
        ),
      );

    const [lead] = await db
      .update(crmLeads)
      .set({
        firstName:
          getOptionalString(
            values.firstName,
          ) as string,

        lastName:
          getOptionalString(
            values.lastName,
          ) ?? null,

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

        company:
          getOptionalString(
            values.company,
          ) ?? null,

        source:
          getOptionalString(
            values.leadSource,
          ) ?? null,

        status:
          getOptionalString(
            values.leadStatus,
          ) ?? "Nuevo",

        productId,

        ownerClerkUserId:
          owner.id,

        ownerName:
          owner.name,

        ownerEmail:
          owner.email,

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
            crmLeads.id,
            recordId,
          ),
          eq(
            crmLeads.tenantId,
            tenantId,
          ),
        ),
      )
      .returning({
        id: crmLeads.id,
        updatedAt:
          crmLeads.updatedAt,
      });

    if (!lead) {
      throw new ApiError(
        "No fue posible actualizar el prospecto.",
        404,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "El prospecto fue actualizado correctamente.",
      data: {
        id: lead.id,
        modifiedTime:
          lead.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible actualizar el prospecto.",
    );
  }
}
