import { currentUser } from "@clerk/nextjs/server";
import { and, eq, sum } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { crmProducts, crmSalesOrderItems, crmSalesOrders, posCashMovements, posCashSessions, posTerminals, posTransactions, commercialPayments } from "@/db/schema";
import { assertPOSBranchAccess, createPOSApiErrorResponse, getPOSApiContext, money, POSApiError } from "@/lib/pos/api-context";

type CheckoutItem = { productId: string; quantity: number };
type PaymentInput = { method: "cash" | "card" | "transfer" | "other"; amount: number; tenderedAmount?: number; reference?: string };

function paymentLabel(method: PaymentInput["method"]) {
  return { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otro" }[method];
}

export async function POST(request: Request) {
  try {
    const context = await getPOSApiContext("pos-terminal", "create");
    const payload = await request.json() as Record<string, unknown>;
    const cashSessionId = typeof payload.cashSessionId === "string" ? payload.cashSessionId : "";
    const existingSalesOrderId = typeof payload.salesOrderId === "string" && payload.salesOrderId ? payload.salesOrderId : null;
    const customerName = typeof payload.customerName === "string" && payload.customerName.trim() ? payload.customerName.trim() : "Público general";
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const rawPayments = Array.isArray(payload.payments) ? payload.payments : [];
    if (!cashSessionId) throw new POSApiError("Abre una caja antes de cobrar.");

    const [session] = await db.select({ id: posCashSessions.id, terminalId: posCashSessions.terminalId, branchId: posTerminals.branchId, receiptPrefix: posTerminals.receiptPrefix })
      .from(posCashSessions).innerJoin(posTerminals, eq(posCashSessions.terminalId, posTerminals.id))
      .where(and(eq(posCashSessions.id, cashSessionId), eq(posCashSessions.tenantId, context.tenantId), eq(posCashSessions.status, "open")))
      .limit(1);
    if (!session) throw new POSApiError("La sesión de caja no está abierta.", 409);
    assertPOSBranchAccess(context, session.branchId);

    const payments: PaymentInput[] = rawPayments.map((record) => {
      const value = record as Record<string, unknown>;
      const method = typeof value.method === "string" ? value.method : "";
      if (!(["cash", "card", "transfer", "other"] as string[]).includes(method)) throw new POSApiError("Selecciona un método de pago válido.");
      const amount = money(value.amount, "El importe del pago");
      if (amount <= 0) throw new POSApiError("Cada pago debe ser mayor que cero.");
      const tenderedAmount = method === "cash" ? money(value.tenderedAmount ?? amount, "El efectivo recibido") : undefined;
      if (tenderedAmount !== undefined && tenderedAmount < amount) throw new POSApiError("El efectivo recibido no cubre el importe.");
      return { method: method as PaymentInput["method"], amount, tenderedAmount, reference: typeof value.reference === "string" ? value.reference.trim() : undefined };
    });
    if (payments.length === 0) throw new POSApiError("Agrega al menos un método de pago.");

    let salesOrderId = existingSalesOrderId;
    let totalAmount = 0;
    let orderReference = "";
    let sourceProduct = "pos";
    let sourceType = "direct_sale";
    let sourceId: string | null = null;

    if (salesOrderId) {
      const [order] = await db.select({ id: crmSalesOrders.id, reference: crmSalesOrders.reference, totalAmount: crmSalesOrders.totalAmount, branchId: crmSalesOrders.branchId, metadata: crmSalesOrders.metadata })
        .from(crmSalesOrders).where(and(eq(crmSalesOrders.id, salesOrderId), eq(crmSalesOrders.tenantId, context.tenantId))).limit(1);
      if (!order) throw new POSApiError("La orden de venta ya no está disponible.", 404);
      if (order.branchId && order.branchId !== session.branchId) throw new POSApiError("La orden pertenece a otra sucursal.", 409);
      const [paymentSummary] = await db.select({ paidAmount: sum(commercialPayments.amount) })
        .from(commercialPayments)
        .where(and(
          eq(commercialPayments.tenantId, context.tenantId),
          eq(commercialPayments.salesOrderId, order.id),
          eq(commercialPayments.status, "received"),
        ));
      totalAmount = Math.round((Number(order.totalAmount) - Number(paymentSummary?.paidAmount ?? 0)) * 100) / 100;
      if (totalAmount <= 0) throw new POSApiError("La orden ya está pagada.", 409);
      orderReference = order.reference;
      sourceProduct = typeof order.metadata.sourceProduct === "string" ? order.metadata.sourceProduct : "crm";
      sourceType = typeof order.metadata.sourceType === "string" ? order.metadata.sourceType : "sales_order";
      sourceId = typeof order.metadata.sourceId === "string" ? order.metadata.sourceId : order.id;
    } else {
      const items: CheckoutItem[] = rawItems.map((record) => {
        const value = record as Record<string, unknown>;
        const productId = typeof value.productId === "string" ? value.productId : "";
        const quantity = Number(value.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity <= 0) throw new POSApiError("Revisa los productos y cantidades de la venta.");
        return { productId, quantity };
      });
      if (items.length === 0) throw new POSApiError("Agrega al menos un producto.");
      const productIds = [...new Set(items.map((item) => item.productId))];
      const records = await db.select({ id: crmProducts.id, name: crmProducts.name, description: crmProducts.description, unitPrice: crmProducts.unitPrice, currency: crmProducts.currency })
        .from(crmProducts).where(and(eq(crmProducts.tenantId, context.tenantId), eq(crmProducts.active, true)));
      const byId = new Map(records.filter((record) => productIds.includes(record.id)).map((record) => [record.id, record]));
      if (byId.size !== productIds.length) throw new POSApiError("Uno de los productos ya no está disponible.", 409);
      const currencies = new Set(items.map((item) => byId.get(item.productId)?.currency));
      if (currencies.size !== 1 || !currencies.has("mxn")) throw new POSApiError("Esta versión del POS solamente admite ventas en MXN.");
      const pricedItems = items.map((item, position) => {
        const product = byId.get(item.productId)!;
        const unitPrice = Number(product.unitPrice);
        return { ...item, position, name: product.name, description: product.description, unitPrice, totalAmount: Math.round(unitPrice * item.quantity * 100) / 100 };
      });
      totalAmount = pricedItems.reduce((total, item) => total + item.totalAmount, 0);
      salesOrderId = crypto.randomUUID();
      orderReference = `POS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${salesOrderId.slice(0, 8).toUpperCase()}`;
      await db.insert(crmSalesOrders).values({ id: salesOrderId, tenantId: context.tenantId, branchId: session.branchId, reference: orderReference, status: "Confirmada", customerName, currency: "mxn", baseAmount: String(totalAmount), totalAmount: String(totalAmount), paymentMethod: payments.map((payment) => paymentLabel(payment.method)).join(" + "), createdByClerkUserId: context.userId, metadata: { sourceProduct: "pos", sourceType: "direct_sale" } });
      await db.insert(crmSalesOrderItems).values(pricedItems.map((item) => ({ tenantId: context.tenantId, salesOrderId: salesOrderId!, productId: item.productId, name: item.name, description: item.description, quantity: item.quantity, unitPrice: String(item.unitPrice), totalAmount: String(item.totalAmount), position: item.position })));
    }

    const paymentTotal = Math.round(payments.reduce((total, payment) => total + payment.amount, 0) * 100) / 100;
    if (paymentTotal !== Math.round(totalAmount * 100) / 100) throw new POSApiError(`Los pagos deben sumar ${totalAmount.toFixed(2)}.`);
    const user = await currentUser();
    const cashierName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.emailAddresses[0]?.emailAddress || "Usuario";
    const transactionId = crypto.randomUUID();
    const receiptNumber = `${session.receiptPrefix}-${Date.now().toString(36).toUpperCase()}-${transactionId.slice(0, 4).toUpperCase()}`;
    if (!salesOrderId) throw new POSApiError("No fue posible resolver la orden de venta.", 500);
    const resolvedSalesOrderId = salesOrderId;
    const [transaction] = await db.insert(posTransactions).values({ id: transactionId, tenantId: context.tenantId, terminalId: session.terminalId, cashSessionId, salesOrderId: resolvedSalesOrderId, receiptNumber, status: "paid", sourceProduct, sourceType, sourceId, subtotalAmount: String(totalAmount), totalAmount: String(totalAmount), currency: "mxn", cashierClerkUserId: context.userId, cashierName, completedAt: new Date(), metadata: { customerName } }).returning();
    const paymentRows = await db.insert(commercialPayments).values(payments.map((payment) => ({ tenantId: context.tenantId, branchId: session.branchId, salesOrderId: resolvedSalesOrderId, paymentType: "payment", status: "received", amount: String(payment.amount), currency: "mxn", paymentMethod: paymentLabel(payment.method), reference: payment.reference || receiptNumber, receivedByClerkUserId: context.userId, externalSystem: "datara_pos", externalId: `${transactionId}:${payment.method}:${crypto.randomUUID()}`, metadata: { posTransactionId: transactionId, tenderedAmount: payment.tenderedAmount ?? payment.amount } }))).returning();
    const cashPaymentIndex = payments.findIndex((payment) => payment.method === "cash");
    if (cashPaymentIndex >= 0) {
      const cashPayment = payments[cashPaymentIndex];
      await db.insert(posCashMovements).values({ tenantId: context.tenantId, cashSessionId, transactionId, paymentId: paymentRows[cashPaymentIndex]?.id, movementType: "sale", direction: "in", amount: String(cashPayment.amount), currency: "mxn", reason: `Venta ${receiptNumber}`, performedByClerkUserId: context.userId, performedByName: cashierName });
    }
    return NextResponse.json({ success: true, data: { id: transaction.id, receiptNumber, salesOrderId, orderReference, totalAmount, changeAmount: payments.reduce((total, payment) => total + Math.max(0, (payment.tenderedAmount ?? payment.amount) - payment.amount), 0) } }, { status: 201 });
  } catch (error) {
    return createPOSApiErrorResponse(error, "No fue posible completar la venta.");
  }
}
