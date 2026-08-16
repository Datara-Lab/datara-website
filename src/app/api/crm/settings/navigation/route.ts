import {
  auth,
} from "@clerk/nextjs/server";

import {
  and,
  desc,
  eq,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  roles,
  subscriptions,
  tenantMembers,
  tenants,
} from "@/db/schema";

import {
  CRMPermissionError,
  getCRMModulePermissions,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

import {
  getEnabledCRMModuleIds,
} from "@/lib/crm/module-entitlements";

import {
  permissionModules,
} from "@/lib/administration/permission-modules";

export const dynamic =
  "force-dynamic";

type TenantMetadata =
  Record<string, unknown>;

type NavigationPayload = {
  order?: unknown;
  labels?: unknown;
  hiddenItemIds?: unknown;
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

function getNavigationOrder(
  metadata:
    TenantMetadata,
): string[] {
  const value =
    metadata.crmNavigationOrder;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item ===
        "string" &&
      item.trim().length >
        0,
  );
}

function getNavigationLabels(
  metadata:
    TenantMetadata,
): Record<string, string> {
  const value =
    metadata
      .crmNavigationLabels;

  if (
    typeof value !==
      "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (
          entry,
        ): entry is [
          string,
          string,
        ] =>
          typeof entry[1] ===
            "string" &&
          entry[1].trim().length >
            0,
      )
      .map(
        ([itemId, label]) => [
          itemId,
          label.trim(),
        ],
      ),
  );
}

function getHiddenNavigationItems(
  metadata:
    TenantMetadata,
): string[] {
  const value =
    metadata
      .crmHiddenNavigationItems;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item ===
        "string" &&
      item.trim().length >
        0,
  );
}

function getRequestedOrder(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    throw new ApiError(
      "El orden del menú no tiene un formato válido.",
      400,
    );
  }

  const order =
    value.map((item) => {
      if (
        typeof item !==
          "string" ||
        !item.trim()
      ) {
        throw new ApiError(
          "El orden contiene un módulo inválido.",
          400,
        );
      }

      return item.trim();
    });

  if (
    order.length >
    100
  ) {
    throw new ApiError(
      "El orden contiene demasiados elementos.",
      400,
    );
  }

  if (
    new Set(order).size !==
    order.length
  ) {
    throw new ApiError(
      "El orden contiene módulos duplicados.",
      400,
    );
  }

  return order;
}

function getRequestedLabels(
  value: unknown,
): Record<string, string> {
  if (
    typeof value !==
      "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new ApiError(
      "Los nombres del menú no tienen un formato válido.",
      400,
    );
  }

  const entries =
    Object.entries(value);

  if (entries.length > 100) {
    throw new ApiError(
      "Se enviaron demasiados nombres personalizados.",
      400,
    );
  }

  return Object.fromEntries(
    entries.map(
      ([itemId, label]) => {
        const normalizedItemId =
          itemId.trim();

        const normalizedLabel =
          typeof label ===
            "string"
            ? label.trim()
            : "";

        if (
          !normalizedItemId ||
          !normalizedLabel
        ) {
          throw new ApiError(
            "Todos los módulos deben tener un nombre válido.",
            400,
          );
        }

        if (
          normalizedLabel.length >
          60
        ) {
          throw new ApiError(
            "El nombre de un módulo no puede exceder 60 caracteres.",
            400,
          );
        }

        return [
          normalizedItemId,
          normalizedLabel,
        ];
      },
    ),
  );
}

function getRequestedHiddenItemIds(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    throw new ApiError(
      "La visibilidad del menú no tiene un formato válido.",
      400,
    );
  }

  const itemIds =
    value.map((item) => {
      if (
        typeof item !==
          "string" ||
        !item.trim()
      ) {
        throw new ApiError(
          "La visibilidad contiene un módulo inválido.",
          400,
        );
      }

      return item.trim();
    });

  if (
    itemIds.length >
    100
  ) {
    throw new ApiError(
      "Se enviaron demasiados módulos ocultos.",
      400,
    );
  }

  if (
    new Set(itemIds).size !==
    itemIds.length
  ) {
    throw new ApiError(
      "La lista de módulos ocultos contiene duplicados.",
      400,
    );
  }

  return itemIds;
}

