import { auth } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";

import {
  CRMIndustryCapabilityError,
  requireCRMIndustryCapability,
} from "@/lib/crm/industry-capabilities";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type CatalogPayload = {
  action?: unknown;
  providerId?: unknown;
  name?: unknown;
  code?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  minimumDownPaymentPercent?: unknown;
  minimumDownPaymentAmount?: unknown;
  minimumTermMonths?: unknown;
  maximumTermMonths?: unknown;
};

type CatalogRow = {
  providerId: string;
  providerName: string;
  providerCode: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  productId: string | null;
  productName: string | null;
  productCode: string | null;
  minimumDownPaymentPercent: string | null;
  minimumDownPaymentAmount: string | null;
  minimumTermMonths: number | null;
  maximumTermMonths: number | null;
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

function getString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function getCode(
  value: unknown,
): string | undefined {
  const normalized =
    getString(value)
      ?.toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return normalized || undefined;
}

function getNonNegativeNumber(
  value: unknown,
  label: string,
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    throw new ApiError(
      `${label} no es válido.`,
      400,
    );
  }

  return Math.round(parsed * 10000) / 10000;
}

function getPositiveInteger(
  value: unknown,
  label: string,
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    throw new ApiError(
      `${label} debe ser un entero mayor que cero.`,
      400,
    );
  }

  return parsed;
}

