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

import { db } from "@/db";

import {
  crmDeals,
  crmProducts,
  inventoryLocations,
  inventoryMovements,
  inventoryReservations,
  inventoryStocks,
  tenantBranches,
  tenants,
} from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
  type CRMBranchAccessContext,
} from "@/lib/crm/branch-access";

import {
  createInventoryAuditQuery,
} from "@/lib/crm/inventory-audit";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type BulkReservationItemPayload = {
  locationId?: unknown;
  productId?: unknown;
  quantity?: unknown;
};

type BulkReservationPayload = {
  sourceId?: unknown;
  sourceReference?: unknown;
  customerName?: unknown;
  notes?: unknown;
  expiresAt?: unknown;
  items?: unknown;
};

type GroupReservationUpdatePayload = {
  sourceId?: unknown;

  action?: unknown;

  expiresAt?: unknown;
  reason?: unknown;
};

type ValidatedItem = {
  locationId: string;
  productId: string;
  quantity: number;
};

type LocationRecord = {
  id: string;

  branchId:
    | string
    | null;

  name: string;

  branchName:
    | string
    | null;

  branchCode:
    | string
    | null;
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
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized ||
    undefined;
}

function getPositiveInteger(
  value: unknown,
): number | undefined {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return undefined;
  }

  return parsed;
}

function normalizeText(
  value:
    | string
    | null
    | undefined,
): string {
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

function getExpirationDate(
  value: unknown,
): Date {
  const normalized =
    getString(value);

  if (!normalized) {
    throw new ApiError(
      "Selecciona la fecha y hora de vencimiento.",
      400,
    );
  }

  const date =
    new Date(normalized);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new ApiError(
      "La fecha de vencimiento no es válida.",
      400,
    );
  }

  if (
    date.getTime() <=
    Date.now()
  ) {
    throw new ApiError(
      "La fecha de vencimiento debe ser posterior a la fecha actual.",
      400,
    );
  }

  return date;
}

function getItems(
  value: unknown,
): ValidatedItem[] {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    throw new ApiError(
      "Selecciona al menos una partida para reservar.",
      400,
    );
  }

  if (
    value.length > 25
  ) {
    throw new ApiError(
      "No es posible crear más de 25 reservas en una sola operación.",
      400,
    );
  }

  const items =
    value.map(
      (
        rawItem,
        index,
      ) => {
        if (
          typeof rawItem !==
            "object" ||
          rawItem === null ||
          Array.isArray(rawItem)
        ) {
          throw new ApiError(
            `La partida ${index + 1} no tiene un formato válido.`,
            400,
          );
        }

        const item =
          rawItem as
            BulkReservationItemPayload;

        const locationId =
          getString(
            item.locationId,
          );

        const productId =
          getString(
            item.productId,
          );

        const quantity =
          getPositiveInteger(
            item.quantity,
          );

        if (
          !locationId ||
          !productId ||
          !quantity
        ) {
          throw new ApiError(
            `Completa la ubicación, el producto y la cantidad de la partida ${index + 1}.`,
            400,
          );
        }

        return {
          locationId,
          productId,
          quantity,
        };
      },
    );

  const itemKeys =
    items.map(
      (item) =>
        `${item.locationId}:${item.productId}`,
    );

  if (
    new Set(itemKeys).size !==
    itemKeys.length
  ) {
    throw new ApiError(
      "El grupo contiene el mismo producto y ubicación más de una vez.",
      400,
    );
  }

  return items;
}

function canAccessLocation(
  location: LocationRecord,
  branchAccess:
    CRMBranchAccessContext,
): boolean {
  if (
    branchAccess.allBranches
  ) {
    return true;
  }

  if (!location.branchId) {
    return false;
  }

  return branchAccess.branchIds.includes(
    location.branchId,
  );
}

