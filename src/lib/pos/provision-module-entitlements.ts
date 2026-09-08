import { and, eq, inArray, notInArray } from "drizzle-orm";

import { db } from "@/db";
import { tenantModuleEntitlements } from "@/db/schema";
import { POS_CORE_MODULE_IDS } from "@/lib/pos/module-catalog";

export type POSProvisioningMode = "trial" | "subscription" | "manual";

export async function provisionPOSModuleEntitlements({
  tenantId,
  mode,
  expiresAt = null,
}: {
  tenantId: string;
  mode: POSProvisioningMode;
  expiresAt?: Date | null;
}): Promise<string[]> {
  const moduleIds = [...POS_CORE_MODULE_IDS];
  const now = new Date();

  await db
    .insert(tenantModuleEntitlements)
    .values(
      moduleIds.map((moduleId) => ({
        tenantId,
        product: "pos" as const,
        moduleId,
        enabled: true,
        source: mode,
        grantedAt: now,
        expiresAt,
        configuration: { mode },
      })),
    )
    .onConflictDoUpdate({
      target: [
        tenantModuleEntitlements.tenantId,
        tenantModuleEntitlements.product,
        tenantModuleEntitlements.moduleId,
      ],
      set: {
        enabled: true,
        source: mode,
        grantedAt: now,
        expiresAt,
        configuration: { mode },
      },
    });

  await db
    .update(tenantModuleEntitlements)
    .set({ enabled: false })
    .where(
      and(
        eq(tenantModuleEntitlements.tenantId, tenantId),
        eq(tenantModuleEntitlements.product, "pos"),
        inArray(tenantModuleEntitlements.source, ["trial", "subscription"]),
        notInArray(tenantModuleEntitlements.moduleId, moduleIds),
      ),
    );

  return moduleIds;
}
