import { CRMBranchAccessError } from "@/lib/crm/branch-access";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { CRMPermissionError, requireCRMModulePermission } from "@/lib/crm/permissions";

export class PetApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getPetApiContext(
  moduleId: string,
  permission: "view" | "create" | "edit" | "manage",
) {
  const { userId, orgId } = await auth();
  if (!userId) throw new PetApiError("No autenticado.", 401);
  if (!orgId) throw new PetApiError("No hay una organización activa.", 400);
  const [tenant] = await db.select({ id: tenants.id, industry: tenants.industry })
    .from(tenants).where(eq(tenants.clerkOrganizationId, orgId)).limit(1);
  if (!tenant) throw new PetApiError("La empresa aún no está sincronizada.", 404);
  if (tenant.industry !== "veterinary") {
    throw new PetApiError("La operación de Mascotas no está disponible para esta empresa.", 403);
  }
  const permissions = await requireCRMModulePermission(tenant.id, userId, moduleId, permission);
  return { tenantId: tenant.id, userId, permissions };
}

export function createPetApiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof PetApiError || error instanceof CRMPermissionError || error instanceof CRMBranchAccessError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}

export function getRequiredString(value: unknown, label: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new PetApiError(`${label} es obligatorio.`, 400);
  return normalized;
}

export function getOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