async function getContext(
  permission:
    | "view"
    | "manage",
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

  const tenantResult =
    await db.execute<{
      id: string;
    }>(sql`
      SELECT id
      FROM tenants
      WHERE clerk_organization_id = ${orgId}
      LIMIT 1
    `);

  const tenantId =
    tenantResult.rows[0]?.id;

  if (!tenantId) {
    throw new ApiError(
      "La empresa aún no está sincronizada.",
      404,
    );
  }

  await requireCRMIndustryCapability(

    tenantId,

    "motorcycle_commercial_cycle",

  );


  await requireCRMModulePermission(
    tenantId,
    userId,
    "deals",
    permission,
  );

  return {
    tenantId,
    userId,
  };
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
    error instanceof CRMIndustryCapabilityError ||
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
    code?: string;
    cause?: {
      code?: string;
    };
  };

  if (
    databaseError.code === "23505" ||
    databaseError.cause?.code === "23505"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe una financiera o producto con esa clave.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(
    "No fue posible procesar el catálogo financiero:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar el catálogo financiero.",
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
    } = await getContext("view");

    const result =
      await db.execute<CatalogRow>(sql`
        SELECT
          provider.id AS "providerId",
          provider.name AS "providerName",
          provider.code AS "providerCode",
          provider.contact_name AS "contactName",
          provider.contact_email AS "contactEmail",
          provider.contact_phone AS "contactPhone",
          product.id AS "productId",
          product.name AS "productName",
          product.code AS "productCode",
          product.minimum_down_payment_percent AS "minimumDownPaymentPercent",
          product.minimum_down_payment_amount AS "minimumDownPaymentAmount",
          product.minimum_term_months AS "minimumTermMonths",
          product.maximum_term_months AS "maximumTermMonths"
        FROM financing_providers AS provider
        LEFT JOIN financing_products AS product
          ON product.tenant_id = provider.tenant_id
          AND product.provider_id = provider.id
          AND product.active = TRUE
        WHERE
          provider.tenant_id = ${tenantId}
          AND provider.active = TRUE
        ORDER BY
          provider.name ASC,
          product.name ASC
      `);

    const providers =
      Array.from(
        result.rows.reduce(
          (map, row) => {
            const provider =
              map.get(row.providerId) ?? {
                id: row.providerId,
                name: row.providerName,
                code: row.providerCode,
                contactName:
                  row.contactName,
                contactEmail:
                  row.contactEmail,
                contactPhone:
                  row.contactPhone,
                products: [] as Array<{
                  id: string;
                  name: string;
                  code: string;
                  minimumDownPaymentPercent:
                    string | null;
                  minimumDownPaymentAmount:
                    string | null;
                  minimumTermMonths:
                    number | null;
                  maximumTermMonths:
                    number | null;
                }>,
              };

            if (
              row.productId &&
              row.productName &&
              row.productCode
            ) {
              provider.products.push({
                id: row.productId,
                name: row.productName,
                code: row.productCode,
                minimumDownPaymentPercent:
                  row.minimumDownPaymentPercent,
                minimumDownPaymentAmount:
                  row.minimumDownPaymentAmount,
                minimumTermMonths:
                  row.minimumTermMonths,
                maximumTermMonths:
                  row.maximumTermMonths,
              });
            }

            map.set(
              row.providerId,
              provider,
            );

            return map;
          },
          new Map<string, {
            id: string;
            name: string;
            code: string;
            contactName: string | null;
            contactEmail: string | null;
            contactPhone: string | null;
            products: Array<{
              id: string;
              name: string;
              code: string;
              minimumDownPaymentPercent:
                string | null;
              minimumDownPaymentAmount:
                string | null;
              minimumTermMonths:
                number | null;
              maximumTermMonths:
                number | null;
            }>;
          }>(),
        ).values(),
      );

    return NextResponse.json({
      success: true,
      data: {
        providers,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(
  request: Request,
) {
  try {
    const payload =
      (await request.json()) as
        CatalogPayload;

    const action =
      getString(payload.action);

    if (
      action !== "create_provider" &&
      action !== "create_product"
    ) {
      throw new ApiError(
        "La acción solicitada no es válida.",
        400,
      );
    }

    const name =
      getString(payload.name);

    const code =
      getCode(
        payload.code ??
          payload.name,
      );

    if (!name || !code) {
      throw new ApiError(
        "El nombre y la clave son obligatorios.",
        400,
      );
    }

    const {
      tenantId,
      userId,
    } = await getContext("manage");

    if (action === "create_provider") {
      const result =
        await db.execute<{
          id: string;
          name: string;
          code: string;
        }>(sql`
          INSERT INTO financing_providers (
            tenant_id,
            name,
            code,
            active,
            contact_name,
            contact_email,
            contact_phone,
            metadata,
            created_at,
            updated_at
          )
          VALUES (
            ${tenantId},
            ${name},
            ${code},
            TRUE,
            ${getString(payload.contactName) ?? null},
            ${getString(payload.contactEmail) ?? null},
            ${getString(payload.contactPhone) ?? null},
            jsonb_build_object(
              'createdByClerkUserId',
              ${userId}
            ),
            NOW(),
            NOW()
          )
          RETURNING id, name, code
        `);

      return NextResponse.json(
        {
          success: true,
          message:
            "La financiera fue creada.",
          data: result.rows[0],
        },
        {
          status: 201,
        },
      );
    }

    const providerId =
      getString(payload.providerId);

    if (!providerId) {
      throw new ApiError(
        "Selecciona la financiera del producto.",
        400,
      );
    }

    const minimumDownPaymentPercent =
      getNonNegativeNumber(
        payload.minimumDownPaymentPercent,
        "El porcentaje mínimo de enganche",
      );

    if (
      minimumDownPaymentPercent !==
        undefined &&
      minimumDownPaymentPercent > 100
    ) {
      throw new ApiError(
        "El porcentaje mínimo debe estar entre 0 y 100.",
        400,
      );
    }

    const minimumDownPaymentAmount =
      getNonNegativeNumber(
        payload.minimumDownPaymentAmount,
        "El monto mínimo de enganche",
      );

    const minimumTermMonths =
      getPositiveInteger(
        payload.minimumTermMonths,
        "El plazo mínimo",
      );

    const maximumTermMonths =
      getPositiveInteger(
        payload.maximumTermMonths,
        "El plazo máximo",
      );

    if (
      minimumTermMonths !== undefined &&
      maximumTermMonths !== undefined &&
      minimumTermMonths > maximumTermMonths
    ) {
      throw new ApiError(
        "El plazo mínimo no puede ser mayor que el máximo.",
        400,
      );
    }

    const result =
      await db.execute<{
        id: string;
        name: string;
        code: string;
      }>(sql`
        INSERT INTO financing_products (
          tenant_id,
          provider_id,
          name,
          code,
          active,
          minimum_down_payment_percent,
          minimum_down_payment_amount,
          minimum_term_months,
          maximum_term_months,
          metadata,
          created_at,
          updated_at
        )
        SELECT
          ${tenantId},
          provider.id,
          ${name},
          ${code},
          TRUE,
          ${minimumDownPaymentPercent ?? null},
          ${minimumDownPaymentAmount ?? null},
          ${minimumTermMonths ?? null},
          ${maximumTermMonths ?? null},
          jsonb_build_object(
            'createdByClerkUserId',
            ${userId}
          ),
          NOW(),
          NOW()
        FROM financing_providers AS provider
        WHERE
          provider.tenant_id = ${tenantId}
          AND provider.id = ${providerId}
          AND provider.active = TRUE
        RETURNING id, name, code
      `);

    const product =
      result.rows[0];

    if (!product) {
      throw new ApiError(
        "La financiera seleccionada no existe o está inactiva.",
        400,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "El producto financiero fue creado.",
        data: product,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
