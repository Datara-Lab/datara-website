import { and, eq, gt, lt, sql } from "drizzle-orm";

import { db } from "@/db";

import { commercialUsageWindows } from "@/db/schema";

import { getTenantCommercialCapacity } from "@/lib/commercial/tenant-capacity";

export type CommercialEmailUsage = {
  used: number;
  limit: number;
  available: number | null;
  atLimit: boolean;
  windowStartedAt: Date;
};

export class CommercialEmailLimitError extends Error {
  status = 409;
}

function getMonthWindowStart(referenceDate = new Date()): Date {
  return new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );
}

function createUsage(
  used: number,
  limit: number,
  windowStartedAt: Date,
): CommercialEmailUsage {
  return {
    used,
    limit,
    available: limit > 0 ? Math.max(0, limit - used) : null,
    atLimit: limit > 0 && used >= limit,
    windowStartedAt,
  };
}

export async function getTenantCommercialEmailUsage(
  tenantId: string,
): Promise<CommercialEmailUsage> {
  const windowStartedAt = getMonthWindowStart();

  const [capacity, usageRows] = await Promise.all([
    getTenantCommercialCapacity(tenantId, "crm"),
    db
      .select({
        usageCount: commercialUsageWindows.usageCount,
      })
      .from(commercialUsageWindows)
      .where(
        and(
          eq(commercialUsageWindows.tenantId, tenantId),
          eq(commercialUsageWindows.metric, "emails"),
          eq(commercialUsageWindows.windowStartedAt, windowStartedAt),
        ),
      )
      .limit(1),
  ]);

  return createUsage(
    usageRows[0]?.usageCount ?? 0,
    capacity.emailsPerMonth,
    windowStartedAt,
  );
}

async function reserveTenantCommercialEmail(
  tenantId: string,
): Promise<CommercialEmailUsage | null> {
  const capacity = await getTenantCommercialCapacity(tenantId, "crm");

  const limit = capacity.emailsPerMonth;

  const windowStartedAt = getMonthWindowStart();

  const now = new Date();

  const [usageWindow] = await db
    .insert(commercialUsageWindows)
    .values({
      tenantId,
      metric: "emails",
      windowStartedAt,
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        commercialUsageWindows.tenantId,
        commercialUsageWindows.metric,
        commercialUsageWindows.windowStartedAt,
      ],
      set: {
        usageCount: sql`${commercialUsageWindows.usageCount} + 1`,
        updatedAt: now,
      },
      ...(limit > 0
        ? {
            setWhere: lt(commercialUsageWindows.usageCount, limit),
          }
        : {}),
    })
    .returning({
      usageCount: commercialUsageWindows.usageCount,
    });

  return usageWindow
    ? createUsage(usageWindow.usageCount, limit, windowStartedAt)
    : null;
}

async function releaseTenantCommercialEmail(
  tenantId: string,
  windowStartedAt: Date,
): Promise<void> {
  await db
    .update(commercialUsageWindows)
    .set({
      usageCount: sql`${commercialUsageWindows.usageCount} - 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(commercialUsageWindows.tenantId, tenantId),
        eq(commercialUsageWindows.metric, "emails"),
        eq(commercialUsageWindows.windowStartedAt, windowStartedAt),
        gt(commercialUsageWindows.usageCount, 0),
      ),
    );
}

type SendMeteredCommercialEmailOptions = {
  tenantId: string;
  send: () => Promise<Response>;
};

export async function sendMeteredCommercialEmail({
  tenantId,
  send,
}: SendMeteredCommercialEmailOptions): Promise<Response> {
  const reservation = await reserveTenantCommercialEmail(tenantId);

  if (!reservation) {
    throw new CommercialEmailLimitError(
      "Tu plan alcanzó el límite mensual de correos. Contrata una expansión para continuar enviando.",
    );
  }

  try {
    const response = await send();

    if (!response.ok) {
      await releaseTenantCommercialEmail(tenantId, reservation.windowStartedAt);
    }

    return response;
  } catch (error) {
    await releaseTenantCommercialEmail(tenantId, reservation.windowStartedAt);

    throw error;
  }
}
