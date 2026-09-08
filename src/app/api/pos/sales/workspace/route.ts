import { and, asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { crmProducts, posCashSessions, posTerminals } from "@/db/schema";
import { assertPOSBranchAccess, createPOSApiErrorResponse, getPOSApiContext, POSApiError } from "@/lib/pos/api-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const context = await getPOSApiContext("pos-terminal", "view");
    const terminalId = new URL(request.url).searchParams.get("terminalId")?.trim();
    if (!terminalId) throw new POSApiError("Selecciona una terminal.");
    const [terminal] = await db.select({ id: posTerminals.id, branchId: posTerminals.branchId })
      .from(posTerminals)
      .where(and(eq(posTerminals.id, terminalId), eq(posTerminals.tenantId, context.tenantId), eq(posTerminals.status, "active")))
      .limit(1);
    if (!terminal) throw new POSApiError("La terminal no está disponible.", 404);
    assertPOSBranchAccess(context, terminal.branchId);

    const products = await db.select({
      id: crmProducts.id,
      code: crmProducts.code,
      name: crmProducts.name,
      description: crmProducts.description,
      itemType: crmProducts.itemType,
      category: crmProducts.category,
      unitPrice: crmProducts.unitPrice,
      currency: crmProducts.currency,
    }).from(crmProducts)
      .where(and(eq(crmProducts.tenantId, context.tenantId), eq(crmProducts.active, true)))
      .orderBy(asc(crmProducts.name));

    const pending = await db.execute<{
      id: string; reference: string; customerName: string; totalAmount: string;
      currency: string; createdAt: string; sourceType: string | null;
      paidAmount: string; items: unknown;
    }>(sql`
      SELECT sales_order.id, sales_order.reference,
        sales_order.customer_name AS "customerName",
        sales_order.total_amount AS "totalAmount",
        sales_order.currency, sales_order.created_at AS "createdAt",
        sales_order.metadata->>'sourceType' AS "sourceType",
        COALESCE(SUM(payment.amount) FILTER (WHERE payment.status = 'received'), 0) AS "paidAmount",
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'id', item.id, 'productId', item.product_id, 'name', item.name,
            'quantity', item.quantity, 'unitPrice', item.unit_price,
            'totalAmount', item.total_amount
          ) ORDER BY item.position)
          FROM crm_sales_order_items item WHERE item.sales_order_id = sales_order.id),
          '[]'::jsonb
        ) AS items
      FROM crm_sales_orders sales_order
      LEFT JOIN commercial_payments payment ON payment.sales_order_id = sales_order.id
      WHERE sales_order.tenant_id = ${context.tenantId}
        AND sales_order.branch_id = ${terminal.branchId}
        AND sales_order.status NOT IN ('Cancelada', 'Entregada')
        AND NOT EXISTS (
          SELECT 1 FROM pos_transactions transaction
          WHERE transaction.tenant_id = ${context.tenantId}
            AND transaction.sales_order_id = sales_order.id
            AND transaction.status = 'paid'
        )
      GROUP BY sales_order.id
      HAVING COALESCE(SUM(payment.amount) FILTER (WHERE payment.status = 'received'), 0) < sales_order.total_amount
      ORDER BY sales_order.created_at
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      data: {
        products: products.map((product) => ({ ...product, unitPrice: Number(product.unitPrice) })),
        orders: pending.rows.map((order) => ({
          ...order,
          totalAmount: Number(order.totalAmount),
          paidAmount: Number(order.paidAmount),
          items: order.items,
        })),
      },
    });
  } catch (error) {
    return createPOSApiErrorResponse(error, "No fue posible preparar el espacio de venta.");
  }
}
