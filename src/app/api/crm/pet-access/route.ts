import { NextResponse } from "next/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";

import { petModuleIds } from "@/config/crm/industries/pet-modules";
import { db } from "@/db";
import { tenantModuleEntitlements } from "@/db/schema";
import { createPetApiErrorResponse, getPetApiContext } from "@/lib/crm/pet-api-context";
import { CRMPermissionError, requireCRMModulePermission } from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    const entitlements = await db.select({
      moduleId: tenantModuleEntitlements.moduleId,
      enabled: tenantModuleEntitlements.enabled,
    }).from(tenantModuleEntitlements).where(and(
      eq(tenantModuleEntitlements.tenantId, tenantId),
      eq(tenantModuleEntitlements.product, "crm"),
      or(isNull(tenantModuleEntitlements.expiresAt), gt(tenantModuleEntitlements.expiresAt, new Date())),
    ));
    const enabled = entitlements.length === 0
      ? new Set<string>(petModuleIds)
      : new Set(entitlements.filter((item) => item.enabled).map((item) => item.moduleId));
    const modules = await Promise.all(petModuleIds.map(async (moduleId) => {
      const access = { enabled: enabled.has(moduleId), canView: false, canCreate: false, canEdit: false };
      if (!access.enabled) return [moduleId, access] as const;
      for (const permission of ["view", "create", "edit"] as const) {
        try {
          await requireCRMModulePermission(tenantId, userId, moduleId, permission);
          access[permission === "view" ? "canView" : permission === "create" ? "canCreate" : "canEdit"] = true;
        } catch (error) {
          if (!(error instanceof CRMPermissionError)) throw error;
        }
      }
      return [moduleId, access] as const;
    }));
    return NextResponse.json({ success: true, data: Object.fromEntries(modules) });
  } catch (error) {
    return createPetApiErrorResponse(error, "No fue posible consultar el acceso de Mascotas.");
  }
}
