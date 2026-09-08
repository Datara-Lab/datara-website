import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmCustomers,
  crmPets,
  crmProducts,
  entityQrCodes,
  inventoryUnits,
} from "@/db/schema";
import {
  createQrApiErrorResponse,
  getQrApiContext,
  QrApiError,
} from "@/lib/qr/api-context";
import {
  buildQrPublicUrl,
  createQrDisplayCode,
  createQrPublicToken,
  isQREntityType,
  type QREntityType,
} from "@/lib/qr/runtime";

export const dynamic = "force-dynamic";

async function assertEntityExists(
  tenantId: string,
  entityType: QREntityType,
  entityId: string,
) {
  if (entityType === "pet") {
    return db.select({ id: crmPets.id }).from(crmPets)
      .where(and(eq(crmPets.tenantId, tenantId), eq(crmPets.id, entityId))).limit(1);
  }
  if (entityType === "product") {
    return db.select({ id: crmProducts.id }).from(crmProducts)
      .where(and(eq(crmProducts.tenantId, tenantId), eq(crmProducts.id, entityId))).limit(1);
  }
  if (entityType === "inventory_unit") {
    return db.select({ id: inventoryUnits.id }).from(inventoryUnits)
      .where(and(eq(inventoryUnits.tenantId, tenantId), eq(inventoryUnits.id, entityId))).limit(1);
  }
  if (entityType === "customer") {
    return db.select({ id: crmCustomers.id }).from(crmCustomers)
      .where(and(eq(crmCustomers.tenantId, tenantId), eq(crmCustomers.id, entityId))).limit(1);
  }
  throw new QrApiError("Este tipo de entidad aún no admite códigos QR.", 400);
}

function serializeCode(code: typeof entityQrCodes.$inferSelect) {
  return {
    ...code,
    publicUrl: buildQrPublicUrl(code.publicToken),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getQrApiContext("view");
    const entityType = request.nextUrl.searchParams.get("entityType");
    const entityId = request.nextUrl.searchParams.get("entityId");

    const filters = [eq(entityQrCodes.tenantId, tenantId)];
    if (entityType) {
      if (!isQREntityType(entityType)) throw new QrApiError("Tipo de entidad inválido.", 400);
      filters.push(eq(entityQrCodes.entityType, entityType));
    }
    if (entityId) filters.push(eq(entityQrCodes.entityId, entityId));

    const codes = await db.select().from(entityQrCodes)
      .where(and(...filters))
      .orderBy(desc(entityQrCodes.createdAt));

    return NextResponse.json({ success: true, data: { codes: codes.map(serializeCode) } });
  } catch (error) {
    return createQrApiErrorResponse(error, "No fue posible consultar los códigos QR.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getQrApiContext("create");
    const body = await request.json() as Record<string, unknown>;
    const entityType = body.entityType;
    const entityId = typeof body.entityId === "string" ? body.entityId.trim() : "";
    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : null;
    const symbology = "qr";
    const allowedThemes = ["standard", "pet_dog", "pet_cat", "pet_paws"];
    const designTheme = typeof body.designTheme === "string" && allowedThemes.includes(body.designTheme)
      ? body.designTheme
      : entityType === "pet" ? "pet_paws" : "standard";

    if (!isQREntityType(entityType)) throw new QrApiError("Tipo de entidad inválido.", 400);
    if (!/^[0-9a-f-]{36}$/i.test(entityId)) throw new QrApiError("Identificador de entidad inválido.", 400);
    const entity = await assertEntityExists(tenantId, entityType, entityId);
    if (entity.length !== 1) throw new QrApiError("No se encontró la entidad indicada.", 404);

    const [existing] = await db.select().from(entityQrCodes).where(and(
      eq(entityQrCodes.tenantId, tenantId),
      eq(entityQrCodes.entityType, entityType),
      eq(entityQrCodes.entityId, entityId),
      eq(entityQrCodes.status, "active"),
    )).limit(1);

    if (existing) {
      const [updated] = await db.update(entityQrCodes).set({
        symbology,
        designTheme,
        label,
        updatedAt: new Date(),
      }).where(and(
        eq(entityQrCodes.id, existing.id),
        eq(entityQrCodes.tenantId, tenantId),
      )).returning();
      return NextResponse.json({ success: true, data: { code: serializeCode(updated), created: false, updated: true } });
    }

    const [created] = await db.insert(entityQrCodes).values({
      tenantId,
      publicToken: createQrPublicToken(),
      displayCode: createQrDisplayCode(),
      symbology,
      designTheme,
      entityType,
      entityId,
      label,
      createdByClerkUserId: userId,
    }).returning();

    return NextResponse.json(
      { success: true, data: { code: serializeCode(created), created: true } },
      { status: 201 },
    );
  } catch (error) {
    return createQrApiErrorResponse(error, "No fue posible crear el código QR.");
  }
}
