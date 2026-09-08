import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { crmCustomers, crmPets, crmProducts, crmProductTypes, crmSalesOrderItems, petPackageAccounts, petPackageLedgerEntries, posTransactions } from "@/db/schema";
import { purchasePetPackageUnits } from "@/lib/crm/pet-package-ledger";
import { createPetApiErrorResponse, getOptionalString, getPetApiContext, getRequiredString, PetApiError } from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission } from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId } = await getPetApiContext("contacts", "view");
    const records = await db.select({
      id: petPackageAccounts.id, customerId: petPackageAccounts.customerId,
      petId: petPackageAccounts.petId, productId: petPackageAccounts.productId,
      tutorName: sql<string>`COALESCE(NULLIF(${crmCustomers.companyName}, ''), CONCAT_WS(' ', ${crmCustomers.name}, ${crmCustomers.lastName}))`,
      petName: crmPets.name,
      productName: crmProducts.name,
      name: petPackageAccounts.name, serviceType: petPackageAccounts.serviceType,
      unitType: petPackageAccounts.unitType, purchasedUnits: petPackageAccounts.purchasedUnits,
      validFrom: petPackageAccounts.validFrom, validUntil: petPackageAccounts.validUntil,
      status: petPackageAccounts.status, transferableBetweenPets: petPackageAccounts.transferableBetweenPets,
      available: sql<number>`COALESCE(SUM(${petPackageLedgerEntries.availableDelta}), 0)::int`,
      reserved: sql<number>`COALESCE(SUM(${petPackageLedgerEntries.reservedDelta}), 0)::int`,
      consumed: sql<number>`COALESCE(SUM(${petPackageLedgerEntries.consumedDelta}), 0)::int`,
      metadata: petPackageAccounts.metadata,
    }).from(petPackageAccounts)
      .innerJoin(crmCustomers, and(eq(crmCustomers.id, petPackageAccounts.customerId), eq(crmCustomers.tenantId, petPackageAccounts.tenantId)))
      .leftJoin(crmPets, and(eq(crmPets.id, petPackageAccounts.petId), eq(crmPets.tenantId, petPackageAccounts.tenantId)))
      .leftJoin(crmProducts, and(eq(crmProducts.id, petPackageAccounts.productId), eq(crmProducts.tenantId, petPackageAccounts.tenantId)))
      .leftJoin(petPackageLedgerEntries, and(
      eq(petPackageLedgerEntries.packageAccountId, petPackageAccounts.id),
      eq(petPackageLedgerEntries.tenantId, petPackageAccounts.tenantId),
    )).where(eq(petPackageAccounts.tenantId, tenantId)).groupBy(petPackageAccounts.id, crmCustomers.id, crmPets.id, crmProducts.id)
      .orderBy(desc(petPackageAccounts.createdAt));
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return createPetApiErrorResponse(error, "No fue posible consultar los paquetes.");
  }
}

