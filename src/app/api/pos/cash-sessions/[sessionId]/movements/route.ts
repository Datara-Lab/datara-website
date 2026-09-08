import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { posCashMovements, posCashSessions, posTerminals } from "@/db/schema";
import { assertPOSBranchAccess, createPOSApiErrorResponse, getPOSApiContext, money, POSApiError, requiredString } from "@/lib/pos/api-context";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, routeContext: RouteContext) {
  try {
    const context = await getPOSApiContext("pos-cash", "edit");
    const { sessionId } = await routeContext.params;
    const payload = await request.json() as Record<string, unknown>;
    const movementType = requiredString(payload.movementType, "El tipo de movimiento");
    if (!(["cash_in", "cash_out"] as string[]).includes(movementType)) {
      throw new POSApiError("Selecciona una entrada o retiro de efectivo.");
    }
    const amount = money(payload.amount, "El importe");
    if (amount <= 0) throw new POSApiError("El importe debe ser mayor que cero.");
    const reason = requiredString(payload.reason, "El motivo");
    const [session] = await db.select({ id: posCashSessions.id, branchId: posTerminals.branchId })
      .from(posCashSessions).innerJoin(posTerminals, eq(posCashSessions.terminalId, posTerminals.id))
      .where(and(eq(posCashSessions.id, sessionId), eq(posCashSessions.tenantId, context.tenantId), eq(posCashSessions.status, "open"))).limit(1);
    if (!session) throw new POSApiError("La sesión de caja no está abierta.", 409);
    assertPOSBranchAccess(context, session.branchId);
    const user = await currentUser();
    const actorName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.emailAddresses[0]?.emailAddress || "Usuario";
    const [movement] = await db.insert(posCashMovements).values({
      tenantId: context.tenantId, cashSessionId: session.id,
      movementType, direction: movementType === "cash_in" ? "in" : "out",
      amount: String(amount), currency: "mxn", reason,
      performedByClerkUserId: context.userId, performedByName: actorName,
    }).returning();
    return NextResponse.json({ success: true, data: { ...movement, amount: Number(movement.amount) } }, { status: 201 });
  } catch (error) { return createPOSApiErrorResponse(error, "No fue posible registrar el movimiento de caja."); }
}
