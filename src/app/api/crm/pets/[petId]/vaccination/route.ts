import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmDocuments } from "@/db/schema";
import { createPetApiErrorResponse, getPetApiContext, PetApiError } from "@/lib/crm/pet-api-context";
import { getPetVaccinationCard, vaccinationState } from "@/lib/crm/pet-vaccination";

type Context = { params: Promise<{ petId: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { tenantId } = await getPetApiContext("contacts", "view");
    const { petId } = await context.params;
    const card = await getPetVaccinationCard(tenantId, petId);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return NextResponse.json({ success: true, data: { documentId: card?.id, ...vaccinationState(card, today) } });
  } catch (error) { return createPetApiErrorResponse(error, "No fue posible consultar la vigencia."); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "edit");
    const { petId } = await context.params;
    const payload = await request.json() as Record<string, unknown>;
    const validUntil = typeof payload.validUntil === "string" ? payload.validUntil : "";
    const date = new Date(`${validUntil}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== validUntil || payload.reviewed !== true) {
      throw new PetApiError("Indica una fecha válida y confirma que revisaste la cartilla.", 400);
    }
    const card = await getPetVaccinationCard(tenantId, petId);
    if (!card || card.id !== payload.documentId) throw new PetApiError("La cartilla cambió. Actualiza el expediente y revisa el documento vigente.", 409);
    const review = JSON.stringify({ validUntil, reviewedBy: userId, reviewedAt: new Date().toISOString() });
    await db.update(crmDocuments).set({
      metadata: sql`jsonb_set(${crmDocuments.metadata}, '{vaccinationReview}', ${review}::jsonb)`, updatedAt: new Date(),
    }).where(and(eq(crmDocuments.id, card.id), eq(crmDocuments.tenantId, tenantId), eq(crmDocuments.status, "active")));
    return NextResponse.json({ success: true, data: { validUntil } });
  } catch (error) { return createPetApiErrorResponse(error, "No fue posible guardar la revisión."); }
}
