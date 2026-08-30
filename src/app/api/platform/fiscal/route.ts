import {
  desc,
  eq,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  fiscalProviderConfigurations,
  fiscalProviderRequests,
  fiscalTenantAccounts,
  tenants,
} from "@/db/schema";

import {
  requirePlatformAdministrator,
} from "@/lib/platform/authorization";

export const dynamic =
  "force-dynamic";

type FiscalPatchPayload = {
  action?: unknown;
  enabled?: unknown;
  provider?: unknown;
  mode?: unknown;
  credentialSecretReference?: unknown;
  costPerStamp?: unknown;
  currency?: unknown;
  tenantId?: unknown;
  status?: unknown;
  includedMonthlyStamps?: unknown;
  topUpStampBalance?: unknown;
  maxMonthlySpend?: unknown;
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

function getEnvironment() {
  return process.env
    .DATARA_ENVIRONMENT
    ?.trim()
    .toLowerCase() ||
    process.env.NODE_ENV ||
    "development";
}

function getDatabaseEndpoint() {
  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    return "No configurado";
  }

  try {
    const hostname =
      new URL(databaseUrl).hostname;

    const [endpoint] =
      hostname.split(".");

    return endpoint || hostname;
  } catch {
    return "No identificable";
  }
}

function getString(
  value: unknown,
  field: string,
  required = true,
) {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  if (required && !normalized) {
    throw new ApiError(
      `${field} es obligatorio.`,
      400,
    );
  }

  return normalized;
}

function getNonNegativeNumber(
  value: unknown,
  field: string,
) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    throw new ApiError(
      `${field} debe ser un número mayor o igual a cero.`,
      400,
    );
  }

  return number;
}

function getNonNegativeInteger(
  value: unknown,
  field: string,
) {
  const number =
    getNonNegativeNumber(
      value,
      field,
    );

  if (!Number.isInteger(number)) {
    throw new ApiError(
      `${field} debe ser un número entero.`,
      400,
    );
  }

  return number;
}

function errorResponse(
  error: unknown,
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

  console.error(
    "No fue posible administrar la plataforma fiscal:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible administrar la plataforma fiscal.",
    },
    {
      status: 500,
    },
  );
}

async function getDashboard() {
  const environment =
    getEnvironment();

  const [
    configurationRows,
    accountRows,
    requestRows,
  ] = await Promise.all([
    db
      .select()
      .from(
        fiscalProviderConfigurations,
      )
      .where(
        eq(
          fiscalProviderConfigurations
            .environment,
          environment,
        ),
      )
      .limit(1),

    db
      .select({
        tenantId:
          tenants.id,
        tenantName:
          tenants.name,
        tenantStatus:
          tenants.status,
        enabled:
          fiscalTenantAccounts.enabled,
        status:
          fiscalTenantAccounts.status,
        includedMonthlyStamps:
          fiscalTenantAccounts
            .includedMonthlyStamps,
        usedMonthlyStamps:
          fiscalTenantAccounts
            .usedMonthlyStamps,
        topUpStampBalance:
          fiscalTenantAccounts
            .topUpStampBalance,
        monthlyWindowStart:
          fiscalTenantAccounts
            .monthlyWindowStart,
        monthlyWindowEnd:
          fiscalTenantAccounts
            .monthlyWindowEnd,
        maxMonthlySpend:
          fiscalTenantAccounts
            .maxMonthlySpend,
        updatedAt:
          fiscalTenantAccounts.updatedAt,
      })
      .from(tenants)
      .leftJoin(
        fiscalTenantAccounts,
        eq(
          fiscalTenantAccounts.tenantId,
          tenants.id,
        ),
      )
      .orderBy(tenants.name),

    db
      .select({
        id:
          fiscalProviderRequests.id,
        tenantId:
          fiscalProviderRequests.tenantId,
        tenantName:
          tenants.name,
        operation:
          fiscalProviderRequests.operation,
        status:
          fiscalProviderRequests.status,
        provider:
          fiscalProviderRequests.provider,
        fiscalUuid:
          fiscalProviderRequests.fiscalUuid,
        durationMs:
          fiscalProviderRequests.durationMs,
        providerCost:
          fiscalProviderRequests.providerCost,
        currency:
          fiscalProviderRequests.currency,
        errorCode:
          fiscalProviderRequests.errorCode,
        errorMessage:
          fiscalProviderRequests.errorMessage,
        createdAt:
          fiscalProviderRequests.createdAt,
        completedAt:
          fiscalProviderRequests.completedAt,
      })
      .from(fiscalProviderRequests)
      .innerJoin(
        tenants,
        eq(
          tenants.id,
          fiscalProviderRequests.tenantId,
        ),
      )
      .where(
        eq(
          fiscalProviderRequests.environment,
          environment,
        ),
      )
      .orderBy(
        desc(
          fiscalProviderRequests.createdAt,
        ),
      )
      .limit(100),
  ]);

  const configuration =
    configurationRows[0];

  const requests =
    requestRows.map(
      (request) => ({
        ...request,
        providerCost:
          Number(request.providerCost),
      }),
    );

  const successfulRequests =
    requests.filter(
      (request) =>
        request.status === "success",
    ).length;

  const failedRequests =
    requests.filter(
      (request) =>
        request.status === "error",
    ).length;

  const providerCost =
    requests.reduce(
      (total, request) =>
        total + request.providerCost,
      0,
    );

  const accounts =
    accountRows.map(
      (account) => ({
        tenantId:
          account.tenantId,
        tenantName:
          account.tenantName,
        tenantStatus:
          account.tenantStatus,
        configured:
          account.status !== null,
        enabled:
          account.enabled ?? false,
        status:
          account.status ?? "active",
        includedMonthlyStamps:
          account.includedMonthlyStamps ?? 0,
        usedMonthlyStamps:
          account.usedMonthlyStamps ?? 0,
        monthlyRemaining:
          Math.max(
            0,
            (account.includedMonthlyStamps ?? 0) -
              (account.usedMonthlyStamps ?? 0),
          ),
        topUpStampBalance:
          account.topUpStampBalance ?? 0,
        monthlyWindowStart:
          account.monthlyWindowStart,
        monthlyWindowEnd:
          account.monthlyWindowEnd,
        maxMonthlySpend:
          Number(
            account.maxMonthlySpend ?? 0,
          ),
        updatedAt:
          account.updatedAt,
      }),
    );

  return {
    environment,
    databaseEndpoint:
      getDatabaseEndpoint(),
    configuration: {
      enabled:
        configuration?.enabled ?? false,
      provider:
        configuration?.provider ?? "pending",
      mode:
        configuration?.mode ?? "test",
      credentialSecretReference:
        configuration
          ?.credentialSecretReference ?? "",
      costPerStamp:
        Number(
          configuration?.costPerStamp ?? 0,
        ),
      currency:
        configuration?.currency ?? "mxn",
      configured:
        Boolean(configuration),
      updatedAt:
        configuration?.updatedAt ?? null,
    },
    metrics: {
      requests:
        requests.length,
      successfulRequests,
      failedRequests,
      pendingRequests:
        requests.length -
        successfulRequests -
        failedRequests,
      providerCost,
      enabledTenants:
        accounts.filter(
          (account) => account.enabled,
        ).length,
      totalMonthlyRemaining:
        accounts.reduce(
          (total, account) =>
            total + account.monthlyRemaining,
          0,
        ),
      totalTopUpRemaining:
        accounts.reduce(
          (total, account) =>
            total + account.topUpStampBalance,
          0,
        ),
    },
    accounts,
    requests,
  };
}

