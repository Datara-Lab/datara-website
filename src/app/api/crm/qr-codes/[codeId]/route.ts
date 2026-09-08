import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { entityQrCodes } from "@/db/schema";
import {
  createQrApiErrorResponse,
  getQrApiContext,
  QrApiError,
} from "@/lib/qr/api-context";
import { buildQrPublicUrl, createQrDisplayCode, createQrPublicToken } from "@/lib/qr/runtime";

type RouteContext = { params: Promise<{ codeId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, userId } = await getQrApiContext("manage");
    const { codeId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const action = body.action;
    if (action !== "revoke" && action !== "rotate") {
      throw new QrApiError("Acción QR inválida.", 400);
    }

    const [current] = await db.select().from(entityQrCodes).where(and(
      eq(entityQrCodes.id, codeId),
      eq(entityQrCodes.tenantId, tenantId),
    )).limit(1);
    if (!current) throw new QrApiError("No se encontró el código QR.", 404);
    if (current.status !== "active") throw new QrApiError("El código QR ya fue revocado.", 409);

    const replacementToken = createQrPublicToken();
    const replacementDisplayCode = createQrDisplayCode();
    const result = await db.execute<{
      id: string;
      publicToken: string;
      entityType: string;
      entityId: string;
      label: string | null;
      status: string;
    }>(sql`
      WITH revoked AS (
        UPDATE entity_qr_codes
        SET status = 'revoked', revoked_at = NOW(),
            revoked_by_clerk_user_id = ${userId}, updated_at = NOW()
        WHERE id = ${codeId} AND tenant_id = ${tenantId} AND status = 'active'
        RETURNING *
      )
      ${action === "rotate" ? sql`
        INSERT INTO entity_qr_codes (
          tenant_id, public_token, display_code, symbology, design_theme,
          entity_type, entity_id, label, status, created_by_clerk_user_id, metadata
        )
        SELECT tenant_id, ${replacementToken}, ${replacementDisplayCode}, symbology, design_theme,
          entity_type, entity_id, label, 'active', ${userId}, metadata
        FROM revoked
        RETURNING id, public_token AS "publicToken", entity_type AS "entityType",
          entity_id AS "entityId", label, status
      ` : sql`
        SELECT id, public_token AS "publicToken", entity_type AS "entityType",
          entity_id AS "entityId", label, status
        FROM revoked
      `}
    `);

    const changed = result.rows[0];
    if (!changed) throw new QrApiError("El código QR cambió mientras se procesaba.", 409);

    return NextResponse.json({
      success: true,
      data: {
        code: {
          ...changed,
          publicUrl: action === "rotate" ? buildQrPublicUrl(changed.publicToken) : null,
        },
      },
    });
  } catch (error) {
    return createQrApiErrorResponse(error, "No fue posible actualizar el código QR.");
  }
}
