import {
  and,
  eq,
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  tenantProducts,
} from "@/db/schema";

import {
  AdministrationAuthError,
  requireAdminContext,
} from "@/lib/administration/require-admin-context";

import {
  getAITopUpSummary,
} from "@/lib/ai/credits";

import {
  getTenantAIConfiguration,
  getTenantAIUsage,
} from "@/lib/ai/entitlements";

import {
  canAccessProductWithContext,
} from "@/lib/auth/products";

import {
  getAuthorizationContext,
} from "@/lib/auth/session";

import type {
  DataraProduct,
} from "@/lib/auth/types";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    product: string;
  }>;
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

function getProduct(
  value: string,
): DataraProduct {
  if (
    value !== "crm" &&
    value !== "analytics" &&
    value !== "cloud"
  ) {
    throw new ApiError(
      "El producto solicitado no es válido.",
      404,
    );
  }

  return value;
}

async function getResponseData(
  tenantId: string,
  product: DataraProduct,
) {
  const [
    configuration,
    used,
    extraCredits,
  ] =
    await Promise.all([
      getTenantAIConfiguration(
        tenantId,
        product,
      ),

      getTenantAIUsage(
        tenantId,
        product,
      ),

      getAITopUpSummary(
        tenantId,
        product,
      ),
    ]);

  return {
    product,

    assistantName:
      configuration
        .assistantName,

    internalAssistantEnabled:
      configuration
        .internalAssistantEnabled,

    publicChatbotEnabled:
      configuration
        .publicChatbotEnabled,

    usage: {
      monthly: {
        used,

        limit:
          configuration
            .monthlyMessageLimit,

        remaining:
          Math.max(
            0,

            configuration
              .monthlyMessageLimit -
              used,
          ),
      },

      extra: {
        original:
          extraCredits.original,

        used:
          extraCredits.used,

        remaining:
          extraCredits.remaining,

        nextExpiresAt:
          extraCredits
            .nextExpiresAt
            ?.toISOString() ??
          null,
      },
    },
  };
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof
      ApiError ||
    error instanceof
      AdministrationAuthError
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

  console.error(
    "No fue posible administrar la configuración de IA:",
    error,
  );

  return NextResponse.json(
    {
      success: false,

      error:
        "No fue posible procesar la configuración de IA.",
    },
    {
      status: 500,
    },
  );
}

export async function GET(
  _request: Request,
  routeContext: RouteContext,
) {
  try {
    const {
      product:
        requestedProduct,
    } =
      await routeContext.params;

    const product =
      getProduct(
        requestedProduct,
      );

    const context =
      await getAuthorizationContext();

    const productAccess =
      await canAccessProductWithContext(
        context,
        product,
      );

    if (
      !productAccess.allowed
    ) {
      throw new ApiError(
        "No tienes acceso activo a este producto de Datara.",
        403,
      );
    }

    return NextResponse.json({
      success: true,

      data:
        await getResponseData(
          context.tenantId,
          product,
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
  routeContext: RouteContext,
) {
  try {
    const {
      product:
        requestedProduct,
    } =
      await routeContext.params;

    const product =
      getProduct(
        requestedProduct,
      );

    const context =
      await requireAdminContext();

    const requestBody:
      unknown =
      await request.json();

    if (
      !isRecord(requestBody)
    ) {
      throw new ApiError(
        "La solicitud no tiene un formato válido.",
        400,
      );
    }

    const settings:
      Record<
        string,
        | boolean
        | string
      > = {};

    if (
      requestBody
        .assistantName !==
      undefined
    ) {
      if (
        typeof requestBody
          .assistantName !==
        "string"
      ) {
        throw new ApiError(
          "El nombre del asistente no es válido.",
          400,
        );
      }

      const assistantName =
        requestBody
          .assistantName
          .trim();

      if (
        assistantName.length <
          2 ||
        assistantName.length >
          40
      ) {
        throw new ApiError(
          "El nombre del asistente debe tener entre 2 y 40 caracteres.",
          400,
        );
      }

      settings
        .assistantName =
        assistantName;
    }

    if (
      requestBody
        .internalAssistantEnabled !==
      undefined
    ) {
      if (
        typeof requestBody
          .internalAssistantEnabled !==
        "boolean"
      ) {
        throw new ApiError(
          "El estado del asistente interno no es válido.",
          400,
        );
      }

      settings
        .internalAssistantEnabled =
        requestBody
          .internalAssistantEnabled;
    }

    if (
      requestBody
        .publicChatbotEnabled !==
      undefined
    ) {
      if (
        typeof requestBody
          .publicChatbotEnabled !==
        "boolean"
      ) {
        throw new ApiError(
          "El estado del chatbot público no es válido.",
          400,
        );
      }

      settings
        .publicChatbotEnabled =
        requestBody
          .publicChatbotEnabled;
    }

    if (
      Object.keys(
        settings,
      ).length === 0
    ) {
      throw new ApiError(
        "No se recibió ninguna configuración para actualizar.",
        400,
      );
    }

    const [updatedProduct] =
      await db
        .update(
          tenantProducts,
        )
        .set({
          configuration:
            sql`
              coalesce(
                ${tenantProducts.configuration},
                '{}'::jsonb
              )
              ||
              ${JSON.stringify(settings)}::jsonb
            `,
        })
        .where(
          and(
            eq(
              tenantProducts
                .tenantId,

              context.tenantId,
            ),

            eq(
              tenantProducts
                .product,

              product,
            ),
          ),
        )
        .returning({
          tenantId:
            tenantProducts
              .tenantId,
        });

    if (!updatedProduct) {
      throw new ApiError(
        "La empresa no tiene configurado este producto.",
        404,
      );
    }

    return NextResponse.json({
      success: true,

      data:
        await getResponseData(
          context.tenantId,
          product,
        ),
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}
