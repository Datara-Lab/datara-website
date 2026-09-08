import { getActiveCRMBranch } from "@/lib/crm/active-branch";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { crmCustomers, crmPets, petReservations, tenantBranches } from "@/db/schema";
import {
  createPetApiErrorResponse,
  getPetApiContext,
  PetApiError,
} from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission } from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    await requireCRMModulePermission(tenantId, userId, "pet-stays", "view");
    const activeBranchId = await getActiveCRMBranch(tenantId, userId);
    const petId = request.nextUrl.searchParams.get("petId")?.trim();
    if (!petId) throw new PetApiError("La mascota es obligatoria.", 400);

    const [pet] = await db.select({
      id: crmPets.id,
      name: crmPets.name,
      species: crmPets.species,
      customerId: crmPets.customerId,
      tutorName: crmCustomers.name,
      tutorLastName: crmCustomers.lastName,
      tutorCompanyName: crmCustomers.companyName,
    }).from(crmPets)
      .innerJoin(crmCustomers, and(
        eq(crmCustomers.id, crmPets.customerId),
        eq(crmCustomers.tenantId, crmPets.tenantId),
      ))
      .where(and(eq(crmPets.id, petId), eq(crmPets.tenantId, tenantId)))
      .limit(1);
    if (!pet) throw new PetApiError("No se encontró la mascota.", 404);

    const [openStay] = await db.select({
      id: petReservations.id,
      serviceType: petReservations.serviceType,
      checkedInAt: petReservations.checkedInAt,
      branchId: petReservations.branchId,
      branchName: tenantBranches.name,
      notes: petReservations.notes,
      careInstructions: petReservations.careInstructions,
    }).from(petReservations)
      .leftJoin(tenantBranches, and(
        eq(tenantBranches.id, petReservations.branchId),
        eq(tenantBranches.tenantId, petReservations.tenantId),
      ))
      .where(and(
        eq(petReservations.tenantId, tenantId),
        eq(petReservations.petId, petId),
        eq(petReservations.status, "checked_in"),
        eq(petReservations.branchId, activeBranchId),
      ))
      .orderBy(desc(petReservations.checkedInAt))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: { pet, openStay: openStay ?? null, nextAction: openStay ? "checkout" : "check_in" },
    });
  } catch (error) {
    return createPetApiErrorResponse(error, "No fue posible consultar la estancia.");
  }
}
