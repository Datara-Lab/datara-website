import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  crmCustomers,
  crmDealItems,
  crmDeals,
  crmProducts,
  crmQuoteItems,
  crmQuotes,
  crmSalesOrderItems,
  crmSalesOrders,
  inventoryReservations,
  tenantBranches,
  tenants,
} from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
} from "@/lib/crm/branch-access";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type SalesOrderPayload = {
  dealId?: unknown;
  quoteId?: unknown;
  notes?: unknown;
};

class ApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

function getString(
  value: unknown,
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized ||
    undefined;
}

function getCustomerName(
  customer: {
    customerType: string;
    name: string;
    lastName:
    | string
    | null;
    companyName:
    | string
    | null;
    legalName:
    | string
    | null;
  },
) {
  if (
    customer.customerType ===
    "Empresa"
  ) {
    return (
      customer.companyName ??
      customer.legalName ??
      customer.name
    );
  }

  return [
    customer.name,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

async function getContext(
  permission:
    | "view"
    | "create"
    | "edit"
    | "manage",
) {
  const {
    userId,
    orgId,
  } = await auth();

  if (!userId) {
    throw new ApiError(
      "No autenticado.",
      401,
    );
  }

  if (!orgId) {
    throw new ApiError(
      "No hay una organización activa.",
      400,
    );
  }

  const [tenant] =
    await db
      .select({
        id:
          tenants.id,
      })
      .from(tenants)
      .where(
        eq(
          tenants
            .clerkOrganizationId,
          orgId,
        ),
      )
      .limit(1);

  if (!tenant) {
    throw new ApiError(
      "La empresa aún no está sincronizada.",
      404,
    );
  }

  const [
    branchAccess,
    permissions,
  ] = await Promise.all([
    getCRMBranchAccess(
      tenant.id,
      userId,
    ),

    requireCRMModulePermission(
      tenant.id,
      userId,
      "sales-orders",
      permission,
    ),
  ]);

  return {
    tenantId:
      tenant.id,

    userId,
    branchAccess,
    permissions,
  };
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof
      ApiError ||
    error instanceof
      CRMBranchAccessError ||
    error instanceof
      CRMPermissionError
  ) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  const databaseError =
    error as {
      cause?: {
        code?: string;
      };
      code?: string;
    };

  const code =
    databaseError.cause?.code ??
    databaseError.code;

  if (code === "23505") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe una orden de venta para este origen.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(
    "No fue posible procesar la orden de venta:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar la orden de venta.",
    },
    {
      status: 500,
    },
  );
}

function normalizeText(
  value:
    | string
    | null
    | undefined,
) {
  return (
    value ?? ""
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    );
}


