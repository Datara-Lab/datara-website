import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { inventoryLocations, posCashSessions, posTerminals, tenantBranches } from "@/db/schema";
import { assertPOSBranchAccess, createPOSApiErrorResponse, getPOSApiContext, requiredString } from "@/lib/pos/api-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getPOSApiContext("pos-settings", "view");
    const records = await db
      .select({
        id: posTerminals.id, code: posTerminals.code, name: posTerminals.name,
        status: posTerminals.status, receiptPrefix: posTerminals.receiptPrefix,
        branchId: posTerminals.branchId, branchName: tenantBranches.name,
        inventoryLocationId: posTerminals.inventoryLocationId,
        inventoryLocationName: inventoryLocations.name,
        openSessionId: posCashSessions.id,
      })
      .from(posTerminals)
      .innerJoin(tenantBranches, eq(posTerminals.branchId, tenantBranches.id))
      .leftJoin(inventoryLocations, eq(posTerminals.inventoryLocationId, inventoryLocations.id))
      .leftJoin(posCashSessions, and(eq(posCashSessions.terminalId, posTerminals.id), eq(posCashSessions.status, "open")))
      .where(and(
        eq(posTerminals.tenantId, context.tenantId),
        context.allBranches ? undefined : context.branchIds.length > 0
          ? inArray(posTerminals.branchId, context.branchIds) : sql<boolean>`false`,
      ))
      .orderBy(asc(tenantBranches.name), asc(posTerminals.name));
    const branches = await db
      .select({ id: tenantBranches.id, name: tenantBranches.name, code: tenantBranches.code })
      .from(tenantBranches)
      .where(and(
        eq(tenantBranches.tenantId, context.tenantId),
        eq(tenantBranches.active, true),
        context.allBranches ? undefined : context.branchIds.length > 0
          ? inArray(tenantBranches.id, context.branchIds) : sql<boolean>`false`,
      ))
      .orderBy(asc(tenantBranches.name));
    return NextResponse.json({ success: true, data: records, options: { branches } });
  } catch (error) { return createPOSApiErrorResponse(error, "No fue posible consultar las terminales POS."); }
}

export async function POST(request: Request) {
  try {
    const context = await getPOSApiContext("pos-settings", "manage");
    const payload = await request.json() as Record<string, unknown>;
    const branchId = requiredString(payload.branchId, "La sucursal");
    assertPOSBranchAccess(context, branchId);
    const [branch] = await db.select({ id: tenantBranches.id }).from(tenantBranches)
      .where(and(eq(tenantBranches.id, branchId), eq(tenantBranches.tenantId, context.tenantId), eq(tenantBranches.active, true))).limit(1);
    if (!branch) throw new Error("La sucursal no está disponible.");
    const [terminal] = await db.insert(posTerminals).values({
      tenantId: context.tenantId, branchId,
      inventoryLocationId: typeof payload.inventoryLocationId === "string" && payload.inventoryLocationId ? payload.inventoryLocationId : null,
      code: requiredString(payload.code, "El código").toUpperCase(),
      name: requiredString(payload.name, "El nombre"),
      receiptPrefix: (typeof payload.receiptPrefix === "string" && payload.receiptPrefix.trim() ? payload.receiptPrefix.trim() : "POS").toUpperCase(),
    }).returning();
    return NextResponse.json({ success: true, data: terminal }, { status: 201 });
  } catch (error) { return createPOSApiErrorResponse(error, "No fue posible crear la terminal POS."); }
}
