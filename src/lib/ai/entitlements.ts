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

import {
  consumeAITopUpCredit,
} from "@/lib/ai/credits";

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

type AIMonthlyWindow = {
  start: Date;
  end: Date;
};

function createAnchoredMonthDate(
  anchor: Date,
  monthOffset: number,
): Date {
  const absoluteMonth =
    anchor.getUTCMonth() +
    monthOffset;

  const targetYear =
    anchor.getUTCFullYear() +
    Math.floor(
      absoluteMonth / 12,
    );

  const targetMonth =
    (
      (
        absoluteMonth % 12
      ) +
      12
    ) % 12;

  const lastDay =
    new Date(
      Date.UTC(
        targetYear,
        targetMonth + 1,
        0,
      ),
    ).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(
        anchor.getUTCDate(),
        lastDay,
      ),
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds(),
    ),
  );
}

function getAnchoredMonthlyWindow(
  anchor: Date,
  referenceDate =
    new Date(),
): AIMonthlyWindow {
  if (
    referenceDate.getTime() <
    anchor.getTime()
  ) {
    return {
      start:
        new Date(anchor),

      end:
        createAnchoredMonthDate(
          anchor,
          1,
        ),
    };
  }

  let monthOffset =
    (
      referenceDate
        .getUTCFullYear() -
      anchor.getUTCFullYear()
    ) *
      12 +
    (
      referenceDate
        .getUTCMonth() -
      anchor.getUTCMonth()
    );

  let start =
    createAnchoredMonthDate(
      anchor,
      monthOffset,
    );

  if (
    start.getTime() >
    referenceDate.getTime()
  ) {
    monthOffset -= 1;

    start =
      createAnchoredMonthDate(
        anchor,
        monthOffset,
      );
  }

  return {
    start,

    end:
      createAnchoredMonthDate(
        anchor,
        monthOffset + 1,
      ),
  };
}

async function getTenantAIMonthlyWindow(
  tenantId: string,
  product: DataraProduct,
  referenceDate =
    new Date(),
): Promise<AIMonthlyWindow> {
  const calendarStart =
    getMonthWindowStart(
      referenceDate,
    );

  const calendarEnd =
    new Date(
      Date.UTC(
        calendarStart
          .getUTCFullYear(),

        calendarStart
          .getUTCMonth() + 1,

        1,
      ),
    );

  const [subscription] =
    await db
      .select({
        planKey:
          subscriptions.planKey,

        currentPeriodStart:
          subscriptions
            .currentPeriodStart,

        currentPeriodEnd:
          subscriptions
            .currentPeriodEnd,
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

  if (
    !subscription
      ?.currentPeriodStart
  ) {
    return {
      start:
        calendarStart,
      end:
        calendarEnd,
    };
  }

  if (
    subscription.planKey
      .startsWith(
        "trial-",
      )
  ) {
    return {
      start:
        subscription
          .currentPeriodStart,

      end:
        subscription
          .currentPeriodEnd ??
        calendarEnd,
    };
  }

  return getAnchoredMonthlyWindow(
    subscription
      .currentPeriodStart,

    referenceDate,
  );
}

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

/*
 * La cuota técnica solo aplica durante
 * el desarrollo local. Los Workers demo
 * deben respetar la suscripción y su
 * fecha real de vencimiento.
 */
const usesLocalDevelopmentQuota =
  process.env.NODE_ENV ===
    "development" &&
  dataraEnvironment !==
    "demo";

if (
  usesLocalDevelopmentQuota
) {
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

    currentPeriodEnd:
      subscriptions
        .currentPeriodEnd,
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

  const isTrialSubscription =
  subscription.planKey
    .startsWith(
      "trial-",
    );

/*
 * La vigencia se valida en cada petición.
 * Así el chatbot se desactiva aunque el
 * cron todavía no haya cerrado el trial.
 */
if (
  isTrialSubscription &&
  (
    !subscription
      .currentPeriodEnd ||
    subscription
      .currentPeriodEnd
      .getTime() <=
      Date.now()
  )
) {
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
    isTrialSubscription
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
  const monthlyWindow =
    await getTenantAIMonthlyWindow(
      tenantId,
      product,
    );

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

            monthlyWindow.start,
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
  if (limit > 0) {
    const monthlyWindow =
      await getTenantAIMonthlyWindow(
        tenantId,
        product,
      );

    const monthlyQuota =
      await consumeAIRateLimit({
        tenantId,
        scope:
          "tenant_month",

        subjectKey:
          product,

        windowStartedAt:
          monthlyWindow.start,

        limit,
      });

    if (monthlyQuota.allowed) {
      return {
        allowed: true,
        limit,
        remaining:
          monthlyQuota.remaining,
      };
    }
  }

  const topUpCredit =
    await consumeAITopUpCredit(
      tenantId,
      product,
    );

  if (topUpCredit.allowed) {
    return {
      allowed: true,

      limit:
        Math.max(
          limit,
          topUpCredit.remaining +
            1,
        ),

      remaining:
        topUpCredit.remaining,
    };
  }

  return {
    allowed: false,
    limit,
    remaining: 0,
  };
}