export async function GET() {
  try {
    const {
      tenantId,
      branchAccess,
      permissions,
    } = await getContext(
      "view",
    );

    if (
      !branchAccess.allBranches &&
      branchAccess.branchIds.length ===
        0
    ) {
      return NextResponse.json({
        success: true,
        data: [],
        permissions,
      });
    }

    const orders =
      await db
        .select({
          id:
            crmSalesOrders.id,

          reference:
            crmSalesOrders
              .reference,

          status:
            crmSalesOrders.status,

          branchId:
            crmSalesOrders
              .branchId,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          customerId:
            crmSalesOrders
              .customerId,

          customerName:
            crmSalesOrders
              .customerName,

          customerEmail:
            crmSalesOrders
              .customerEmail,

          customerPhone:
            crmSalesOrders
              .customerPhone,

          dealId:
            crmSalesOrders.dealId,

          quoteId:
            crmSalesOrders.quoteId,

          ownerClerkUserId:
            crmSalesOrders
              .ownerClerkUserId,

          ownerName:
            crmSalesOrders
              .ownerName,

          ownerEmail:
            crmSalesOrders
              .ownerEmail,

          currency:
            crmSalesOrders.currency,

          baseAmount:
            crmSalesOrders
              .baseAmount,

          discountAmount:
            crmSalesOrders
              .discountAmount,

          totalAmount:
            crmSalesOrders
              .totalAmount,

          paymentMethod:
            crmSalesOrders
              .paymentMethod,

          notes:
            crmSalesOrders.notes,

          metadata:
            crmSalesOrders.metadata,

          createdByName:
            crmSalesOrders
              .createdByName,

          confirmedByName:
            crmSalesOrders
              .confirmedByName,

          confirmedAt:
            crmSalesOrders
              .confirmedAt,

          deliveredByName:
            crmSalesOrders
              .deliveredByName,

          deliveredAt:
            crmSalesOrders
              .deliveredAt,

          cancelledByName:
            crmSalesOrders
              .cancelledByName,

          cancelledAt:
            crmSalesOrders
              .cancelledAt,

          cancellationReason:
            crmSalesOrders
              .cancellationReason,

          createdAt:
            crmSalesOrders
              .createdAt,

          updatedAt:
            crmSalesOrders
              .updatedAt,
        })
        .from(
          crmSalesOrders,
        )
        .leftJoin(
          tenantBranches,
          and(
            eq(
              crmSalesOrders
                .branchId,
              tenantBranches.id,
            ),
            eq(
              tenantBranches
                .tenantId,
              tenantId,
            ),
          ),
        )
        .where(
          branchAccess.allBranches
            ? eq(
                crmSalesOrders
                  .tenantId,
                tenantId,
              )
            : and(
                eq(
                  crmSalesOrders
                    .tenantId,
                  tenantId,
                ),
                inArray(
                  crmSalesOrders
                    .branchId,
                  branchAccess
                    .branchIds,
                ),
              ),
        )
        .orderBy(
          desc(
            crmSalesOrders
              .createdAt,
          ),
        );

    const orderIds =
      orders.map(
        (order) =>
          order.id,
      );

    const items =
      orderIds.length > 0
        ? await db
            .select({
              id:
                crmSalesOrderItems
                  .id,

              salesOrderId:
                crmSalesOrderItems
                  .salesOrderId,

              productId:
                crmSalesOrderItems
                  .productId,

              productCode:
                crmProducts.code,

              name:
                crmSalesOrderItems
                  .name,

              description:
                crmSalesOrderItems
                  .description,

              quantity:
                crmSalesOrderItems
                  .quantity,

              unitPrice:
                crmSalesOrderItems
                  .unitPrice,

              discountAmount:
                crmSalesOrderItems
                  .discountAmount,

              totalAmount:
                crmSalesOrderItems
                  .totalAmount,

              position:
                crmSalesOrderItems
                  .position,
            })
            .from(
              crmSalesOrderItems,
            )
            .leftJoin(
              crmProducts,
              and(
                eq(
                  crmSalesOrderItems
                    .productId,
                  crmProducts.id,
                ),
                eq(
                  crmProducts
                    .tenantId,
                  tenantId,
                ),
              ),
            )
            .where(
              and(
                eq(
                  crmSalesOrderItems
                    .tenantId,
                  tenantId,
                ),
                inArray(
                  crmSalesOrderItems
                    .salesOrderId,
                  orderIds,
                ),
              ),
            )
            .orderBy(
              asc(
                crmSalesOrderItems
                  .position,
              ),
            )
        : [];

    return NextResponse.json({
      success: true,

      data:
        orders.map(
          (order) => ({
            ...order,

            branchLabel:
              order.branchName
                ? order.branchCode
                  ? `${order.branchName} (${order.branchCode})`
                  : order.branchName
                : "Sin sucursal",

            baseAmount:
              Number(
                order.baseAmount,
              ),

            discountAmount:
              Number(
                order
                  .discountAmount,
              ),

            totalAmount:
              Number(
                order.totalAmount,
              ),

            deliveryReason:
              getString(
                order.metadata
                  ?.deliveryReason,
              ) ?? null,

            items:
              items
                .filter(
                  (item) =>
                    item.salesOrderId ===
                    order.id,
                )
                .map(
                  (item) => ({
                    ...item,

                    unitPrice:
                      Number(
                        item.unitPrice,
                      ),

                    discountAmount:
                      Number(
                        item
                          .discountAmount,
                      ),

                    totalAmount:
                      Number(
                        item
                          .totalAmount,
                      ),
                  }),
                ),
          }),
        ),

      permissions,
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext(
      "create",
    );

    const payload =
      (await request.json()) as
        SalesOrderPayload;

    const dealId =
      getString(
        payload.dealId,
      );

    const quoteId =
      getString(
        payload.quoteId,
      );

    if (
      (
        dealId &&
        quoteId
      ) ||
      (
        !dealId &&
        !quoteId
      )
    ) {
      throw new ApiError(
        "Selecciona una oportunidad ganada o una cotización aceptada.",
        400,
      );
    }

    let source: {
      branchId:
      | string
      | null;

      customerId:
      | string
      | null;

      dealId:
      | string
      | null;

      quoteId:
      | string
      | null;

      ownerClerkUserId:
      | string
      | null;

      ownerName:
      | string
      | null;

      ownerEmail:
      | string
      | null;

      currency: string;
      baseAmount: string;
      discountAmount: string;
      totalAmount: string;

      paymentMethod:
      | string
      | null;

      sourceReference: string;
      sourceType: string;
    };

    let sourceItems:
      Array<{
        productId:
        | string
        | null;

        name: string;

        description:
        | string
        | null;

        quantity: string;
        unitPrice: string;
        discountAmount: string;
        totalAmount: string;
        position: number;

        metadata:
        Record<string, unknown>;
      }>;

    if (dealId) {
      const [deal] =
        await db
          .select({
            id:
              crmDeals.id,

            branchId:
              crmDeals.branchId,

            customerId:
              crmDeals.customerId,

            name:
              crmDeals.name,

            status:
              crmDeals.status,

            ownerClerkUserId:
              crmDeals
                .ownerClerkUserId,

            ownerName:
              crmDeals.ownerName,

            ownerEmail:
              crmDeals.ownerEmail,

            currency:
              crmDeals.currency,

            baseAmount:
              crmDeals.baseAmount,

            discountAmount:
              crmDeals
                .discountAmount,

            totalAmount:
              crmDeals.totalAmount,

            paymentMethod:
              crmDeals
                .paymentMethod,
          })
          .from(crmDeals)
          .where(
            and(
              eq(
                crmDeals.id,
                dealId,
              ),
              eq(
                crmDeals.tenantId,
                tenantId,
              ),
            ),
          )
          .limit(1);

      if (!deal) {
        throw new ApiError(
          "La oportunidad no existe.",
          404,
        );
      }

      if (
        normalizeText(
          deal.status,
        ) !== "ganada"
      ) {
        throw new ApiError(
          "Solo puede generarse una orden desde una oportunidad ganada.",
          409,
        );
      }

      source = {
        branchId:
          deal.branchId,

        customerId:
          deal.customerId,

        dealId:
          deal.id,

        quoteId:
          null,

        ownerClerkUserId:
          deal.ownerClerkUserId,

        ownerName:
          deal.ownerName,

        ownerEmail:
          deal.ownerEmail,

        currency:
          deal.currency,

        baseAmount:
          deal.baseAmount,

        discountAmount:
          deal.discountAmount,

        totalAmount:
          deal.totalAmount,

        paymentMethod:
          deal.paymentMethod,

        sourceReference:
          deal.name,

        sourceType:
          "Oportunidad",
      };

      sourceItems =
        await db
          .select({
            productId:
              crmDealItems
                .productId,

            name:
              crmDealItems.name,

            description:
              crmDealItems
                .description,

            quantity:
              crmDealItems
                .quantity,

            unitPrice:
              crmDealItems
                .unitPrice,

            discountAmount:
              crmDealItems
                .discountAmount,

            totalAmount:
              crmDealItems
                .totalAmount,

            position:
              crmDealItems
                .position,

            metadata:
              crmDealItems
                .metadata,
          })
          .from(crmDealItems)
          .where(
            and(
              eq(
                crmDealItems
                  .tenantId,
                tenantId,
              ),
              eq(
                crmDealItems
                  .dealId,
                deal.id,
              ),
            ),
          )
          .orderBy(
            asc(
              crmDealItems
                .position,
            ),
          );
    } else {
              if (!quoteId) {
        throw new ApiError(
          "No fue posible identificar la cotización.",
          400,
        );
      }

      const [quote] =
        await db
          .select({
            id:
              crmQuotes.id,

            branchId:
              crmQuotes.branchId,

            customerId:
              crmQuotes.customerId,

            dealId:
              crmQuotes.dealId,

            quoteNumber:
              crmQuotes
                .quoteNumber,

            subject:
              crmQuotes.subject,

            status:
              crmQuotes.status,

            acceptedAt:
              crmQuotes
                .acceptedAt,

            ownerClerkUserId:
              crmQuotes
                .ownerClerkUserId,

            ownerName:
              crmQuotes.ownerName,

            ownerEmail:
              crmQuotes.ownerEmail,

            currency:
              crmQuotes.currency,

            baseAmount:
              crmQuotes.baseAmount,

            discountAmount:
              crmQuotes
                .discountAmount,

            totalAmount:
              crmQuotes.totalAmount,

            paymentMethod:
              crmQuotes
                .paymentMethod,
          })
          .from(crmQuotes)
          .where(
            and(
              eq(
                crmQuotes.id,
                quoteId,
              ),
              eq(
                crmQuotes.tenantId,
                tenantId,
              ),
            ),
          )
          .limit(1);

      if (!quote) {
        throw new ApiError(
          "La cotización no existe.",
          404,
        );
      }

      if (
        normalizeText(
          quote.status,
        ) !== "aceptada" &&
        !quote.acceptedAt
      ) {
        throw new ApiError(
          "Solo puede generarse una orden desde una cotización aceptada.",
          409,
        );
      }

      source = {
        branchId:
          quote.branchId,

        customerId:
          quote.customerId,

        dealId:
          quote.dealId,

        quoteId:
          quote.id,

        ownerClerkUserId:
          quote.ownerClerkUserId,

        ownerName:
          quote.ownerName,

        ownerEmail:
          quote.ownerEmail,

        currency:
          quote.currency,

        baseAmount:
          quote.baseAmount,

        discountAmount:
          quote.discountAmount,

        totalAmount:
          quote.totalAmount,

        paymentMethod:
          quote.paymentMethod,

        sourceReference:
          `${quote.quoteNumber} · ${quote.subject}`,

        sourceType:
          "Cotización",
      };

      sourceItems =
        await db
          .select({
            productId:
              crmQuoteItems
                .productId,

            name:
              crmQuoteItems.name,

            description:
              crmQuoteItems
                .description,

            quantity:
              crmQuoteItems
                .quantity,

            unitPrice:
              crmQuoteItems
                .unitPrice,

            discountAmount:
              crmQuoteItems
                .discountAmount,

            totalAmount:
              crmQuoteItems
                .totalAmount,

            position:
              crmQuoteItems
                .position,

            metadata:
              crmQuoteItems
                .metadata,
          })
          .from(crmQuoteItems)
          .where(
            and(
              eq(
                crmQuoteItems
                  .tenantId,
                tenantId,
              ),
              eq(
                crmQuoteItems
                  .quoteId,
                quote.id,
              ),
            ),
          )
          .orderBy(
            asc(
              crmQuoteItems
                .position,
            ),
          );
    }

        if (
      !branchAccess.allBranches &&
      (
        !source.branchId ||
        !branchAccess.branchIds.includes(
          source.branchId,
        )
      )
    ) {
      throw new ApiError(
        "No tienes acceso a la sucursal de esta operación.",
        403,
      );
    }

    if (!source.customerId) {
      throw new ApiError(
        "La operación debe tener un cliente antes de generar la orden.",
        409,
      );
    }

    if (
      sourceItems.length ===
      0
    ) {
      throw new ApiError(
        "La operación no contiene partidas para generar la orden.",
        409,
      );
    }

    const normalizedItems =
      sourceItems.map(
        (item) => {
          const quantity =
            Number(
              item.quantity,
            );

          if (
            !Number.isInteger(
              quantity,
            ) ||
            quantity <= 0
          ) {
            throw new ApiError(
              `La cantidad de "${item.name}" debe ser un entero mayor que cero.`,
              409,
            );
          }

          return {
            ...item,
            quantity,
          };
        },
      );

    const [customer] =
      await db
        .select({
          id:
            crmCustomers.id,

          customerType:
            crmCustomers
              .customerType,

          name:
            crmCustomers.name,

          lastName:
            crmCustomers
              .lastName,

          companyName:
            crmCustomers
              .companyName,

          legalName:
            crmCustomers
              .legalName,

          email:
            crmCustomers.email,

          phone:
            crmCustomers.phone,

          mobile:
            crmCustomers.mobile,
        })
        .from(crmCustomers)
        .where(
          and(
            eq(
              crmCustomers.id,
              source.customerId,
            ),
            eq(
              crmCustomers
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!customer) {
      throw new ApiError(
        "El cliente de la operación ya no existe.",
        409,
      );
    }

        if (source.dealId) {
      const reservationRecords =
        await db
          .select({
            status:
              inventoryReservations
                .status,
          })
          .from(
            inventoryReservations,
          )
          .where(
            and(
              eq(
                inventoryReservations
                  .tenantId,
                tenantId,
              ),
              eq(
                inventoryReservations
                  .sourceType,
                "Oportunidad",
              ),
              eq(
                inventoryReservations
                  .sourceId,
                source.dealId,
              ),
            ),
          );

      if (
        reservationRecords.length ===
        0
      ) {
        throw new ApiError(
          "La oportunidad debe tener reservas activas antes de generar una orden de venta.",
          409,
        );
      }

      if (
        reservationRecords.length >
          0 &&
        reservationRecords.some(
          (reservation) =>
            reservation.status !==
            "Activa",
        )
      ) {
        throw new ApiError(
          "Esta oportunidad ya procesó su inventario y no puede generar una nueva orden de venta.",
          409,
        );
      }
    }

    const existingOrderCondition =
      source.quoteId
        ? eq(
            crmSalesOrders
              .quoteId,
            source.quoteId,
          )
        : source.dealId
          ? eq(
              crmSalesOrders
                .dealId,
              source.dealId,
            )
          : null;

    if (
      !existingOrderCondition
    ) {
      throw new ApiError(
        "No fue posible identificar el origen de la orden.",
        400,
      );
    }

    const [existingOrder] =
      await db
        .select({
          id:
            crmSalesOrders.id,

          reference:
            crmSalesOrders
              .reference,
        })
        .from(
          crmSalesOrders,
        )
        .where(
          and(
            eq(
              crmSalesOrders
                .tenantId,
              tenantId,
            ),
            existingOrderCondition,
          ),
        )
        .limit(1);

    if (existingOrder) {
      throw new ApiError(
        `Este origen ya generó la orden ${existingOrder.reference}.`,
        409,
      );
    }

        const user =
      await currentUser();

    const createdByName =
      [
        user?.firstName,
        user?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      user?.emailAddresses[0]
        ?.emailAddress ||
      "Usuario";

    const now =
      new Date();

    const salesOrderId =
      crypto.randomUUID();

    const reference =
      `OV-${now
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "")}-${salesOrderId
        .slice(0, 8)
        .toUpperCase()}`;

    const customerName =
      getCustomerName(
        customer,
      );

    const orderQuery =
      db
        .insert(
          crmSalesOrders,
        )
        .values({
          id:
            salesOrderId,

          tenantId,

          branchId:
            source.branchId,

          customerId:
            customer.id,

          dealId:
            source.dealId,

          quoteId:
            source.quoteId,

          reference,

          status:
            "Borrador",

          customerName,

          customerEmail:
            customer.email,

          customerPhone:
            customer.mobile ??
            customer.phone,

          ownerClerkUserId:
            source.ownerClerkUserId,

          ownerName:
            source.ownerName,

          ownerEmail:
            source.ownerEmail,

          currency:
            source.currency,

          baseAmount:
            source.baseAmount,

          discountAmount:
            source.discountAmount,

          totalAmount:
            source.totalAmount,

          paymentMethod:
            source.paymentMethod,

          notes:
            getString(
              payload.notes,
            ) ?? null,

          createdByClerkUserId:
            userId,

          createdByName,

          metadata: {
            sourceType:
              source.sourceType,

            sourceReference:
              source.sourceReference,

            createdFromSnapshot:
              true,
          },

          createdAt:
            now,

          updatedAt:
            now,
        });

    const itemRows =
      normalizedItems.map(
        (item) => ({
          id:
            crypto.randomUUID(),

          tenantId,

          salesOrderId,

          productId:
            item.productId,

          name:
            item.name,

          description:
            item.description,

          quantity:
            item.quantity,

          unitPrice:
            item.unitPrice,

          discountAmount:
            item.discountAmount,

          totalAmount:
            item.totalAmount,

          position:
            item.position,

          metadata: {
            ...item.metadata,

            sourceType:
              source.sourceType,

            sourceReference:
              source.sourceReference,
          },

          createdAt:
            now,

          updatedAt:
            now,
        }),
      );

    const itemsQuery =
      db
        .insert(
          crmSalesOrderItems,
        )
        .values(
          itemRows,
        );

    const queries = [
      orderQuery,
      itemsQuery,
    ];

    if (source.quoteId) {
      queries.push(
        db
          .update(
            crmQuotes,
          )
          .set({
            convertedAt:
              now,

            updatedAt:
              now,
          })
          .where(
            and(
              eq(
                crmQuotes.id,
                source.quoteId,
              ),
              eq(
                crmQuotes.tenantId,
                tenantId,
              ),
            ),
          ) as unknown as
            typeof orderQuery,
      );
    }

    await db.batch(
      queries as unknown as
        Parameters<
          typeof db.batch
        >[0],
    );

    return NextResponse.json(
      {
        success: true,

        message:
          `La orden ${reference} fue creada correctamente.`,

        data: {
          id:
            salesOrderId,

          reference,

          status:
            "Borrador",

          customerName,

          itemCount:
            itemRows.length,

          totalAmount:
            Number(
              source.totalAmount,
            ),

          currency:
            source.currency,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}