async function getContext() {
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

  const [record] =
    await db
      .select({
        tenantId:
          tenants.id,

        metadata:
          tenants.metadata,

        roleKey:
          roles.key,
      })
      .from(tenants)
      .innerJoin(
        tenantMembers,
        and(
          eq(
            tenantMembers
              .tenantId,
            tenants.id,
          ),
          eq(
            tenantMembers
              .clerkUserId,
            userId,
          ),
          eq(
            tenantMembers.status,
            "active",
          ),
        ),
      )
      .leftJoin(
        roles,
        eq(
          tenantMembers.roleId,
          roles.id,
        ),
      )
      .where(
        eq(
          tenants
            .clerkOrganizationId,
          orgId,
        ),
      )
      .limit(1);

  if (!record) {
    throw new ApiError(
      "No tienes acceso a esta empresa.",
      403,
    );
  }

  return {
    ...record,
    userId,
  };
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
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error(
    "No fue posible procesar la configuración del menú:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar la configuración del menú.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
  try {
    const context =
      await getContext();

    const metadata =
      context.metadata &&
      typeof context.metadata ===
        "object" &&
      !Array.isArray(
        context.metadata,
      )
        ? context.metadata as
            TenantMetadata
        : {};

    const [subscription] =
      await db
        .select({
          status:
            subscriptions.status,

          planKey:
            subscriptions.planKey,

          currentPeriodEnd:
            subscriptions
              .currentPeriodEnd,
        })
        .from(subscriptions)
        .where(
          eq(
            subscriptions.tenantId,
            context.tenantId,
          ),
        )
        .orderBy(
          desc(
            subscriptions.createdAt,
          ),
        )
        .limit(1);

    const isTrialSubscription =
      subscription
        ?.planKey
        .startsWith(
          "trial-",
        ) ?? false;

    const trialEndsAt =
      isTrialSubscription
        ? subscription
            ?.currentPeriodEnd ??
          null
        : null;

    const trialDaysRemaining =
      trialEndsAt
        ? Math.max(
            0,
            Math.ceil(
              (
                trialEndsAt
                  .getTime() -
                Date.now()
              ) /
                (
                  24 *
                  60 *
                  60 *
                  1000
                ),
            ),
          )
        : null;

    const crmModules =
      permissionModules.filter(
        (module) =>
          module.product ===
          "crm",
      );

    const entitledModuleIds =
      await getEnabledCRMModuleIds(
        context.tenantId,
        crmModules.map(
          (module) =>
            module.id,
        ),
      );

    const entitledModuleIdSet =
      new Set(
        entitledModuleIds,
      );

    const modulePermissions =
      await Promise.all(
        crmModules.map(
          async (module) => ({
            moduleId:
              module.id,

            permissions:
              await getCRMModulePermissions(
                context.tenantId,
                context.userId,
                module.id,
              ),
          }),
        ),
      );

    const visibleModuleIds =
      modulePermissions
        .filter(
          (item) =>
            entitledModuleIdSet.has(
              item.moduleId,
            ) &&
            item.permissions
              .canView,
        )
        .map(
          (item) =>
            item.moduleId,
        );

    const settingsPermissions =
      modulePermissions.find(
        (item) =>
          item.moduleId ===
          "crm-settings",
      )?.permissions;

    return NextResponse.json({
      success: true,

      data: {
        order:
          getNavigationOrder(
            metadata,
          ),

        labels:
          getNavigationLabels(
            metadata,
          ),

        hiddenItemIds:
          getHiddenNavigationItems(
            metadata,
          ),

        visibleModuleIds,

        trial:
          trialEndsAt
            ? {
                status:
                  subscription
                    ?.status,

                planKey:
                  subscription
                    ?.planKey,

                endsAt:
                  trialEndsAt
                    .toISOString(),

                daysRemaining:
                  trialDaysRemaining,

                expired:
                  trialEndsAt
                    .getTime() <=
                  Date.now(),
              }
            : null,

        canManage:
          settingsPermissions
            ?.canManage ??
          false,
      },
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
    const context =
      await getContext();

    await requireCRMModulePermission(
      context.tenantId,
      context.userId,
      "crm-settings",
      "manage",
    );

    const payload =
      (await request.json()) as
        NavigationPayload;

    const order =
      getRequestedOrder(
        payload.order,
      );

    const labels =
      getRequestedLabels(
        payload.labels,
      );

    const hiddenItemIds =
      getRequestedHiddenItemIds(
        payload.hiddenItemIds,
      );

    const protectedItemIds =
      new Set([
        "home",
        "users",
        "settings",
      ]);

    if (
      hiddenItemIds.some(
        (itemId) =>
          protectedItemIds.has(
            itemId,
          ),
      )
    ) {
      throw new ApiError(
        "Inicio, Usuarios y Configuración no pueden ocultarse.",
        400,
      );
    }


    const allowedItemIds =
      new Set(order);

    if (
      Object.keys(labels)
        .some(
          (itemId) =>
            !allowedItemIds.has(
              itemId,
            ),
        ) ||
      hiddenItemIds.some(
        (itemId) =>
          !allowedItemIds.has(
            itemId,
          ),
      )
    ) {
      throw new ApiError(
        "La configuración contiene módulos que no están disponibles.",
        400,
      );
    }

    const currentMetadata =
      context.metadata &&
      typeof context.metadata ===
        "object" &&
      !Array.isArray(
        context.metadata,
      )
        ? context.metadata as
            TenantMetadata
        : {};

    const nextMetadata = {
      ...currentMetadata,

      crmNavigationOrder:
        order,

      crmNavigationLabels:
        labels,

      crmHiddenNavigationItems:
        hiddenItemIds,
    };

    await db
      .update(tenants)
      .set({
        metadata:
          nextMetadata,

        updatedAt:
          new Date(),
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
        "El orden del menú fue actualizado correctamente.",

      data: {
        order,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}