function getLocationLabel(
  location: LocationRecord,
): string {
  const branchLabel =
    location.branchName
      ? location.branchCode
        ? `${location.branchName} (${location.branchCode})`
        : location.branchName
      : "Bodega independiente";

  return `${location.name} · ${branchLabel}`;
}

function isStockAvailabilityConflict(
  error: unknown,
): boolean {
  let currentError:
    unknown = error;

  for (
    let depth = 0;
    depth < 5;
    depth += 1
  ) {
    if (
      !currentError ||
      typeof currentError !==
        "object"
    ) {
      return false;
    }

    const errorRecord =
      currentError as
        Record<string, unknown>;

    if (
      errorRecord.code ===
        "23514" &&
      errorRecord.constraint ===
        "inventory_stocks_reserved_lte_quantity"
    ) {
      return true;
    }

    currentError =
      errorRecord.cause;
  }

  return false;
}

function createErrorResponse(
  error: unknown,
) {
  if (
    isStockAvailabilityConflict(
      error,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "La disponibilidad de uno o más modelos cambió mientras se registraban las reservas. Actualiza el inventario e inténtalo nuevamente.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    error instanceof ApiError ||
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
    "No fue posible crear el grupo de reservas:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible crear el grupo de reservas.",
    },
    {
      status: 500,
    },
  );
}

async function getContext(
  permission:
    | "create"
    | "edit" =
      "create",
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
        id: tenants.id,
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
  ] = await Promise.all([
    getCRMBranchAccess(
      tenant.id,
      userId,
    ),

    requireCRMModulePermission(
      tenant.id,
      userId,
      "inventory",
      permission,
    ),
  ]);

  return {
    tenantId: tenant.id,
    userId,
    branchAccess,
  };
}

