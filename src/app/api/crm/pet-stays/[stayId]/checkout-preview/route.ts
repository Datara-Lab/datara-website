import { getActiveCRMBranch } from "@/lib/crm/active-branch";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { petReservations, tenantBranches } from "@/db/schema";
import { createPetApiErrorResponse, getPetApiContext, PetApiError } from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission } from "@/lib/crm/permissions";
import { getPetCheckoutOptions } from "@/lib/crm/pet-checkout-options";

type RouteContext = { params: Promise<{ stayId: string }> };
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    await Promise.all([
      requireCRMModulePermission(tenantId, userId, "pet-stays", "edit"),
      requireCRMModulePermission(tenantId, userId, "sales-orders", "create"),
    ]);
    const { stayId } = await context.params;
    const [stay] = await db.select({
      id: petReservations.id,
      branchId: petReservations.branchId,
      customerId: petReservations.customerId,
      petId: petReservations.petId,
      serviceType: petReservations.serviceType,
      status: petReservations.status,
      startsAt: petReservations.startsAt,
      checkedInAt: petReservations.checkedInAt,
      packageAccountId: petReservations.packageAccountId,
      metadata: petReservations.metadata,
      timezone: tenantBranches.timezone,
      branchMetadata: tenantBranches.metadata,
    }).from(petReservations)
      .leftJoin(tenantBranches, and(eq(tenantBranches.id, petReservations.branchId), eq(tenantBranches.tenantId, petReservations.tenantId)))
      .where(and(
      eq(petReservations.id, stayId), eq(petReservations.tenantId, tenantId),
    )).limit(1);
    if (!stay) throw new PetApiError("No se encontró la estancia.", 404);
    await getActiveCRMBranch(tenantId, userId, stay.branchId);
    if (stay.status !== "checked_in") throw new PetApiError("La mascota no tiene una estancia abierta.", 409);

    const result = await getPetCheckoutOptions(tenantId, stay);
    return NextResponse.json({
      success: true,
      data: {
        ...result.billing,
        options: result.options,
        serviceType: result.serviceType,
        nights: result.nights,
        lowUsagePercent: result.lowUsagePercent,
        packageAccount: null,
        quote: null,
      },
    });
  } catch (error) {
    return createPetApiErrorResponse(error, "No fue posible preparar la salida.");
  }
}
