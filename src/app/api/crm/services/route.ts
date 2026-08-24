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

import {
  db,
} from "@/db";

import {
  crmCustomers,
  crmDeals,
  crmProducts,
  crmSalesOrders,
  crmServiceOrderItems,
  crmServiceOrders,
  tenantBranches,
  tenantMembers,
  tenants,
} from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
  validateCRMBranchId,
} from "@/lib/crm/branch-access";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type ServiceOrderItemPayload = {
  itemType?: unknown;
  productId?: unknown;
  name?: unknown;
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
};

type ServiceOrderPayload = {
  branchId?: unknown;
  customerId?: unknown;
  dealId?: unknown;
  salesOrderId?: unknown;

  serviceType?: unknown;
  priority?: unknown;

  unitModel?: unknown;
  unitPlate?: unknown;
  unitIdentifier?: unknown;

  reportedProblem?: unknown;
  diagnosis?: unknown;
  result?: unknown;
  notes?: unknown;

  ownerClerkUserId?: unknown;

  scheduledAt?: unknown;
  commitmentAt?: unknown;

  items?: unknown;
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

  return (
    value.trim() ||
    undefined
  );
}

function getDate(
  value: unknown,
): Date | null {
  const normalized =
    getString(value);

  if (!normalized) {
    return null;
  }

  const date =
    new Date(normalized);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new ApiError(
      "Una de las fechas no tiene un formato válido.",
      400,
    );
  }

  return date;
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

