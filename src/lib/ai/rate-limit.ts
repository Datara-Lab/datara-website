import {
  lt,
  sql,
} from "drizzle-orm";

import { db } from "@/db";

import {
  aiRateLimitWindows,
} from "@/db/schema";

export type AIRateLimitScope =
  | "internal_minute"
  | "internal_day"
  | "tenant_month"
  | "public_minute"
  | "public_day";

type ConsumeAIRateLimitOptions = {
  tenantId: string;
  scope: AIRateLimitScope;
  subjectKey: string;
  windowStartedAt: Date;
  limit: number;
};

type AIRateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export function getMinuteWindowStart(
  referenceDate =
    new Date(),
): Date {
  const result =
    new Date(
      referenceDate,
    );

  result.setUTCSeconds(
    0,
    0,
  );

  return result;
}

export function getMonthWindowStart(
  referenceDate =
    new Date(),
): Date {
  return new Date(
    Date.UTC(
      referenceDate
        .getUTCFullYear(),

      referenceDate
        .getUTCMonth(),

      1,
    ),
  );
}

export function getDayWindowStart(
  referenceDate =
    new Date(),
): Date {
  return new Date(
    Date.UTC(
      referenceDate
        .getUTCFullYear(),

      referenceDate
        .getUTCMonth(),

      referenceDate
        .getUTCDate(),
    ),
  );
}

export async function consumeAIRateLimit({
  tenantId,
  scope,
  subjectKey,
  windowStartedAt,
  limit,
}: ConsumeAIRateLimitOptions): Promise<AIRateLimitResult> {
  if (
    !Number.isInteger(limit) ||
    limit < 1
  ) {
    throw new Error(
      "El límite de solicitudes de IA no es válido.",
    );
  }

  const normalizedSubjectKey =
    subjectKey.trim();

  if (!normalizedSubjectKey) {
    throw new Error(
      "El identificador del límite de IA está vacío.",
    );
  }

  const now =
    new Date();

  const [rateLimitWindow] =
    await db
      .insert(
        aiRateLimitWindows,
      )
      .values({
        tenantId,
        scope,

        subjectKey:
          normalizedSubjectKey,

        windowStartedAt,
        requestCount: 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          aiRateLimitWindows
            .tenantId,

          aiRateLimitWindows
            .scope,

          aiRateLimitWindows
            .subjectKey,

          aiRateLimitWindows
            .windowStartedAt,
        ],

        set: {
          requestCount:
            sql`${aiRateLimitWindows.requestCount} + 1`,

          updatedAt: now,
        },

        setWhere:
          lt(
            aiRateLimitWindows
              .requestCount,

            limit,
          ),
      })
      .returning({
        requestCount:
          aiRateLimitWindows
            .requestCount,
      });

  if (!rateLimitWindow) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  return {
    allowed: true,

    remaining:
      Math.max(
        0,
        limit -
          rateLimitWindow
            .requestCount,
      ),
  };
}
