import { and, eq, lte, sql } from "drizzle-orm";

import { db } from "@/db";

import { commercialStorageAccounts } from "@/db/schema";

import { getTenantCommercialCapacity } from "@/lib/commercial/tenant-capacity";

const BYTES_PER_GB = 1024 * 1024 * 1024;

export type CommercialStorageUsage = {
  usedBytes: number;
  limitBytes: number;
  availableBytes: number | null;
  usedGb: number;
  limitGb: number;
  availableGb: number | null;
  percentage: number | null;
  atLimit: boolean;
};

export class CommercialStorageLimitError extends Error {
  status = 409;
}

function toGb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_GB) * 100) / 100;
}

function createUsage(
  usedBytes: number,
  limitGb: number,
): CommercialStorageUsage {
  const limitBytes = limitGb > 0 ? Math.floor(limitGb * BYTES_PER_GB) : 0;

  const availableBytes =
    limitBytes > 0 ? Math.max(0, limitBytes - usedBytes) : null;

  return {
    usedBytes,
    limitBytes,
    availableBytes,
    usedGb: toGb(usedBytes),
    limitGb,
    availableGb: availableBytes === null ? null : toGb(availableBytes),
    percentage:
      limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : null,
    atLimit: limitBytes > 0 && usedBytes >= limitBytes,
  };
}

async function getLimitGb(tenantId: string): Promise<number> {
  const capacity = await getTenantCommercialCapacity(tenantId, "crm");

  return Number(capacity.storageGb);
}

export async function getTenantCommercialStorageUsage(
  tenantId: string,
): Promise<CommercialStorageUsage> {
  const [limitGb, accountRows] = await Promise.all([
    getLimitGb(tenantId),
    db
      .select({
        usedBytes: commercialStorageAccounts.usedBytes,
      })
      .from(commercialStorageAccounts)
      .where(
        and(
          eq(commercialStorageAccounts.tenantId, tenantId),
          eq(commercialStorageAccounts.product, "crm"),
        ),
      )
      .limit(1),
  ]);

  return createUsage(accountRows[0]?.usedBytes ?? 0, limitGb);
}

export async function reserveTenantCommercialStorage(
  tenantId: string,
  bytes: number,
): Promise<void> {
  if (bytes <= 0) {
    return;
  }

  const limitGb = await getLimitGb(tenantId);

  const limitBytes = limitGb > 0 ? Math.floor(limitGb * BYTES_PER_GB) : 0;

  if (limitBytes > 0 && bytes > limitBytes) {
    throw new CommercialStorageLimitError(
      "El archivo supera el almacenamiento disponible de tu plan.",
    );
  }

  const [account] = await db
    .insert(commercialStorageAccounts)
    .values({
      tenantId,
      product: "crm",
      usedBytes: bytes,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        commercialStorageAccounts.tenantId,
        commercialStorageAccounts.product,
      ],
      set: {
        usedBytes: sql`${commercialStorageAccounts.usedBytes} + ${bytes}`,
        updatedAt: new Date(),
      },
      ...(limitBytes > 0
        ? {
            setWhere: lte(
              commercialStorageAccounts.usedBytes,
              limitBytes - bytes,
            ),
          }
        : {}),
    })
    .returning({
      usedBytes: commercialStorageAccounts.usedBytes,
    });

  if (!account) {
    throw new CommercialStorageLimitError(
      "Tu plan alcanzó el límite de almacenamiento. Elimina archivos o contrata una expansión para continuar.",
    );
  }
}

export async function releaseTenantCommercialStorage(
  tenantId: string,
  bytes: number,
): Promise<void> {
  if (bytes <= 0) {
    return;
  }

  await db
    .update(commercialStorageAccounts)
    .set({
      usedBytes: sql`greatest(0, ${commercialStorageAccounts.usedBytes} - ${bytes})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(commercialStorageAccounts.tenantId, tenantId),
        eq(commercialStorageAccounts.product, "crm"),
      ),
    );
}

export async function reserveStorageReplacement(
  tenantId: string,
  previousBytes: number,
  nextBytes: number,
): Promise<number> {
  const additionalBytes = Math.max(0, nextBytes - previousBytes);

  await reserveTenantCommercialStorage(tenantId, additionalBytes);

  return additionalBytes;
}

export async function finalizeStorageReplacement(
  tenantId: string,
  previousBytes: number,
  nextBytes: number,
): Promise<void> {
  if (previousBytes > nextBytes) {
    await releaseTenantCommercialStorage(tenantId, previousBytes - nextBytes);
  }
}