async function getOwnerSnapshot(
  tenantId: string,
  requestedOwnerId:
    | string
    | undefined,
  currentUserId: string,
) {
  const ownerId =
    requestedOwnerId ??
    currentUserId;

  const [member] =
    await db
      .select({
        clerkUserId:
          tenantMembers
            .clerkUserId,

        firstName:
          tenantMembers
            .firstName,

        lastName:
          tenantMembers
            .lastName,

        email:
          tenantMembers.email,
      })
      .from(tenantMembers)
      .where(
        and(
          eq(
            tenantMembers
              .tenantId,
            tenantId,
          ),
          eq(
            tenantMembers
              .clerkUserId,
            ownerId,
          ),
          eq(
            tenantMembers.status,
            "active",
          ),
        ),
      )
      .limit(1);

  if (!member) {
    throw new ApiError(
      "El responsable seleccionado no es un miembro activo de la empresa.",
      400,
    );
  }

  return {
    id:
      member.clerkUserId,

    name:
      [
        member.firstName,
        member.lastName,
      ]
        .filter(Boolean)
        .join(" ") ||
      member.email,

    email:
      member.email,
  };
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
      "services",
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

  console.error(
    "No fue posible procesar los servicios:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar los servicios.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
  try {
    const {
      tenantId,
      userId,
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

    const services =
      await db
        .select({
          id:
            crmServiceOrders.id,

          reference:
            crmServiceOrders
              .reference,

          status:
            crmServiceOrders.status,

          priority:
            crmServiceOrders
              .priority,

          serviceType:
            crmServiceOrders
              .serviceType,

          branchId:
            crmServiceOrders
              .branchId,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          customerId:
            crmServiceOrders
              .customerId,

          customerName:
            crmServiceOrders
              .customerName,

          customerEmail:
            crmServiceOrders
              .customerEmail,

          customerPhone:
            crmServiceOrders
              .customerPhone,

          dealId:
            crmServiceOrders.dealId,

          salesOrderId:
            crmServiceOrders
              .salesOrderId,

          unitModel:
            crmServiceOrders
              .unitModel,

          unitPlate:
            crmServiceOrders
              .unitPlate,

          unitIdentifier:
            crmServiceOrders
              .unitIdentifier,

          reportedProblem:
            crmServiceOrders
              .reportedProblem,

          diagnosis:
            crmServiceOrders
              .diagnosis,

          result:
            crmServiceOrders.result,

          authorizationRequestedAt:
            crmServiceOrders
              .authorizationRequestedAt,

          authorizationRequestedByName:
            crmServiceOrders
              .authorizationRequestedByName,

          authorizedAt:
            crmServiceOrders
              .authorizedAt,

          authorizedByName:
            crmServiceOrders
              .authorizedByName,

          authorizationNotes:
            crmServiceOrders
              .authorizationNotes,

          workCompletedAt:
            crmServiceOrders
              .workCompletedAt,

          workCompletedByName:
            crmServiceOrders
              .workCompletedByName,

          returnedAt:
            crmServiceOrders
              .returnedAt,

          returnedByName:
            crmServiceOrders
              .returnedByName,

          returnReason:
            crmServiceOrders
              .returnReason,

          ownerClerkUserId:
            crmServiceOrders
              .ownerClerkUserId,

          ownerName:
            crmServiceOrders
              .ownerName,

          ownerEmail:
            crmServiceOrders
              .ownerEmail,

          scheduledAt:
            crmServiceOrders
              .scheduledAt,

          commitmentAt:
            crmServiceOrders
              .commitmentAt,

          startedAt:
            crmServiceOrders
              .startedAt,

          completedAt:
            crmServiceOrders
              .completedAt,

          cancelledAt:
            crmServiceOrders
              .cancelledAt,

          cancellationReason:
            crmServiceOrders
              .cancellationReason,

          notes:
            crmServiceOrders.notes,

          createdByName:
            crmServiceOrders
              .createdByName,

          updatedByName:
            crmServiceOrders
              .updatedByName,

          metadata:
            crmServiceOrders
              .metadata,

          createdAt:
            crmServiceOrders
              .createdAt,

          updatedAt:
            crmServiceOrders
              .updatedAt,
        })
        .from(crmServiceOrders)
        .leftJoin(
          tenantBranches,
          and(
            eq(
              crmServiceOrders
                .branchId,
              tenantBranches.id,
            ),
            eq(
              tenantBranches.tenantId,
              tenantId,
            ),
          ),
        )
        .where(
          and(
            branchAccess.allBranches
              ? eq(
                  crmServiceOrders
                    .tenantId,
                  tenantId,
                )
              : and(
                  eq(
                    crmServiceOrders
                      .tenantId,
                    tenantId,
                  ),
                  inArray(
                    crmServiceOrders
                      .branchId,
                    branchAccess
                      .branchIds,
                  ),
                ),

            /*
             * View permite consultar todas las órdenes
             * dentro del alcance de sucursales.
             */
            permissions.canView
              ? undefined
              : eq(
                  crmServiceOrders
                    .ownerClerkUserId,
                  userId,
                ),
          ),
        )
        .orderBy(
          desc(
            crmServiceOrders
              .createdAt,
          ),
        );

    const serviceIds =
      services.map(
        (service) =>
          service.id,
      );

    const items =
      serviceIds.length > 0
        ? await db
            .select({
              id:
                crmServiceOrderItems.id,

              serviceOrderId:
                crmServiceOrderItems
                  .serviceOrderId,

              productId:
                crmServiceOrderItems
                  .productId,

              productCode:
                crmProducts.code,

              itemType:
                crmServiceOrderItems
                  .itemType,

              name:
                crmServiceOrderItems.name,

              description:
                crmServiceOrderItems
                  .description,

              quantity:
                crmServiceOrderItems
                  .quantity,

              unitPrice:
                crmServiceOrderItems
                  .unitPrice,

              totalAmount:
                crmServiceOrderItems
                  .totalAmount,

              authorizationStatus:
                crmServiceOrderItems
                  .authorizationStatus,

              authorizedQuantity:
                crmServiceOrderItems
                  .authorizedQuantity,

              position:
                crmServiceOrderItems
                  .position,
            })
            .from(
              crmServiceOrderItems,
            )
            .leftJoin(
              crmProducts,
              and(
                eq(
                  crmServiceOrderItems
                    .productId,
                  crmProducts.id,
                ),
                eq(
                  crmProducts.tenantId,
                  tenantId,
                ),
              ),
            )
            .where(
              and(
                eq(
                  crmServiceOrderItems
                    .tenantId,
                  tenantId,
                ),
                inArray(
                  crmServiceOrderItems
                    .serviceOrderId,
                  serviceIds,
                ),
              ),
            )
            .orderBy(
              asc(
                crmServiceOrderItems
                  .position,
              ),
            )
        : [];

    return NextResponse.json({
      success: true,

      data:
        services.map(
          (service) => ({
            ...service,

            branchLabel:
              service.branchName
                ? service.branchCode
                  ? `${service.branchName} (${service.branchCode})`
                  : service.branchName
                : "Sin sucursal",

            items:
              items
                .filter(
                  (item) =>
                    item.serviceOrderId ===
                    service.id,
                )
                .map(
                  (item) => ({
                    ...item,

                    quantity:
                      Number(
                        item.quantity,
                      ),

                    unitPrice:
                      Number(
                        item.unitPrice,
                      ),

                    totalAmount:
                      Number(
                        item.totalAmount,
                      ),

                    authorizedQuantity:
                      item.authorizedQuantity ===
                        null
                        ? null
                        : Number(
                            item
                              .authorizedQuantity,
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
        ServiceOrderPayload;

    const customerId =
      getString(
        payload.customerId,
      );

    const serviceType =
      getString(
        payload.serviceType,
      );

    const unitModel =
      getString(
        payload.unitModel,
      );

    const reportedProblem =
      getString(
        payload.reportedProblem,
      );

    if (!customerId) {
      throw new ApiError(
        "Selecciona un cliente.",
        400,
      );
    }

    if (!serviceType) {
      throw new ApiError(
        "Indica el tipo de servicio.",
        400,
      );
    }

    if (!unitModel) {
      throw new ApiError(
        "Indica el modelo de la motocicleta.",
        400,
      );
    }

    if (!reportedProblem) {
      throw new ApiError(
        "Describe el problema reportado.",
        400,
      );
    }

    const branchId =
      await validateCRMBranchId(
        tenantId,
        branchAccess,
        getString(
          payload.branchId,
        ),
      );

    if (!branchId) {
      throw new ApiError(
        "Selecciona una sucursal.",
        400,
      );
    }

    const [customer] =
      await db
        .select({
          id:
            crmCustomers.id,

          branchId:
            crmCustomers.branchId,

          customerType:
            crmCustomers
              .customerType,

          name:
            crmCustomers.name,

          lastName:
            crmCustomers.lastName,

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
              customerId,
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
        "El cliente seleccionado no pertenece a la empresa.",
        400,
      );
    }

    const dealId =
      getString(
        payload.dealId,
      );

    if (dealId) {
      const [deal] =
        await db
          .select({
            id:
              crmDeals.id,

            customerId:
              crmDeals
                .customerId,
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
          "La oportunidad relacionada no pertenece a la empresa.",
          400,
        );
      }

      if (
        deal.customerId &&
        deal.customerId !==
          customerId
      ) {
        throw new ApiError(
          "La oportunidad seleccionada pertenece a otro cliente.",
          400,
        );
      }
    }

    const salesOrderId =
      getString(
        payload.salesOrderId,
      );

    if (salesOrderId) {
      const [salesOrder] =
        await db
          .select({
            id:
              crmSalesOrders.id,

            customerId:
              crmSalesOrders
                .customerId,
          })
          .from(crmSalesOrders)
          .where(
            and(
              eq(
                crmSalesOrders.id,
                salesOrderId,
              ),
              eq(
                crmSalesOrders
                  .tenantId,
                tenantId,
              ),
            ),
          )
          .limit(1);

      if (!salesOrder) {
        throw new ApiError(
          "La orden de venta relacionada no pertenece a la empresa.",
          400,
        );
      }

      if (
        salesOrder.customerId &&
        salesOrder.customerId !==
          customerId
      ) {
        throw new ApiError(
          "La orden de venta seleccionada pertenece a otro cliente.",
          400,
        );
      }
    }

    const priority =
      getString(
        payload.priority,
      ) ??
      "Normal";

    if (
      ![
        "Baja",
        "Normal",
        "Alta",
        "Urgente",
      ].includes(priority)
    ) {
      throw new ApiError(
        "Selecciona una prioridad válida.",
        400,
      );
    }

    const scheduledAt =
      getDate(
        payload.scheduledAt,
      );

    const commitmentAt =
      getDate(
        payload.commitmentAt,
      );

    if (
      scheduledAt &&
      commitmentAt &&
      commitmentAt <
        scheduledAt
    ) {
      throw new ApiError(
        "La fecha compromiso no puede ser anterior a la fecha programada.",
        400,
      );
    }

    const owner =
      await getOwnerSnapshot(
        tenantId,
        getString(
          payload
            .ownerClerkUserId,
        ),
        userId,
      );

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

    const datePart =
      now
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "");

    const reference =
      `SER-${datePart}-${crypto
        .randomUUID()
        .slice(0, 6)
        .toUpperCase()}`;

    const [createdService] =
      await db
        .insert(
          crmServiceOrders,
        )
        .values({
          tenantId,
          branchId,
          customerId,

          dealId:
            dealId ?? null,

          salesOrderId:
            salesOrderId ??
            null,

          reference,
          status: "Borrador",
          priority,
          serviceType,

          customerName:
            getCustomerName(
              customer,
            ),

          customerEmail:
            customer.email,

          customerPhone:
            customer.mobile ??
            customer.phone,

          unitModel,

          unitPlate:
            getString(
              payload.unitPlate,
            ) ?? null,

          unitIdentifier:
            getString(
              payload
                .unitIdentifier,
            ) ?? null,

          reportedProblem,

          diagnosis:
            getString(
              payload.diagnosis,
            ) ?? null,

          result:
            getString(
              payload.result,
            ) ?? null,

          ownerClerkUserId:
            owner.id,

          ownerName:
            owner.name,

          ownerEmail:
            owner.email,

          scheduledAt,
          commitmentAt,

          notes:
            getString(
              payload.notes,
            ) ?? null,

          createdByClerkUserId:
            userId,

          createdByName,

          updatedByClerkUserId:
            userId,

          updatedByName:
            createdByName,

          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id:
            crmServiceOrders.id,

          reference:
            crmServiceOrders
              .reference,

          status:
            crmServiceOrders.status,
        });

    return NextResponse.json(
      {
        success: true,

        message:
          `La orden ${createdService.reference} fue creada correctamente.`,

        data:
          createdService,
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