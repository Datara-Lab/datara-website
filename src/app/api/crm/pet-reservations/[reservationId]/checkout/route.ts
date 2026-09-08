import { getActiveCRMBranch } from "@/lib/crm/active-branch";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getPOSApiContext, assertPOSBranchAccess, POSApiError } from "@/lib/pos/api-context";
import { posCashSessions, posTerminals } from "@/db/schema";
import { PgDialect } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { petReservations, tenantBranches } from "@/db/schema";
import { createPetApiErrorResponse, getOptionalString, getPetApiContext, PetApiError } from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission } from "@/lib/crm/permissions";
import { getPetCheckoutOptions } from "@/lib/crm/pet-checkout-options";
import { POST as completeLegacyCheckout } from "@/lib/crm/legacy-pet-checkout";

type RouteContext = { params: Promise<{ reservationId: string }> };

const serviceModules: Record<string, string> = {
  veterinary: "pet-veterinary", grooming: "pet-grooming",
  daycare: "pet-stays", boarding: "pet-stays",
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    const { reservationId } = await context.params;
    const legacyRequest = request.clone();
    const payload = await request.json() as Record<string, unknown>;
    const paymentMethod = getOptionalString(payload.paymentMethod);
    const paymentReference = getOptionalString(payload.paymentReference);

    const [reservation] = await db.select({
      branchId: petReservations.branchId,
      id: petReservations.id, customerId: petReservations.customerId,
      serviceType: petReservations.serviceType, status: petReservations.status,
      startsAt: petReservations.startsAt, checkedInAt: petReservations.checkedInAt,
      petId: petReservations.petId,
      packageAccountId: petReservations.packageAccountId,
      metadata:
        petReservations.metadata,
      timezone: tenantBranches.timezone,
      branchMetadata: tenantBranches.metadata,
    }).from(petReservations)
      .leftJoin(tenantBranches, and(eq(tenantBranches.id, petReservations.branchId), eq(tenantBranches.tenantId, petReservations.tenantId)))
      .where(and(
      eq(petReservations.id, reservationId), eq(petReservations.tenantId, tenantId),
    )).limit(1);
    if (!reservation) throw new PetApiError("La reservación no existe.", 404);
    if (!["daycare", "boarding"].includes(reservation.serviceType)) return completeLegacyCheckout(legacyRequest, context);
    await getActiveCRMBranch(tenantId, userId, reservation.branchId);
    const moduleId = serviceModules[reservation.serviceType];
    if (!moduleId) throw new PetApiError("El servicio de la reservación no es válido.", 409);
    await Promise.all([
      requireCRMModulePermission(tenantId, userId, moduleId, "edit"),
      requireCRMModulePermission(tenantId, userId, "sales-orders", "create"),
    ]);
    if (!["checked_in", "checked_out"].includes(reservation.status)) {
      throw new PetApiError("La mascota debe tener check-in antes de registrar su salida.", 409);
    }

    if (reservation.status !== "checked_in") throw new PetApiError("La salida ya fue registrada. Actualiza la lista para consultar su orden.", 409);
    if (reservation.packageAccountId) throw new PetApiError("Esta estancia tiene un paquete previamente asignado. Requiere revisión antes de usar el nuevo checkout.", 409);
    const alternatives = await getPetCheckoutOptions(tenantId, reservation);
    const choice = alternatives.options.find((option) => option.id === payload.optionId);
    if (!choice) throw new PetApiError("Selecciona una opción vigente en Revisar salida. Si cambió el tiempo, saldo o tarifa, vuelve a abrir la salida.", 409);
    const billing = choice.billing;
    const { billableHours, packageUnits } = billing;
    const selectedPackageAccountId = choice.packageAccount?.id ?? null;
    const shouldRedeemPackage = Boolean(selectedPackageAccountId);
    const quote = choice.quote;
    if (quote && quote.total > 0 && !["cash", "card", "transfer", "other"].includes(paymentMethod ?? "")) {
      throw new PetApiError("Selecciona un método de pago válido.", 400);
    }

    let cashSession: { id: string; terminalId: string; receiptPrefix: string } | null = null;
    const totalToPay = quote?.total ?? 0;
    const tenderedAmount = paymentMethod === "cash" ? Number(payload.tenderedAmount ?? totalToPay) : totalToPay;
    if (totalToPay > 0) {
      if (quote?.currency.toLowerCase() !== "mxn") throw new PetApiError("La caja POS admite cobros en MXN.", 409);
      if (!Number.isFinite(tenderedAmount) || tenderedAmount < totalToPay) throw new PetApiError("El efectivo recibido no cubre el cobro.", 400);
      const posContext = await getPOSApiContext("pos-terminal", "create");
      if (posContext.tenantId !== tenantId || !reservation.branchId) throw new PetApiError("La caja no corresponde a la empresa activa.", 403);
      assertPOSBranchAccess(posContext, reservation.branchId);
      const selectedCashSessionId = getOptionalString(payload.cashSessionId);
      if (!selectedCashSessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedCashSessionId)) throw new PetApiError("Selecciona una caja abierta de esta sucursal.", 400);
      const [session] = await db.select({ id: posCashSessions.id, terminalId: posCashSessions.terminalId, receiptPrefix: posTerminals.receiptPrefix })
        .from(posCashSessions).innerJoin(posTerminals, and(eq(posTerminals.id, posCashSessions.terminalId), eq(posTerminals.tenantId, tenantId)))
        .where(and(eq(posCashSessions.tenantId, tenantId), eq(posCashSessions.id, selectedCashSessionId),
          eq(posCashSessions.status, "open"), eq(posTerminals.branchId, reservation.branchId), eq(posTerminals.status, "active"))).limit(1);
      if (!session) throw new PetApiError("Selecciona una caja abierta de la sucursal activa.", 409);
      cashSession = session;
    }
    const user = await currentUser();
    const actorName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
      || user?.emailAddresses[0]?.emailAddress || "Usuario";
    const salesOrderId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();
    const posTransactionId = crypto.randomUUID();
    const receiptNumber = `${cashSession?.receiptPrefix ?? "POS"}-${Date.now().toString(36).toUpperCase()}-${posTransactionId.slice(0, 8).toUpperCase()}`;
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

    const statement = sql`
      WITH locked_cash_session AS MATERIALIZED (
        SELECT session.id, session.terminal_id FROM pos_cash_sessions session
        JOIN pos_terminals terminal ON terminal.id = session.terminal_id AND terminal.tenant_id = session.tenant_id
        WHERE session.tenant_id = ${tenantId} AND session.id = ${cashSession?.id ?? null}::uuid
          AND session.status = 'open' AND terminal.status = 'active' AND terminal.branch_id = ${reservation.branchId}::uuid
        FOR UPDATE OF session, terminal
      ), locked_reservation AS MATERIALIZED (
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
          jsonb_build_object('billableHours', ${billableHours}::int, 'billing', ${JSON.stringify(billing)}::jsonb), ${userId}, NOW()
        FROM package_balance
        WHERE ${shouldRedeemPackage} = true
          AND available >= ${packageUnits}
          AND NOT EXISTS (SELECT 1 FROM existing_redemption)
          AND EXISTS (SELECT 1 FROM locked_reservation WHERE status = 'checked_in')
          AND (${totalToPay}::numeric = 0 OR EXISTS (SELECT 1 FROM locked_cash_session))
          AND NOT EXISTS (SELECT 1 FROM crm_sales_orders WHERE tenant_id = ${tenantId} AND metadata->>'petReservationId' = ${reservationId})
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
          jsonb_build_object('sourceType', 'pet_checkout', 'petReservationId', ${reservationId}::text,
            'billableHours', ${billableHours}::int, 'packageUnits', ${packageUnits}::int,
            'coveredByPackage', ${Boolean(selectedPackageAccountId)}::boolean,
            'petPackageAccountId', ${selectedPackageAccountId}::text, 'billing', ${JSON.stringify(billing)}::jsonb), NOW(), NOW()
        FROM locked_reservation reservation
        WHERE reservation.status = 'checked_in' AND NOT EXISTS (SELECT 1 FROM existing_order)
          AND (${totalToPay}::numeric = 0 OR EXISTS (SELECT 1 FROM locked_cash_session))
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
          jsonb_build_object('sourceType', 'pet_checkout', 'petReservationId', ${reservationId}::text), NOW(), NOW()
        FROM created_order
        CROSS JOIN jsonb_to_recordset(${JSON.stringify(serializedLines)}::jsonb) AS item(
          "productId" text, name text, description text, quantity int,
          "unitPrice" numeric, "totalAmount" numeric, position int
        )
        RETURNING id
      ), created_pos_transaction AS (
        INSERT INTO pos_transactions (
          id, tenant_id, terminal_id, cash_session_id, sales_order_id, receipt_number, status, source_product,
          source_type, source_id, subtotal_amount, total_amount, currency, cashier_clerk_user_id, cashier_name, completed_at, metadata
        )
        SELECT ${posTransactionId}, ${tenantId}, session.terminal_id, session.id, created_order.id, ${receiptNumber}, 'paid', 'crm',
          'pet_checkout', ${reservationId}::text, ${String(total)}, ${String(total)}, ${currency}, ${userId}, ${actorName}, NOW(),
          jsonb_build_object('petReservationId', ${reservationId}::text)
        FROM created_order, locked_cash_session session WHERE ${String(total)}::numeric > 0
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
          NOW(), ${userId}, 'datara_pos', ${posTransactionId},
          jsonb_build_object('petReservationId', ${reservationId}::text, 'posTransactionId', ${posTransactionId}::text, 'tenderedAmount', ${tenderedAmount}::numeric, 'billableHours', ${billableHours}::int, 'billing', ${JSON.stringify(billing)}::jsonb), NOW(), NOW()
        FROM created_order, locked_reservation reservation
        WHERE ${String(total)}::numeric > 0
        RETURNING id
      ), created_cash_movement AS (
        INSERT INTO pos_cash_movements (
          tenant_id, cash_session_id, transaction_id, payment_id, movement_type, direction, amount, currency, reason,
          performed_by_clerk_user_id, performed_by_name
        )
        SELECT ${tenantId}, ${cashSession?.id ?? null}::uuid, transaction.id, payment.id, 'sale', 'in', ${String(total)}, ${currency},
          ${"Estancia " + receiptNumber}, ${userId}, ${actorName}
        FROM created_pos_transaction transaction, created_payment payment
        WHERE ${paymentMethod} = 'cash' AND ${String(total)}::numeric > 0
        RETURNING id
      ), completed_checkout AS (
        UPDATE pet_reservations reservation
        SET status = 'checked_out', service_type = ${alternatives.serviceType}, checked_out_at = COALESCE(checked_out_at, NOW()),
          ends_at = COALESCE(ends_at, NOW()),
          package_account_id = COALESCE(package_account_id, ${selectedPackageAccountId}::uuid),
          reserved_units = CASE WHEN ${selectedPackageAccountId}::uuid IS NULL THEN reservation.reserved_units ELSE ${packageUnits} END,
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
    `;
    const query = new PgDialect().sqlToQuery(statement);
    const results = await db.$client.transaction([db.$client.query(query.sql, query.params)], { isolationLevel: "Serializable", fullResults: true });
    const checkout = results[0].rows[0] as { salesOrderId: string; reference: string; paymentId: string | null; totalAmount: string; currency: string } | undefined;
    if (!checkout) throw new PetApiError("No fue posible crear la orden de salida.", 409);
    return NextResponse.json({
      success: true,
      data: {
        ...checkout,
        posTransactionId: total > 0 ? posTransactionId : null,
        receiptNumber: total > 0 ? receiptNumber : null,
        changeAmount: total > 0 ? Math.max(0, tenderedAmount - total) : 0,
        totalAmount: Number(checkout.totalAmount),
        ...billing,
        coveredByPackage: Boolean(selectedPackageAccountId),
        packageAccountId: selectedPackageAccountId,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof POSApiError) return NextResponse.json({success:false,error:error.message},{status:error.status});
    if (error && typeof error === "object" && "code" in error && error.code === "40001") {
      return NextResponse.json({ success: false, error: "Otro movimiento actualizó la estancia o el saldo. Vuelve a revisar la salida antes de confirmar." }, { status: 409 });
    }
    return createPetApiErrorResponse(error, "No fue posible registrar el cobro y check-out.");
  }
}