export async function POST(
  request: Request,
) {
  try {
    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext();

    const payload =
      (await request.json()) as
        BulkReservationPayload;

    const sourceId =
      getString(
        payload.sourceId,
      );

    if (!sourceId) {
      throw new ApiError(
        "Selecciona una oportunidad válida.",
        400,
      );
    }

    const items =
      getItems(
        payload.items,
      );

    const expiresAt =
      getExpirationDate(
        payload.expiresAt,
      );

    const [deal] =
      await db
        .select({
          id: crmDeals.id,
          name: crmDeals.name,
          stage: crmDeals.stage,
          status: crmDeals.status,
          branchId:
            crmDeals.branchId,
        })
        .from(crmDeals)
        .where(
          and(
            eq(
              crmDeals.id,
              sourceId,
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
        "La oportunidad no existe o pertenece a otra empresa.",
        404,
      );
    }

    const normalizedStage =
      normalizeText(
        deal.stage,
      );

    const normalizedStatus =
      normalizeText(
        deal.status,
      );

    if (
      normalizedStage ===
        "prospecto" ||
      normalizedStage ===
        "contactado"
    ) {
      throw new ApiError(
        "La oportunidad debe avanzar a una etapa calificada antes de reservar inventario.",
        400,
      );
    }

    if (
      normalizedStatus.includes(
        "perdida",
      ) ||
      normalizedStatus.includes(
        "cancelada",
      )
    ) {
      throw new ApiError(
        "No es posible reservar inventario para una oportunidad perdida o cancelada.",
        400,
      );
    }

    const locationIds =
      Array.from(
        new Set(
          items.map(
            (item) =>
              item.locationId,
          ),
        ),
      );

    const productIds =
      Array.from(
        new Set(
          items.map(
            (item) =>
              item.productId,
          ),
        ),
      );

    const locationRecords =
      await db
        .select({
          id:
            inventoryLocations.id,

          branchId:
            inventoryLocations
              .branchId,

          name:
            inventoryLocations.name,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          active:
            inventoryLocations.active,
        })
        .from(
          inventoryLocations,
        )
        .leftJoin(
          tenantBranches,
          eq(
            inventoryLocations
              .branchId,
            tenantBranches.id,
          ),
        )
        .where(
          and(
            eq(
              inventoryLocations
                .tenantId,
              tenantId,
            ),
            inArray(
              inventoryLocations.id,
              locationIds,
            ),
          ),
        );

    if (
      locationRecords.length !==
      locationIds.length
    ) {
      throw new ApiError(
        "Una o más ubicaciones no existen o pertenecen a otra empresa.",
        400,
      );
    }

    for (
      const locationRecord of
        locationRecords
    ) {
      if (
        !locationRecord.active
      ) {
        throw new ApiError(
          `La ubicación "${locationRecord.name}" está desactivada.`,
          400,
        );
      }

      if (
        !canAccessLocation(
          locationRecord,
          branchAccess,
        )
      ) {
        throw new ApiError(
          `No tienes acceso a la ubicación "${locationRecord.name}".`,
          403,
        );
      }
    }

    const productRecords =
      await db
        .select({
          id: crmProducts.id,
          name: crmProducts.name,
          active:
            crmProducts.active,
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
      productRecords.length !==
      productIds.length
    ) {
      throw new ApiError(
        "Uno o más modelos no existen o pertenecen a otra empresa.",
        400,
      );
    }

    const inactiveProduct =
      productRecords.find(
        (product) =>
          !product.active,
      );

    if (inactiveProduct) {
      throw new ApiError(
        `El modelo "${inactiveProduct.name}" está desactivado.`,
        400,
      );
    }

        const stockRecords =
      await db
        .select()
        .from(inventoryStocks)
        .where(
          and(
            eq(
              inventoryStocks
                .tenantId,
              tenantId,
            ),
            inArray(
              inventoryStocks
                .locationId,
              locationIds,
            ),
            inArray(
              inventoryStocks
                .productId,
              productIds,
            ),
          ),
        );

    const stocksByPair =
      new Map(
        stockRecords.map(
          (stock) => [
            `${stock.locationId}:${stock.productId}`,
            stock,
          ],
        ),
      );

    const locationsById =
      new Map(
        locationRecords.map(
          (locationRecord) => [
            locationRecord.id,
            locationRecord,
          ],
        ),
      );

    const productsById =
      new Map(
        productRecords.map(
          (productRecord) => [
            productRecord.id,
            productRecord,
          ],
        ),
      );

    const validatedItems =
      items.map((item) => {
        const stock =
          stocksByPair.get(
            `${item.locationId}:${item.productId}`,
          );

        const locationRecord =
          locationsById.get(
            item.locationId,
          );

        const productRecord =
          productsById.get(
            item.productId,
          );

        if (
          !stock ||
          !locationRecord ||
          !productRecord
        ) {
          throw new ApiError(
            "No existe inventario inicializado para uno de los modelos y ubicaciones seleccionados.",
            400,
          );
        }

        const physicalQuantity =
          Number(
            stock.quantity,
          );

        const reservedQuantity =
          Number(
            stock.reservedQuantity,
          );

        const availableQuantity =
          physicalQuantity -
          reservedQuantity;

        if (
          item.quantity >
          availableQuantity
        ) {
          throw new ApiError(
            `Solo hay ${availableQuantity} unidad(es) disponibles de "${productRecord.name}" en "${getLocationLabel(locationRecord)}".`,
            400,
          );
        }

        return {
          ...item,
          stock,
          location:
            locationRecord,
          product:
            productRecord,
          availableQuantity,
        };
      });

    const stockIds =
      validatedItems.map(
        (item) =>
          item.stock.id,
      );

    const previousReservations =
      await db
        .select({
          id:
            inventoryReservations.id,

          stockId:
            inventoryReservations
              .stockId,

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
              sourceId,
            ),
            inArray(
              inventoryReservations
                .stockId,
              stockIds,
            ),
          ),
        );

    if (
      previousReservations.length >
      0
    ) {
      throw new ApiError(
        "Esta oportunidad ya tiene una reserva registrada para uno o más de los modelos seleccionados.",
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

    const groupId =
      crypto.randomUUID();

    const sourceReference =
      getString(
        payload.sourceReference,
      ) ??
      deal.name;

    const customerName =
      getString(
        payload.customerName,
      );

    const notes =
      getString(
        payload.notes,
      );

    const now =
      new Date();

    const reservationIds =
      validatedItems.map(
        () =>
          crypto.randomUUID(),
      );

          const stockUpdateQueries =
      validatedItems.map(
        (item) =>
          db
            .update(
              inventoryStocks,
            )
            .set({
              reservedQuantity:
                sql`${inventoryStocks.reservedQuantity} + ${item.quantity}`,

              updatedAt: now,
            })
            .where(
              and(
                eq(
                  inventoryStocks.id,
                  item.stock.id,
                ),
                eq(
                  inventoryStocks
                    .tenantId,
                  tenantId,
                ),
              ),
            ),
      );

    const reservationInsertQuery =
      db
        .insert(
          inventoryReservations,
        )
        .values(
          validatedItems.map(
            (
              item,
              index,
            ) => ({
              id:
                reservationIds[
                  index
                ],

              tenantId,

              branchId:
                item.location
                  .branchId,

              locationId:
                item.location.id,

              productId:
                item.product.id,

              stockId:
                item.stock.id,

              sourceType:
                "Oportunidad",

              sourceId,

              sourceReference,

              quantity:
                item.quantity,

              status:
                "Activa",

              customerName:
                customerName ??
                null,

              notes:
                notes ?? null,

              expiresAt,

              createdByClerkUserId:
                userId,

              createdByName,

              metadata: {
                reservationGroupId:
                  groupId,

                dealName:
                  deal.name,

                dealStage:
                  deal.stage,

                productName:
                  item.product.name,

                locationName:
                  getLocationLabel(
                    item.location,
                  ),
              },

              createdAt: now,
              updatedAt: now,
            }),
          ),
        );

    const auditQueries =
      validatedItems.map(
        (item, position) =>
          createInventoryAuditQuery({
            tenantId,

            branchId:
              item.location
                .branchId,

            locationId:
              item.location.id,

            productId:
              item.product.id,

            entityType:
              "Reserva",

            entityId:
              reservationIds[
                position
              ],

            action:
              "Crear grupo",

            summary:
              `Se reservaron ${item.quantity} unidad(es) de ${item.product.name} para la oportunidad ${sourceReference}.`,

            reason:
              notes ?? null,

            actorClerkUserId:
              userId,

            actorName:
              createdByName,

            before: {
              reservedQuantity:
                Number(
                  item.stock
                    .reservedQuantity,
                ),

              availableQuantity:
                item
                  .availableQuantity,
            },

            after: {
              status:
                "Activa",

              quantity:
                item.quantity,

              reservedQuantity:
                Number(
                  item.stock
                    .reservedQuantity,
                ) +
                item.quantity,

              availableQuantity:
                item
                  .availableQuantity -
                item.quantity,

              customerName:
                customerName ??
                null,

              sourceReference,

              expiresAt:
                expiresAt
                  .toISOString(),
            },

            metadata: {
              groupId,
              sourceId,
              sourceType:
                "Oportunidad",
            },
          }),
      );

    const batchQueries = [
      ...stockUpdateQueries,
      reservationInsertQuery,
      ...auditQueries,
    ];

    await db.batch(
      batchQueries as unknown as
        Parameters<
          typeof db.batch
        >[0],
    );

    return NextResponse.json(
      {
        success: true,

        message:
          validatedItems.length ===
          1
            ? "La reserva fue creada correctamente."
            : `Se crearon ${validatedItems.length} reservas para la oportunidad.`,

        data: {
          groupId,
          sourceId,
          reservationIds,

          count:
            validatedItems.length,
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

export async function PATCH(
  request: Request,
) {
  try {
    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext(
      "edit",
    );

    const payload =
      (await request.json()) as
        GroupReservationUpdatePayload;

    const sourceId =
      getString(
        payload.sourceId,
      );

    if (!sourceId) {
      throw new ApiError(
        "No fue posible identificar la oportunidad.",
        400,
      );
    }

        const action =
      getString(
        payload.action,
      ) ?? "Reactivar";

    const validActions =
      new Set([
        "Reactivar",
        "Entregar",
        "Liberar",
        "Cancelar",
        "Extender",
      ]);

    if (
      !validActions.has(
        action,
      )
    ) {
      throw new ApiError(
        "Selecciona una acción grupal válida.",
        400,
      );
    }

    const expiresAt =
      action === "Reactivar" ||
      action === "Extender"
        ? getExpirationDate(
            payload.expiresAt,
          )
        : undefined;

        if (
      action !== "Reactivar"
    ) {
      const activeReservations =
        await db
          .select({
            id:
              inventoryReservations.id,

            branchId:
              inventoryReservations
                .branchId,
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
                sourceId,
              ),
              eq(
                inventoryReservations
                  .status,
                "Activa",
              ),
            ),
          );

      if (
        activeReservations.length ===
        0
      ) {
        throw new ApiError(
          "La oportunidad no tiene reservas activas.",
          409,
        );
      }

      for (
        const reservation of
        activeReservations
      ) {
        const canAccessBranch =
          branchAccess.allBranches ||
          (
            reservation.branchId &&
            branchAccess.branchIds.includes(
              reservation.branchId,
            )
          );

        if (!canAccessBranch) {
          throw new ApiError(
            "No tienes acceso a una de las ubicaciones reservadas.",
            403,
          );
        }
      }

      const user =
        await currentUser();

      const performedByName =
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

      const reason =
        getString(
          payload.reason,
        ) ??
        (
          action === "Entregar"
            ? "Entrega al cliente"
            : action === "Cancelar"
              ? "Reservas canceladas"
              : action === "Liberar"
                ? "Reservas liberadas"
                : "Extensión grupal"
        );

      const now =
        new Date();

      if (
        action === "Extender"
      ) {
        await db.execute(
          sql`
            UPDATE ${inventoryReservations}
            SET
              expires_at = ${expiresAt},
              updated_at = ${now},
              metadata =
                coalesce(
                  metadata,
                  '{}'::jsonb
                )
                || jsonb_build_object(
                  'lastGroupExtensionAt',
                  ${now}::timestamptz,
                  'lastGroupExtensionByClerkUserId',
                  ${userId}::text,
                  'lastGroupExtensionReason',
                  ${reason}::text
                )
            WHERE
              tenant_id = ${tenantId}
              AND source_type =
                'Oportunidad'
              AND source_id =
                ${sourceId}
              AND status = 'Activa'
          `,
        );

        await createInventoryAuditQuery({
          tenantId,

          branchId:
            null,

          locationId:
            null,

          productId:
            null,

          entityType:
            "Grupo de reservas",

          entityId:
            sourceId,

          action:
            "Extender",

          summary:
            `Se extendieron ${activeReservations.length} reservas de la oportunidad.`,

          reason,

          actorClerkUserId:
            userId,

          actorName:
            performedByName,

          before: {
            status:
              "Activa",

            reservationCount:
              activeReservations.length,
          },

          after: {
            status:
              "Activa",

            reservationCount:
              activeReservations.length,

            expiresAt:
              expiresAt
                ?.toISOString() ??
              null,
          },

          metadata: {
            sourceType:
              "Oportunidad",

            sourceId,
          },
        });

        return NextResponse.json({
          success: true,

          message:
            `Se extendieron ${activeReservations.length} reservas correctamente.`,

          data: {
            sourceId,

            count:
              activeReservations.length,

            expiresAt:
              expiresAt
                ?.toISOString(),
          },
        });
      }

      await db.execute(
        sql`
          WITH selected_reservations AS (
            SELECT
              reservation.id,
              reservation.tenant_id,
              reservation.branch_id,
              reservation.location_id,
              reservation.product_id,
              reservation.stock_id,
              reservation.quantity,
              reservation.source_type,
              reservation.source_reference,
              reservation.customer_name,
              stock.quantity AS
                stock_quantity,
              stock.reserved_quantity AS
                stock_reserved_quantity,
              stock.average_unit_cost AS
                average_unit_cost,
              product.name AS
                product_name,
              location.name AS
                location_name
            FROM
              ${inventoryReservations}
                AS reservation
            INNER JOIN
              ${inventoryStocks}
                AS stock
              ON
                stock.id =
                  reservation.stock_id
                AND stock.tenant_id =
                  ${tenantId}
            INNER JOIN
              ${crmProducts}
                AS product
              ON
                product.id =
                  reservation.product_id
                AND product.tenant_id =
                  ${tenantId}
            INNER JOIN
              ${inventoryLocations}
                AS location
              ON
                location.id =
                  reservation.location_id
                AND location.tenant_id =
                  ${tenantId}
            WHERE
              reservation.tenant_id =
                ${tenantId}
              AND reservation.source_type =
                'Oportunidad'
              AND reservation.source_id =
                ${sourceId}
              AND reservation.status =
                'Activa'
            FOR UPDATE OF
              reservation,
              stock
          ),
          updated_reservations AS (
            UPDATE
              ${inventoryReservations}
                AS reservation
            SET
              status =
                CASE
                  WHEN ${action}::text =
                    'Entregar'
                    THEN 'Consumida'
                  WHEN ${action}::text =
                    'Cancelar'
                    THEN 'Cancelada'
                  ELSE 'Liberada'
                END,
              released_by_clerk_user_id =
                ${userId},
              released_by_name =
                ${performedByName},
              released_at =
                ${now},
              release_reason =
                ${reason},
              updated_at =
                ${now}
            FROM
              selected_reservations
            WHERE
              reservation.id =
                selected_reservations.id
            RETURNING
              reservation.id
          ),
          updated_stocks AS (
            UPDATE
              ${inventoryStocks}
                AS stock
            SET
              quantity =
                CASE
                  WHEN ${action}::text =
                    'Entregar'
                    THEN
                      stock.quantity -
                      selected_reservations
                        .quantity
                  ELSE
                    stock.quantity
                END,
              reserved_quantity =
                stock.reserved_quantity -
                selected_reservations
                  .quantity,
              updated_at =
                ${now}
            FROM
              selected_reservations
            WHERE
              stock.id =
                selected_reservations
                  .stock_id
              AND stock.tenant_id =
                ${tenantId}
            RETURNING
              stock.id
          )
          INSERT INTO
            ${inventoryMovements} (
              id,
              tenant_id,
              branch_id,
              location_id,
              product_id,
              stock_id,
              type,
              quantity,
              previous_quantity,
              resulting_quantity,
              reason,
              reference,
              unit_cost,
              total_cost,
              resulting_average_cost,
              performed_by_clerk_user_id,
              performed_by_name,
              metadata,
              created_at
            )
          SELECT
            gen_random_uuid(),
            selected.tenant_id,
            selected.branch_id,
            selected.location_id,
            selected.product_id,
            selected.stock_id,
            'Salida reservada',
            -selected.quantity,
            selected.stock_quantity,
            selected.stock_quantity -
              selected.quantity,
            ${reason},
            coalesce(
              selected.source_reference,
              'Entrega de oportunidad'
            ),
            selected.average_unit_cost,
            -(
              selected.quantity *
              selected.average_unit_cost
            ),
            selected.average_unit_cost,
            ${userId},
            ${performedByName},
            jsonb_build_object(
              'reservationId',
              selected.id,
              'sourceType',
              selected.source_type,
              'customerName',
              selected.customer_name,
              'productName',
              selected.product_name,
              'locationName',
              selected.location_name,
              'groupAction',
              true
            ),
            ${now}
          FROM
            selected_reservations
              AS selected
          WHERE
            ${action}::text =
              'Entregar'
        `,
      );

      const resultingStatus =
        action === "Entregar"
          ? "Consumida"
          : action === "Cancelar"
            ? "Cancelada"
            : "Liberada";

      await createInventoryAuditQuery({
        tenantId,

        branchId:
          null,

        locationId:
          null,

        productId:
          null,

        entityType:
          "Grupo de reservas",

        entityId:
          sourceId,

        action:
          action === "Entregar"
            ? "Confirmar entrega"
            : action,

        summary:
          action === "Entregar"
            ? `Se confirmaron ${activeReservations.length} entregas del grupo.`
            : action === "Cancelar"
              ? `Se cancelaron ${activeReservations.length} reservas del grupo.`
              : `Se liberaron ${activeReservations.length} reservas del grupo.`,

        reason,

        actorClerkUserId:
          userId,

        actorName:
          performedByName,

        before: {
          status:
            "Activa",

          reservationCount:
            activeReservations.length,
        },

        after: {
          status:
            resultingStatus,

          reservationCount:
            activeReservations.length,
        },

        metadata: {
          sourceType:
            "Oportunidad",

          sourceId,

          groupAction:
            true,
        },
      });

      return NextResponse.json({
        success: true,

        message:
          action === "Entregar"
            ? `Se confirmaron ${activeReservations.length} entregas y sus salidas quedaron registradas en el Kardex.`
            : action === "Cancelar"
              ? `Se cancelaron ${activeReservations.length} reservas correctamente.`
              : `Se liberaron ${activeReservations.length} reservas correctamente.`,

        data: {
          sourceId,

          count:
            activeReservations.length,

          action,
        },
      });
    }

    const [deal] =
      await db
        .select({
          id:
            crmDeals.id,

          status:
            crmDeals.status,
        })
        .from(crmDeals)
        .where(
          and(
            eq(
              crmDeals.id,
              sourceId,
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
        "La oportunidad no existe o pertenece a otra empresa.",
        404,
      );
    }

    if (
      normalizeText(
        deal.status,
      ) !== "ganada"
    ) {
      throw new ApiError(
        "Solo pueden reactivarse reservas de una oportunidad ganada.",
        400,
      );
    }

    const reservationRecords =
      await db
        .select({
          id:
            inventoryReservations.id,

          status:
            inventoryReservations.status,

          branchId:
            inventoryReservations.branchId,

          stockId:
            inventoryReservations.stockId,

          quantity:
            inventoryReservations.quantity,

          productName:
            crmProducts.name,

          stockQuantity:
            inventoryStocks.quantity,

          stockReservedQuantity:
            inventoryStocks
              .reservedQuantity,
        })
        .from(
          inventoryReservations,
        )
        .innerJoin(
          inventoryStocks,
          and(
            eq(
              inventoryReservations
                .stockId,
              inventoryStocks.id,
            ),
            eq(
              inventoryStocks
                .tenantId,
              tenantId,
            ),
          ),
        )
        .innerJoin(
          crmProducts,
          and(
            eq(
              inventoryReservations
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
              sourceId,
            ),
          ),
        );

    if (
      reservationRecords.some(
        (reservation) =>
          reservation.status ===
          "Activa",
      )
    ) {
      throw new ApiError(
        "La oportunidad ya tiene reservas activas.",
        409,
      );
    }

    const reactivatableStatuses =
      new Set([
        "Liberada",
        "Cancelada",
        "Vencida",
      ]);

    const reservationsToReactivate =
      reservationRecords.filter(
        (reservation) =>
          reactivatableStatuses.has(
            reservation.status,
          ),
      );

    if (
      reservationsToReactivate
        .length === 0
    ) {
      throw new ApiError(
        "La oportunidad no tiene reservas que puedan reactivarse.",
        400,
      );
    }

    for (
      const reservation of
      reservationsToReactivate
    ) {
      const canAccessBranch =
        branchAccess.allBranches ||
        (
          reservation.branchId &&
          branchAccess.branchIds.includes(
            reservation.branchId,
          )
        );

      if (!canAccessBranch) {
        throw new ApiError(
          "No tienes acceso a una de las ubicaciones reservadas.",
          403,
        );
      }
    }

    const shortages =
      reservationsToReactivate
        .filter(
          (reservation) =>
            (
              reservation.stockQuantity -
              reservation
                .stockReservedQuantity
            ) <
            reservation.quantity,
        )
        .map(
          (reservation) =>
            `${reservation.productName}: requiere ${reservation.quantity} y hay ${
              reservation.stockQuantity -
              reservation
                .stockReservedQuantity
            } disponible(s)`,
        );

    if (shortages.length > 0) {
      throw new ApiError(
        `No hay existencia suficiente para reactivar todas las reservas. ${shortages.join(
          ". ",
        )}.`,
        409,
      );
    }

    const user =
      await currentUser();

    const performedByName =
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

    await db.execute(
      sql`
        WITH reactivated_reservations AS (
          UPDATE ${inventoryReservations}
          SET
            status = 'Activa',
            expires_at = ${expiresAt},
            released_by_clerk_user_id = NULL,
            released_by_name = NULL,
            released_at = NULL,
            release_reason = NULL,
            updated_at = ${now},
            metadata =
              coalesce(metadata, '{}'::jsonb)
              || jsonb_build_object(
                'lastReactivatedAt',
                ${now}::timestamptz,
                'lastReactivatedByClerkUserId',
                ${userId}::text
              )
          WHERE
            tenant_id = ${tenantId}
            AND source_type = 'Oportunidad'
            AND source_id = ${sourceId}
            AND status IN (
              'Liberada',
              'Cancelada',
              'Vencida'
            )
          RETURNING
            stock_id,
            quantity
        ),
        reactivated_totals AS (
          SELECT
            stock_id,
            sum(quantity)::integer AS quantity
          FROM reactivated_reservations
          GROUP BY stock_id
        )
        UPDATE ${inventoryStocks} AS stock
        SET
          reserved_quantity =
            stock.reserved_quantity +
            reactivated_totals.quantity,
          updated_at = ${now}
        FROM reactivated_totals
        WHERE
          stock.id =
            reactivated_totals.stock_id
          AND stock.tenant_id =
            ${tenantId}
      `,
    );

    await createInventoryAuditQuery({
      tenantId,

      branchId:
        null,

      locationId:
        null,

      productId:
        null,

      entityType:
        "Grupo de reservas",

      entityId:
        sourceId,

      action:
        "Reactivar",

      summary:
        `Se reactivaron ${reservationsToReactivate.length} reservas de la oportunidad.`,

      actorClerkUserId:
        userId,

      actorName:
        performedByName,

      before: {
        status:
          "Liberada, cancelada o vencida",

        reservationCount:
          reservationsToReactivate
            .length,
      },

      after: {
        status:
          "Activa",

        reservationCount:
          reservationsToReactivate
            .length,

        expiresAt:
          expiresAt
            ?.toISOString() ??
          null,
      },

      metadata: {
        sourceType:
          "Oportunidad",

        sourceId,

        groupAction:
          true,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        reservationsToReactivate
          .length === 1
          ? "La reserva fue reactivada correctamente."
          : `Se reactivaron ${reservationsToReactivate.length} reservas correctamente.`,

      data: {
        sourceId,

        count:
          reservationsToReactivate
            .length,

        expiresAt:
          expiresAt?.toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}