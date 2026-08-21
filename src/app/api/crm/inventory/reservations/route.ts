import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
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
  isInventoryTrackedProduct,
} from "@/lib/crm/inventory-products";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type ReservationItemPayload = {
  locationId?: unknown;
  productId?: unknown;
  quantity?: unknown;
};

type ReservationPayload = {
  locationId?: unknown;
  productId?: unknown;
  quantity?: unknown;

  items?: unknown;

  sourceType?: unknown;
  sourceId?: unknown;
  sourceReference?: unknown;

  customerName?: unknown;
  notes?: unknown;
  expiresAt?: unknown;
};

type ReservationUpdatePayload = {
  id?: unknown;
  action?: unknown;
  releaseReason?: unknown;
  expiresAt?: unknown;
};

type ReservationAction =
  | "Liberar"
  | "Cancelar"
  | "Consumir"
  | "Extender";

type InventoryLocationRecord = {
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

function getOptionalDate(
  value: unknown,
): Date | undefined {
  const normalized =
    getString(value);

  if (!normalized) {
    return undefined;
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

  return date;
}

function getReservationAction(
  value: unknown,
): ReservationAction {
  if (
    value === "Liberar" ||
    value === "Cancelar" ||
    value === "Consumir" ||
    value === "Extender"
  ) {
    return value;
  }

  throw new ApiError(
    "Selecciona una acción válida para la reserva.",
    400,
  );
}

function canAccessLocation(
  location:
    InventoryLocationRecord,
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
  location:
    InventoryLocationRecord,
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
      (
        errorRecord.constraint ===
          "inventory_stocks_reserved_lte_quantity" ||
        errorRecord.constraint ===
          "inventory_stocks_reserved_nonnegative" ||
        errorRecord.constraint ===
          "inventory_stocks_quantity_nonnegative"
      )
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
          "La disponibilidad cambió mientras se registraba la reserva. Actualiza el inventario e inténtalo nuevamente.",
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
    "No fue posible procesar las reservas de inventario:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar las reservas de inventario.",
    },
    {
      status: 500,
    },
  );
}


async function getContext(
  permission:
    | "view"
    | "create"
    | "edit",
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

async function releaseExpiredReservations(
  tenantId: string,
) {
  const [tenantRecord] =
    await db
      .select({
        metadata:
          tenants.metadata,
      })
      .from(tenants)
      .where(
        eq(
          tenants.id,
          tenantId,
        ),
      )
      .limit(1);

  const metadata =
    tenantRecord?.metadata &&
    typeof tenantRecord.metadata ===
      "object" &&
    !Array.isArray(
      tenantRecord.metadata,
    )
      ? tenantRecord.metadata as
          Record<string, unknown>
      : {};

  const rawSettings =
    metadata
      .inventoryReservationSettings;

  const settings =
    rawSettings &&
    typeof rawSettings ===
      "object" &&
    !Array.isArray(
      rawSettings,
    )
      ? rawSettings as
          Record<string, unknown>
      : {};

  if (
    settings.autoReleaseExpired ===
    false
  ) {
    return;
  }

  const now =
    new Date();

  const [expiredReservation] =
    await db
      .select({
        id:
          inventoryReservations.id,
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
              .status,
            "Activa",
          ),
          isNotNull(
            inventoryReservations
              .expiresAt,
          ),
          lt(
            inventoryReservations
              .expiresAt,
            now,
          ),
        ),
      )
      .limit(1);

  if (!expiredReservation) {
    return;
  }

  await db.execute(
    sql`
      WITH expired_reservations AS (
        UPDATE ${inventoryReservations}
        SET
          status = 'Vencida',
          released_by_name = 'Sistema',
          released_at = ${now},
          release_reason = 'Vencimiento automático',
          updated_at = ${now}
        WHERE
          tenant_id = ${tenantId}
          AND status = 'Activa'
          AND expires_at IS NOT NULL
          AND expires_at < ${now}
        RETURNING stock_id, quantity
      ),
      released_by_stock AS (
        SELECT
          stock_id,
          SUM(quantity)::integer AS quantity
        FROM expired_reservations
        GROUP BY stock_id
      )
      UPDATE ${inventoryStocks}
      SET
        reserved_quantity = GREATEST(
          ${inventoryStocks.reservedQuantity}
          - released_by_stock.quantity,
          0
        ),
        updated_at = ${now}
      FROM released_by_stock
      WHERE
        ${inventoryStocks.id}
          = released_by_stock.stock_id
        AND ${inventoryStocks.tenantId}
          = ${tenantId}
    `,
  );
}

