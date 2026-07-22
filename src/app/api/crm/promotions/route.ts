import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";
import {
  and,
  eq,
  inArray,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmPromotionProducts,
  crmPromotions,
  crmProducts,
  tenants,
} from "@/db/schema";

export const dynamic = "force-dynamic";

type PromotionFormPayload = {
  id?: unknown;
  promotionName?: unknown;
  status?: unknown;
  priority?: unknown;
  promotionStart?: unknown;
  promotionEnd?: unknown;
  benefitType?: unknown;
  paymentMethod?: unknown;
  promotionGroup?: unknown;
  availableMonths?: unknown;
  channel?: unknown;
  minimumDownPayment?: unknown;
  maximumBenefits?: unknown;
  usedBenefits?: unknown;
  limitPromotion?: unknown;
  paused?: unknown;
  requiresSelection?: unknown;
  applicableProducts?: unknown;
  customerType?: unknown;
  value?: unknown;
  commercialMessage?: unknown;
  conditions?: unknown;
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

function getOptionalString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function getOptionalNumber(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const normalized =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(normalized)
    ? normalized
    : undefined;
}

function getOptionalInteger(
  value: unknown,
): number | null {
  const number =
    getOptionalNumber(value);

  return number === undefined
    ? null
    : Math.trunc(number);
}

function getNumericString(
  value: unknown,
): string | null {
  const number =
    getOptionalNumber(value);

  return number === undefined
    ? null
    : String(number);
}

function getOptionalDate(
  value: unknown,
): Date | null {
  const normalized =
    getOptionalString(value);

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getBoolean(
  value: unknown,
): boolean {
  return value === true;
}

function getStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (
            item,
          ): item is string =>
            typeof item === "string",
        )
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getIdArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value
    .map((item) => {
      if (
        typeof item === "string"
      ) {
        return item.trim();
      }

      if (isRecord(item)) {
        return getOptionalString(
          item.id,
        );
      }

      return undefined;
    })
    .filter(
      (
        id,
      ): id is string =>
        Boolean(id),
    );

  return Array.from(new Set(ids));
}