export async function POST(request: Request) {
  let createdAccountId: string | null = null;
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    const payload = await request.json() as Record<string, unknown>;
    const customerId = getRequiredString(payload.customerId, "El tutor");
    const petId = getOptionalString(payload.petId);
    const productId = getRequiredString(payload.productId, "El paquete del catálogo");
    const posTransactionId = getRequiredString(payload.posTransactionId, "La venta del POS");
    await requireCRMModulePermission(tenantId, userId, "pet-stays", "create");
    const [customer] = await db.select({ id: crmCustomers.id }).from(crmCustomers)
      .where(and(eq(crmCustomers.id, customerId), eq(crmCustomers.tenantId, tenantId))).limit(1);
    if (!customer) throw new PetApiError("El tutor seleccionado no pertenece a la empresa.", 400);
    if (petId) {
      const [pet] = await db.select({ id: crmPets.id }).from(crmPets).where(and(
        eq(crmPets.id, petId), eq(crmPets.tenantId, tenantId), eq(crmPets.customerId, customerId),
      )).limit(1);
      if (!pet) throw new PetApiError("La mascota seleccionada no pertenece al tutor.", 400);
    }
    const [paidItem] = await db.select({
      transactionId: posTransactions.id,
      salesOrderId: posTransactions.salesOrderId,
      productId: crmProducts.id,
      productName: crmProducts.name,
      productCategory: crmProducts.category,
      productMetadata: crmProducts.metadata,
      productTypeKey: crmProductTypes.key,
    }).from(posTransactions)
      .innerJoin(crmSalesOrderItems, eq(crmSalesOrderItems.salesOrderId, posTransactions.salesOrderId))
      .innerJoin(crmProducts, eq(crmProducts.id, crmSalesOrderItems.productId))
      .leftJoin(crmProductTypes, eq(crmProductTypes.id, crmProducts.productTypeId))
      .where(and(
        eq(posTransactions.id, posTransactionId),
        eq(posTransactions.tenantId, tenantId),
        eq(posTransactions.status, "paid"),
        eq(crmSalesOrderItems.productId, productId),
      )).limit(1);
    if (!paidItem) throw new PetApiError("Primero cobra el paquete en una caja abierta.", 409);
    if (paidItem.productTypeKey !== "stay_package") throw new PetApiError("El producto cobrado no está configurado como paquete de estancias.", 400);
    const [existing] = await db.select({ id: petPackageAccounts.id }).from(petPackageAccounts).where(and(
      eq(petPackageAccounts.tenantId, tenantId),
      sql`${petPackageAccounts.metadata}->>'posTransactionId' = ${posTransactionId}`,
    )).limit(1);
    if (existing) return NextResponse.json({ success: true, data: { id: existing.id, idempotent: true } });
    const technical = (paidItem.productMetadata?.technicalSpecifications ?? {}) as Record<string, unknown>;
    const serviceMap: Record<string, string> = { "Guardería": "daycare", "Pensión": "boarding", "Ambos": "mixed" };
    const unitMap: Record<string, string> = { "Día": "day", "Noche": "night", "Acceso": "access" };
    const serviceType = serviceMap[String(paidItem.productCategory ?? "")];
    const configuredUnitType = unitMap[String(technical.packageUnitType ?? "")];
    const unitType = serviceType === "boarding" ? "night" : configuredUnitType;
    const purchasedUnits = Number(technical.includedUnits);
    const validityDays = technical.validityDays === "" || technical.validityDays == null ? null : Number(technical.validityDays);
    if (!serviceType || !unitType || !Number.isInteger(purchasedUnits) || purchasedUnits <= 0) throw new PetApiError("Completa la configuración del paquete en Productos y servicios.", 409);
    if (serviceType === "daycare" && !["day", "access"].includes(unitType)) throw new PetApiError("Guardería solamente puede descontar días o accesos.", 409);
    if (validityDays !== null && (!Number.isInteger(validityDays) || validityDays <= 0)) throw new PetApiError("La vigencia configurada para el paquete no es válida.", 409);
    const validUntil = validityDays === null ? null : new Date(Date.now() + validityDays * 86_400_000);
    const includedHours = Number(technical.includedHours || 5);
    if (!Number.isFinite(includedHours) || includedHours <= 0) throw new PetApiError("Las horas incluidas deben ser mayores a cero.", 409);
    const billingPolicy = {
      includedHours,
      overagePolicy:
        technical.overagePolicy === "Cobrar el excedente"
          ? "cash"
          : "extra_units",
    };
    const [created] = await db.insert(petPackageAccounts).values({
      tenantId, customerId, petId, productId, name: paidItem.productName,
      serviceType, unitType, purchasedUnits, validUntil,
      transferableBetweenPets: String(technical.transferableBetweenPets) === "Sí",
      metadata: { posTransactionId, salesOrderId: paidItem.salesOrderId, source: "paid_pos_sale", billingPolicy }, updatedAt: new Date(),
    }).returning({ id: petPackageAccounts.id });
    if (!created) throw new Error("No fue posible crear la cuenta del paquete.");
    createdAccountId = created.id;
    const movement = await purchasePetPackageUnits({
      tenantId, packageAccountId: created.id, units: purchasedUnits,
      idempotencyKey: `pet-package:${created.id}:purchase`, createdByClerkUserId: userId,
      metadata: { source: "paid_pos_sale", posTransactionId, salesOrderId: paidItem.salesOrderId },
    });
    if (!movement.applied && !movement.idempotent) throw new Error("No fue posible acreditar las unidades del paquete.");
    return NextResponse.json({ success: true, data: { id: created.id, ...movement } }, { status: 201 });
  } catch (error) {
    if (createdAccountId) {
      try {
        await db.delete(petPackageAccounts).where(eq(petPackageAccounts.id, createdAccountId));
      } catch (compensationError) {
        console.error("No fue posible revertir la cuenta de paquete incompleta:", compensationError);
      }
    }
    return createPetApiErrorResponse(error, "No fue posible crear el paquete.");
  }
}
