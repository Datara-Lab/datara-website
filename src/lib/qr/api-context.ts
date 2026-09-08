import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { CRMPermissionError, requireCRMModulePermission } from "@/lib/crm/permissions";

export class QrApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getQrApiContext(
  permission: "view" | "create" | "edit" | "manage",
) {
  const { userId, orgId } = await auth();
  if (!userId) throw new QrApiError("No autenticado.", 401);
  if (!orgId) throw new QrApiError("No hay una organización activa.", 400);

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.clerkOrganizationId, orgId))
    .limit(1);

  if (!tenant) throw new QrApiError("La empresa aún no está sincronizada.", 404);
  await requireCRMModulePermission(tenant.id, userId, "qr-codes", permission);
  return { tenantId: tenant.id, userId };
}

export function createQrApiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof QrApiError || error instanceof CRMPermissionError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }
  console.error(fallback, error);
  return NextResponse.json(
    { success: false, error: fallback },
    { status: 500 },
  );
}
