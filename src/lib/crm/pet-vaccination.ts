import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { crmDocuments, crmDocumentRelations } from "@/db/schema";
import { PetApiError } from "@/lib/crm/pet-api-context";

export async function getPetVaccinationCard(tenantId: string, petId: string) {
  const [card] = await db.select({ id: crmDocuments.id, metadata: crmDocuments.metadata })
    .from(crmDocuments).innerJoin(crmDocumentRelations, and(
      eq(crmDocumentRelations.documentId, crmDocuments.id),
      eq(crmDocumentRelations.tenantId, tenantId),
      eq(crmDocumentRelations.entityType, "pet"), eq(crmDocumentRelations.entityId, petId),
    )).where(and(eq(crmDocuments.tenantId, tenantId), eq(crmDocuments.status, "active"),
      eq(crmDocuments.category, "Cartilla de vacunación")))
    .orderBy(desc(crmDocuments.createdAt), desc(crmDocuments.id)).limit(1);
  return card ?? null;
}

export function vaccinationState(card: Awaited<ReturnType<typeof getPetVaccinationCard>> | null, today: string) {
  if (!card) return { status: "missing", validUntil: "", message: "La mascota no tiene cartilla. Súbela en su expediente antes de registrar la entrada." };
  const raw = card.metadata.vaccinationReview;
  const review = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const validUntil = typeof review.validUntil === "string" ? review.validUntil : "";
  if (!review.reviewedBy || !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
    return { status: "pending", validUntil, message: "La cartilla está pendiente de revisión. Revisa el documento y registra su vigencia en el expediente." };
  }
  if (validUntil < today) return { status: "expired", validUntil, message: `La cartilla venció el ${validUntil}. Actualízala en el expediente antes de registrar la entrada.` };
  const days = (Date.parse(validUntil) - Date.parse(today)) / 86400000;
  return { status: days <= 30 ? "expiring" : "valid", validUntil,
    message: days <= 30 ? `La cartilla vence el ${validUntil}. Solicita al tutor su actualización.` : `Cartilla vigente hasta ${validUntil}.` };
}

export async function requirePetVaccination(tenantId: string, petId: string, timezone = "America/Mexico_City") {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const state = vaccinationState(await getPetVaccinationCard(tenantId, petId), today);
  if (!["valid", "expiring"].includes(state.status)) throw new PetApiError(state.message, 409);
  return state.status === "expiring" ? state.message : null;
}
