import { normalizePetMicrochip, isDuplicatePetMicrochip } from "@/lib/crm/pet-microchip";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { crmCustomers, crmPets, crmDocuments, crmDocumentRelations } from "@/db/schema";
import { vaccinationState } from "@/lib/crm/pet-vaccination";
import { createPetApiErrorResponse, getOptionalString, getPetApiContext, getRequiredString, PetApiError } from "@/lib/crm/pet-api-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId } = await getPetApiContext("contacts", "view");
    const records = await db.select({
      id: crmPets.id, customerId: crmPets.customerId, name: crmPets.name,
      species: crmPets.species, breed: crmPets.breed, sex: crmPets.sex,
      birthDate: crmPets.birthDate, color: crmPets.color, weightKg: crmPets.weightKg,
      microchipNumber: crmPets.microchipNumber, status: crmPets.status,
      allergies: crmPets.allergies, medicalConditions: crmPets.medicalConditions,
      medications: crmPets.medications, feedingInstructions: crmPets.feedingInstructions,
      careNotes: crmPets.careNotes, metadata: crmPets.metadata,
      tutorName: crmCustomers.name, tutorLastName: crmCustomers.lastName,
      tutorCompanyName: crmCustomers.companyName, updatedAt: crmPets.updatedAt,
    }).from(crmPets).innerJoin(crmCustomers, and(
      eq(crmCustomers.id, crmPets.customerId), eq(crmCustomers.tenantId, crmPets.tenantId),
    )).where(eq(crmPets.tenantId, tenantId)).orderBy(desc(crmPets.updatedAt));
    const cards = await db.select({ petId: crmDocumentRelations.entityId, id: crmDocuments.id, metadata: crmDocuments.metadata })
      .from(crmDocuments).innerJoin(crmDocumentRelations, and(
        eq(crmDocumentRelations.documentId, crmDocuments.id), eq(crmDocumentRelations.tenantId, tenantId), eq(crmDocumentRelations.entityType, "pet"),
      )).where(and(eq(crmDocuments.tenantId, tenantId), eq(crmDocuments.status, "active"), eq(crmDocuments.category, "Cartilla de vacunación")))
      .orderBy(desc(crmDocuments.createdAt), desc(crmDocuments.id));
    const latest = new Map<string, typeof cards[number]>();
    for (const card of cards) if (!latest.has(card.petId)) latest.set(card.petId, card);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const end = new Date(`${today}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 7);
    const weekEnd = end.toISOString().slice(0, 10);
    return NextResponse.json({ success: true, data: records.map((pet) => {
      const vaccination = vaccinationState(latest.get(pet.id) ?? null, today);
      return { ...pet, vaccination: { ...vaccination, expiresThisWeek: ["valid", "expiring"].includes(vaccination.status) && vaccination.validUntil <= weekEnd } };
    }) });
  } catch (error) {
    return createPetApiErrorResponse(error, "No fue posible consultar las mascotas.");
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getPetApiContext("contacts", "create");
    const payload = await request.json() as Record<string, unknown>;
    const customerId = getRequiredString(payload.customerId, "El tutor");
    const [customer] = await db.select({ id: crmCustomers.id }).from(crmCustomers)
      .where(and(eq(crmCustomers.id, customerId), eq(crmCustomers.tenantId, tenantId))).limit(1);
    if (!customer) throw new PetApiError("El tutor seleccionado no pertenece a la empresa.", 400);
    const sex = getOptionalString(payload.sex);
    if (sex && !["female", "male", "unknown"].includes(sex)) throw new PetApiError("Selecciona un sexo válido.", 400);
    const weight = payload.weightKg === null || payload.weightKg === undefined || payload.weightKg === ""
      ? null : Number(payload.weightKg);
    if (weight !== null && (!Number.isFinite(weight) || weight < 0)) throw new PetApiError("El peso no es válido.", 400);
    const [created] = await db.insert(crmPets).values({
      tenantId, customerId, name: getRequiredString(payload.name, "El nombre"),
      species: getRequiredString(payload.species, "La especie"), breed: getOptionalString(payload.breed),
      sex: sex as "female" | "male" | "unknown" | null,
      birthDate: getOptionalString(payload.birthDate), color: getOptionalString(payload.color),
      weightKg: weight === null ? null : String(weight), microchipNumber: normalizePetMicrochip(payload.microchipNumber),
      allergies: getOptionalString(payload.allergies), medicalConditions: getOptionalString(payload.medicalConditions),
      medications: getOptionalString(payload.medications), feedingInstructions: getOptionalString(payload.feedingInstructions),
      careNotes: getOptionalString(payload.careNotes), metadata: {}, updatedAt: new Date(),
    }).returning({ id: crmPets.id, name: crmPets.name, status: crmPets.status });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (isDuplicatePetMicrochip(error)) {
      return createPetApiErrorResponse(new PetApiError("Ese número de microchip ya está registrado en otra mascota. Revisa el número; si no tiene microchip, deja el campo vacío.", 409), "Microchip duplicado.");
    }
    return createPetApiErrorResponse(error, "No fue posible registrar la mascota.");
  }
}
