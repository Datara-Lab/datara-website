import { currentUser } from "@clerk/nextjs/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmProducts,
  crmServiceOrderItems,
  crmServiceOrders,
} from "@/db/schema";
import {
  createPetApiErrorResponse,
  getOptionalString,
  getPetApiContext,
  PetApiError,
} from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission } from "@/lib/crm/permissions";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { tenantId, userId } =
      await getPetApiContext(
        "pet-grooming",
        "edit",
      );
    const { id: serviceOrderId } =
      await context.params;
    const payload =
      (await request.json()) as Record<
        string,
        unknown
      >;
    const paymentMethod =
      getOptionalString(
        payload.paymentMethod,
      );
    const paymentReference =
      getOptionalString(
        payload.paymentReference,
      );
    const requestedServiceOrderIds = Array.isArray(payload.serviceOrderIds)
      ? payload.serviceOrderIds.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : [];
    const serviceOrderIds = Array.from(
      new Set([serviceOrderId, ...requestedServiceOrderIds]),
    );
    if (serviceOrderIds.length > 20) {
      throw new PetApiError(
        "Puedes cobrar hasta 20 servicios juntos.",
        400,
      );
    }

    await requireCRMModulePermission(
      tenantId,
      userId,
      "sales-orders",
      "create",
    );

    const serviceOrders = await db
      .select({
        id: crmServiceOrders.id,
        serviceType:
          crmServiceOrders.serviceType,
        status: crmServiceOrders.status,
        unitIdentifier:
          crmServiceOrders.unitIdentifier,
        customerId: crmServiceOrders.customerId,
        branchId: crmServiceOrders.branchId,
      })
      .from(crmServiceOrders)
      .where(
        and(
          inArray(crmServiceOrders.id, serviceOrderIds),
          eq(
            crmServiceOrders.tenantId,
            tenantId,
          ),
        ),
      );

    const serviceOrder = serviceOrders.find(
      (order) => order.id === serviceOrderId,
    );

    if (!serviceOrder) {
      throw new PetApiError(
        "La orden de Grooming no existe.",
        404,
      );
    }
    if (!serviceOrder.unitIdentifier) {
      throw new PetApiError(
        "La orden no está relacionada con una mascota.",
        409,
      );
    }
    if (serviceOrders.length !== serviceOrderIds.length) {
      throw new PetApiError(
        "Una de las órdenes seleccionadas ya no está disponible.",
        409,
      );
    }
    if (
      serviceOrders.some(
        (order) =>
          order.customerId !== serviceOrder.customerId ||
          order.branchId !== serviceOrder.branchId,
      )
    ) {
      throw new PetApiError(
        "Solo puedes agrupar servicios del mismo tutor y sucursal.",
        409,
      );
    }
    if (serviceOrders.some((order) => !order.unitIdentifier)) {
      throw new PetApiError(
        "Todas las órdenes deben estar relacionadas con una mascota.",
        409,
      );
    }
    if (
      serviceOrders.some(
        (order) =>
          !["Pendiente de cierre", "Completada"].includes(order.status),
      )
    ) {
      throw new PetApiError(
        "El servicio debe estar listo antes de registrar la entrega.",
        409,
      );
    }

    const catalogServices = await db
      .select({
        id: crmProducts.id,
        name: crmProducts.name,
        description:
          crmProducts.description,
        unitPrice:
          crmProducts.unitPrice,
        currency:
          crmProducts.currency,
      })
      .from(crmProducts)
      .where(
        and(
          eq(
            crmProducts.tenantId,
            tenantId,
          ),
          inArray(
            crmProducts.name,
            Array.from(new Set(serviceOrders.map((order) => order.serviceType))),
          ),
          eq(crmProducts.active, true),
        ),
      );

    if (catalogServices.length !== new Set(serviceOrders.map((order) => order.serviceType)).size) {
      throw new PetApiError(
        "El servicio de Grooming ya no está disponible en el catálogo.",
        409,
      );
    }

    const additionalItems = await db
      .select({
        totalAmount:
          crmServiceOrderItems.totalAmount,
      })
      .from(crmServiceOrderItems)
      .where(
        and(
          eq(
            crmServiceOrderItems.tenantId,
            tenantId,
          ),
          inArray(crmServiceOrderItems.serviceOrderId, serviceOrderIds),
        ),
      );
    const total =
      catalogServices.reduce(
        (sum, service) => sum + Number(service.unitPrice),
        0,
      ) +
      additionalItems.reduce(
        (sum, item) =>
          sum + Number(item.totalAmount),
        0,
      );
    const currencies = new Set(catalogServices.map((service) => service.currency));
    if (currencies.size !== 1) {
      throw new PetApiError(
        "Los servicios agrupados deben utilizar la misma moneda.",
        409,
      );
    }
    const currency = catalogServices[0]?.currency ?? "mxn";
    const posAccess = await db.execute<{
      enabled: boolean;
    }>(sql`
      SELECT EXISTS (
        SELECT 1
        FROM tenant_products product
        INNER JOIN tenant_module_entitlements entitlement
          ON entitlement.tenant_id = product.tenant_id
          AND entitlement.product = 'pos'
          AND entitlement.module_id = 'pos-terminal'
          AND entitlement.enabled = true
          AND (
            entitlement.expires_at IS NULL OR
            entitlement.expires_at > NOW()
          )
        WHERE product.tenant_id = ${tenantId}
          AND product.product = 'pos'
          AND product.enabled = true
      ) AS enabled
    `);
    const routeToPOS =
      Boolean(
        posAccess.rows[0]?.enabled,
      );
    if (
      !Number.isFinite(total) ||
      total < 0
    ) {
      throw new PetApiError(
        "El precio del servicio no es válido.",
        409,
      );
    }
    if (
      total > 0 &&
      !routeToPOS &&
      !paymentMethod
    ) {
      throw new PetApiError(
        "Selecciona el método de pago.",
        400,
      );
    }

    const user = await currentUser();
    const actorName =
      [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      user?.emailAddresses[0]
        ?.emailAddress ||
      "Usuario";
    const salesOrderId =
      crypto.randomUUID();
    const paymentId = crypto.randomUUID();
    const now = new Date();
    const reference = `OV-${now
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${salesOrderId
      .slice(0, 8)
      .toUpperCase()}`;
    const checkoutKey = serviceOrderIds.slice().sort().join(":");
    const selectedOrderIds = sql.join(
      serviceOrderIds.map((id) => sql`${id}`),
      sql`, `,
    );

    const result = await db.execute<{
      salesOrderId: string;
      reference: string;
      paymentId: string | null;
      totalAmount: string;
      currency: string;
    }>(sql`
      WITH locked_service AS MATERIALIZED (
        SELECT service.*
        FROM crm_service_orders service
        WHERE service.tenant_id = ${tenantId}
          AND service.id IN (${selectedOrderIds})
        FOR UPDATE OF service
      ), primary_service AS MATERIALIZED (
        SELECT * FROM locked_service
        WHERE id = ${serviceOrderId}
      ), existing_order AS MATERIALIZED (
        SELECT id, reference, total_amount, currency
        FROM crm_sales_orders
        WHERE tenant_id = ${tenantId}
          AND metadata->>'groomingCheckoutKey' = ${checkoutKey}
        LIMIT 1
      ), created_order AS (
        INSERT INTO crm_sales_orders (
          id, tenant_id, branch_id, customer_id, reference, status,
          customer_name, customer_email, customer_phone, currency,
          base_amount, discount_amount, total_amount, payment_method,
          notes, created_by_clerk_user_id, created_by_name,
          confirmed_by_clerk_user_id, confirmed_by_name, confirmed_at,
          metadata, created_at, updated_at
        )
        SELECT ${salesOrderId}, ${tenantId}, service.branch_id,
          service.customer_id, ${reference}, 'Confirmada',
          service.customer_name, service.customer_email,
          service.customer_phone, ${currency},
          ${String(total)}, 0, ${String(total)}, ${routeToPOS ? null : paymentMethod},
          'Cobro generado al entregar servicio de Grooming',
          ${userId}, ${actorName}, ${userId}, ${actorName}, NOW(),
          jsonb_build_object(
            'sourceType', 'pet_grooming_checkout',
            'groomingServiceOrderId', ${serviceOrderId}::text,
            'groomingCheckoutKey', ${checkoutKey}::text,
            'groomingServiceOrderIds', to_jsonb(ARRAY[${selectedOrderIds}]::text[]),
            'petIds', (
              SELECT jsonb_agg(unit_identifier ORDER BY reference)
              FROM locked_service
            )
          ), NOW(), NOW()
        FROM primary_service service
        WHERE service.status IN ('Pendiente de cierre', 'Completada')
          AND NOT EXISTS (SELECT 1 FROM existing_order)
        RETURNING id, reference, total_amount, currency
      ), effective_order AS (
        SELECT * FROM created_order
        UNION ALL
        SELECT * FROM existing_order
        WHERE NOT EXISTS (SELECT 1 FROM created_order)
      ), charge_lines AS MATERIALIZED (
        SELECT product.id AS product_id,
          CONCAT(service.unit_model, ' · ', product.name)::text AS name,
          product.description::text AS description,
          1::numeric AS quantity,
          product.unit_price::numeric AS unit_price,
          product.unit_price::numeric AS total_amount,
          (ROW_NUMBER() OVER (ORDER BY service.reference) * 100)::integer AS position,
          'base_service'::text AS source_type
        FROM locked_service service
        INNER JOIN crm_products product
          ON product.tenant_id = service.tenant_id
          AND product.name = service.service_type
          AND product.active = true
        UNION ALL
        SELECT item.product_id,
          CONCAT(service.unit_model, ' · ', item.name), item.description,
          item.quantity, item.unit_price, item.total_amount,
          (ROW_NUMBER() OVER (ORDER BY service.reference) * 100 + item.position + 1)::integer,
          'service_order_item'
        FROM crm_service_order_items item
        JOIN locked_service service
          ON service.id = item.service_order_id
        WHERE item.tenant_id = ${tenantId}
      ), created_item AS (
        INSERT INTO crm_sales_order_items (
          id, tenant_id, sales_order_id, product_id, name,
          description, quantity, unit_price, discount_amount,
          total_amount, position, metadata, created_at, updated_at
        )
        SELECT gen_random_uuid(), ${tenantId}, created_order.id,
          line.product_id, line.name, line.description,
          line.quantity, line.unit_price, 0,
          line.total_amount, line.position,
          jsonb_build_object(
            'sourceType', 'pet_grooming_checkout',
            'lineSource', line.source_type,
            'groomingCheckoutKey', ${checkoutKey}::text
          ), NOW(), NOW()
        FROM created_order
        JOIN charge_lines line ON TRUE
        RETURNING id
      ), created_payment AS (
        INSERT INTO commercial_payments (
          id, tenant_id, branch_id, deal_id, customer_id,
          sales_order_id, payment_type, status, amount, currency,
          payment_method, reference, received_at,
          received_by_clerk_user_id, external_system, external_id,
          metadata, created_at, updated_at
        )
        SELECT ${paymentId}, ${tenantId}, service.branch_id, NULL,
          service.customer_id, created_order.id, 'payment', 'received',
          ${String(total)}, ${currency}, ${paymentMethod},
          ${paymentReference}, NOW(), ${userId},
          'pet_grooming_checkout', ${serviceOrderId},
          jsonb_build_object(
            'groomingCheckoutKey', ${checkoutKey}::text,
            'groomingServiceOrderIds', to_jsonb(ARRAY[${selectedOrderIds}]::text[])
          ), NOW(), NOW()
        FROM created_order
        JOIN primary_service service ON TRUE
        WHERE ${String(total)}::numeric > 0
          AND ${!routeToPOS}
        RETURNING id
      ), completed_service AS (
        UPDATE crm_service_orders service
        SET status = 'Completada',
          completed_at = COALESCE(completed_at, NOW()),
          sales_order_id = effective_order.id,
          metadata = COALESCE(service.metadata, '{}'::jsonb)
            || jsonb_build_object(
              'salesOrderId', effective_order.id,
              'salesOrderReference', effective_order.reference,
              'petId', service.unit_identifier,
              'groomingCheckoutKey', ${checkoutKey}::text
            ),
          updated_at = NOW()
        FROM effective_order
        WHERE service.tenant_id = ${tenantId}
          AND service.id IN (${selectedOrderIds})
          AND service.status IN ('Pendiente de cierre', 'Completada')
        RETURNING service.id
      )
      SELECT effective_order.id AS "salesOrderId",
        effective_order.reference,
        (SELECT id FROM created_payment LIMIT 1) AS "paymentId",
        effective_order.total_amount AS "totalAmount",
        effective_order.currency
      FROM effective_order
      WHERE EXISTS (SELECT 1 FROM completed_service)
    `);

    const checkout = result.rows[0];
    if (!checkout) {
      throw new PetApiError(
        "No fue posible generar la orden de venta de Grooming.",
        409,
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...checkout,
          checkoutMode:
            routeToPOS
              ? "pos"
              : "embedded",
          totalAmount: Number(
            checkout.totalAmount,
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return createPetApiErrorResponse(
      error,
      "No fue posible registrar el cobro de Grooming.",
    );
  }
}