function normalizeOptionValue(
  value: unknown,
): string | undefined {
  return getOptionalString(value)
    ?.normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function calculatePromotionStatus(
  promotionStart:
    | Date
    | string
    | null,
  promotionEnd:
    | Date
    | string
    | null,
  paused: boolean,
):
  | "Activa"
  | "Programada"
  | "Inactiva"
  | "Expirada" {
  if (paused) {
    return "Inactiva";
  }

  const startDate =
    promotionStart instanceof Date
      ? promotionStart
      : promotionStart
        ? new Date(promotionStart)
        : null;

  const endDate =
    promotionEnd instanceof Date
      ? promotionEnd
      : promotionEnd
        ? new Date(promotionEnd)
        : null;

  if (
    !startDate ||
    !endDate ||
    Number.isNaN(
      startDate.getTime(),
    ) ||
    Number.isNaN(
      endDate.getTime(),
    )
  ) {
    return "Inactiva";
  }

  const now = Date.now();

  if (
    now <
    startDate.getTime()
  ) {
    return "Programada";
  }

  if (
    now >=
    endDate.getTime()
  ) {
    return "Expirada";
  }

  return "Activa";
}

function validatePayload(
  values: PromotionFormPayload,
): string | null {
  const promotionName =
    getOptionalString(
      values.promotionName,
    );

  if (!promotionName) {
    return "El nombre de la promoción es obligatorio.";
  }

  const benefitType =
    normalizeOptionValue(
      values.benefitType,
    );

  const typesThatRequireValue =
    new Set([
      "descuento(%)",
      "descuento (%)",
      "descuento($)",
      "descuento ($)",
      "meses sin intereses",
      "bono",
    ]);

  if (
    benefitType &&
    typesThatRequireValue.has(
      benefitType,
    ) &&
    getOptionalNumber(
      values.value,
    ) === undefined
  ) {
    return `El valor es obligatorio para el beneficio "${getOptionalString(values.benefitType)}".`;
  }

  return null;
}

async function getTenantContext() {
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

  const [tenant] = await db
    .select({
      id: tenants.id,
    })
    .from(tenants)
    .where(
      eq(
        tenants.clerkOrganizationId,
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

  return {
    userId,
    tenantId: tenant.id,
  };
}

async function validateProductIds(
  tenantId: string,
  productIds: string[],
  allowedInactiveIds: string[] = [],
) {
  if (productIds.length === 0) {
    return [];
  }

  const products = await db
    .select({
      id: crmProducts.id,
      active: crmProducts.active,
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
    products.length !==
    productIds.length
  ) {
    throw new ApiError(
      "Uno o más productos no pertenecen al catálogo de la empresa.",
      400,
    );
  }

  const allowedInactiveSet =
    new Set(allowedInactiveIds);

  const hasUnauthorizedInactive =
    products.some(
      (product) =>
        !product.active &&
        !allowedInactiveSet.has(
          product.id,
        ),
    );

  if (hasUnauthorizedInactive) {
    throw new ApiError(
      "No es posible agregar productos inactivos a una promoción.",
      400,
    );
  }

  return products.map(
    (product) => product.id,
  );
}

function createErrorResponse(
  error: unknown,
  fallback: string,
) {
  if (error instanceof ApiError) {
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

  console.error(fallback, error);

  return NextResponse.json(
    {
      success: false,
      error: fallback,
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
    } = await getTenantContext();

    const promotionRecords =
      await db
        .select()
        .from(crmPromotions)
        .where(
          eq(
            crmPromotions.tenantId,
            tenantId,
          ),
        );

    const promotionIds =
      promotionRecords.map(
        (promotion) =>
          promotion.id,
      );

    const relations =
      promotionIds.length > 0
        ? await db
            .select({
              promotionId:
                crmPromotionProducts.promotionId,
              productId:
                crmProducts.id,
              productName:
                crmProducts.name,
            })
            .from(
              crmPromotionProducts,
            )
            .innerJoin(
              crmProducts,
              eq(
                crmPromotionProducts.productId,
                crmProducts.id,
              ),
            )
            .where(
              inArray(
                crmPromotionProducts.promotionId,
                promotionIds,
              ),
            )
        : [];

    const productsByPromotion =
      new Map<
        string,
        Array<{
          id: string;
          name: string;
        }>
      >();

    for (
      const relation of relations
    ) {
      const products =
        productsByPromotion.get(
          relation.promotionId,
        ) ?? [];

      products.push({
        id: relation.productId,
        name:
          relation.productName,
      });

      productsByPromotion.set(
        relation.promotionId,
        products,
      );
    }

    const promotions =
      promotionRecords
        .map((promotion) => ({
          id: promotion.id,

          promotionName:
            promotion.name,

          status:
            calculatePromotionStatus(
              promotion.promotionStart,
              promotion.promotionEnd,
              promotion.paused,
            ),

          priority:
            promotion.priority,

          promotionStart:
            promotion.promotionStart
              ?.toISOString() ??
            null,

          promotionEnd:
            promotion.promotionEnd
              ?.toISOString() ??
            null,

          benefitType:
            promotion.benefitType,

          paymentMethod:
            promotion.paymentMethod,

          promotionGroup:
            promotion.promotionGroup,

          availableMonths:
            promotion.availableMonths,

          channel:
            promotion.channels,

          minimumDownPayment:
            promotion.minimumDownPayment ===
            null
              ? null
              : Number(
                  promotion.minimumDownPayment,
                ),

          maximumBenefits:
            promotion.maximumBenefits,

          usedBenefits:
            promotion.usedBenefits,

          limitPromotion:
            promotion.limitPromotion,

          paused:
            promotion.paused,

          requiresSelection:
            promotion.requiresSelection,

          applicableProducts:
            productsByPromotion.get(
              promotion.id,
            ) ?? [],

          customerType:
            promotion.customerType,

          value:
            promotion.value === null
              ? null
              : Number(
                  promotion.value,
                ),

          commercialMessage:
            promotion.commercialMessage,

          conditions:
            promotion.conditions,

          owner:
            promotion.ownerName ||
            promotion.ownerEmail ||
            promotion.ownerClerkUserId
              ? {
                  id:
                    promotion.ownerClerkUserId ??
                    undefined,
                  name:
                    promotion.ownerName ??
                    undefined,
                  email:
                    promotion.ownerEmail ??
                    undefined,
                }
              : null,

          createdTime:
            promotion.createdAt
              .toISOString(),

          modifiedTime:
            promotion.updatedAt
              .toISOString(),
        }))
        .sort((a, b) => {
          const aPriority =
            a.priority ??
            Number.MAX_SAFE_INTEGER;

          const bPriority =
            b.priority ??
            Number.MAX_SAFE_INTEGER;

          return (
            aPriority -
            bPriority
          );
        });

    return NextResponse.json({
      success: true,
      data: promotions,
      meta: {
        count:
          promotions.length,
        page: 1,
        perPage: 200,
        moreRecords: false,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible consultar las promociones.",
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
    } = await getTenantContext();

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values =
      body as PromotionFormPayload;

    const validationError =
      validatePayload(values);

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

    const productIds =
      await validateProductIds(
        tenantId,
        getIdArray(
          values.applicableProducts,
        ),
      );

    const clerkUser =
      await currentUser();

    const ownerEmail =
      clerkUser
        ?.primaryEmailAddress
        ?.emailAddress ??
      null;

    const ownerName =
      clerkUser
        ? [
            clerkUser.firstName,
            clerkUser.lastName,
          ]
            .filter(Boolean)
            .join(" ") || null
        : null;

    const now = new Date();

    const [promotion] =
      await db
        .insert(crmPromotions)
        .values({
          tenantId,
          name:
            getOptionalString(
              values.promotionName,
            ) as string,
          priority:
            getOptionalInteger(
              values.priority,
            ),
          promotionStart:
            getOptionalDate(
              values.promotionStart,
            ),
          promotionEnd:
            getOptionalDate(
              values.promotionEnd,
            ),
          benefitType:
            getOptionalString(
              values.benefitType,
            ) ?? null,
          paymentMethod:
            getOptionalString(
              values.paymentMethod,
            ) ?? null,
          promotionGroup:
            getOptionalString(
              values.promotionGroup,
            ) ?? null,
          availableMonths:
            getStringArray(
              values.availableMonths,
            ),
          channels:
            getStringArray(
              values.channel,
            ),
          minimumDownPayment:
            getNumericString(
              values.minimumDownPayment,
            ),
          maximumBenefits:
            getOptionalInteger(
              values.maximumBenefits,
            ),
          usedBenefits:
            getOptionalInteger(
              values.usedBenefits,
            ) ?? 0,
          limitPromotion:
            getBoolean(
              values.limitPromotion,
            ),
          paused:
            getBoolean(
              values.paused,
            ),
          requiresSelection:
            getBoolean(
              values.requiresSelection,
            ),
          customerType:
            getOptionalString(
              values.customerType,
            ) ?? null,
          value:
            getNumericString(
              values.value,
            ),
          commercialMessage:
            getOptionalString(
              values.commercialMessage,
            ) ?? null,
          conditions:
            getOptionalString(
              values.conditions,
            ) ?? null,
          ownerClerkUserId:
            userId,
          ownerName,
          ownerEmail,
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: crmPromotions.id,
          createdAt:
            crmPromotions.createdAt,
        });

    if (!promotion) {
      throw new Error(
        "No fue posible crear la promoción.",
      );
    }

    if (productIds.length > 0) {
      await db
        .insert(
          crmPromotionProducts,
        )
        .values(
          productIds.map(
            (productId) => ({
              promotionId:
                promotion.id,
              productId,
            }),
          ),
        );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "La promoción fue creada correctamente.",
        data: {
          id: promotion.id,
          createdTime:
            promotion.createdAt
              .toISOString(),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible crear la promoción.",
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const {
      tenantId,
    } = await getTenantContext();

    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values =
      body as PromotionFormPayload;

    const recordId =
      getOptionalString(
        values.id,
      );

    if (!recordId) {
      throw new ApiError(
        "No fue posible identificar la promoción que se desea actualizar.",
        400,
      );
    }

    const validationError =
      validatePayload(values);

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

    const existingRelations =
      await db
        .select({
          productId:
            crmPromotionProducts.productId,
        })
        .from(
          crmPromotionProducts,
        )
        .innerJoin(
          crmPromotions,
          eq(
            crmPromotionProducts.promotionId,
            crmPromotions.id,
          ),
        )
        .where(
          and(
            eq(
              crmPromotionProducts.promotionId,
              recordId,
            ),
            eq(
              crmPromotions.tenantId,
              tenantId,
            ),
          ),
        );

    const existingProductIds =
      existingRelations.map(
        (relation) =>
          relation.productId,
      );

    const productIds =
      await validateProductIds(
        tenantId,
        getIdArray(
          values.applicableProducts,
        ),
        existingProductIds,
      );

    const now = new Date();

    const [promotion] =
      await db
        .update(crmPromotions)
        .set({
          name:
            getOptionalString(
              values.promotionName,
            ) as string,
          priority:
            getOptionalInteger(
              values.priority,
            ),
          promotionStart:
            getOptionalDate(
              values.promotionStart,
            ),
          promotionEnd:
            getOptionalDate(
              values.promotionEnd,
            ),
          benefitType:
            getOptionalString(
              values.benefitType,
            ) ?? null,
          paymentMethod:
            getOptionalString(
              values.paymentMethod,
            ) ?? null,
          promotionGroup:
            getOptionalString(
              values.promotionGroup,
            ) ?? null,
          availableMonths:
            getStringArray(
              values.availableMonths,
            ),
          channels:
            getStringArray(
              values.channel,
            ),
          minimumDownPayment:
            getNumericString(
              values.minimumDownPayment,
            ),
          maximumBenefits:
            getOptionalInteger(
              values.maximumBenefits,
            ),
          usedBenefits:
            getOptionalInteger(
              values.usedBenefits,
            ) ?? 0,
          limitPromotion:
            getBoolean(
              values.limitPromotion,
            ),
          paused:
            getBoolean(
              values.paused,
            ),
          requiresSelection:
            getBoolean(
              values.requiresSelection,
            ),
          customerType:
            getOptionalString(
              values.customerType,
            ) ?? null,
          value:
            getNumericString(
              values.value,
            ),
          commercialMessage:
            getOptionalString(
              values.commercialMessage,
            ) ?? null,
          conditions:
            getOptionalString(
              values.conditions,
            ) ?? null,
          updatedAt: now,
        })
        .where(
          and(
            eq(
              crmPromotions.id,
              recordId,
            ),
            eq(
              crmPromotions.tenantId,
              tenantId,
            ),
          ),
        )
        .returning({
          id: crmPromotions.id,
          updatedAt:
            crmPromotions.updatedAt,
        });

    if (!promotion) {
      throw new ApiError(
        "La promoción no existe o no pertenece a esta empresa.",
        404,
      );
    }

    await db
      .delete(
        crmPromotionProducts,
      )
      .where(
        eq(
          crmPromotionProducts.promotionId,
          promotion.id,
        ),
      );

    if (productIds.length > 0) {
      await db
        .insert(
          crmPromotionProducts,
        )
        .values(
          productIds.map(
            (productId) => ({
              promotionId:
                promotion.id,
              productId,
            }),
          ),
        );
    }

    return NextResponse.json({
      success: true,
      message:
        "La promoción fue actualizada correctamente.",
      data: {
        id: promotion.id,
        modifiedTime:
          promotion.updatedAt
            .toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible actualizar la promoción.",
    );
  }
}