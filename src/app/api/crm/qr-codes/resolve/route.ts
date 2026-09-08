import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { entityQrCodes, entityQrScanEvents } from "@/db/schema";
import {
  createQrApiErrorResponse,
  getQrApiContext,
  QrApiError,
} from "@/lib/qr/api-context";
import { normalizeScannedCode } from "@/lib/qr/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getQrApiContext("view");
    const body = await request.json() as Record<string, unknown>;
    const scanned = normalizeScannedCode(body.value ?? body.token);
    const branchId = typeof body.branchId === "string" && body.branchId.trim()
      ? body.branchId.trim()
      : null;

    if (!scanned.publicToken && !scanned.displayCode) {
      throw new QrApiError("El código leído no es un identificador de Datara válido.", 400);
    }

    const codeFilter = scanned.publicToken
      ? eq(entityQrCodes.publicToken, scanned.publicToken)
      : eq(entityQrCodes.displayCode, scanned.displayCode!);

    const [code] = await db.select().from(entityQrCodes).where(and(
      eq(entityQrCodes.tenantId, tenantId),
      codeFilter,
    )).limit(1);

    if (!code) throw new QrApiError("El código QR no pertenece a esta empresa.", 404);

    if (code.status !== "active") {
      await db.insert(entityQrScanEvents).values({
        tenantId,
        qrCodeId: code.id,
        publicToken: code.publicToken,
        outcome: "revoked",
        resolvedEntityType: code.entityType,
        resolvedEntityId: code.entityId,
        branchId,
        scannedByClerkUserId: userId,
      });
      throw new QrApiError("Este código QR fue revocado.", 410);
    }

    await db.insert(entityQrScanEvents).values({
      tenantId,
      qrCodeId: code.id,
      publicToken: code.publicToken,
      outcome: "resolved",
      requestedAction: typeof body.action === "string" ? body.action : null,
      resolvedEntityType: code.entityType,
      resolvedEntityId: code.entityId,
      branchId,
      scannedByClerkUserId: userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        codeId: code.id,
        entityType: code.entityType,
        entityId: code.entityId,
        label: code.label,
      },
    });
  } catch (error) {
    return createQrApiErrorResponse(error, "No fue posible resolver el código QR.");
  }
}
