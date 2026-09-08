import { currentUser } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { crmProducts, petPackageAccounts, petPackageLedgerEntries, petReservations, tenantBranches } from "@/db/schema";
import { createPetApiErrorResponse, getOptionalString, getPetApiContext, PetApiError } from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission } from "@/lib/crm/permissions";
import { calculatePetStayBilling, readPetStayBillingPolicy } from "@/lib/crm/pet-stay-billing";

type RouteContext = { params: Promise<{ reservationId: string }> };
type Rate = { id: string; name: string; duration: number; unitPrice: number; currency: string };
type ChargeLine = Rate & { quantity: number };

const serviceModules: Record<string, string> = {
  veterinary: "pet-veterinary", grooming: "pet-grooming",
  daycare: "pet-stays", boarding: "pet-stays",
};

function getDuration(metadata: Record<string, unknown>): number {
  const technical = metadata.technicalSpecifications;
  if (!technical || typeof technical !== "object" || Array.isArray(technical)) return 0;
  return Number((technical as Record<string, unknown>).durationHours);
}

function calculateQuote(rates: Rate[], targetHours: number): { lines: ChargeLine[]; total: number; currency: string; coveredHours: number } | null {
  if (rates.length === 0) return null;
  const currency = rates[0].currency;
  const options = rates.filter((rate) => rate.currency === currency);
  const limit = targetHours + Math.max(...options.map((rate) => rate.duration));
  const costs = Array<number>(limit + 1).fill(Number.POSITIVE_INFINITY);
  const choices = Array<number>(limit + 1).fill(-1);
  costs[0] = 0;
  for (let covered = 1; covered <= limit; covered += 1) {
    options.forEach((rate, index) => {
      const previous = covered - rate.duration;
      if (previous < 0) return;
      const candidate = costs[previous] + rate.unitPrice;
      if (candidate < costs[covered]) { costs[covered] = candidate; choices[covered] = index; }
    });
  }
  let bestHours = targetHours;
  for (let covered = targetHours; covered <= limit; covered += 1) {
    if (costs[covered] < costs[bestHours]) bestHours = covered;
  }
  if (!Number.isFinite(costs[bestHours])) return null;
  const quantities = new Map<number, number>();
  let remaining = bestHours;
  while (remaining > 0) {
    const index = choices[remaining];
    if (index < 0) return null;
    quantities.set(index, (quantities.get(index) ?? 0) + 1);
    remaining -= options[index].duration;
  }
  return {
    currency, coveredHours: bestHours, total: costs[bestHours],
    lines: [...quantities.entries()].map(([index, quantity]) => ({ ...options[index], quantity })),
  };
}

