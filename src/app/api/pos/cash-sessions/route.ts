import { currentUser } from "@clerk/nextjs/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { posCashMovements, posCashSessions, posTerminals } from "@/db/schema";
import { assertPOSBranchAccess, createPOSApiErrorResponse, getPOSApiContext, money, requiredString } from "@/lib/pos/api-context";

export async function GET() {
  try {
    const context = await getPOSApiContext("pos-cash", "view");
    const records = await db.select({
      id: posCashSessions.id, terminalId: posCashSessions.terminalId,
      terminalName: posTerminals.name, branchId: posTerminals.branchId,
      status: posCashSessions.status, openedAt: posCashSessions.openedAt,
      openedByName: posCashSessions.openedByName, openingAmount: posCashSessions.openingAmount,
      closedAt: posCashSessions.closedAt, expectedCashAmount: posCashSessions.expectedCashAmount,
      countedCashAmount: posCashSessions.countedCashAmount, differenceAmount: posCashSessions.differenceAmount,
    }).from(posCashSessions).innerJoin(posTerminals, eq(posCashSessions.terminalId, posTerminals.id))
      .where(and(eq(posCashSessions.tenantId, context.tenantId), context.allBranches ? undefined : inArray(posTerminals.branchId, context.branchIds)))
      .orderBy(desc(posCashSessions.openedAt)).limit(100);
    return NextResponse.json({ success: true, data: records.map((record) => ({ ...record, openingAmount: Number(record.openingAmount), expectedCashAmount: record.expectedCashAmount === null ? null : Number(record.expectedCashAmount), countedCashAmount: record.countedCashAmount === null ? null : Number(record.countedCashAmount), differenceAmount: record.differenceAmount === null ? null : Number(record.differenceAmount) })) });
  } catch (error) { return createPOSApiErrorResponse(error, "No fue posible consultar las sesiones de caja."); }
}

export async function POST(request: Request) {
  try {
    const context = await getPOSApiContext("pos-cash", "create");
    const payload = await request.json() as Record<string, unknown>;
    const terminalId = requiredString(payload.terminalId, "La terminal");
    const openingAmount = money(payload.openingAmount ?? 0, "El fondo inicial");
    const [terminal] = await db.select({ id: posTerminals.id, branchId: posTerminals.branchId }).from(posTerminals)
      .where(and(eq(posTerminals.id, terminalId), eq(posTerminals.tenantId, context.tenantId), eq(posTerminals.status, "active"))).limit(1);
    if (!terminal) throw new Error("La terminal no está disponible.");
    assertPOSBranchAccess(context, terminal.branchId);
    const user = await currentUser();
    const actorName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.emailAddresses[0]?.emailAddress || "Usuario";
    const sessionId = crypto.randomUUID();
    const result = await db.execute<{ id: string }>(sql`
      WITH created_session AS (
        INSERT INTO pos_cash_sessions (id, tenant_id, terminal_id, status, opened_by_clerk_user_id, opened_by_name, opening_amount, created_at, updated_at)
        VALUES (${sessionId}, ${context.tenantId}, ${terminalId}, 'open', ${context.userId}, ${actorName}, ${String(openingAmount)}, NOW(), NOW())
        RETURNING id
      ), opening_movement AS (
        INSERT INTO pos_cash_movements (id, tenant_id, cash_session_id, movement_type, direction, amount, currency, reason, performed_by_clerk_user_id, performed_by_name, created_at)
        SELECT gen_random_uuid(), ${context.tenantId}, id, 'opening', 'in', ${String(openingAmount)}, 'mxn', 'Fondo inicial', ${context.userId}, ${actorName}, NOW()
        FROM created_session WHERE ${String(openingAmount)}::numeric > 0
      ) SELECT id FROM created_session
    `);
    return NextResponse.json({ success: true, data: { id: result.rows[0]?.id } }, { status: 201 });
  } catch (error) { return createPOSApiErrorResponse(error, "No fue posible abrir la caja."); }
}
