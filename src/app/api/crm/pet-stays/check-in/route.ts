import { getActiveCRMBranch } from "@/lib/crm/active-branch";
import { and, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { crmPets, petReservations, tenantBranches } from "@/db/schema";
import { requirePetVaccination } from "@/lib/crm/pet-vaccination";
import { CRMBranchAccessError, getCRMBranchAccess, validateCRMBranchId } from "@/lib/crm/branch-access";
import {
  createPetApiErrorResponse,
  getOptionalString,
  getPetApiContext,
  getRequiredString,
  PetApiError,
} from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission } from "@/lib/crm/permissions";
import {
  getPetStayScheduleForDate,
  readPetBranchPolicy,
} from "@/lib/crm/pet-branch-policy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    await requireCRMModulePermission(tenantId, userId, "pet-stays", "create");
    const payload = await request.json() as Record<string, unknown>;
    const petId = getRequiredString(payload.petId, "La mascota");
    const serviceType = "daycare";
    const requestedBranchId = getRequiredString(payload.branchId, "La sucursal");
    const outsideBusinessHoursReason = getOptionalString(
      payload.outsideBusinessHoursReason,
    );
    await getActiveCRMBranch(tenantId, userId, requestedBranchId);
    const branchAccess = await getCRMBranchAccess(tenantId, userId);
    const branchId = await validateCRMBranchId(tenantId, branchAccess, requestedBranchId);
    if (!['daycare', 'boarding'].includes(serviceType)) {
      throw new PetApiError("Selecciona guardería o pensión.", 400);
    }

    const [pet] = await db.select({ id: crmPets.id, customerId: crmPets.customerId })
      .from(crmPets).where(and(
        eq(crmPets.id, petId), eq(crmPets.tenantId, tenantId), eq(crmPets.status, "active"),
      )).limit(1);
    if (!pet) throw new PetApiError("No se encontró una mascota activa.", 404);

    const [branch] = await db.select({
      timezone: tenantBranches.timezone,
      metadata: tenantBranches.metadata,
    }).from(tenantBranches)
      .where(and(eq(tenantBranches.id, branchId), eq(tenantBranches.tenantId, tenantId))).limit(1);

    const timezone = branch?.timezone ?? "America/Mexico_City";
    const now = new Date();
    const branchPolicy = readPetBranchPolicy(branch?.metadata);
    const schedule = getPetStayScheduleForDate(
      now,
      timezone,
      branchPolicy,
    );

    const localParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

    const localHour = Number(
      localParts.find((part) => part.type === "hour")?.value ?? "0",
    );
    const localMinute = Number(
      localParts.find((part) => part.type === "minute")?.value ?? "0",
    );
    const currentMinute = localHour * 60 + localMinute;

    const minutesFromTime = (value: string) => {
      const [hours, minutes] = value.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const outsideBusinessHours =
      schedule.closed ||
      Boolean(
        schedule.open &&
        currentMinute < minutesFromTime(schedule.open),
      ) ||
      Boolean(
        schedule.close &&
        currentMinute > minutesFromTime(schedule.close),
      );

    if (outsideBusinessHours && !outsideBusinessHoursReason) {
      return NextResponse.json(
        {
          success: false,
          error: "La entrada está fuera del horario laboral de la sucursal.",
          code: "OUTSIDE_BUSINESS_HOURS",
          data: {
            currentTime: `${String(localHour).padStart(2, "0")}:${String(localMinute).padStart(2, "0")}`,
            openTime: schedule.open,
            closeTime: schedule.close,
            closed: schedule.closed,
          },
        },
        { status: 409 },
      );
    }

    const outsideBusinessHoursMetadata = outsideBusinessHours
      ? {
          outsideBusinessHours: {
            reason: outsideBusinessHoursReason,
            authorizedBy: userId,
            authorizedAt: now.toISOString(),
            localTime: `${String(localHour).padStart(2, "0")}:${String(localMinute).padStart(2, "0")}`,
            scheduledOpen: schedule.open,
            scheduledClose: schedule.close,
          },
        }
      : {};

    const warning = await requirePetVaccination(tenantId, petId, timezone);
    // Only today's arrivals at this branch are candidates; never consume a future booking.
    const arrivals = await db.select({
      id: petReservations.id,
      metadata: petReservations.metadata,
    }).from(petReservations).where(and(
      eq(petReservations.tenantId, tenantId), eq(petReservations.petId, petId),
      eq(petReservations.branchId, branchId),
      inArray(petReservations.serviceType, ["daycare", "boarding"]),
      inArray(petReservations.status, ["pending", "confirmed"]),
      sql`(${petReservations.startsAt} AT TIME ZONE ${timezone})::date = (now() AT TIME ZONE ${timezone})::date`,
    )).limit(2);
    if (arrivals.length > 1) throw new PetApiError("Hay varias reservas para hoy. Abre la reserva correspondiente para registrar la entrada.", 409);
    if (arrivals[0]) {
      const [updated] = await db.update(petReservations).set({
        status: "checked_in",
        checkedInAt: now,
        metadata: {
          ...(arrivals[0].metadata ?? {}),
          ...outsideBusinessHoursMetadata,
        },
        updatedAt: now,
      })
        .where(and(eq(petReservations.id, arrivals[0].id), eq(petReservations.tenantId, tenantId),
          inArray(petReservations.status, ["pending", "confirmed"])))
        .returning({ id: petReservations.id, checkedInAt: petReservations.checkedInAt });
      if (!updated) throw new PetApiError("La reserva cambió de estado. Consulta nuevamente la mascota.", 409);
      return NextResponse.json({ success: true, data: { ...updated, warning } });
    }

    const [created] = await db.insert(petReservations).values({
      tenantId,
      customerId: pet.customerId,
      petId,
      branchId,
      serviceType,
      origin: "walk_in",
      status: "checked_in",
      startsAt: now,
      endsAt: null,
      checkedInAt: now,
      reservedUnits: 1,
      careInstructions: getOptionalString(payload.careInstructions),
      notes: getOptionalString(payload.notes),
      metadata: {
        sourceType: "walk_in",
        ...outsideBusinessHoursMetadata,
      },
      updatedAt: now,
    }).returning({ id: petReservations.id, checkedInAt: petReservations.checkedInAt });

    return NextResponse.json({ success: true, data: { ...created, warning } }, { status: 201 });
  } catch (error) {
    if (error instanceof CRMBranchAccessError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    const cause = error && typeof error === "object" && "cause" in error ? error.cause : error;
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "23505") {
      return NextResponse.json(
        { success: false, error: "La mascota ya tiene una estancia abierta." },
        { status: 409 },
      );
    }
    return createPetApiErrorResponse(error, "No fue posible registrar la entrada.");
  }
}
