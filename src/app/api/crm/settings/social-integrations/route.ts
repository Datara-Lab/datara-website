import {
  eq,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  tenants,
} from "@/db/schema";

import {
  getAuthorizationContext,
} from "@/lib/auth/session";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type SocialIntegrationSettings = {
  metaBusinessAccountId: string;

  facebook: {
    enabled: boolean;
    pageId: string;
    pageName: string;
    leadAdsEnabled: boolean;
  };

  instagram: {
    enabled: boolean;
    businessAccountId: string;
    username: string;
    messagesEnabled: boolean;
  };
};

type SettingsPayload = {
  metaBusinessAccountId?: unknown;
  facebook?: unknown;
  instagram?: unknown;
};

const defaultSettings:
  SocialIntegrationSettings = {
  metaBusinessAccountId: "",

  facebook: {
    enabled: false,
    pageId: "",
    pageName: "",
    leadAdsEnabled: true,
  },

  instagram: {
    enabled: false,
    businessAccountId: "",
    username: "",
    messagesEnabled: true,
  },
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
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getStoredString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim().slice(0, 160)
    : "";
}

function getStoredBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function getSettings(
  metadata: Record<string, unknown>,
): SocialIntegrationSettings {
  const stored =
    metadata.crmSocialIntegrations;

  if (!isRecord(stored)) {
    return structuredClone(
      defaultSettings,
    );
  }

  const facebook = isRecord(
    stored.facebook,
  )
    ? stored.facebook
    : {};

  const instagram = isRecord(
    stored.instagram,
  )
    ? stored.instagram
    : {};

  return {
    metaBusinessAccountId:
      getStoredString(
        stored.metaBusinessAccountId,
      ),

    facebook: {
      enabled:
        getStoredBoolean(
          facebook.enabled,
          false,
        ),
      pageId:
        getStoredString(
          facebook.pageId,
        ),
      pageName:
        getStoredString(
          facebook.pageName,
        ),
      leadAdsEnabled:
        getStoredBoolean(
          facebook.leadAdsEnabled,
          true,
        ),
    },

    instagram: {
      enabled:
        getStoredBoolean(
          instagram.enabled,
          false,
        ),
      businessAccountId:
        getStoredString(
          instagram.businessAccountId,
        ),
      username:
        getStoredString(
          instagram.username,
        ),
      messagesEnabled:
        getStoredBoolean(
          instagram.messagesEnabled,
          true,
        ),
    },
  };
}

function getRequestedString(
  value: unknown,
  label: string,
): string {
  if (typeof value !== "string") {
    throw new ApiError(
      `${label} no tiene un valor válido.`,
      400,
    );
  }

  const normalized = value.trim();

  if (normalized.length > 160) {
    throw new ApiError(
      `${label} no puede superar 160 caracteres.`,
      400,
    );
  }

  return normalized;
}

function getRequestedBoolean(
  value: unknown,
  label: string,
): boolean {
  if (typeof value !== "boolean") {
    throw new ApiError(
      `${label} no tiene un valor válido.`,
      400,
    );
  }

  return value;
}

function getRequestedSettings(
  payload: SettingsPayload,
): SocialIntegrationSettings {
  if (
    !isRecord(payload.facebook) ||
    !isRecord(payload.instagram)
  ) {
    throw new ApiError(
      "La configuración de redes sociales no tiene un formato válido.",
      400,
    );
  }

  const settings = {
    metaBusinessAccountId:
      getRequestedString(
        payload.metaBusinessAccountId,
        "El identificador de Meta Business",
      ),

    facebook: {
      enabled:
        getRequestedBoolean(
          payload.facebook.enabled,
          "La activación de Facebook",
        ),
      pageId:
        getRequestedString(
          payload.facebook.pageId,
          "El identificador de la página de Facebook",
        ),
      pageName:
        getRequestedString(
          payload.facebook.pageName,
          "El nombre de la página de Facebook",
        ),
      leadAdsEnabled:
        getRequestedBoolean(
          payload.facebook.leadAdsEnabled,
          "La captura de prospectos de Facebook",
        ),
    },

    instagram: {
      enabled:
        getRequestedBoolean(
          payload.instagram.enabled,
          "La activación de Instagram",
        ),
      businessAccountId:
        getRequestedString(
          payload.instagram.businessAccountId,
          "El identificador de Instagram Business",
        ),
      username:
        getRequestedString(
          payload.instagram.username,
          "El usuario de Instagram",
        ).replace(/^@/, ""),
      messagesEnabled:
        getRequestedBoolean(
          payload.instagram.messagesEnabled,
          "La captura de mensajes de Instagram",
        ),
    },
  };

  if (
    settings.facebook.enabled &&
    (
      !settings.metaBusinessAccountId ||
      !settings.facebook.pageId
    )
  ) {
    throw new ApiError(
      "Para preparar Facebook captura el identificador de Meta Business y de la página.",
      400,
    );
  }

  if (
    settings.instagram.enabled &&
    (
      !settings.metaBusinessAccountId ||
      !settings.instagram
        .businessAccountId
    )
  ) {
    throw new ApiError(
      "Para preparar Instagram captura el identificador de Meta Business y de Instagram Business.",
      400,
    );
  }

  return settings;
}

function createErrorResponse(
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
    "No fue posible procesar las integraciones sociales:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar las integraciones sociales.",
    },
    {
      status: 500,
    },
  );
}

async function getContext(
  permission: "view" | "manage",
) {
  const context =
    await getAuthorizationContext();

  const permissions =
    await requireCRMModulePermission(
      context.tenantId,
      context.clerkUserId,
      "integrations",
      permission,
    );

  const [tenant] = await db
    .select({
      metadata: tenants.metadata,
    })
    .from(tenants)
    .where(
      eq(
        tenants.id,
        context.tenantId,
      ),
    )
    .limit(1);

  if (!tenant) {
    throw new ApiError(
      "La empresa no está disponible.",
      404,
    );
  }

  return {
    ...context,
    metadata:
      isRecord(tenant.metadata)
        ? tenant.metadata
        : {},
    permissions,
  };
}

export async function GET() {
  try {
    const context =
      await getContext("view");

    return NextResponse.json({
      success: true,
      data: {
        settings:
          getSettings(
            context.metadata,
          ),
        canManage:
          context.permissions
            .canManage,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const context =
      await getContext("manage");

    const payload =
      (await request.json()) as
        SettingsPayload;

    const settings =
      getRequestedSettings(payload);

    await db
      .update(tenants)
      .set({
        metadata: {
          ...context.metadata,
          crmSocialIntegrations: {
            ...settings,
            updatedAt:
              new Date()
                .toISOString(),
            updatedByClerkUserId:
              context.clerkUserId,
          },
        },
        updatedAt: new Date(),
      })
      .where(
        eq(
          tenants.id,
          context.tenantId,
        ),
      );

    return NextResponse.json({
      success: true,
      message:
        "La preparación de Facebook e Instagram fue guardada.",
      data: {
        settings,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
