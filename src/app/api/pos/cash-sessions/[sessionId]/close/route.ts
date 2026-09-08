import { currentUser } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { posCashSessions, posTerminals } from "@/db/schema";
import { assertPOSBranchAccess, createPOSApiErrorResponse, getPOSApiContext, money, POSApiError } from "@/lib/pos/api-context";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await getPOSApiContext("pos-cash", "manage");
    const { sessionId } = await routeContext.params;
    const payload = await request.json() as Record<string, unknown>;
    const countedCashAmount = money(payload.countedCashAmount, "El efectivo contado");
    const closingNotes = typeof payload.closingNotes === "string" ? payload.closingNotes.trim() || null : null;
    const [session] = await db.select({ id: posCashSessions.id, branchId: posTerminals.branchId })
      .from(posCashSessions).innerJoin(posTerminals, eq(posCashSessions.terminalId, posTerminals.id))
      .where(and(eq(posCashSessions.id, sessionId), eq(posCashSessions.tenantId, context.tenantId), eq(posCashSessions.status, "open"))).limit(1);
    if (!session) throw new POSApiError("La sesión de caja no está abierta.", 409);
    assertPOSBranchAccess(context, session.branchId);
    const user = await currentUser();
    const actorName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.emailAddresses[0]?.emailAddress || "Usuario";
    const result = await db.execute<{ id: string; expectedCashAmount: string; countedCashAmount: string; differenceAmount: string }>(sql`
      WITH locked_session AS MATERIALIZED (
        SELECT session.* FROM pos_cash_sessions session
        WHERE session.id = ${sessionId} AND session.tenant_id = ${context.tenantId} AND session.status = 'open'
        FOR UPDATE OF session
      ), totals AS (
        SELECT COALESCE(SUM(CASE WHEN movement.direction = 'in' THEN movement.amount ELSE -movement.amount END), 0) AS expected
        FROM pos_cash_movements movement JOIN locked_session session ON session.id = movement.cash_session_id
      ), closed AS (
        UPDATE pos_cash_sessions session SET status = 'closed', closed_by_clerk_user_id = ${context.userId},
          closed_by_name = ${actorName}, closed_at = NOW(), expected_cash_amount = totals.expected,
          counted_cash_amount = ${String(countedCashAmount)}, difference_amount = ${String(countedCashAmount)}::numeric - totals.expected,
          closing_notes = ${closingNotes}, updated_at = NOW()
        FROM totals WHERE session.id = ${sessionId} AND session.status = 'open'
        RETURNING session.id, session.expected_cash_amount, session.counted_cash_amount, session.difference_amount
      ) SELECT id, expected_cash_amount AS "expectedCashAmount", counted_cash_amount AS "countedCashAmount", difference_amount AS "differenceAmount" FROM closed
    `);
    const closed = result.rows[0];
    if (!closed) throw new POSApiError("La caja ya fue cerrada por otro usuario.", 409);
    return NextResponse.json({ success: true, data: { ...closed, expectedCashAmount: Number(closed.expectedCashAmount), countedCashAmount: Number(closed.countedCashAmount), differenceAmount: Number(closed.differenceAmount) } });
  } catch (error) { return createPOSApiErrorResponse(error, "No fue posible cerrar la caja."); }
}
