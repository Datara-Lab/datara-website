import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
  inArray,
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import {
  db,
} from "@/db";

import {
  crmProducts,
  crmServiceOrderItems,
  crmServiceOrders,
  tenantMembers,
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

type RouteContext = {
  params:
    Promise<{
      id: string;
    }>;
};

type ServiceItemPayload = {
  itemType?: unknown;
  productId?: unknown;
  name?: unknown;
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
};

type ServiceUpdatePayload = {
  action?: unknown;

  priority?: unknown;
  serviceType?: unknown;

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

  reason?: unknown;
  authorizationNotes?: unknown;
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

async function getContext(
  permission:
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

async function getOwnerSnapshot(
  tenantId: string,
  requestedOwnerId: string,
) {
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
            requestedOwnerId,
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
    "No fue posible actualizar la orden de servicio:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible actualizar la orden de servicio.",
    },
    {
      status: 500,
    },
  );
}

export async function PATCH(
  request: Request,
  routeContext:
    RouteContext,
) {
  try {
    const {
      id: serviceId,
    } =
      await routeContext.params;

    const payload =
      (await request.json()) as
        ServiceUpdatePayload;

    const action =
      getString(
        payload.action,
      );

    const allowedActions = [
      "Actualizar",
      "Programar",
      "Iniciar",
      "Pausar",
      "Solicitar autorización",
      "Autorizar",
      "Servicio realizado",
      "Devolver",
      "Completar",
      "Cancelar",
    ];

    if (
      !action ||
      !allowedActions.includes(
        action,
      )
    ) {
      throw new ApiError(
        "Selecciona una acción válida para la orden de servicio.",
        400,
      );
    }

    const requiresManage =
      action === "Autorizar" ||
      action === "Devolver" ||
      action === "Completar" ||
      action === "Cancelar";

    const {
      tenantId,
      userId,
      branchAccess,
      permissions,
    } = await getContext(
      requiresManage
        ? "manage"
        : "edit",
    );

    const [service] =
      await db
        .select()
        .from(
          crmServiceOrders,
        )
        .where(
          and(
            eq(
              crmServiceOrders.id,
              serviceId,
            ),
            eq(
              crmServiceOrders
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!service) {
      throw new ApiError(
        "La orden de servicio no existe.",
        404,
      );
    }

    if (
      !branchAccess.allBranches &&
      (
        !service.branchId ||
        !branchAccess.branchIds.includes(
          service.branchId,
        )
      )
    ) {
      throw new ApiError(
        "No tienes acceso a la sucursal de esta orden de servicio.",
        403,
      );
    }

        if (
      !permissions.canManage &&
      service.ownerClerkUserId !==
        userId
    ) {
      throw new ApiError(
        "Esta orden de servicio está asignada a otro responsable.",
        403,
      );
    }

    if (
      service.status ===
        "Completada" ||
      service.status ===
        "Cancelada"
    ) {
      throw new ApiError(
        "Una orden completada o cancelada ya no puede modificarse.",
        409,
      );
    }

    const validTransition =
      (
        action === "Actualizar" &&
        (
          service.status ===
            "En proceso" ||
          service.status ===
            "Pausada"
        )
      ) ||
      (
        action === "Programar" &&
        service.status ===
          "Borrador"
      ) ||
      (
        action === "Iniciar" &&
        (
          service.status ===
            "Programada" ||
          service.status ===
            "Pausada"
        )
      ) ||
      (
        action === "Pausar" &&
        service.status ===
          "En proceso"
      ) ||
      (
        action ===
          "Solicitar autorización" &&
        service.status ===
          "En proceso"
      ) ||
      (
        action === "Autorizar" &&
        service.status ===
          "Pendiente de autorización"
      ) ||
      (
        action ===
          "Servicio realizado" &&
        service.status ===
          "En proceso" &&
        Boolean(
          service.authorizedAt,
        )
      ) ||
      (
        action === "Devolver" &&
        service.status ===
          "Pendiente de cierre"
      ) ||
      (
        action === "Completar" &&
        service.status ===
          "Pendiente de cierre"
      ) ||
      (
        action === "Cancelar"
      );

    if (!validTransition) {
      throw new ApiError(
        `La acción ${action} no está permitida cuando la orden está ${service.status}.`,
        409,
      );
    }

    const scheduledAt =
      payload.scheduledAt ===
        undefined
        ? service.scheduledAt
        : getDate(
            payload.scheduledAt,
          );

    const commitmentAt =
      payload.commitmentAt ===
        undefined
        ? service.commitmentAt
        : getDate(
            payload
              .commitmentAt,
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

    if (
      action === "Programar" &&
      !scheduledAt
    ) {
      throw new ApiError(
        "Indica la fecha programada antes de programar el servicio.",
        400,
      );
    }

    const priority =
      getString(
        payload.priority,
      ) ??
      service.priority;

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

    const serviceType =
      getString(
        payload.serviceType,
      ) ??
      service.serviceType;

    const unitModel =
      getString(
        payload.unitModel,
      ) ??
      service.unitModel;

    const reportedProblem =
      getString(
        payload.reportedProblem,
      ) ??
      service.reportedProblem;

    const diagnosis =
      payload.diagnosis ===
        undefined
        ? service.diagnosis
        : getString(
            payload.diagnosis,
          ) ?? null;

    if (
      action ===
        "Solicitar autorización" &&
      !diagnosis
    ) {
      throw new ApiError(
        "Registra el diagnóstico antes de solicitar autorización.",
        400,
      );
    }

    const result =
      payload.result ===
        undefined
        ? service.result
        : getString(
            payload.result,
          ) ?? null;

    if (
      action ===
        "Servicio realizado" &&
      !result
    ) {
      throw new ApiError(
        "Registra el resultado del servicio antes de enviarlo a cierre.",
        400,
      );
    }

    const reason =
      getString(
        payload.reason,
      );

    if (
      (
        action === "Pausar" ||
        action === "Devolver" ||
        action === "Cancelar"
      ) &&
      !reason
    ) {
      throw new ApiError(
        action === "Pausar"
          ? "Indica el motivo de la pausa."
          : action === "Devolver"
            ? "Indica qué debe corregirse antes del cierre."
            : "Indica el motivo de cancelación.",
        400,
      );
    }

        const rawItems =
      payload.items ===
        undefined
        ? undefined
        : Array.isArray(
              payload.items,
            )
          ? payload.items as
              ServiceItemPayload[]
          : null;

    if (rawItems === null) {
      throw new ApiError(
        "Las partidas del servicio no tienen un formato válido.",
        400,
      );
    }

    const preparedItems =
      rawItems?.map(
        (
          item,
          position,
        ) => {
          const itemType =
            getString(
              item.itemType,
            );

          const productId =
            getString(
              item.productId,
            );

          const name =
            getString(
              item.name,
            );

          const quantity =
            Number(
              item.quantity,
            );

          const unitPrice =
            Number(
              item.unitPrice,
            );

          if (
            itemType !==
              "Mano de obra" &&
            itemType !==
              "Refacción"
          ) {
            throw new ApiError(
              `La partida ${position + 1} tiene un tipo inválido.`,
              400,
            );
          }

          if (!name) {
            throw new ApiError(
              `Indica el nombre de la partida ${position + 1}.`,
              400,
            );
          }

          if (
            !Number.isFinite(
              quantity,
            ) ||
            quantity <= 0
          ) {
            throw new ApiError(
              `La cantidad de la partida ${position + 1} debe ser mayor que cero.`,
              400,
            );
          }

          if (
            !Number.isFinite(
              unitPrice,
            ) ||
            unitPrice < 0
          ) {
            throw new ApiError(
              `El precio de la partida ${position + 1} no es válido.`,
              400,
            );
          }

          return {
            tenantId,
            serviceOrderId:
              service.id,
            productId:
              productId ?? null,
            itemType,
            name,

            description:
              getString(
                item.description,
              ) ?? null,

            quantity:
              String(quantity),

            unitPrice:
              String(unitPrice),

            totalAmount:
              String(
                Math.round(
                  quantity *
                    unitPrice *
                    100,
                ) / 100,
              ),

            authorizationStatus:
              "Pendiente",

            authorizedQuantity:
              null,

            position,
            updatedAt:
              new Date(),
          };
        },
      );

          const productIds =
      [
        ...new Set(
          (
            preparedItems ??
            []
          )
            .map(
              (item) =>
                item.productId,
            )
            .filter(
              (
                productId,
              ): productId is string =>
                Boolean(productId),
            ),
        ),
      ];

    if (
      productIds.length > 0
    ) {
      const validProducts =
        await db
          .select({
            id:
              crmProducts.id,
          })
          .from(crmProducts)
          .where(
            and(
              eq(
                crmProducts.tenantId,
                tenantId,
              ),
              inArray(
                crmProducts.id,
                productIds,
              ),
            ),
          );

      if (
        validProducts.length !==
        productIds.length
      ) {
        throw new ApiError(
          "Una o más refacciones no pertenecen a la empresa.",
          400,
        );
      }
    }

    if (
      action ===
        "Solicitar autorización" &&
      (
        !preparedItems ||
        preparedItems.length === 0
      )
    ) {
      throw new ApiError(
        "Agrega al menos una acción o refacción antes de solicitar autorización.",
        400,
      );
    }

    let owner = {
      id:
        service
          .ownerClerkUserId,

      name:
        service.ownerName,

      email:
        service.ownerEmail,
    };

    const requestedOwnerId =
      getString(
        payload
          .ownerClerkUserId,
      );

    const isOwnerTransfer =
      Boolean(
        requestedOwnerId &&
        requestedOwnerId !==
          service
            .ownerClerkUserId,
      );

    if (
      isOwnerTransfer &&
      !permissions.canManage
    ) {
      throw new ApiError(
        "No tienes permiso para transferir esta orden.",
        403,
      );
    }

    if (
      isOwnerTransfer &&
      !reason
    ) {
      throw new ApiError(
        "Indica el motivo de la transferencia.",
        400,
      );
    }

    if (
      requestedOwnerId &&
      requestedOwnerId !==
        service
          .ownerClerkUserId
    ) {
      owner =
        await getOwnerSnapshot(
          tenantId,
          requestedOwnerId,
        );
    }

    const user =
      await currentUser();

    const updatedByName =
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

    const existingPauseHistory =
      Array.isArray(
        service.metadata
          .pauseHistory,
      )
        ? service.metadata
            .pauseHistory
        : [];

    const existingTransferHistory =
      Array.isArray(
        service.metadata
          .transferHistory,
      )
        ? service.metadata
            .transferHistory
        : [];

    const existingReturnHistory =
      Array.isArray(
        service.metadata
          .returnHistory,
      )
        ? service.metadata
            .returnHistory
        : [];

    const metadata =
      action === "Pausar"
        ? {
            ...service.metadata,

            pauseHistory: [
              ...existingPauseHistory,
              {
                reason,
                pausedAt:
                  now.toISOString(),
                pausedByClerkUserId:
                  userId,
                pausedByName:
                  updatedByName,
              },
            ],
          }
        : isOwnerTransfer
          ? {
              ...service.metadata,

              transferHistory: [
                ...existingTransferHistory,
                {
                  reason,

                  transferredAt:
                    now.toISOString(),

                  transferredByClerkUserId:
                    userId,

                  transferredByName:
                    updatedByName,

                  previousOwnerClerkUserId:
                    service
                      .ownerClerkUserId,

                  previousOwnerName:
                    service.ownerName,

                  newOwnerClerkUserId:
                    owner.id,

                  newOwnerName:
                    owner.name,
                },
              ],
            }
          : action === "Devolver"
            ? {
                ...service.metadata,

                returnHistory: [
                  ...existingReturnHistory,
                  {
                    reason,

                    returnedAt:
                      now.toISOString(),

                    returnedByClerkUserId:
                      userId,

                    returnedByName:
                      updatedByName,
                  },
                ],
              }
            : service.metadata;

    const nextStatus =
      action === "Programar"
        ? "Programada"
        : action === "Iniciar"
          ? "En proceso"
          : action === "Pausar"
            ? "Pausada"
            : action ===
                "Solicitar autorización"
              ? "Pendiente de autorización"
              : action === "Autorizar"
                ? "En proceso"
                : action ===
                    "Servicio realizado"
                  ? "Pendiente de cierre"
                  : action ===
                      "Devolver"
                    ? "En proceso"
                    : action ===
                        "Completar"
                      ? "Completada"
                      : action ===
                          "Cancelar"
                        ? "Cancelada"
                        : service.status;

    const updateServiceQuery =
      db
        .update(
          crmServiceOrders,
        )
        .set({
          status:
            nextStatus,

          priority,
          serviceType,
          unitModel,
          reportedProblem,

          unitPlate:
            payload.unitPlate ===
              undefined
              ? service.unitPlate
              : getString(
                  payload.unitPlate,
                ) ?? null,

          unitIdentifier:
            payload
              .unitIdentifier ===
              undefined
              ? service
                  .unitIdentifier
              : getString(
                  payload
                    .unitIdentifier,
                ) ?? null,

          diagnosis,

          result,

          authorizationRequestedAt:
            action ===
              "Solicitar autorización"
              ? now
              : service
                  .authorizationRequestedAt,

          authorizationRequestedByClerkUserId:
            action ===
              "Solicitar autorización"
              ? userId
              : service
                  .authorizationRequestedByClerkUserId,

          authorizationRequestedByName:
            action ===
              "Solicitar autorización"
              ? updatedByName
              : service
                  .authorizationRequestedByName,

          authorizedAt:
            action === "Autorizar"
              ? now
              : service.authorizedAt,

          authorizedByClerkUserId:
            action === "Autorizar"
              ? userId
              : service
                  .authorizedByClerkUserId,

          authorizedByName:
            action === "Autorizar"
              ? updatedByName
              : service
                  .authorizedByName,

          authorizationNotes:
            payload.authorizationNotes ===
              undefined
              ? service
                  .authorizationNotes
              : getString(
                  payload
                    .authorizationNotes,
                ) ?? null,

          workCompletedAt:
            action ===
              "Servicio realizado"
              ? now
              : service
                  .workCompletedAt,

          workCompletedByClerkUserId:
            action ===
              "Servicio realizado"
              ? userId
              : service
                  .workCompletedByClerkUserId,

          workCompletedByName:
            action ===
              "Servicio realizado"
              ? updatedByName
              : service
                  .workCompletedByName,

          returnedAt:
            action === "Devolver"
              ? now
              : service.returnedAt,

          returnedByClerkUserId:
            action === "Devolver"
              ? userId
              : service
                  .returnedByClerkUserId,

          returnedByName:
            action === "Devolver"
              ? updatedByName
              : service
                  .returnedByName,

          returnReason:
            action === "Devolver"
              ? reason
              : service.returnReason,

          notes:
            payload.notes ===
              undefined
              ? service.notes
              : getString(
                  payload.notes,
                ) ?? null,

          ownerClerkUserId:
            owner.id,

          ownerName:
            owner.name,

          ownerEmail:
            owner.email,

          scheduledAt,
          commitmentAt,

          startedAt:
            action === "Iniciar"
              ? service.startedAt ??
                now
              : service.startedAt,

          completedAt:
            action === "Completar"
              ? now
              : service.completedAt,

          cancelledAt:
            action === "Cancelar"
              ? now
              : service.cancelledAt,

          cancellationReason:
            action === "Cancelar"
              ? reason
              : service
                  .cancellationReason,
                  metadata,

          updatedByClerkUserId:
            userId,

          updatedByName,
          updatedAt: now,
        })
        .where(
          and(
            eq(
              crmServiceOrders.id,
              service.id,
            ),
            eq(
              crmServiceOrders
                .tenantId,
              tenantId,
            ),
          ),
        )
        ;

    const itemQueries =
      preparedItems ===
        undefined
        ? []
        : [
            db
              .delete(
                crmServiceOrderItems,
              )
              .where(
                and(
                  eq(
                    crmServiceOrderItems
                      .tenantId,
                    tenantId,
                  ),
                  eq(
                    crmServiceOrderItems
                      .serviceOrderId,
                    service.id,
                  ),
                ),
              ),

            ...(
              preparedItems.length >
                0
                ? [
                    db
                      .insert(
                        crmServiceOrderItems,
                      )
                      .values(
                        preparedItems,
                      ),
                  ]
                : []
            ),
          ];

    const authorizationQueries =
      action === "Autorizar"
        ? [
            db
              .update(
                crmServiceOrderItems,
              )
              .set({
                authorizationStatus:
                  "Autorizada",

                authorizedQuantity:
                  sql`${crmServiceOrderItems.quantity}`,

                updatedAt: now,
              })
              .where(
                and(
                  eq(
                    crmServiceOrderItems
                      .tenantId,
                    tenantId,
                  ),
                  eq(
                    crmServiceOrderItems
                      .serviceOrderId,
                    service.id,
                  ),
                ),
              ),
          ]
        : [];

    await db.batch(
      [
        updateServiceQuery,
        ...itemQueries,
        ...authorizationQueries,
      ] as unknown as
        Parameters<
          typeof db.batch
        >[0],
    );

    const updatedService = {
      id:
        service.id,

      reference:
        service.reference,

      status:
        nextStatus,
    };

    return NextResponse.json({
      success: true,

      message:
        `La orden ${updatedService.reference} fue actualizada correctamente.`,

      data:
        updatedService,
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}