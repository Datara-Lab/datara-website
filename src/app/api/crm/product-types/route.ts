import {
  randomUUID,
} from "node:crypto";

import {
  auth,
} from "@clerk/nextjs/server";

import {
  and,
  asc,
  eq,
  isNull,
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  crmProductCategories,
  crmProducts,
  crmProductTypes,
  inventoryCountItems,
  inventoryCounts,
  inventoryReplenishmentRequestItems,
  inventoryReplenishmentRequests,
  inventoryReservations,
  inventoryStocks,
  tenants,
} from "@/db/schema";

import {
  CRMPermissionError,
  type CRMModulePermission,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type ProductTypePayload = {
  id?: unknown;
  name?: unknown;
  inventoryTracked?: unknown;
  active?: unknown;
  sortOrder?: unknown;
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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  return (
    value.trim() ||
    null
  );
}

function getBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value ===
    "boolean"
    ? value
    : fallback;
}

function getSortOrder(
  value: unknown,
): number {
  const parsed =
    Number(value ?? 0);

  if (
    !Number.isInteger(parsed) ||
    parsed < 0
  ) {
    throw new ApiError(
      "El orden debe ser un número entero igual o mayor que cero.",
      400,
    );
  }

  return parsed;
}

async function getTenantContext(
  permission:
    CRMModulePermission,
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

  await requireCRMModulePermission(
    tenant.id,
    userId,
    "products",
    permission,
  );

  return {
    tenantId:
      tenant.id,

    userId,
  };
}

function serializeProductType(
  productType:
    typeof crmProductTypes
      .$inferSelect,
) {
  return {
    id:
      productType.id,

    key:
      productType.key,

    name:
      productType.name,

    inventoryTracked:
      productType
        .inventoryTracked,

    technicalProfile:
      productType
        .technicalProfile,

    active:
      productType.active,

    sortOrder:
      productType.sortOrder,

    createdAt:
      productType.createdAt
        .toISOString(),

    updatedAt:
      productType.updatedAt
        .toISOString(),
  };
}

