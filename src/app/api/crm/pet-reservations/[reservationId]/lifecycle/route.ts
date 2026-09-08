import { getActiveCRMBranch } from "@/lib/crm/active-branch";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { petReservations, tenantBranches } from "@/db/schema";
import { requirePetVaccination } from "@/lib/crm/pet-vaccination";
import { CRMBranchAccessError, getCRMBranchAccess, validateCRMBranchId } from "@/lib/crm/branch-access";
import { createPetApiErrorResponse, getOptionalString, getPetApiContext, PetApiError } from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission } from "@/lib/crm/permissions";

type RouteContext = { params: Promise<{ reservationId: string }> };
type LifecycleAction = "check_in" | "check_out" | "cancel" | "no_show";

const serviceModules: Record<string, string> = {
  veterinary: "pet-veterinary",
  grooming: "pet-grooming",
  daycare: "pet-stays",
  boarding: "pet-stays",
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    const { reservationId } = await context.params;
    const payload = await request.json() as Record<string, unknown>;
    const action = payload.action as LifecycleAction;
    if (!["check_in", "check_out", "cancel", "no_show"].includes(action)) {
      throw new PetApiError("La acción solicitada no es válida.", 400);
    }
    if (action === "check_out") {
      throw new PetApiError(
        "Completa la salida mediante el flujo de checkout para registrar paquete, orden y cobro.",
        409,
      );
    }

    const [reservation] = await db.select({
      id: petReservations.id,
      petId: petReservations.petId,
      branchId: petReservations.branchId,
      serviceType: petReservations.serviceType,
      status: petReservations.status,
    }).from(petReservations).where(and(
      eq(petReservations.id, reservationId), eq(petReservations.tenantId, tenantId),
    )).limit(1);
    if (!reservation) throw new PetApiError("La reservación no existe.", 404);
    await getActiveCRMBranch(tenantId, userId, reservation.branchId);
    const moduleId = serviceModules[reservation.serviceType];
    if (!moduleId) throw new PetApiError("El servicio de la reservación no es válido.", 409);
    await requireCRMModulePermission(tenantId, userId, moduleId, "edit");

    const now = new Date();
    let updated: { id: string } | undefined;
    let warning: string | null = null;
    if (action === "check_in") {
      if (reservation.status === "checked_in") updated = { id: reservation.id };
      else {
        if (["daycare", "boarding"].includes(reservation.serviceType)) {
          if (!reservation.branchId) throw new PetApiError("La reserva requiere una sucursal antes de registrar la entrada.", 409);
          await validateCRMBranchId(tenantId, await getCRMBranchAccess(tenantId, userId), reservation.branchId);
          const [branch] = await db.select({ timezone: tenantBranches.timezone }).from(tenantBranches)
            .where(and(eq(tenantBranches.id, reservation.branchId), eq(tenantBranches.tenantId, tenantId))).limit(1);
          warning = await requirePetVaccination(tenantId, reservation.petId, branch?.timezone ?? "America/Mexico_City");
        }
        [updated] = await db.update(petReservations).set({ status: "checked_in", checkedInAt: now, updatedAt: now })
          .where(and(eq(petReservations.id, reservationId), eq(petReservations.tenantId, tenantId),
            inArray(petReservations.status, ["pending", "confirmed"])))
          .returning({ id: petReservations.id });
      }
    } else {
      const nextStatus = action === "cancel" ? "cancelled" : "no_show";
      if (reservation.status === nextStatus) updated = { id: reservation.id };
      else {
        [updated] = await db.update(petReservations).set({
          status: nextStatus,
          cancellationReason: getOptionalString(payload.reason),
          updatedAt: now,
        }).where(and(eq(petReservations.id, reservationId), eq(petReservations.tenantId, tenantId),
          inArray(petReservations.status, ["pending", "confirmed"])))
          .returning({ id: petReservations.id });
      }
    }
    if (!updated) throw new PetApiError("La reservación cambió de estado y ya no admite esta acción.", 409);

    return NextResponse.json({ success: true, data: { id: reservationId, action, warning } });
  } catch (error) {
    if (error instanceof CRMBranchAccessError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    return createPetApiErrorResponse(error, "No fue posible actualizar la reservación.");
  }
}