export async function GET() {
  try {
    await requirePlatformAdministrator();

    return NextResponse.json({
      success: true,
      data:
        await getDashboard(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const administrator =
      await requirePlatformAdministrator();

    const payload =
      await request.json() as
        FiscalPatchPayload;

    const action =
      getString(
        payload.action,
        "La acción",
      );

    const now = new Date();

    if (action === "configuration") {
      const provider =
        getString(
          payload.provider,
          "El proveedor",
        );

      const modeValue =
        getString(
          payload.mode,
          "El modo",
        );

      if (
        modeValue !== "test" &&
        modeValue !== "live"
      ) {
        throw new ApiError(
          "El modo fiscal no es válido.",
          400,
        );
      }

      const mode:
        "test" | "live" =
        modeValue;

      if (
        typeof payload.enabled !==
        "boolean"
      ) {
        throw new ApiError(
          "El estado del proveedor no es válido.",
          400,
        );
      }

      const environment =
        getEnvironment();

      const values = {
        environment,
        enabled:
          payload.enabled,
        provider,
        mode,
        credentialSecretReference:
          getString(
            payload.credentialSecretReference,
            "La referencia del secreto",
            false,
          ) || null,
        costPerStamp:
          getNonNegativeNumber(
            payload.costPerStamp,
            "El costo por timbre",
          ).toFixed(6),
        currency:
          getString(
            payload.currency,
            "La moneda",
          ).toLowerCase(),
        changedByClerkUserId:
          administrator.userId,
        updatedAt: now,
      };

      await db
        .insert(
          fiscalProviderConfigurations,
        )
        .values({
          ...values,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target:
            fiscalProviderConfigurations
              .environment,
          set: values,
        });
    } else if (
      action === "tenant-account"
    ) {
      const tenantId =
        getString(
          payload.tenantId,
          "La empresa",
        );

      const statusValue =
        getString(
          payload.status,
          "El estado",
        );

      if (
        statusValue !== "active" &&
        statusValue !== "paused" &&
        statusValue !== "blocked"
      ) {
        throw new ApiError(
          "El estado de la cuenta fiscal no es válido.",
          400,
        );
      }

      const status:
        | "active"
        | "paused"
        | "blocked" =
        statusValue;

      if (
        typeof payload.enabled !==
        "boolean"
      ) {
        throw new ApiError(
          "El estado de la cuenta fiscal no es válido.",
          400,
        );
      }

      const [tenant] =
        await db
          .select({
            id: tenants.id,
          })
          .from(tenants)
          .where(
            eq(
              tenants.id,
              tenantId,
            ),
          )
          .limit(1);

      if (!tenant) {
        throw new ApiError(
          "La empresa no existe.",
          404,
        );
      }

      const includedMonthlyStamps =
        getNonNegativeInteger(
          payload.includedMonthlyStamps,
          "Los timbres mensuales",
        );

      const topUpStampBalance =
        getNonNegativeInteger(
          payload.topUpStampBalance,
          "El saldo adicional",
        );

      const maxMonthlySpend =
        getNonNegativeNumber(
          payload.maxMonthlySpend,
          "El gasto mensual máximo",
        );

      const values = {
        enabled:
          payload.enabled,
        status,
        includedMonthlyStamps,
        topUpStampBalance,
        maxMonthlySpend:
          maxMonthlySpend.toFixed(2),
        updatedAt: now,
      };

      await db
        .insert(
          fiscalTenantAccounts,
        )
        .values({
          tenantId,
          ...values,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target:
            fiscalTenantAccounts.tenantId,
          set: values,
        });
    } else {
      throw new ApiError(
        "La acción solicitada no es válida.",
        400,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "La configuración fiscal fue actualizada.",
      data:
        await getDashboard(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
