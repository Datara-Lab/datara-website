import {
  and,
  desc,
  eq,
  inArray,
} from "drizzle-orm";

import { db } from "@/db";

import {
  aiRateLimitWindows,
  commercialCatalogItems,
  subscriptions,
  tenantProducts,
} from "@/db/schema";

import {
  consumeAIRateLimit,
  getMonthWindowStart,
} from "@/lib/ai/rate-limit";

import type {
  DataraProduct,
} from "@/lib/auth/types";

type TenantAIConfiguration = {
  assistantName: string;

  internalAssistantEnabled:
    boolean;

  publicChatbotEnabled:
    boolean;

  monthlyMessageLimit:
    number;
};

type ConsumeTenantAIQuotaResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
};

const DEFAULT_DEMO_MONTHLY_LIMIT =
  250;

const DEFAULT_TRIAL_MONTHLY_LIMIT =
  100;

function getConfiguredLimit(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsedValue =
    Number(value);

  return Number.isInteger(
    parsedValue,
  ) &&
    parsedValue >= 0
    ? parsedValue
    : fallback;
}

function isEnabled(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value ===
    "boolean"
    ? value
    : fallback;
}

function getAssistantName(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "Dara";
  }

  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue.slice(
        0,
        40,
      )
    : "Dara";
}

export async function getTenantAIConfiguration(
  tenantId: string,
  product: DataraProduct,
): Promise<TenantAIConfiguration> {
  const [tenantProduct] =
    await db
      .select({
        configuration:
          tenantProducts
            .configuration,
      })
      .from(
        tenantProducts,
      )
      .where(
        and(
          eq(
            tenantProducts
              .tenantId,

            tenantId,
          ),

          eq(
            tenantProducts
              .product,

            product,
          ),
        ),
      )
      .limit(1);

  const configuration =
    tenantProduct
      ?.configuration ?? {};

  const assistantName =
    getAssistantName(
      configuration
        .assistantName,
    );

  const internalAssistantEnabled =
    isEnabled(
      configuration
        .internalAssistantEnabled,
      true,
    );

  const publicChatbotEnabled =
    isEnabled(
      configuration
        .publicChatbotEnabled,
      false,
    );

  const dataraEnvironment =
    process.env
      .DATARA_ENVIRONMENT
      ?.trim()
      .toLowerCase();

  const usesDemoQuota =
    dataraEnvironment ===
      "demo" ||
    process.env.NODE_ENV ===
      "development";

  if (usesDemoQuota) {
    return {
      assistantName,
      internalAssistantEnabled,
      publicChatbotEnabled,

      monthlyMessageLimit:
        getConfiguredLimit(
          process.env
            .AI_DEMO_MONTHLY_MESSAGE_LIMIT,

          DEFAULT_DEMO_MONTHLY_LIMIT,
        ),
    };
  }

  const [subscription] =
    await db
      .select({
        planKey:
          subscriptions.planKey,

        catalogItemIds:
          subscriptions
            .catalogItemIds,
      })
      .from(
        subscriptions,
      )
      .where(
        and(
          eq(
            subscriptions
              .tenantId,

            tenantId,
          ),

          eq(
            subscriptions
              .productKey,

            product,
          ),

          inArray(
            subscriptions.status,
            [
              "trialing",
              "active",
            ],
          ),
        ),
      )
      .orderBy(
        desc(
          subscriptions
            .createdAt,
        ),
      )
      .limit(1);

  if (!subscription) {
    return {
      assistantName,
      internalAssistantEnabled,
      publicChatbotEnabled,
      monthlyMessageLimit: 0,
    };
  }

  const catalogItemIds =
    subscription
      .catalogItemIds;

  let monthlyMessageLimit =
    0;

  if (
    catalogItemIds.length >
    0
  ) {
    const catalogItems =
      await db
        .select({
          includedAiMessages:
            commercialCatalogItems
              .includedAiMessages,
        })
        .from(
          commercialCatalogItems,
        )
        .where(
          inArray(
            commercialCatalogItems.id,
            catalogItemIds,
          ),
        );

    monthlyMessageLimit =
      catalogItems.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.includedAiMessages,
        0,
      );
  }

  if (
    monthlyMessageLimit ===
      0 &&
    subscription.planKey
      .startsWith(
        "trial-",
      )
  ) {
    monthlyMessageLimit =
      getConfiguredLimit(
        process.env
          .AI_TRIAL_MONTHLY_MESSAGE_LIMIT,

        DEFAULT_TRIAL_MONTHLY_LIMIT,
      );
  }

  return {
    assistantName,
    internalAssistantEnabled,
    publicChatbotEnabled,
    monthlyMessageLimit,
  };
}

export async function getTenantAIUsage(
  tenantId: string,
  product: DataraProduct,
): Promise<number> {
  const [usage] =
    await db
      .select({
        requestCount:
          aiRateLimitWindows
            .requestCount,
      })
      .from(
        aiRateLimitWindows,
      )
      .where(
        and(
          eq(
            aiRateLimitWindows
              .tenantId,

            tenantId,
          ),

          eq(
            aiRateLimitWindows
              .scope,

            "tenant_month",
          ),

          eq(
            aiRateLimitWindows
              .subjectKey,

            product,
          ),

          eq(
            aiRateLimitWindows
              .windowStartedAt,

            getMonthWindowStart(),
          ),
        ),
      )
      .limit(1);

  return usage
    ?.requestCount ?? 0;
}

export async function consumeTenantAIQuota(
  tenantId: string,
  product: DataraProduct,
  limit: number,
): Promise<ConsumeTenantAIQuotaResult> {
  if (limit < 1) {
    return {
      allowed: false,
      limit: 0,
      remaining: 0,
    };
  }

  const result =
    await consumeAIRateLimit({
      tenantId,
      scope:
        "tenant_month",

      subjectKey:
        product,

      windowStartedAt:
        getMonthWindowStart(),

      limit,
    });

  return {
    allowed:
      result.allowed,

    limit,

    remaining:
      result.remaining,
  };
}