function isUniqueViolation(
  error: unknown,
): boolean {
  return (
    isRecord(error) &&
    error.code ===
      "23505"
  );
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
    error instanceof
      CRMPermissionError
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message,
      },
      {
        status:
          error.status,
      },
    );
  }

  if (
    isUniqueViolation(
      error,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ya existe un tipo de elemento activo o descontinuado con ese nombre. Reactiva el tipo existente en lugar de crear uno nuevo.",
      },
      {
        status: 409,
      },
    );
  }

  console.error(
    "No fue posible administrar los tipos del catálogo.",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible administrar los tipos del catálogo.",
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
    } =
      await getTenantContext(
        "view",
      );

    const productTypes =
      await db
        .select()
        .from(
          crmProductTypes,
        )
        .where(
          eq(
            crmProductTypes
              .tenantId,
            tenantId,
          ),
        )
        .orderBy(
          asc(
            crmProductTypes
              .sortOrder,
          ),
          asc(
            crmProductTypes
              .name,
          ),
        );

    return NextResponse.json({
      success: true,

      data:
        productTypes.map(
          serializeProductType,
        ),
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
    } =
      await getTenantContext(
        "create",
      );

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no es válida.",
        400,
      );
    }

    const payload =
      body as
        ProductTypePayload;

    const name =
      getString(
        payload.name,
      );

    if (!name) {
      throw new ApiError(
        "El nombre del tipo es obligatorio.",
        400,
      );
    }

    if (
      name.length >
      100
    ) {
      throw new ApiError(
        "El nombre no puede superar los 100 caracteres.",
        400,
      );
    }

    const [productType] =
      await db
        .insert(
          crmProductTypes,
        )
        .values({
          tenantId,

          key:
            `custom-${randomUUID()}`,

          name,

          inventoryTracked:
            getBoolean(
              payload
                .inventoryTracked,
              false,
            ),

          technicalProfile:
            null,

          active: true,

          sortOrder:
            getSortOrder(
              payload.sortOrder,
            ),

          createdByClerkUserId:
            userId,

          updatedByClerkUserId:
            userId,
        })
        .returning();

    return NextResponse.json(
      {
        success: true,

        message:
          "El tipo de elemento fue creado correctamente.",

        data:
          serializeProductType(
            productType,
          ),
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
    } =
      await getTenantContext(
        "edit",
      );

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no es válida.",
        400,
      );
    }

    const payload =
      body as
        ProductTypePayload;

    const id =
      getString(
        payload.id,
      );

    const name =
      getString(
        payload.name,
      );

    if (!id) {
      throw new ApiError(
        "No fue posible identificar el tipo.",
        400,
      );
    }

    if (!name) {
      throw new ApiError(
        "El nombre del tipo es obligatorio.",
        400,
      );
    }

    if (
      name.length >
      100
    ) {
      throw new ApiError(
        "El nombre no puede superar los 100 caracteres.",
        400,
      );
    }

    const [existing] =
      await db
        .select({
          id:
            crmProductTypes.id,

          active:
            crmProductTypes.active,

          inventoryTracked:
            crmProductTypes
              .inventoryTracked,
        })
        .from(
          crmProductTypes,
        )
        .where(
          and(
            eq(
              crmProductTypes.id,
              id,
            ),
            eq(
              crmProductTypes
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!existing) {
      throw new ApiError(
        "El tipo de elemento no existe.",
        404,
      );
    }

    const active =
      getBoolean(
        payload.active,
        existing.active,
      );

    const inventoryTracked =
      getBoolean(
        payload
          .inventoryTracked,
        existing
          .inventoryTracked,
      );

    if (
      existing.inventoryTracked &&
      !inventoryTracked
    ) {
      const [
        stockSummary,
        activeReservationResult,
        openCountResult,
        openReplenishmentResult,
      ] =
        await Promise.all([
          db
            .select({
              quantity:
                sql<number>`
                  coalesce(
                    sum(
                      abs(
                        ${inventoryStocks.quantity}
                      )
                    ),
                    0
                  )::integer
                `,

              reservedQuantity:
                sql<number>`
                  coalesce(
                    sum(
                      ${inventoryStocks.reservedQuantity}
                    ),
                    0
                  )::integer
                `,
            })
            .from(
              inventoryStocks,
            )
            .innerJoin(
              crmProducts,
              and(
                eq(
                  crmProducts.id,
                  inventoryStocks
                    .productId,
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
                  inventoryStocks
                    .tenantId,
                  tenantId,
                ),
                eq(
                  crmProducts
                    .productTypeId,
                  id,
                ),
              ),
            ),

          db
            .select({
              count:
                sql<number>`
                  count(*)::integer
                `,
            })
            .from(
              inventoryReservations,
            )
            .innerJoin(
              crmProducts,
              and(
                eq(
                  crmProducts.id,
                  inventoryReservations
                    .productId,
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
                  inventoryReservations
                    .tenantId,
                  tenantId,
                ),
                eq(
                  inventoryReservations
                    .status,
                  "Activa",
                ),
                eq(
                  crmProducts
                    .productTypeId,
                  id,
                ),
              ),
            ),

          db
            .select({
              count:
                sql<number>`
                  count(
                    distinct
                    ${inventoryCounts.id}
                  )::integer
                `,
            })
            .from(
              inventoryCountItems,
            )
            .innerJoin(
              inventoryCounts,
              and(
                eq(
                  inventoryCounts.id,
                  inventoryCountItems
                    .countId,
                ),
                eq(
                  inventoryCounts
                    .tenantId,
                  tenantId,
                ),
              ),
            )
            .innerJoin(
              crmProducts,
              and(
                eq(
                  crmProducts.id,
                  inventoryCountItems
                    .productId,
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
                  inventoryCountItems
                    .tenantId,
                  tenantId,
                ),
                eq(
                  crmProducts
                    .productTypeId,
                  id,
                ),
                isNull(
                  inventoryCounts
                    .approvedAt,
                ),
                isNull(
                  inventoryCounts
                    .cancelledAt,
                ),
              ),
            ),

          db
            .select({
              count:
                sql<number>`
                  count(
                    distinct
                    ${inventoryReplenishmentRequests.id}
                  )::integer
                `,
            })
            .from(
              inventoryReplenishmentRequestItems,
            )
            .innerJoin(
              inventoryReplenishmentRequests,
              and(
                eq(
                  inventoryReplenishmentRequests
                    .id,
                  inventoryReplenishmentRequestItems
                    .requestId,
                ),
                eq(
                  inventoryReplenishmentRequests
                    .tenantId,
                  tenantId,
                ),
              ),
            )
            .innerJoin(
              crmProducts,
              and(
                eq(
                  crmProducts.id,
                  inventoryReplenishmentRequestItems
                    .productId,
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
                  inventoryReplenishmentRequestItems
                    .tenantId,
                  tenantId,
                ),
                eq(
                  crmProducts
                    .productTypeId,
                  id,
                ),
                isNull(
                  inventoryReplenishmentRequests
                    .receivedAt,
                ),
                isNull(
                  inventoryReplenishmentRequests
                    .cancelledAt,
                ),
              ),
            ),
        ]);

      const stockQuantity =
        Number(
          stockSummary[0]
            ?.quantity ?? 0,
        );

      const reservedQuantity =
        Number(
          stockSummary[0]
            ?.reservedQuantity ?? 0,
        );

      const activeReservations =
        Number(
          activeReservationResult[0]
            ?.count ?? 0,
        );

      const openCounts =
        Number(
          openCountResult[0]
            ?.count ?? 0,
        );

      const openReplenishments =
        Number(
          openReplenishmentResult[0]
            ?.count ?? 0,
        );

      const blockers: string[] =
        [];

      if (stockQuantity > 0) {
        blockers.push(
          `${stockQuantity} unidad(es) registradas`,
        );
      }

      if (
        reservedQuantity > 0
      ) {
        blockers.push(
          `${reservedQuantity} unidad(es) reservadas`,
        );
      }

      if (
        activeReservations > 0
      ) {
        blockers.push(
          `${activeReservations} reserva(s) activa(s)`,
        );
      }

      if (openCounts > 0) {
        blockers.push(
          `${openCounts} conteo(s) abierto(s)`,
        );
      }

      if (
        openReplenishments > 0
      ) {
        blockers.push(
          `${openReplenishments} solicitud(es) de reposición abierta(s)`,
        );
      }

      if (blockers.length > 0) {
        throw new ApiError(
          `No puedes desactivar el inventario de este tipo porque tiene ${blockers.join(
            ", ",
          )}. Resuelve estas operaciones antes de continuar.`,
          409,
        );
      }
    }

    const [productType] =
      await db
        .update(
          crmProductTypes,
        )
        .set({
          name,
          active,
          inventoryTracked,

          sortOrder:
            getSortOrder(
              payload.sortOrder,
            ),

          updatedByClerkUserId:
            userId,

          updatedAt:
            new Date(),
        })
        .where(
          and(
            eq(
              crmProductTypes.id,
              id,
            ),
            eq(
              crmProductTypes
                .tenantId,
              tenantId,
            ),
          ),
        )
        .returning();

    return NextResponse.json({
      success: true,

      message:
        "El tipo de elemento fue actualizado correctamente.",

      data:
        serializeProductType(
          productType,
        ),
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}


export async function DELETE(
  request: Request,
) {
  try {
    const {
      tenantId,
    } =
      await getTenantContext(
        "edit",
      );

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no es válida.",
        400,
      );
    }

    const id =
      getString(
        body.id,
      );

    if (!id) {
      throw new ApiError(
        "No fue posible identificar el tipo.",
        400,
      );
    }

    const [
      typeCountResult,
      productCountResult,
    ] =
      await Promise.all([
        db
          .select({
            count:
              sql<number>`
                count(*)::integer
              `,
          })
          .from(
            crmProductTypes,
          )
          .where(
            eq(
              crmProductTypes
                .tenantId,
              tenantId,
            ),
          ),

        db
          .select({
            count:
              sql<number>`
                count(*)::integer
              `,
          })
          .from(
            crmProducts,
          )
          .where(
            and(
              eq(
                crmProducts
                  .tenantId,
                tenantId,
              ),

              eq(
                crmProducts
                  .productTypeId,
                id,
              ),
            ),
          ),
      ]);

    const typeCount =
      Number(
        typeCountResult[0]
          ?.count ?? 0,
      );

    if (
      typeCount <=
      1
    ) {
      throw new ApiError(
        "El catálogo debe conservar al menos un tipo de elemento.",
        409,
      );
    }

    const assignedProducts =
      Number(
        productCountResult[0]
          ?.count ?? 0,
      );

    if (
      assignedProducts >
      0
    ) {
      throw new ApiError(
        `No puedes eliminar este tipo porque tiene ${assignedProducts} elemento(s) asignado(s). Reasígnalos o desactiva el tipo.`,
        409,
      );
    }

    const [existing] =
      await db
        .select({
          id:
            crmProductTypes.id,
        })
        .from(
          crmProductTypes,
        )
        .where(
          and(
            eq(
              crmProductTypes.id,
              id,
            ),

            eq(
              crmProductTypes
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!existing) {
      throw new ApiError(
        "El tipo de elemento no existe.",
        404,
      );
    }

    await db.batch([
      db
        .delete(
          crmProductCategories,
        )
        .where(
          and(
            eq(
              crmProductCategories
                .tenantId,
              tenantId,
            ),

            eq(
              crmProductCategories
                .productTypeId,
              id,
            ),
          ),
        ),

      db
        .delete(
          crmProductTypes,
        )
        .where(
          and(
            eq(
              crmProductTypes.id,
              id,
            ),

            eq(
              crmProductTypes
                .tenantId,
              tenantId,
            ),
          ),
        ),
    ]);

    return NextResponse.json({
      success: true,

      message:
        "El tipo de elemento y sus categorías fueron eliminados correctamente.",
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}
