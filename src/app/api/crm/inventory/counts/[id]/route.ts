import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  crmProducts,
  inventoryCountItems,
  inventoryCounts,
  inventoryLocations,
  inventoryMovements,
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

type CountItemPayload = {
  id?: unknown;
  countedQuantity?: unknown;
  notes?: unknown;
};

type CountUpdatePayload = {
  action?: unknown;
  items?: unknown;
  notes?: unknown;
  reason?: unknown;

  productId?: unknown;
  countedQuantity?: unknown;
};

type RouteContext = {
  params:
    Promise<{
      id: string;
    }>;
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

function getNonnegativeInteger(
  value: unknown,
): number | undefined {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 0
  ) {
    return undefined;
  }

  return parsed;
}

function canAccessLocation(
  branchId:
    | string
    | null,
  branchAccess:
    CRMBranchAccessContext,
): boolean {
  if (
    branchAccess.allBranches
  ) {
    return true;
  }

  return Boolean(
    branchId &&
      branchAccess.branchIds.includes(
        branchId,
      ),
  );
}

function createErrorResponse(
  error: unknown,
) {
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
    "No fue posible actualizar el conteo físico:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible actualizar el conteo físico.",
    },
    {
      status: 500,
    },
  );
}

async function getContext(
  permission:
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

async function getUserName() {
  const user =
    await currentUser();

  return (
    [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user?.emailAddresses[0]
      ?.emailAddress ||
    "Usuario"
  );
}

async function getCountRecord(
  countId: string,
  tenantId: string,
  branchAccess:
    CRMBranchAccessContext,
) {
  const [count] =
    await db
      .select({
        id:
          inventoryCounts.id,

        reference:
          inventoryCounts
            .reference,

        status:
          inventoryCounts.status,

        branchId:
          inventoryCounts
            .branchId,

        locationId:
          inventoryCounts
            .locationId,

        locationName:
          inventoryLocations.name,

        locationCode:
          inventoryLocations.code,

        branchName:
          tenantBranches.name,

        branchCode:
          tenantBranches.code,
      })
      .from(
        inventoryCounts,
      )
      .innerJoin(
        inventoryLocations,
        and(
          eq(
            inventoryCounts
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
            inventoryCounts
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
            inventoryCounts.id,
            countId,
          ),
          eq(
            inventoryCounts
              .tenantId,
            tenantId,
          ),
        ),
      )
      .limit(1);

  if (!count) {
    throw new ApiError(
      "No fue posible identificar el conteo físico.",
      404,
    );
  }

  if (
    !canAccessLocation(
      count.branchId,
      branchAccess,
    )
  ) {
    throw new ApiError(
      "No tienes acceso a la ubicación de este conteo.",
      403,
    );
  }

  return count;
}

export async function PATCH(
  request: Request,
  routeContext:
    RouteContext,
) {
  try {
    const {
      id: countId,
    } =
      await routeContext.params;

    const payload =
      (await request.json()) as
        CountUpdatePayload;

    const action =
      getString(
        payload.action,
      );

    if (
      action !== "Guardar" &&
      action !== "Enviar" &&
      action !==
        "Agregar modelo"
    ) {
      throw new ApiError(
        "Selecciona una acción válida para el conteo.",
        400,
      );
    }

    const {
      tenantId,
      userId,
      branchAccess,
    } = await getContext(
      "create",
    );

    const count =
      await getCountRecord(
        countId,
        tenantId,
        branchAccess,
      );

    if (
      count.status !==
      "Borrador"
    ) {
      throw new ApiError(
        "Solo los conteos en borrador pueden modificarse.",
        409,
      );
    }

    const actorName =
      await getUserName();

    if (
      action ===
        "Agregar modelo"
    ) {
      const productId =
        getString(
          payload.productId,
        );

      const countedQuantity =
        getNonnegativeInteger(
          payload.countedQuantity,
        );

      if (!productId) {
        throw new ApiError(
          "Selecciona el modelo encontrado.",
          400,
        );
      }

      if (
        countedQuantity ===
        undefined
      ) {
        throw new ApiError(
          "La cantidad encontrada debe ser un entero igual o mayor que cero.",
          400,
        );
      }

      const [product] =
        await db
          .select({
            id:
              crmProducts.id,

            name:
              crmProducts.name,

            active:
              crmProducts.active,
          })
          .from(
            crmProducts,
          )
          .where(
            and(
              eq(
                crmProducts.id,
                productId,
              ),
              eq(
                crmProducts
                  .tenantId,
                tenantId,
              ),
            ),
          )
          .limit(1);

      if (
        !product ||
        !product.active
      ) {
        throw new ApiError(
          "El modelo seleccionado no está disponible.",
          404,
        );
      }

      const [existingCountItem] =
        await db
          .select({
            id:
              inventoryCountItems.id,
          })
          .from(
            inventoryCountItems,
          )
          .where(
            and(
              eq(
                inventoryCountItems
                  .tenantId,
                tenantId,
              ),
              eq(
                inventoryCountItems
                  .countId,
                countId,
              ),
              eq(
                inventoryCountItems
                  .productId,
                productId,
              ),
            ),
          )
          .limit(1);

      if (existingCountItem) {
        throw new ApiError(
          "Este modelo ya forma parte del conteo.",
          409,
        );
      }

      const [existingStock] =
        await db
          .select({
            id:
              inventoryStocks.id,

            quantity:
              inventoryStocks
                .quantity,
          })
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
                count.locationId,
              ),
              eq(
                inventoryStocks
                  .productId,
                productId,
              ),
            ),
          )
          .limit(1);

      const now =
        new Date();

      let stockId =
        existingStock?.id;

      const expectedQuantity =
        existingStock
          ?.quantity ?? 0;

      if (!stockId) {
        const [createdStock] =
          await db
            .insert(
              inventoryStocks,
            )
            .values({
              id:
                crypto.randomUUID(),

              tenantId,

              branchId:
                count.branchId,

              locationId:
                count.locationId,

              productId,

              quantity: 0,

              reservedQuantity:
                0,

              createdAt: now,
              updatedAt: now,
            })
            .returning({
              id:
                inventoryStocks.id,
            });

        stockId =
          createdStock.id;
      }

      const foundReason =
        getString(
          payload.reason,
        ) ?? null;

      const countItemQuery =
        db
          .insert(
            inventoryCountItems,
          )
          .values({
            id:
              crypto.randomUUID(),

            tenantId,
            countId,
            stockId,
            productId,

            expectedQuantity,

            countedQuantity,

            difference:
              countedQuantity -
              expectedQuantity,

            notes:
              foundReason,

            metadata: {
              foundDuringCount:
                true,
            },

            createdAt: now,
            updatedAt: now,
          });

      const auditQuery =
        createInventoryAuditQuery({
          tenantId,

          branchId:
            count.branchId,

          locationId:
            count.locationId,

          productId,

          entityType:
            "Conteo físico",

          entityId:
            countId,

          action:
            "Agregar modelo",

          summary:
            `Se agregó ${product.name} al conteo ${count.reference}.`,

          reason:
            foundReason,

          actorClerkUserId:
            userId,

          actorName,

          before: {
            expectedQuantity,
          },

          after: {
            countedQuantity,

            difference:
              countedQuantity -
              expectedQuantity,

            foundDuringCount:
              true,
          },
        });

      await db.batch([
        countItemQuery,
        auditQuery,
      ]);

      return NextResponse.json({
        success: true,

        message:
          "El modelo encontrado fue agregado al conteo.",

        data: {
          countId,
          productId,

          productName:
            product.name,

          expectedQuantity,

          countedQuantity,

          difference:
            countedQuantity -
            expectedQuantity,
        },
      });
    }


    if (
      !Array.isArray(
        payload.items,
      )
    ) {
      throw new ApiError(
        "Las partidas del conteo no tienen un formato válido.",
        400,
      );
    }

    const submittedItems =
      payload.items.map(
        (value) => {
          if (
            !value ||
            typeof value !==
              "object" ||
            Array.isArray(value)
          ) {
            throw new ApiError(
              "Una partida del conteo no tiene un formato válido.",
              400,
            );
          }

          const item =
            value as
              CountItemPayload;

          const id =
            getString(
              item.id,
            );

          const countedQuantity =
            getNonnegativeInteger(
              item.countedQuantity,
            );

          if (!id) {
            throw new ApiError(
              "No fue posible identificar una partida del conteo.",
              400,
            );
          }

          if (
            countedQuantity ===
            undefined
          ) {
            throw new ApiError(
              "Todas las cantidades capturadas deben ser enteros iguales o mayores que cero.",
              400,
            );
          }

          return {
            id,
            countedQuantity,

            notes:
              getString(
                item.notes,
              ) ?? null,
          };
        },
      );

    const existingItems =
      await db
        .select({
          id:
            inventoryCountItems.id,

          expectedQuantity:
            inventoryCountItems
              .expectedQuantity,
        })
        .from(
          inventoryCountItems,
        )
        .where(
          and(
            eq(
              inventoryCountItems
                .tenantId,
              tenantId,
            ),
            eq(
              inventoryCountItems
                .countId,
              count.id,
            ),
          ),
        );

    if (
      submittedItems.length !==
      existingItems.length
    ) {
      throw new ApiError(
        "Debes capturar todas las partidas incluidas en el conteo.",
        400,
      );
    }

    const existingItemsById =
      new Map(
        existingItems.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      );

    const duplicatedItemIds =
      new Set<string>();

    for (
      const item of
      submittedItems
    ) {
      if (
        duplicatedItemIds.has(
          item.id,
        )
      ) {
        throw new ApiError(
          "El conteo contiene partidas duplicadas.",
          400,
        );
      }

      duplicatedItemIds.add(
        item.id,
      );

      if (
        !existingItemsById.has(
          item.id,
        )
      ) {
        throw new ApiError(
          "Una partida no pertenece a este conteo.",
          400,
        );
      }
    }

    const now =
      new Date();

    const itemQueries =
      submittedItems.map(
        (item) => {
          const existingItem =
            existingItemsById.get(
              item.id,
            ) as
              typeof existingItems[number];

          return db
            .update(
              inventoryCountItems,
            )
            .set({
              countedQuantity:
                item
                  .countedQuantity,

              difference:
                item.countedQuantity -
                existingItem
                  .expectedQuantity,

              notes:
                item.notes,

              updatedAt: now,
            })
            .where(
              and(
                eq(
                  inventoryCountItems.id,
                  item.id,
                ),
                eq(
                  inventoryCountItems
                    .tenantId,
                  tenantId,
                ),
                eq(
                  inventoryCountItems
                    .countId,
                  count.id,
                ),
              ),
            );
        },
      );

    const userName =
      action === "Enviar"
        ? await getUserName()
        : null;

    const countQuery =
      db
        .update(
          inventoryCounts,
        )
        .set({
          status:
            action === "Enviar"
              ? "En revisión"
              : "Borrador",

          notes:
            getString(
              payload.notes,
            ) ?? null,

          submittedByClerkUserId:
            action === "Enviar"
              ? userId
              : null,

          submittedByName:
            action === "Enviar"
              ? userName
              : null,

          submittedAt:
            action === "Enviar"
              ? now
              : null,

          updatedAt: now,
        })
        .where(
          and(
            eq(
              inventoryCounts.id,
              count.id,
            ),
            eq(
              inventoryCounts
                .tenantId,
              tenantId,
            ),
            eq(
              inventoryCounts.status,
              "Borrador",
            ),
          ),
        );

    const differenceCount =
      submittedItems.filter(
        (item) => {
          const existingItem =
            existingItems.find(
              (existing) =>
                existing.id ===
                item.id,
            );

          return (
            existingItem &&
            item.countedQuantity !==
              existingItem
                .expectedQuantity
          );
        },
      ).length;

    const auditQuery =
      createInventoryAuditQuery({
        tenantId,

        branchId:
          count.branchId,

        locationId:
          count.locationId,

        entityType:
          "Conteo físico",

        entityId:
          count.id,

        action:
          action === "Enviar"
            ? "Enviar a revisión"
            : "Guardar captura",

        summary:
          action === "Enviar"
            ? `Se envió el conteo ${count.reference} a revisión.`
            : `Se guardó la captura del conteo ${count.reference}.`,

        reason:
          getString(
            payload.notes,
          ) ?? null,

        actorClerkUserId:
          userId,

        actorName,

        before: {
          status:
            "Borrador",
        },

        after: {
          status:
            action === "Enviar"
              ? "En revisión"
              : "Borrador",

          itemCount:
            submittedItems.length,

          differenceCount,

          notes:
            getString(
              payload.notes,
            ) ?? null,
        },
      });

    await db.batch(
      [
        ...itemQueries,
        countQuery,
        auditQuery,
      ] as unknown as
        Parameters<
          typeof db.batch
        >[0],
    );

    return NextResponse.json({
      success: true,

      message:
        action === "Enviar"
          ? "El conteo fue enviado a revisión correctamente."
          : "El borrador del conteo fue guardado correctamente.",

      data: {
        id:
          count.id,

        status:
          action === "Enviar"
            ? "En revisión"
            : "Borrador",

        updatedAt:
          now.toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}