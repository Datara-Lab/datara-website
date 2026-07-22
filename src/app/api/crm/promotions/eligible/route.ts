import { auth } from "@clerk/nextjs/server";
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

function normalizeValue(
  value: string | null | undefined,
): string {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(/\s+/g, " ");
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
    tenantId: tenant.id,
  };
}

function createErrorResponse(
  error: unknown,
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

  console.error(
    "No fue posible consultar las promociones elegibles.",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible consultar las promociones disponibles.",
    },
    {
      status: 500,
    },
  );
}

export async function GET(
  request: Request,
) {
  try {
    const {
      tenantId,
    } = await getTenantContext();

    const {
      searchParams,
    } = new URL(request.url);

    const productId =
      searchParams
        .get("productId")
        ?.trim();

    const channel =
      searchParams
        .get("channel")
        ?.trim();

    const customerType =
      searchParams
        .get("customerType")
        ?.trim();

    if (!productId) {
      throw new ApiError(
        "Selecciona un producto para consultar sus promociones.",
        400,
      );
    }

    const [product] = await db
      .select({
        id: crmProducts.id,
        name: crmProducts.name,
        code: crmProducts.code,
        active: crmProducts.active,
        unitPrice:
          crmProducts.unitPrice,
        currency:
          crmProducts.currency,
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
        ),
      )
      .limit(1);

    if (
      !product ||
      !product.active
    ) {
      throw new ApiError(
        "El producto no existe o está inactivo.",
        404,
      );
    }

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
                crmPromotionProducts
                  .promotionId,
              productId:
                crmPromotionProducts
                  .productId,
            })
            .from(
              crmPromotionProducts,
            )
            .where(
              inArray(
                crmPromotionProducts
                  .promotionId,
                promotionIds,
              ),
            )
        : [];

    const productIdsByPromotion =
      new Map<
        string,
        Set<string>
      >();

    for (
      const relation of relations
    ) {
      const productIds =
        productIdsByPromotion.get(
          relation.promotionId,
        ) ??
        new Set<string>();

      productIds.add(
        relation.productId,
      );

      productIdsByPromotion.set(
        relation.promotionId,
        productIds,
      );
    }

    const now = Date.now();

    const normalizedChannel =
      normalizeValue(channel);

    const normalizedCustomerType =
      normalizeValue(
        customerType,
      );

    const data =
      promotionRecords
        .filter((promotion) => {
          if (promotion.paused) {
            return false;
          }

          if (
            !promotion.promotionStart ||
            !promotion.promotionEnd
          ) {
            return false;
          }

          if (
            now <
              promotion
                .promotionStart
                .getTime() ||
            now >=
              promotion
                .promotionEnd
                .getTime()
          ) {
            return false;
          }

          if (
            promotion.limitPromotion &&
            promotion.maximumBenefits !==
              null &&
            promotion.usedBenefits >=
              promotion.maximumBenefits
          ) {
            return false;
          }

          const applicableProductIds =
            productIdsByPromotion.get(
              promotion.id,
            );

          if (
            applicableProductIds &&
            applicableProductIds.size >
              0 &&
            !applicableProductIds.has(
              product.id,
            )
          ) {
            return false;
          }

          const normalizedChannels =
            promotion.channels.map(
              (promotionChannel) =>
                normalizeValue(
                  promotionChannel,
                ),
            );

          const appliesToAllChannels =
            normalizedChannels.includes(
              "todos",
            );

          if (
            normalizedChannels.length > 0 &&
            !appliesToAllChannels &&
            (
              !normalizedChannel ||
              !normalizedChannels.includes(
                normalizedChannel,
              )
            )
          ) {
            return false;
          }

          const promotionCustomerType =
            normalizeValue(
              promotion.customerType,
            );

          const appliesToAllCustomers =
            promotionCustomerType ===
              "todos" ||
            promotionCustomerType ===
              "todo";

          if (
            promotionCustomerType &&
            !appliesToAllCustomers &&
            (
              !normalizedCustomerType ||
              promotionCustomerType !==
                normalizedCustomerType
            )
          ) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          const aPriority =
            a.priority ??
            Number.MAX_SAFE_INTEGER;

          const bPriority =
            b.priority ??
            Number.MAX_SAFE_INTEGER;

          return (
            aPriority - bPriority
          );
        })
        .map((promotion) => ({
          id: promotion.id,

          name: promotion.name,

          priority:
            promotion.priority,

          promotionGroup:
            promotion.promotionGroup,

          benefitType:
            promotion.benefitType,

          paymentMethod:
            promotion.paymentMethod,

          value:
            promotion.value === null
              ? null
              : Number(
                  promotion.value,
                ),

          availableMonths:
            promotion.availableMonths,

          minimumDownPayment:
            promotion
              .minimumDownPayment ===
            null
              ? null
              : Number(
                  promotion
                    .minimumDownPayment,
                ),

          requiresSelection:
            promotion
              .requiresSelection,

          commercialMessage:
            promotion
              .commercialMessage,

          conditions:
            promotion.conditions,

          channels:
            promotion.channels,

          customerType:
            promotion.customerType,

          remainingBenefits:
            promotion.limitPromotion &&
            promotion.maximumBenefits !==
              null
              ? Math.max(
                  promotion
                    .maximumBenefits -
                    promotion
                      .usedBenefits,
                  0,
                )
              : null,
        }));

    return NextResponse.json({
      success: true,

      data: {
        product: {
          id: product.id,
          name: product.name,
          code: product.code,
          unitPrice: Number(
            product.unitPrice,
          ),
          currency:
            product.currency,
        },

        promotions: data,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}