export async function GET(
  request: Request,
) {
  try {
    const {
      tenantId,
      branchAccess,
    } = await getContext(
      "view",
    );

    await releaseExpiredReservations(
      tenantId,
    );

    const url =
      new URL(request.url);

    const requestedStatus =
      getString(
        url.searchParams.get(
          "status",
        ),
      );

    const requestedProductId =
      getString(
        url.searchParams.get(
          "productId",
        ),
      );

    const requestedLocationId =
      getString(
        url.searchParams.get(
          "locationId",
        ),
      );

    const locationAccessCondition =
      branchAccess.allBranches
        ? sql<boolean>`true`
        : branchAccess
              .branchIds
              .length > 0
          ? inArray(
              inventoryLocations
                .branchId,
              branchAccess
                .branchIds,
            )
          : sql<boolean>`false`;

    const records =
      await db
        .select({
          id:
            inventoryReservations.id,

          sourceType:
            inventoryReservations
              .sourceType,

          sourceId:
            inventoryReservations
              .sourceId,

          sourceReference:
            inventoryReservations
              .sourceReference,

          quantity:
            inventoryReservations
              .quantity,

          status:
            inventoryReservations
              .status,

          customerName:
            inventoryReservations
              .customerName,

          notes:
            inventoryReservations
              .notes,

          expiresAt:
            inventoryReservations
              .expiresAt,

          createdByName:
            inventoryReservations
              .createdByName,

          releasedByName:
            inventoryReservations
              .releasedByName,

          releasedAt:
            inventoryReservations
              .releasedAt,

          releaseReason:
            inventoryReservations
              .releaseReason,

          createdAt:
            inventoryReservations
              .createdAt,

          updatedAt:
            inventoryReservations
              .updatedAt,

          branchId:
            inventoryReservations
              .branchId,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          locationId:
            inventoryReservations
              .locationId,

          locationName:
            inventoryLocations.name,

          locationCode:
            inventoryLocations.code,

          locationType:
            inventoryLocations.type,

          productId:
            inventoryReservations
              .productId,

          productName:
            crmProducts.name,

          productCode:
            crmProducts.code,

          stockId:
            inventoryReservations
              .stockId,

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
          inventoryLocations,
          and(
            eq(
              inventoryReservations
                .locationId,
              inventoryLocations.id,
            ),
            eq(
              inventoryLocations
                .tenantId,
              tenantId,
            ),
          ),
        )
        .leftJoin(
          tenantBranches,
          and(
            eq(
              inventoryReservations
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
        .where(
          and(
            eq(
              inventoryReservations
                .tenantId,
              tenantId,
            ),

            locationAccessCondition,

            requestedStatus
              ? eq(
                  inventoryReservations
                    .status,
                  requestedStatus,
                )
              : sql<boolean>`true`,

            requestedProductId
              ? eq(
                  inventoryReservations
                    .productId,
                  requestedProductId,
                )
              : sql<boolean>`true`,

            requestedLocationId
              ? eq(
                  inventoryReservations
                    .locationId,
                  requestedLocationId,
                )
              : sql<boolean>`true`,
          ),
        )
        .orderBy(
          desc(
            inventoryReservations
              .createdAt,
          ),
        )
        .limit(250);

    return NextResponse.json({
      success: true,

      data: records.map(
        (record) => {
          const locationLabel =
            record.locationCode
              ? `${record.locationName} (${record.locationCode})`
              : record.locationName;

          const branchLabel =
            record.branchName
              ? record.branchCode
                ? `${record.branchName} (${record.branchCode})`
                : record.branchName
              : "Bodega independiente";

          return {
            ...record,

            locationLabel,
            branchLabel,

            availableQuantity:
              record.stockQuantity -
              record
                .stockReservedQuantity,

            expiresAt:
              record.expiresAt
                ?.toISOString() ??
              null,

            releasedAt:
              record.releasedAt
                ?.toISOString() ??
              null,

            createdAt:
              record.createdAt
                .toISOString(),

            updatedAt:
              record.updatedAt
                .toISOString(),
          };
        },
      ),

      meta: {
        count:
          records.length,

        limit: 250,
      },
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
        ReservationPayload;

    const locationId =
      getString(
        payload.locationId,
      );

    const productId =
      getString(
        payload.productId,
      );

    const quantity =
      getPositiveInteger(
        payload.quantity,
      );

    if (!locationId) {
      throw new ApiError(
        "Selecciona una ubicación.",
        400,
      );
    }

    if (!productId) {
      throw new ApiError(
        "Selecciona un producto.",
        400,
      );
    }

    if (!quantity) {
      throw new ApiError(
        "La cantidad reservada debe ser un entero mayor que cero.",
        400,
      );
    }

    const sourceType =
      getString(
        payload.sourceType,
      ) ??
      "Manual";

    const sourceId =
      getString(
        payload.sourceId,
      );

    if (
      sourceId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        sourceId,
      )
    ) {
      throw new ApiError(
        "El identificador del documento de origen no es válido.",
        400,
      );
    }

    const sourceReference =
      getString(
        payload.sourceReference,
      );

    const customerName =
      getString(
        payload.customerName,
      );

    const notes =
      getString(
        payload.notes,
      );

    const expiresAt =
      getOptionalDate(
        payload.expiresAt,
      );

    if (!expiresAt) {
      throw new ApiError(
        "Selecciona la fecha y hora de vencimiento de la reserva.",
        400,
      );
    }

    if (
      expiresAt.getTime() <=
      Date.now()
    ) {
      throw new ApiError(
        "La fecha de vencimiento debe ser posterior a la fecha actual.",
        400,
      );
    }
    const [location] =
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
        })
        .from(
          inventoryLocations,
        )
        .leftJoin(
          tenantBranches,
          and(
            eq(
              inventoryLocations
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
          and(
            eq(
              inventoryLocations.id,
              locationId,
            ),
            eq(
              inventoryLocations
                .tenantId,
              tenantId,
            ),
            eq(
              inventoryLocations.active,
              true,
            ),
          ),
        )
        .limit(1);

    if (!location) {
      throw new ApiError(
        "La ubicación no existe o está inactiva.",
        404,
      );
    }

    if (
      !canAccessLocation(
        location,
        branchAccess,
      )
    ) {
      throw new ApiError(
        "No tienes acceso a la ubicación seleccionada.",
        403,
      );
    }

    const [product] =
      await db
        .select({
          id: crmProducts.id,
          name:
            crmProducts.name,
        })
        .from(crmProducts)
        .where(
          and(
            eq(
              crmProducts.id,
              productId,
            ),
            eq(
              crmProducts.tenantId,
              tenantId,
            ),
            eq(
              crmProducts.active,
              true,
            ),
          ),
        )
        .limit(1);

    if (!product) {
      throw new ApiError(
        "El producto no existe o está inactivo.",
        404,
      );
    }

    const inventoryTracked =
      await isInventoryTrackedProduct(
        tenantId,
        productId,
      );

    if (!inventoryTracked) {
      throw new ApiError(
        "El elemento seleccionado pertenece a un tipo que no administra inventario.",
        400,
      );
    }

    const [stock] =
      await db
        .select()
        .from(
          inventoryStocks,
        )
        .where(
          and(
            eq(
              inventoryStocks
                .tenantId,
              tenantId,
            ),
            eq(
              inventoryStocks
                .locationId,
              locationId,
            ),
            eq(
              inventoryStocks
                .productId,
              productId,
            ),
          ),
        )
        .limit(1);

    if (!stock) {
      throw new ApiError(
        "El producto no tiene existencias inicializadas en esta ubicación.",
        400,
      );
    }

    const availableQuantity =
      stock.quantity -
      stock.reservedQuantity;

    if (
      quantity >
      availableQuantity
    ) {
      throw new ApiError(
        `Solo hay ${availableQuantity} unidades disponibles para reservar.`,
        400,
      );
    }

    if (
      sourceId
    ) {
      const [existingReservation] =
        await db
          .select({
            id:
              inventoryReservations.id,
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
                sourceType,
              ),
              eq(
                inventoryReservations
                  .sourceId,
                sourceId,
              ),
              eq(
                inventoryReservations
                  .stockId,
                stock.id,
              ),
            ),
          )
          .limit(1);

      if (
        existingReservation
      ) {
        throw new ApiError(
          "Este documento ya tiene una reserva para el producto y la ubicación seleccionados.",
          409,
        );
      }
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

    const reservationId =
      crypto.randomUUID();

    const now =
      new Date();

    const resultingReservedQuantity =
      stock.reservedQuantity +
      quantity;

    const stockQuery =
      db
        .update(
          inventoryStocks,
        )
        .set({
          reservedQuantity:
            sql`${inventoryStocks.reservedQuantity} + ${quantity}`,

          updatedAt: now,
        })
        .where(
          and(
            eq(
              inventoryStocks.id,
              stock.id,
            ),
            eq(
              inventoryStocks
                .tenantId,
              tenantId,
            ),
          ),
        );

    const reservationQuery =
      db
        .insert(
          inventoryReservations,
        )
        .values({
          id:
            reservationId,

          tenantId,

          branchId:
            location.branchId,

          locationId:
            location.id,

          productId:
            product.id,

          stockId:
            stock.id,

          sourceType,
          sourceId:
            sourceId ?? null,

          sourceReference:
            sourceReference ??
            `RES-${reservationId
              .slice(0, 8)
              .toUpperCase()}`,

          quantity,

          status:
            "Activa",

          customerName:
            customerName ?? null,

          notes:
            notes ?? null,

          expiresAt:
            expiresAt ?? null,

          createdByClerkUserId:
            userId,

          createdByName,

          metadata: {
            productName:
              product.name,

            locationName:
              getLocationLabel(
                location,
              ),
          },

          createdAt: now,
          updatedAt: now,
        });

    const auditQuery =
      createInventoryAuditQuery({
        tenantId,

        branchId:
          location.branchId,

        locationId:
          location.id,

        productId:
          product.id,

        entityType:
          "Reserva",

        entityId:
          reservationId,

        action:
          "Crear",

        summary:
          `Se reservaron ${quantity} unidad(es) de ${product.name}.`,

        reason:
          notes ?? null,

        actorClerkUserId:
          userId,

        actorName:
          createdByName,

        before: {
          reservedQuantity:
            stock.reservedQuantity,

          availableQuantity:
            stock.quantity -
            stock.reservedQuantity,
        },

        after: {
          status:
            "Activa",

          quantity,

          reservedQuantity:
            resultingReservedQuantity,

          availableQuantity:
            stock.quantity -
            resultingReservedQuantity,

          customerName:
            customerName ?? null,

          sourceType,

          sourceReference:
            sourceReference ??
            `RES-${reservationId
              .slice(0, 8)
              .toUpperCase()}`,

          expiresAt:
            expiresAt
              ?.toISOString() ??
            null,
        },
      });

    await db.batch([
      stockQuery,
      reservationQuery,
      auditQuery,
    ]);

    return NextResponse.json(
      {
        success: true,

        message:
          "La reserva fue registrada correctamente.",

        data: {
          reservationId,

          stockId:
            stock.id,

          locationId:
            location.id,

          productId:
            product.id,

          quantity,

          reservedQuantity:
            resultingReservedQuantity,

          availableQuantity:
            stock.quantity -
            resultingReservedQuantity,
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
        ReservationUpdatePayload;

    const reservationId =
      getString(
        payload.id,
      );

    if (!reservationId) {
      throw new ApiError(
        "No fue posible identificar la reserva.",
        400,
      );
    }

    const action =
      getReservationAction(
        payload.action,
      );

    const releaseReason =
      getString(
        payload.releaseReason,
      );

    const [reservation] =
      await db
        .select({
          id:
            inventoryReservations.id,

          status:
            inventoryReservations
              .status,

          expiresAt:
            inventoryReservations
              .expiresAt,

          createdAt:
            inventoryReservations
              .createdAt,

          metadata:
            inventoryReservations
              .metadata,

          quantity:
            inventoryReservations
              .quantity,

          sourceType:
            inventoryReservations
              .sourceType,

          sourceReference:
            inventoryReservations
              .sourceReference,

          customerName:
            inventoryReservations
              .customerName,

          branchId:
            inventoryReservations
              .branchId,

          locationId:
            inventoryReservations
              .locationId,

          productId:
            inventoryReservations
              .productId,

          stockId:
            inventoryReservations
              .stockId,

          locationName:
            inventoryLocations.name,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          productName:
            crmProducts.name,
        })
        .from(
          inventoryReservations,
        )
        .innerJoin(
          inventoryLocations,
          and(
            eq(
              inventoryReservations
                .locationId,
              inventoryLocations.id,
            ),
            eq(
              inventoryLocations
                .tenantId,
              tenantId,
            ),
          ),
        )
        .leftJoin(
          tenantBranches,
          and(
            eq(
              inventoryReservations
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
              inventoryReservations.id,
              reservationId,
            ),
            eq(
              inventoryReservations
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!reservation) {
      throw new ApiError(
        "La reserva no existe.",
        404,
      );
    }

    if (
      reservation.status !==
      "Activa"
    ) {
      throw new ApiError(
        `La reserva ya se encuentra ${reservation.status.toLowerCase()}.`,
        409,
      );
    }

    const locationRecord:
      InventoryLocationRecord = {
      id:
        reservation.locationId,

      branchId:
        reservation.branchId,

      name:
        reservation.locationName,

      branchName:
        reservation.branchName,

      branchCode:
        reservation.branchCode,
    };

    if (
      !canAccessLocation(
        locationRecord,
        branchAccess,
      )
    ) {
      throw new ApiError(
        "No tienes acceso a la ubicación de esta reserva.",
        403,
      );
    }

        if (
      action === "Extender"
    ) {
      const requestedExpiresAt =
        getOptionalDate(
          payload.expiresAt,
        );

      if (!requestedExpiresAt) {
        throw new ApiError(
          "Selecciona la nueva fecha de vencimiento.",
          400,
        );
      }

      const now =
        new Date();

      if (
        requestedExpiresAt.getTime() <=
        now.getTime()
      ) {
        throw new ApiError(
          "La nueva fecha de vencimiento debe ser futura.",
          400,
        );
      }

      if (
        reservation.expiresAt &&
        reservation.expiresAt.getTime() <=
          now.getTime()
      ) {
        throw new ApiError(
          "La reserva ya venció y no puede extenderse.",
          409,
        );
      }

      if (
        reservation.expiresAt &&
        requestedExpiresAt.getTime() <=
          reservation.expiresAt.getTime()
      ) {
        throw new ApiError(
          "La nueva fecha debe ser posterior al vencimiento actual.",
          400,
        );
      }

      const [tenantRecord] =
        await db
          .select({
            metadata:
              tenants.metadata,
          })
          .from(tenants)
          .where(
            eq(
              tenants.id,
              tenantId,
            ),
          )
          .limit(1);

      const tenantMetadata =
        tenantRecord?.metadata &&
        typeof tenantRecord.metadata ===
          "object" &&
        !Array.isArray(
          tenantRecord.metadata,
        )
          ? tenantRecord.metadata as
              Record<string, unknown>
          : {};

      const rawSettings =
        tenantMetadata
          .inventoryReservationSettings;

      const settings =
        rawSettings &&
        typeof rawSettings ===
          "object" &&
        !Array.isArray(
          rawSettings,
        )
          ? rawSettings as
              Record<string, unknown>
          : {};

      if (
        settings.allowExtensions ===
        false
      ) {
        throw new ApiError(
          "La política de reservas no permite extensiones.",
          403,
        );
      }

      const configuredMaximumHours =
        Number(
          settings.maximumHours ??
          360,
        );

      const maximumHours =
        Number.isInteger(
          configuredMaximumHours,
        ) &&
        configuredMaximumHours > 0
          ? configuredMaximumHours
          : 360;

      const maximumExpiresAt =
        new Date(
          reservation.createdAt
            .getTime() +
          maximumHours *
            60 *
            60 *
            1000,
        );

      if (
        requestedExpiresAt.getTime() >
        maximumExpiresAt.getTime()
      ) {
        throw new ApiError(
          `La reserva no puede extenderse más allá de ${maximumHours} horas desde su creación.`,
          400,
        );
      }

      const user =
        await currentUser();

      const extendedByName =
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

      const previousHistory =
        Array.isArray(
          reservation.metadata
            .extensionHistory,
        )
          ? reservation.metadata
              .extensionHistory
          : [];

      const extensionReason =
        releaseReason ??
        "Extensión de reserva";

      const extensionQuery =
        db
          .update(
            inventoryReservations,
          )
          .set({
            expiresAt:
              requestedExpiresAt,

            metadata: {
              ...reservation.metadata,

              extensionHistory: [
                ...previousHistory,

                {
                  previousExpiresAt:
                    reservation.expiresAt
                      ?.toISOString() ??
                    null,

                  newExpiresAt:
                    requestedExpiresAt
                      .toISOString(),

                  extendedByClerkUserId:
                    userId,

                  extendedByName,

                  reason:
                    extensionReason,

                  extendedAt:
                    now.toISOString(),
                },
              ],
            },

            updatedAt: now,
          })
          .where(
            and(
              eq(
                inventoryReservations.id,
                reservation.id,
              ),
              eq(
                inventoryReservations
                  .tenantId,
                tenantId,
              ),
              eq(
                inventoryReservations
                  .status,
                "Activa",
              ),
            ),
          );

      const auditQuery =
        createInventoryAuditQuery({
          tenantId,

          branchId:
            reservation.branchId,

          locationId:
            reservation.locationId,

          productId:
            reservation.productId,

          entityType:
            "Reserva",

          entityId:
            reservation.id,

          action:
            "Extender",

          summary:
            `Se extendió el vencimiento de la reserva de ${reservation.productName}.`,

          reason:
            extensionReason,

          actorClerkUserId:
            userId,

          actorName:
            extendedByName,

          before: {
            status:
              reservation.status,

            expiresAt:
              reservation.expiresAt
                ?.toISOString() ??
              null,
          },

          after: {
            status:
              reservation.status,

            expiresAt:
              requestedExpiresAt
                .toISOString(),
          },
        });

      await db.batch([
        extensionQuery,
        auditQuery,
      ]);

      return NextResponse.json({
        success: true,

        message:
          "El vencimiento de la reserva fue extendido correctamente.",

        data: {
          reservationId:
            reservation.id,

          status:
            reservation.status,

          previousExpiresAt:
            reservation.expiresAt
              ?.toISOString() ??
            null,

          expiresAt:
            requestedExpiresAt
              .toISOString(),

          extendedByName,
          extensionReason,
        },
      });
    }

    const [stock] =
      await db
        .select()
        .from(
          inventoryStocks,
        )
        .where(
          and(
            eq(
              inventoryStocks.id,
              reservation.stockId,
            ),
            eq(
              inventoryStocks
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!stock) {
      throw new ApiError(
        "No fue posible encontrar la existencia relacionada con la reserva.",
        404,
      );
    }

    if (
      stock.reservedQuantity <
      reservation.quantity
    ) {
      throw new ApiError(
        "La cantidad reservada de la existencia es menor que la registrada en la reserva.",
        409,
      );
    }

    if (
      action === "Consumir" &&
      stock.quantity <
        reservation.quantity
    ) {
      throw new ApiError(
        "La existencia física es insuficiente para consumir esta reserva.",
        409,
      );
    }

    const resultingReservedQuantity =
      stock.reservedQuantity -
      reservation.quantity;

    const resultingQuantity =
      action === "Consumir"
        ? stock.quantity -
          reservation.quantity
        : stock.quantity;

    if (
      resultingQuantity <
      resultingReservedQuantity
    ) {
      throw new ApiError(
        "La existencia final no puede ser menor que las unidades que continuarán reservadas.",
        409,
      );
    }

    const user =
      await currentUser();

    const releasedByName =
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

    const resultingStatus =
      action === "Liberar"
        ? "Liberada"
        : action === "Cancelar"
          ? "Cancelada"
          : "Consumida";

    const normalizedReason =
      releaseReason ??
      (
        action === "Consumir"
          ? "Entrega de inventario reservado"
          : action === "Cancelar"
            ? "Cancelación de reserva"
            : "Liberación de reserva"
      );

    const now =
      new Date();

    const stockQuery =
      db
        .update(
          inventoryStocks,
        )
        .set({
          quantity:
            action === "Consumir"
              ? sql`${inventoryStocks.quantity} - ${reservation.quantity}`
              : sql`${inventoryStocks.quantity}`,

          reservedQuantity:
            sql`${inventoryStocks.reservedQuantity} - ${reservation.quantity}`,

          updatedAt: now,
        })
        .where(
          and(
            eq(
              inventoryStocks.id,
              stock.id,
            ),
            eq(
              inventoryStocks
                .tenantId,
              tenantId,
            ),
          ),
        );

    const reservationQuery =
      db
        .update(
          inventoryReservations,
        )
        .set({
          status:
            resultingStatus,

          releasedByClerkUserId:
            userId,

          releasedByName,

          releasedAt: now,

          releaseReason:
            normalizedReason,

          updatedAt: now,
        })
        .where(
          and(
            eq(
              inventoryReservations.id,
              reservation.id,
            ),
            eq(
              inventoryReservations
                .tenantId,
              tenantId,
            ),
            eq(
              inventoryReservations
                .status,
              "Activa",
            ),
          ),
        );

        const auditAction =
      action === "Consumir"
        ? "Confirmar entrega"
        : action;

    const auditQuery =
      createInventoryAuditQuery({
        tenantId,

        branchId:
          reservation.branchId,

        locationId:
          reservation.locationId,

        productId:
          reservation.productId,

        entityType:
          "Reserva",

        entityId:
          reservation.id,

        action:
          auditAction,

        summary:
          action === "Consumir"
            ? `Se confirmó la entrega de ${reservation.quantity} unidad(es) de ${reservation.productName}.`
            : action === "Cancelar"
              ? `Se canceló la reserva de ${reservation.quantity} unidad(es) de ${reservation.productName}.`
              : `Se liberó la reserva de ${reservation.quantity} unidad(es) de ${reservation.productName}.`,

        reason:
          normalizedReason,

        actorClerkUserId:
          userId,

        actorName:
          releasedByName,

        before: {
          status:
            reservation.status,

          stockQuantity:
            stock.quantity,

          reservedQuantity:
            stock.reservedQuantity,
        },

        after: {
          status:
            resultingStatus,

          stockQuantity:
            resultingQuantity,

          reservedQuantity:
            resultingReservedQuantity,

          availableQuantity:
            resultingQuantity -
            resultingReservedQuantity,
        },
      });


    if (
      action === "Consumir"
    ) {
      const averageUnitCost =
        Number(
          stock.averageUnitCost ??
          0,
        );

      const normalizedUnitCost =
        Number.isFinite(
          averageUnitCost,
        )
          ? Math.round(
              averageUnitCost *
                100,
            ) / 100
          : 0;

      const normalizedTotalCost =
        Math.round(
          reservation.quantity *
            normalizedUnitCost *
            100,
        ) / 100;

      const movementQuery =
        db
          .insert(
            inventoryMovements,
          )
          .values({
            id:
              crypto.randomUUID(),

            tenantId,

            branchId:
              reservation.branchId,

            locationId:
              reservation.locationId,

            productId:
              reservation.productId,

            stockId:
              reservation.stockId,

            type:
              "Salida reservada",

            quantity:
              -reservation.quantity,

            previousQuantity:
              stock.quantity,

            resultingQuantity,

            unitCost:
              String(
                normalizedUnitCost,
              ),

            totalCost:
              String(
                -normalizedTotalCost,
              ),

            resultingAverageCost:
              String(
                normalizedUnitCost,
              ),

            reason:
              normalizedReason,

            reference:
              reservation
                .sourceReference ??
              `RES-${reservation.id
                .slice(0, 8)
                .toUpperCase()}`,

            performedByClerkUserId:
              userId,

            performedByName:
              releasedByName,

            metadata: {
              reservationId:
                reservation.id,

              sourceType:
                reservation.sourceType,

              customerName:
                reservation
                  .customerName,

              productName:
                reservation.productName,

              locationName:
                getLocationLabel(
                  locationRecord,
                ),
            },

            createdAt: now,
          });

      await db.batch([
        stockQuery,
        reservationQuery,
        movementQuery,
        auditQuery,
      ]);
    } else {
      await db.batch([
        stockQuery,
        reservationQuery,
        auditQuery,
      ]);
    }

    return NextResponse.json({
      success: true,

      message:
        action === "Consumir"
          ? "La entrega fue confirmada y la salida quedó registrada en el Kardex."
          : action ===
              "Cancelar"
            ? "La reserva fue cancelada correctamente."
            : "La reserva fue liberada correctamente.",

      data: {
        reservationId:
          reservation.id,

        status:
          resultingStatus,

        quantity:
          reservation.quantity,

        stockQuantity:
          resultingQuantity,

        reservedQuantity:
          resultingReservedQuantity,

        availableQuantity:
          resultingQuantity -
          resultingReservedQuantity,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}