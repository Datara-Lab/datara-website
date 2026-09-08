import { getActiveCRMBranch } from "@/lib/crm/active-branch";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmCustomers,
  crmPets,
  crmProducts,
  petPackageAccounts,
  petReservations,
  tenantBranches,
} from "@/db/schema";
import {
  createPetApiErrorResponse,
  getOptionalString,
  getPetApiContext,
  getRequiredString,
  PetApiError,
} from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission } from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";

const serviceModules = {
  veterinary: "pet-veterinary",
  grooming: "pet-grooming",
  daycare: "pet-stays",
  boarding: "pet-stays",
} as const;

type PetServiceType = keyof typeof serviceModules;

function parseDate(value: unknown, label: string): Date {
  const date = new Date(getRequiredString(value, label));
  if (Number.isNaN(date.getTime())) throw new PetApiError(`${label} no es válida.`, 400);
  return date;
}

export async function GET() {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    const activeBranchId = await getActiveCRMBranch(tenantId, userId);
    const records = await db.select({
      id: petReservations.id,
      customerId: petReservations.customerId,
      customerName: crmCustomers.companyName,
      petId: petReservations.petId,
      petName: crmPets.name,
      branchId: petReservations.branchId,
      branchName: tenantBranches.name,
      timezone: tenantBranches.timezone,
      branchMetadata: tenantBranches.metadata,
      productId: petReservations.productId,
      productName: crmProducts.name,
      packageAccountId: petReservations.packageAccountId,
      packageName: petPackageAccounts.name,
      serviceType: petReservations.serviceType,
      status: petReservations.status,
      startsAt: petReservations.startsAt,
      endsAt: petReservations.endsAt,
      reservedUnits: petReservations.reservedUnits,
      checkedInAt: petReservations.checkedInAt,
      checkedOutAt: petReservations.checkedOutAt,
      cancellationReason: petReservations.cancellationReason,
      careInstructions: petReservations.careInstructions,
      notes: petReservations.notes,
    }).from(petReservations)
      .innerJoin(crmPets, and(eq(crmPets.id, petReservations.petId), eq(crmPets.tenantId, petReservations.tenantId)))
      .innerJoin(crmCustomers, and(eq(crmCustomers.id, petReservations.customerId), eq(crmCustomers.tenantId, petReservations.tenantId)))
      .leftJoin(tenantBranches, and(eq(tenantBranches.id, petReservations.branchId), eq(tenantBranches.tenantId, petReservations.tenantId)))
      .leftJoin(crmProducts, and(eq(crmProducts.id, petReservations.productId), eq(crmProducts.tenantId, petReservations.tenantId)))
      .leftJoin(petPackageAccounts, and(eq(petPackageAccounts.id, petReservations.packageAccountId), eq(petPackageAccounts.tenantId, petReservations.tenantId)))
      .where(and(eq(petReservations.tenantId, tenantId), eq(petReservations.branchId, activeBranchId)))
      .orderBy(desc(petReservations.startsAt));
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return createPetApiErrorResponse(error, "No fue posible consultar las reservaciones.");
  }
}

export async function POST(request: Request) {
  let createdReservationId: string | null = null;
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    const payload = await request.json() as Record<string, unknown>;
    const serviceType = getRequiredString(payload.serviceType, "El servicio") as PetServiceType;
    const moduleId = serviceModules[serviceType];
    if (!moduleId) throw new PetApiError("El servicio seleccionado no es válido.", 400);
    await requireCRMModulePermission(tenantId, userId, moduleId, "create");

    const customerId = getRequiredString(payload.customerId, "El tutor");
    const petId = getRequiredString(payload.petId, "La mascota");
    const branchId = await getActiveCRMBranch(tenantId, userId, getOptionalString(payload.branchId) ?? undefined);
    const productId = getOptionalString(payload.productId);
    const packageAccountId = null;
    const startsAt = parseDate(payload.startsAt, "La fecha de inicio");
    const endsAt = parseDate(payload.endsAt, "La fecha de término");
    if (endsAt <= startsAt) throw new PetApiError("La fecha de término debe ser posterior al inicio.", 400);
    const reservedUnits = Number(payload.reservedUnits ?? 1);
    if (!Number.isInteger(reservedUnits) || reservedUnits <= 0) {
      throw new PetApiError("Las unidades reservadas deben ser un entero positivo.", 400);
    }

    const [pet] = await db.select({ id: crmPets.id }).from(crmPets).where(and(
      eq(crmPets.id, petId), eq(crmPets.customerId, customerId), eq(crmPets.tenantId, tenantId),
    )).limit(1);
    if (!pet) throw new PetApiError("La mascota no pertenece al tutor seleccionado.", 400);

    if (branchId) {
      const [branch] = await db.select({ id: tenantBranches.id }).from(tenantBranches)
        .where(and(eq(tenantBranches.id, branchId), eq(tenantBranches.tenantId, tenantId))).limit(1);
      if (!branch) throw new PetApiError("La sucursal no pertenece a la empresa.", 400);
    }
    if (productId) {
      const [product] = await db.select({ id: crmProducts.id }).from(crmProducts)
        .where(and(eq(crmProducts.id, productId), eq(crmProducts.tenantId, tenantId))).limit(1);
      if (!product) throw new PetApiError("El servicio no pertenece a la empresa.", 400);
    }
    const [created] = await db.insert(petReservations).values({
      tenantId, customerId, petId, branchId, productId, packageAccountId,
      serviceType, status: "confirmed", startsAt, endsAt, reservedUnits,
      careInstructions: getOptionalString(payload.careInstructions),
      notes: getOptionalString(payload.notes), metadata: {}, updatedAt: new Date(),
    }).returning({ id: petReservations.id });
    if (!created) throw new Error("No fue posible crear la reservación.");
    createdReservationId = created.id;

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error) {
    if (createdReservationId) {
      try {
        await db.delete(petReservations).where(eq(petReservations.id, createdReservationId));
      } catch (compensationError) {
        console.error("No fue posible revertir la reservación incompleta:", compensationError);
      }
    }
    return createPetApiErrorResponse(error, "No fue posible crear la reservación.");
  }
}
