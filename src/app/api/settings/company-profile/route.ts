import {
  auth,
  clerkClient,
} from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import {
  isSatCatalogValue,
  isValidMexicanPostalCode,
  isValidMexicanTaxId,
  normalizeMexicanTaxId,
  SAT_TAX_REGIMES,
} from "@/lib/fiscal/catalogs";

export const dynamic =
  "force-dynamic";

type CompanyProfilePayload = {
  name?: unknown;
  legalName?: unknown;
  taxId?: unknown;
  fiscalTaxRegime?: unknown;
  fiscalPostalCode?: unknown;
  tagline?: unknown;
  country?: unknown;
  timezone?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  address?: unknown;
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
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function getMetadataString(
  metadata:
    Record<string, unknown>,
  key: string,
): string {
  const value =
    metadata[key];

  return typeof value ===
    "string"
    ? value
    : "";
}

async function getTenant() {
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
      .select()
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

  return tenant;
}

function serializeCompany(
  tenant:
    typeof tenants.$inferSelect,
) {
  const metadata =
    tenant.metadata ?? {};

  return {
    id: tenant.id,
    name: tenant.name,

    legalName:
      tenant.legalName ?? "",

    taxId:
      tenant.taxId ?? "",

    fiscalTaxRegime:
      tenant.fiscalTaxRegime ?? "",

    fiscalPostalCode:
      tenant.fiscalPostalCode ?? "",

    tagline:
      tenant.tagline ?? "",

    country:
      tenant.country,

    timezone:
      tenant.timezone,

    primaryColor:
      tenant.primaryColor,

    secondaryColor:
      tenant.secondaryColor,

    phone:
      getMetadataString(
        metadata,
        "phone",
      ),

    email:
      getMetadataString(
        metadata,
        "email",
      ),

    website:
      getMetadataString(
        metadata,
        "website",
      ),

    address:
      getMetadataString(
        metadata,
        "address",
      ),

    logoUrl:
      tenant.logoObjectKey
        ? "/api/settings/company-logo/content"
        : null,
  };
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError
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
    "No fue posible guardar la información de la empresa:",
    error,
  );

  return NextResponse.json(
    {
      success: false,

      error:
        "No fue posible guardar la información de la empresa.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
  try {
    const tenant =
      await getTenant();

    return NextResponse.json({
      success: true,

      data:
        serializeCompany(
          tenant,
        ),
    });
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
    const tenant =
      await getTenant();

    const values =
      await request.json();

    if (!isRecord(values)) {
      throw new ApiError(
        "La información enviada no es válida.",
        400,
      );
    }

    const payload =
      values as CompanyProfilePayload;

    const name =
      getString(
        payload.name,
      );

    if (!name) {
      throw new ApiError(
        "El nombre comercial es obligatorio.",
        400,
      );
    }

    const email =
      getString(
        payload.email,
      );

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      throw new ApiError(
        "El correo electrónico no es válido.",
        400,
      );
    }

    const timezone =
      getString(
        payload.timezone,
      ) ||
      tenant.timezone;

    try {
      new Intl.DateTimeFormat(
        "es-MX",
        {
          timeZone: timezone,
        },
      ).format(
        new Date(),
      );
    } catch {
      throw new ApiError(
        "La zona horaria no es válida.",
        400,
      );
    }

    const country =
      (
        getString(
          payload.country,
        ) ||
        tenant.country
      ).toUpperCase();

    const taxId = normalizeMexicanTaxId(getString(payload.taxId));
    const fiscalTaxRegime = getString(payload.fiscalTaxRegime);
    const fiscalPostalCode = getString(payload.fiscalPostalCode);

    if (country === "MX" && taxId && !isValidMexicanTaxId(taxId)) {
      throw new ApiError("El RFC fiscal no tiene un formato válido.", 400);
    }

    if (!isSatCatalogValue(SAT_TAX_REGIMES, fiscalTaxRegime || undefined)) {
      throw new ApiError("El régimen fiscal seleccionado no es válido.", 400);
    }

    if (country === "MX" && fiscalPostalCode && !isValidMexicanPostalCode(fiscalPostalCode)) {
      throw new ApiError("El código postal fiscal debe contener 5 dígitos.", 400);
    }

    const fiscalFields = [taxId, fiscalTaxRegime, fiscalPostalCode];
    if (fiscalFields.some(Boolean) && !fiscalFields.every(Boolean)) {
      throw new ApiError(
        "Para habilitar el timbrado captura RFC, régimen fiscal y código postal fiscal.",
        400,
      );
    }

    const metadata = {
      ...(
        tenant.metadata ??
        {}
      ),

      phone:
        getString(
          payload.phone,
        ),

      email,

      website:
        getString(
          payload.website,
        ),

      address:
        getString(
          payload.address,
        ),
    };

    const [updatedTenant] =
      await db
        .update(tenants)
        .set({
          name,

          legalName:
            getString(
              payload.legalName,
            ) || null,

          taxId:
            taxId || null,

          fiscalTaxRegime:
            fiscalTaxRegime || null,

          fiscalPostalCode:
            fiscalPostalCode || null,

          tagline:
            getString(
              payload.tagline,
            ) || null,

          country,
          timezone,
          metadata,

          updatedAt:
            new Date(),
        })
        .where(
          eq(
            tenants.id,
            tenant.id,
          ),
        )
        .returning();

    if (!updatedTenant) {
      throw new ApiError(
        "No fue posible actualizar la empresa.",
        500,
      );
    }

    const clerk =
      await clerkClient();

    await clerk
      .organizations
      .updateOrganization(
        updatedTenant
          .clerkOrganizationId,
        {
          name:
            updatedTenant.name,
        },
      );

    return NextResponse.json({
      success: true,

      data:
        serializeCompany(
          updatedTenant,
        ),

      message:
        "La información de la empresa se guardó correctamente.",
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}