export async function POST(request: Pick<Request, "json">, context: RouteContext) {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    const { reservationId } = await context.params;
    const payload = await request.json() as Record<string, unknown>;
    const paymentMethod = getOptionalString(payload.paymentMethod);
    const paymentReference = getOptionalString(payload.paymentReference);

    const [reservation] = await db.select({
      id: petReservations.id, customerId: petReservations.customerId,
      serviceType: petReservations.serviceType, status: petReservations.status,
      startsAt: petReservations.startsAt, checkedInAt: petReservations.checkedInAt,
      petId: petReservations.petId,
      packageAccountId: petReservations.packageAccountId,
      timezone: tenantBranches.timezone,
    }).from(petReservations)
      .leftJoin(tenantBranches, and(eq(tenantBranches.id, petReservations.branchId), eq(tenantBranches.tenantId, petReservations.tenantId)))
      .where(and(
      eq(petReservations.id, reservationId), eq(petReservations.tenantId, tenantId),
    )).limit(1);
    if (!reservation) throw new PetApiError("La reservación no existe.", 404);
    const moduleId = serviceModules[reservation.serviceType];
    if (!moduleId) throw new PetApiError("El servicio de la reservación no es válido.", 409);
    await Promise.all([
      requireCRMModulePermission(tenantId, userId, moduleId, "edit"),
      requireCRMModulePermission(tenantId, userId, "sales-orders", "create"),
    ]);
    if (!["checked_in", "checked_out"].includes(reservation.status)) {
      throw new PetApiError("La mascota debe tener check-in antes de registrar su salida.", 409);
    }

    const startedAt = reservation.checkedInAt ?? reservation.startsAt;
    const checkoutAt = new Date();
    let billing = calculatePetStayBilling({
      startedAt, checkoutAt, serviceType: reservation.serviceType,
      unitType: reservation.serviceType === "boarding" ? "night" : "day",
      timezone: reservation.timezone ?? "America/Mexico_City", policy: readPetStayBillingPolicy(null),
    });
    let selectedPackageAccountId: string | null = null;
    const packageResult = await db.execute<{ id: string; available: number; metadata: Record<string, unknown>; unitType: string }>(sql`
        SELECT account.id, account.metadata, account.unit_type AS "unitType",
          COALESCE(SUM(entry.available_delta), 0)::int AS available
        FROM ${petPackageAccounts} account
        LEFT JOIN ${petPackageLedgerEntries} entry
          ON entry.tenant_id = account.tenant_id
          AND entry.package_account_id = account.id
        WHERE account.tenant_id = ${tenantId}
          AND account.customer_id = ${reservation.customerId}
          AND (account.pet_id IS NULL OR account.pet_id = ${reservation.petId})
          AND (account.pet_id = ${reservation.petId} OR account.transferable_between_pets = true)
          AND account.status = 'active'
          AND account.valid_from <= NOW()
          AND (account.valid_until IS NULL OR account.valid_until >= NOW())
          AND account.service_type IN (${reservation.serviceType}, 'mixed')
        GROUP BY account.id, account.pet_id, account.valid_until
        ORDER BY (account.pet_id = ${reservation.petId}) DESC,
          account.valid_until ASC NULLS LAST, account.created_at ASC
      `);
    for (const candidate of packageResult.rows) {
      const candidateBilling = calculatePetStayBilling({
        startedAt, checkoutAt, serviceType: reservation.serviceType, unitType: candidate.unitType,
        timezone: reservation.timezone ?? "America/Mexico_City",
        policy: readPetStayBillingPolicy(candidate.metadata?.billingPolicy),
      });
      if (candidate.available >= candidateBilling.packageUnits) {
        selectedPackageAccountId = candidate.id;
        billing = candidateBilling;
        break;
      }
    }
    const { billableHours, packageUnits } = billing;
    const shouldRedeemPackage = Boolean(selectedPackageAccountId && !reservation.packageAccountId);
    let quote: ReturnType<typeof calculateQuote> = null;
    if (!selectedPackageAccountId || billing.cashChargeHours > 0) {
      const expectedCategory = reservation.serviceType === "boarding" ? "pensión" : "guardería";
      const products = await db.select({
        id: crmProducts.id, name: crmProducts.name, category: crmProducts.category,
        unitPrice: crmProducts.unitPrice, currency: crmProducts.currency, metadata: crmProducts.metadata,
      }).from(crmProducts).where(and(eq(crmProducts.tenantId, tenantId), eq(crmProducts.active, true)));
      const rates = products.map((product) => ({
        id: product.id, name: product.name, duration: getDuration(product.metadata),
        unitPrice: Number(product.unitPrice), currency: product.currency,
        category: product.category?.trim().toLowerCase(),
      })).filter((product) => product.category === expectedCategory && Number.isInteger(product.duration)
        && product.duration > 0 && product.unitPrice >= 0);
      quote = calculateQuote(rates, selectedPackageAccountId ? billing.cashChargeHours : billableHours);
      if (!quote) throw new PetApiError("Configura al menos una tarifa horaria activa para completar el cobro.", 409);
      if (quote.total > 0 && !paymentMethod) throw new PetApiError("Selecciona el método de pago.", 400);
    }

    const user = await currentUser();
    const actorName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
      || user?.emailAddresses[0]?.emailAddress || "Usuario";
    const salesOrderId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();
    const now = new Date();
    const reference = `OV-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${salesOrderId.slice(0, 8).toUpperCase()}`;
    const chargeLines = quote?.lines ?? [{
      id: null, name: `Servicio cubierto por paquete (${packageUnits} ${packageUnits === 1 ? "unidad" : "unidades"})`, duration: billableHours,
      unitPrice: 0, currency: "mxn", quantity: 1,
    }];
    const total = quote?.total ?? 0;
    const currency = quote?.currency ?? "mxn";
    const serializedLines = chargeLines.map((line, index) => ({
      productId: line.id, name: line.name,
      description: `${line.duration} horas por bloque`, quantity: line.quantity,
      unitPrice: line.unitPrice, totalAmount: line.unitPrice * line.quantity, position: index + 1,
    }));

    const result = await db.execute<{
      salesOrderId: string; reference: string; paymentId: string | null; totalAmount: string; currency: string;
    }>(sql`
      WITH locked_reservation AS MATERIALIZED (
        SELECT reservation.*, customer.name, customer.last_name, customer.company_name,
          customer.email, customer.phone, customer.mobile
        FROM pet_reservations reservation
        JOIN crm_customers customer ON customer.tenant_id = reservation.tenant_id
          AND customer.id = reservation.customer_id
        WHERE reservation.tenant_id = ${tenantId} AND reservation.id = ${reservationId}
        FOR UPDATE OF reservation
      ), package_lock AS MATERIALIZED (
        SELECT CASE WHEN ${selectedPackageAccountId}::uuid IS NOT NULL
          THEN pg_advisory_xact_lock(hashtextextended(${selectedPackageAccountId}, 0)) END
      ), package_balance AS MATERIALIZED (
        SELECT COALESCE(SUM(entry.available_delta), 0)::int AS available
        FROM package_lock
        LEFT JOIN pet_package_ledger_entries entry
          ON entry.tenant_id = ${tenantId}
          AND entry.package_account_id = ${selectedPackageAccountId}::uuid
      ), existing_redemption AS MATERIALIZED (
        SELECT id FROM pet_package_ledger_entries, package_lock
        WHERE tenant_id = ${tenantId}
          AND idempotency_key = ${`pet-stay:${reservationId}:checkout-redeem`}
        LIMIT 1
      ), created_redemption AS (
        INSERT INTO pet_package_ledger_entries (
          tenant_id, package_account_id, reservation_id, entry_type,
          available_delta, reserved_delta, consumed_delta,
          idempotency_key, reason, metadata, created_by_clerk_user_id, created_at
        )
        SELECT ${tenantId}, ${selectedPackageAccountId}::uuid, ${reservationId}, 'redeem',
          ${-packageUnits}, 0, ${packageUnits},
          ${`pet-stay:${reservationId}:checkout-redeem`},
          'Unidades descontadas automáticamente al completar la salida.',
          jsonb_build_object('billableHours', ${billableHours}, 'billing', ${JSON.stringify(billing)}::jsonb), ${userId}, NOW()
        FROM package_balance
        WHERE ${shouldRedeemPackage} = true
          AND available >= ${packageUnits}
          AND NOT EXISTS (SELECT 1 FROM existing_redemption)
        RETURNING id
      ), existing_order AS MATERIALIZED (
        SELECT id, reference, total_amount, currency
        FROM crm_sales_orders
        WHERE tenant_id = ${tenantId} AND metadata->>'petReservationId' = ${reservationId}
        LIMIT 1
      ), created_order AS (
        INSERT INTO crm_sales_orders (
          id, tenant_id, branch_id, customer_id, reference, status,
          customer_name, customer_email, customer_phone, currency,
          base_amount, discount_amount, total_amount, payment_method, notes,
          created_by_clerk_user_id, created_by_name, confirmed_by_clerk_user_id,
          confirmed_by_name, confirmed_at, metadata, created_at, updated_at
        )
        SELECT ${salesOrderId}, ${tenantId}, reservation.branch_id, reservation.customer_id, ${reference}, 'Confirmada',
          COALESCE(NULLIF(reservation.company_name, ''), TRIM(CONCAT_WS(' ', reservation.name, reservation.last_name))),
          reservation.email, COALESCE(reservation.mobile, reservation.phone), ${currency},
          ${String(total)}, 0, ${String(total)}, ${paymentMethod}, 'Cobro generado desde check-out de Mascotas',
          ${userId}, ${actorName}, ${userId}, ${actorName}, NOW(),
          jsonb_build_object('sourceType', 'pet_checkout', 'petReservationId', ${reservationId},
            'billableHours', ${billableHours}, 'packageUnits', ${packageUnits},
            'coveredByPackage', ${Boolean(selectedPackageAccountId)},
            'petPackageAccountId', ${selectedPackageAccountId}, 'billing', ${JSON.stringify(billing)}::jsonb), NOW(), NOW()
        FROM locked_reservation reservation
        WHERE reservation.status = 'checked_in' AND NOT EXISTS (SELECT 1 FROM existing_order)
          AND (${Boolean(selectedPackageAccountId)} = false OR ${shouldRedeemPackage} = false
            OR EXISTS (SELECT 1 FROM created_redemption)
            OR EXISTS (SELECT 1 FROM existing_redemption))
        RETURNING id, reference, total_amount, currency
      ), effective_order AS (
        SELECT * FROM created_order
        UNION ALL SELECT * FROM existing_order WHERE NOT EXISTS (SELECT 1 FROM created_order)
      ), created_items AS (
        INSERT INTO crm_sales_order_items (
          id, tenant_id, sales_order_id, product_id, name, description,
          quantity, unit_price, discount_amount, total_amount, position, metadata, created_at, updated_at
        )
        SELECT gen_random_uuid(), ${tenantId}, created_order.id, item."productId"::uuid,
          item.name, item.description, item.quantity, item."unitPrice", 0,
          item."totalAmount", item.position,
          jsonb_build_object('sourceType', 'pet_checkout', 'petReservationId', ${reservationId}), NOW(), NOW()
        FROM created_order
        CROSS JOIN jsonb_to_recordset(${JSON.stringify(serializedLines)}::jsonb) AS item(
          "productId" text, name text, description text, quantity int,
          "unitPrice" numeric, "totalAmount" numeric, position int
        )
        RETURNING id
      ), created_payment AS (
        INSERT INTO commercial_payments (
          id, tenant_id, branch_id, deal_id, customer_id, sales_order_id,
          payment_type, status, amount, currency, payment_method, reference,
          received_at, received_by_clerk_user_id, external_system, external_id,
          metadata, created_at, updated_at
        )
        SELECT ${paymentId}, ${tenantId}, reservation.branch_id, NULL, reservation.customer_id,
          created_order.id, 'payment', 'received', ${String(total)}, ${currency}, ${paymentMethod}, ${paymentReference},
          NOW(), ${userId}, 'pet_checkout', ${reservationId},
          jsonb_build_object('petReservationId', ${reservationId}, 'billableHours', ${billableHours}, 'billing', ${JSON.stringify(billing)}::jsonb), NOW(), NOW()
        FROM created_order, locked_reservation reservation
        WHERE ${String(total)}::numeric > 0
        RETURNING id
      ), completed_checkout AS (
        UPDATE pet_reservations reservation
        SET status = 'checked_out', checked_out_at = COALESCE(checked_out_at, NOW()),
          ends_at = COALESCE(ends_at, NOW()),
          package_account_id = COALESCE(package_account_id, ${selectedPackageAccountId}::uuid),
          reserved_units = ${packageUnits},
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'salesOrderId', effective_order.id, 'salesOrderReference', effective_order.reference),
          updated_at = NOW()
        FROM effective_order
        WHERE reservation.tenant_id = ${tenantId} AND reservation.id = ${reservationId}
          AND reservation.status IN ('checked_in', 'checked_out')
        RETURNING reservation.id
      )
      SELECT effective_order.id AS "salesOrderId", effective_order.reference,
        (SELECT id FROM created_payment LIMIT 1) AS "paymentId",
        effective_order.total_amount AS "totalAmount", effective_order.currency
      FROM effective_order
      WHERE EXISTS (SELECT 1 FROM completed_checkout)
    `);
    const checkout = result.rows[0];
    if (!checkout) throw new PetApiError("No fue posible crear la orden de salida.", 409);
    return NextResponse.json({
      success: true,
      data: {
        ...checkout,
        totalAmount: Number(checkout.totalAmount),
        ...billing,
        coveredHours: quote?.coveredHours ?? billableHours,
        coveredByPackage: Boolean(selectedPackageAccountId),
        packageAccountId: selectedPackageAccountId,
      },
    }, { status: 201 });
  } catch (error) {
    return createPetApiErrorResponse(error, "No fue posible registrar el cobro y check-out.");
  }
}
