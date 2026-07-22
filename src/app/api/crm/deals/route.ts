import { auth } from "@clerk/nextjs/server";
import {
  and,
  desc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmCustomers,
  crmDealItems,
  crmDealPromotions,
  crmDeals,
  crmLeads,
  crmPromotionProducts,
  crmPromotions,
  crmProducts,
  tenantMembers,
  tenants,
} from "@/db/schema";
import {
  calculateDeal,
  type DealItemCalculationInput,
  type DealPromotionInput,
} from "@/lib/crm/deal-calculations";

export const dynamic =
  "force-dynamic";

type DealItemPayload = {
  id?: unknown;
  productId?: unknown;
  quantity?: unknown;

  paymentMethod?: unknown;
  customerDownPayment?: unknown;
  financingMonths?: unknown;

  promotionIds?: unknown;
};

type DealFormPayload = {
  id?: unknown;

  name?: unknown;
  customerId?: unknown;
  sourceLeadId?: unknown;

  ownerClerkUserId?: unknown;

  stage?: unknown;
  status?: unknown;

  acquisitionChannel?: unknown;

  probability?: unknown;
  expectedCloseAt?: unknown;

  customerDownPayment?: unknown;

  items?: unknown;

  generalPromotionIds?: unknown;

  nextStep?: unknown;
  notes?: unknown;
};

type ValidatedDealItem = {
  id: string;
  productId: string;

  name: string;
  description: string | null;

  quantity: number;
  unitPrice: number;

  paymentMethod: string;
  customerDownPayment: number;
  financingMonths: number | null;

  currency: string;

  promotions:
    DealPromotionInput[];
};

type DealContext = {
  tenantId: string;
  userId: string;
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

  const normalized =
    value.trim();

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

  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : undefined;
}

function getOptionalInteger(
  value: unknown,
): number | null {
  const numberValue =
    getOptionalNumber(value);

  return numberValue === undefined
    ? null
    : Math.trunc(numberValue);
}

function getOptionalDate(
  value: unknown,
): Date | null {
  const normalized =
    getOptionalString(value);

  if (!normalized) {
    return null;
  }

  const date =
    new Date(normalized);

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
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
            typeof item ===
            "string",
        )
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean),
    ),
  );
}

function getDealItems(
  value: unknown,
): DealItemPayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is DealItemPayload =>
      isRecord(item),
  );
}

function normalizeText(
  value:
    | string
    | null
    | undefined,
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

function getNumericString(
  value: number | null,
): string | null {
  return value === null
    ? null
    : String(value);
}

async function getTenantContext():
  Promise<DealContext> {
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
    userId,
  };
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

  console.error(
    fallback,
    error,
  );

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

function validateBasicPayload(
  values: DealFormPayload,
): string | null {
  if (
    !getOptionalString(
      values.name,
    )
  ) {
    return "El nombre de la oportunidad es obligatorio.";
  }

  if (
    !getOptionalString(
      values.stage,
    )
  ) {
    return "La etapa de la oportunidad es obligatoria.";
  }

  const probability =
    getOptionalNumber(
      values.probability,
    );

  if (
    probability !== undefined &&
    (
      probability < 0 ||
      probability > 100
    )
  ) {
    return "La probabilidad debe estar entre 0 y 100.";
  }

  const items =
    getDealItems(values.items);

  if (items.length === 0) {
    return "Agrega al menos un producto o servicio a la oportunidad.";
  }

  if (
    items.some(
      (item) =>
        !getOptionalString(
          item.productId,
        ),
    )
  ) {
    return "Todas las partidas deben tener un producto o servicio.";
  }

  if (
    items.some((item) => {
      const quantity =
        getOptionalNumber(
          item.quantity,
        );

      return (
        quantity === undefined ||
        quantity <= 0
      );
    })
  ) {
    return "La cantidad de cada partida debe ser mayor que cero.";
  }

  return null;
}

export async function GET() {
  try {
    const {
      tenantId,
    } = await getTenantContext();

    const dealRecords = await db
      .select()
      .from(crmDeals)
      .where(
        eq(
          crmDeals.tenantId,
          tenantId,
        ),
      )
      .orderBy(
        desc(
          crmDeals.createdAt,
        ),
      );

    const dealIds =
      dealRecords.map(
        (deal) => deal.id,
      );

    const customerIds =
      Array.from(
        new Set(
          dealRecords
            .map(
              (deal) =>
                deal.customerId,
            )
            .filter(
              (
                id,
              ): id is string =>
                Boolean(id),
            ),
        ),
      );

    const leadIds =
      Array.from(
        new Set(
          dealRecords
            .map(
              (deal) =>
                deal.sourceLeadId,
            )
            .filter(
              (
                id,
              ): id is string =>
                Boolean(id),
            ),
        ),
      );

    const customers =
      customerIds.length > 0
        ? await db
            .select({
              id: crmCustomers.id,
              name: crmCustomers.name,
              lastName:
                crmCustomers.lastName,
              companyName:
                crmCustomers
                  .companyName,
              customerType:
                crmCustomers
                  .customerType,
              email:
                crmCustomers.email,
            })
            .from(crmCustomers)
            .where(
              and(
                eq(
                  crmCustomers.tenantId,
                  tenantId,
                ),
                inArray(
                  crmCustomers.id,
                  customerIds,
                ),
              ),
            )
        : [];

    const leads =
      leadIds.length > 0
        ? await db
            .select({
              id: crmLeads.id,
              firstName:
                crmLeads.firstName,
              lastName:
                crmLeads.lastName,
              email:
                crmLeads.email,
            })
            .from(crmLeads)
            .where(
              and(
                eq(
                  crmLeads.tenantId,
                  tenantId,
                ),
                inArray(
                  crmLeads.id,
                  leadIds,
                ),
              ),
            )
        : [];

    const items =
      dealIds.length > 0
        ? await db
            .select()
            .from(crmDealItems)
            .where(
              and(
                eq(
                  crmDealItems.tenantId,
                  tenantId,
                ),
                inArray(
                  crmDealItems.dealId,
                  dealIds,
                ),
              ),
            )
            .orderBy(
              crmDealItems.position,
            )
        : [];

    const promotions =
      dealIds.length > 0
        ? await db
            .select()
            .from(
              crmDealPromotions,
            )
            .where(
              and(
                eq(
                  crmDealPromotions
                    .tenantId,
                  tenantId,
                ),
                inArray(
                  crmDealPromotions
                    .dealId,
                  dealIds,
                ),
              ),
            )
        : [];

    const customersById =
      new Map(
        customers.map(
          (customer) => [
            customer.id,
            customer,
          ],
        ),
      );

    const leadsById =
      new Map(
        leads.map((lead) => [
          lead.id,
          lead,
        ]),
      );

    const itemsByDeal =
      new Map<
        string,
        typeof items
      >();

    for (const item of items) {
      const dealItems =
        itemsByDeal.get(
          item.dealId,
        ) ?? [];

      dealItems.push(item);

      itemsByDeal.set(
        item.dealId,
        dealItems,
      );
    }

    const promotionsByDeal =
      new Map<
        string,
        typeof promotions
      >();

    for (
      const promotion of promotions
    ) {
      const dealPromotions =
        promotionsByDeal.get(
          promotion.dealId,
        ) ?? [];

      dealPromotions.push(
        promotion,
      );

      promotionsByDeal.set(
        promotion.dealId,
        dealPromotions,
      );
    }

    const data =
      dealRecords.map((deal) => {
        const customer =
          deal.customerId
            ? customersById.get(
                deal.customerId,
              )
            : undefined;

        const sourceLead =
          deal.sourceLeadId
            ? leadsById.get(
                deal.sourceLeadId,
              )
            : undefined;

        const dealItems =
          itemsByDeal.get(
            deal.id,
          ) ?? [];

        const dealPromotions =
          promotionsByDeal.get(
            deal.id,
          ) ?? [];

        const customerName =
          customer
            ? customer.companyName ||
              [
                customer.name,
                customer.lastName,
              ]
                .filter(Boolean)
                .join(" ")
            : null;

        const sourceLeadName =
          sourceLead
            ? [
                sourceLead.firstName,
                sourceLead.lastName,
              ]
                .filter(Boolean)
                .join(" ")
            : null;

        return {
          id: deal.id,

          name: deal.name,

          stage: deal.stage,
          status: deal.status,

          customerId:
            deal.customerId,

          customer: customer
            ? {
                id: customer.id,
                name: customerName,
                email:
                  customer.email,
                customerType:
                  customer.customerType,
              }
            : null,

          customerName,

          sourceLeadId:
            deal.sourceLeadId,

          sourceLead:
            sourceLead
              ? {
                  id:
                    sourceLead.id,
                  name:
                    sourceLeadName,
                  email:
                    sourceLead.email,
                }
              : null,

          ownerClerkUserId:
            deal.ownerClerkUserId,

          owner:
            deal.ownerName ||
            deal.ownerEmail ||
            deal.ownerClerkUserId
              ? {
                  id:
                    deal.ownerClerkUserId ??
                    undefined,
                  name:
                    deal.ownerName ??
                    undefined,
                  email:
                    deal.ownerEmail ??
                    undefined,
                }
              : null,

          ownerName:
            deal.ownerName,

          acquisitionChannel:
            deal.acquisitionChannel,

          currency:
            deal.currency.toUpperCase(),

          baseAmount:
            Number(
              deal.baseAmount,
            ),

          discountAmount:
            Number(
              deal.discountAmount,
            ),

          totalAmount:
            Number(
              deal.totalAmount,
            ),

          paymentMethod:
            deal.paymentMethod,

          minimumDownPayment:
            deal.minimumDownPayment ===
            null
              ? null
              : Number(
                  deal.minimumDownPayment,
                ),

          customerDownPayment:
            deal.customerDownPayment ===
            null
              ? null
              : Number(
                  deal.customerDownPayment,
                ),

          financedAmount:
            deal.financedAmount ===
            null
              ? null
              : Number(
                  deal.financedAmount,
                ),

          financingMonths:
            deal.financingMonths,

          estimatedPayment:
            deal.estimatedPayment ===
            null
              ? null
              : Number(
                  deal.estimatedPayment,
                ),

          probability:
            deal.probability,

          expectedCloseAt:
            deal.expectedCloseAt
              ?.toISOString() ??
            null,

          closedAt:
            deal.closedAt
              ?.toISOString() ??
            null,

          nextStep:
            deal.nextStep,

          notes: deal.notes,

          items:
            dealItems.map(
              (item) => ({
                id: item.id,
                productId:
                  item.productId,
                name: item.name,
                description:
                  item.description,

                quantity:
                  Number(
                    item.quantity,
                  ),

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
                    item.totalAmount,
                  ),

                paymentMethod:
                  item.paymentMethod,

                minimumDownPayment:
                  item
                    .minimumDownPayment ===
                  null
                    ? null
                    : Number(
                        item
                          .minimumDownPayment,
                      ),

                customerDownPayment:
                  Number(
                    item
                      .customerDownPayment,
                  ),

                financedAmount:
                  item.financedAmount ===
                  null
                    ? null
                    : Number(
                        item.financedAmount,
                      ),

                financingMonths:
                  item.financingMonths,

                estimatedPayment:
                  item.estimatedPayment ===
                  null
                    ? null
                    : Number(
                        item
                          .estimatedPayment,
                      ),

                position:
                  item.position,
              }),
            ),

          itemsSummary:
            dealItems
              .map((item) => {
                const quantity =
                  Number(
                    item.quantity,
                  );

                return quantity === 1
                  ? item.name
                  : `${quantity} × ${item.name}`;
              })
              .join(", "),

          promotions:
            dealPromotions.map(
              (promotion) => ({
                id: promotion.id,
                promotionId:
                  promotion
                    .promotionId,
                dealItemId:
                  promotion
                    .dealItemId,
                scope:
                  promotion.scope,
                name:
                  promotion
                    .promotionName,
                promotionGroup:
                  promotion
                    .promotionGroup,
                benefitType:
                  promotion
                    .benefitType,
                paymentMethod:
                  promotion
                    .paymentMethod,
                requiresSelection:
                  promotion
                    .requiresSelection,
                value:
                  promotion
                    .promotionValue ===
                  null
                    ? null
                    : Number(
                        promotion
                          .promotionValue,
                      ),
                calculatedBenefit:
                  Number(
                    promotion
                      .calculatedBenefit,
                  ),
              }),
            ),

          promotionsSummary:
            dealPromotions
              .map(
                (promotion) =>
                  promotion
                    .promotionName,
              )
              .join(", "),

          createdTime:
            deal.createdAt
              .toISOString(),

          modifiedTime:
            deal.updatedAt
              .toISOString(),
        };
      });

    return NextResponse.json({
      success: true,
      data,
      meta: {
        count: data.length,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible consultar las oportunidades.",
    );
  }
}

async function validateRelatedRecords(
  tenantId: string,
  customerId:
    | string
    | undefined,
  sourceLeadId:
    | string
    | undefined,
) {
  const customer =
    customerId
      ? (
          await db
            .select({
              id:
                crmCustomers.id,
              customerType:
                crmCustomers
                  .customerType,
            })
            .from(crmCustomers)
            .where(
              and(
                eq(
                  crmCustomers
                    .tenantId,
                  tenantId,
                ),
                eq(
                  crmCustomers.id,
                  customerId,
                ),
              ),
            )
            .limit(1)
        )[0]
      : undefined;

  if (
    customerId &&
    !customer
  ) {
    throw new ApiError(
      "El cliente seleccionado no pertenece a la empresa.",
      400,
    );
  }

  const sourceLead =
    sourceLeadId
      ? (
          await db
            .select({
              id: crmLeads.id,
            })
            .from(crmLeads)
            .where(
              and(
                eq(
                  crmLeads
                    .tenantId,
                  tenantId,
                ),
                eq(
                  crmLeads.id,
                  sourceLeadId,
                ),
              ),
            )
            .limit(1)
        )[0]
      : undefined;

  if (
    sourceLeadId &&
    !sourceLead
  ) {
    throw new ApiError(
      "El prospecto seleccionado no pertenece a la empresa.",
      400,
    );
  }

  if (
    !customer &&
    !sourceLead
  ) {
    throw new ApiError(
      "Selecciona un cliente o un prospecto para la oportunidad.",
      400,
    );
  }

  return {
    customerType:
      customer?.customerType ??
      null,
  };
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

  const [member] = await db
    .select({
      clerkUserId:
        tenantMembers
          .clerkUserId,

      firstName:
        tenantMembers.firstName,

      lastName:
        tenantMembers.lastName,

      email:
        tenantMembers.email,
    })
    .from(tenantMembers)
    .where(
      and(
        eq(
          tenantMembers.tenantId,
          tenantId,
        ),
        eq(
          tenantMembers.clerkUserId,
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
    id: member.clerkUserId,

    name:
      [
        member.firstName,
        member.lastName,
      ]
        .filter(Boolean)
        .join(" ") ||
      member.email,

    email: member.email,
  };
}

function mapPromotionForCalculation(
  promotion:
    typeof crmPromotions.$inferSelect,
): DealPromotionInput {
  return {
    id: promotion.id,
    name: promotion.name,

    promotionGroup:
      promotion.promotionGroup,

    benefitType:
      promotion.benefitType,

    paymentMethod:
      promotion.paymentMethod,

    requiresSelection:
      promotion.requiresSelection,

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

    commercialMessage:
      promotion
        .commercialMessage,
  };
}

function validatePromotionEligibility(
  promotion:
    typeof crmPromotions.$inferSelect,
  productId:
    | string
    | null,
  applicableProductIds:
    Set<string>,
  acquisitionChannel:
    | string
    | undefined,
  customerType:
    | string
    | null,
    existingUsage = 0,
) {
  const now = Date.now();

  if (promotion.paused) {
    throw new ApiError(
      `La promoción "${promotion.name}" está pausada.`,
      400,
    );
  }

  if (
    !promotion.promotionStart ||
    !promotion.promotionEnd ||
    now <
      promotion.promotionStart
        .getTime() ||
    now >=
      promotion.promotionEnd
        .getTime()
  ) {
    throw new ApiError(
      `La promoción "${promotion.name}" no está vigente.`,
      400,
    );
  }

  if (
    promotion.limitPromotion &&
    promotion.maximumBenefits !==
      null &&
    promotion.usedBenefits -
      existingUsage >=
      promotion.maximumBenefits
  ) {
    throw new ApiError(
      `La promoción "${promotion.name}" ya no tiene beneficios disponibles.`,
      400,
    );
  }

  if (
    productId &&
    applicableProductIds.size >
      0 &&
    !applicableProductIds.has(
      productId,
    )
  ) {
    throw new ApiError(
      `La promoción "${promotion.name}" no aplica al producto seleccionado.`,
      400,
    );
  }

  if (
    !productId &&
    applicableProductIds.size >
      0
  ) {
    throw new ApiError(
      `La promoción "${promotion.name}" debe aplicarse a una partida específica.`,
      400,
    );
  }

  const normalizedChannels =
    promotion.channels.map(
      (channel) =>
        normalizeText(channel),
    );

  const appliesToAllChannels =
    normalizedChannels.includes(
      "todos",
    );

  if (
    normalizedChannels.length > 0 &&
    !appliesToAllChannels
  ) {
    const normalizedChannel =
      normalizeText(
        acquisitionChannel,
      );

    const channelMatches =
      normalizedChannel &&
      normalizedChannels.includes(
        normalizedChannel,
      );

    if (!channelMatches) {
      throw new ApiError(
        `La promoción "${promotion.name}" no aplica al canal de adquisición seleccionado.`,
        400,
      );
    }
  }

  const normalizedPromotionCustomerType =
    normalizeText(
      promotion.customerType,
    );

  const appliesToAllCustomers =
    normalizedPromotionCustomerType ===
      "todos" ||
    normalizedPromotionCustomerType ===
      "todo";

  if (
    normalizedPromotionCustomerType &&
    !appliesToAllCustomers
  ) {
    const customerTypeMatches =
      customerType &&
      normalizedPromotionCustomerType ===
        normalizeText(
          customerType,
        );

    if (!customerTypeMatches) {
      throw new ApiError(
        `La promoción "${promotion.name}" no aplica al tipo de cliente seleccionado.`,
        400,
      );
    }
  }
}

async function prepareDealItems(
  tenantId: string,
  itemPayloads:
    DealItemPayload[],
  generalPromotionIds:
    string[],
  acquisitionChannel:
    | string
    | undefined,
  customerType:
    | string
    | null,
  existingPromotionUsage =
    new Map<string, number>(),
) {
  const productIds =
    Array.from(
      new Set(
        itemPayloads
          .map((item) =>
            getOptionalString(
              item.productId,
            ),
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          ),
      ),
    );

  const products = await db
    .select()
    .from(crmProducts)
    .where(
      and(
        eq(
          crmProducts.tenantId,
          tenantId,
        ),
        eq(
          crmProducts.active,
          true,
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
      "Uno o más productos no existen, están inactivos o pertenecen a otra empresa.",
      400,
    );
  }

  const productsById =
    new Map(
      products.map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );

  const currencies =
    Array.from(
      new Set(
        products.map(
          (product) =>
            product.currency
              .trim()
              .toLowerCase(),
        ),
      ),
    );

  if (currencies.length > 1) {
    throw new ApiError(
      "Todos los productos de una oportunidad deben utilizar la misma moneda.",
      400,
    );
  }

  const itemPromotionIds =
    itemPayloads.flatMap(
      (item) =>
        getStringArray(
          item.promotionIds,
        ),
    );

  const selectedPromotionIds =
    Array.from(
      new Set([
        ...itemPromotionIds,
        ...generalPromotionIds,
      ]),
    );

  const promotionRecords =
    selectedPromotionIds.length >
      0
      ? await db
          .select()
          .from(crmPromotions)
          .where(
            and(
              eq(
                crmPromotions
                  .tenantId,
                tenantId,
              ),
              inArray(
                crmPromotions.id,
                selectedPromotionIds,
              ),
            ),
          )
      : [];

  if (
    promotionRecords.length !==
    selectedPromotionIds.length
  ) {
    throw new ApiError(
      "Una o más promociones no existen o pertenecen a otra empresa.",
      400,
    );
  }

  const relations =
    selectedPromotionIds.length >
      0
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
              selectedPromotionIds,
            ),
          )
      : [];

  const promotionRecordsById =
    new Map(
      promotionRecords.map(
        (promotion) => [
          promotion.id,
          promotion,
        ],
      ),
    );

  const productIdsByPromotion =
    new Map<
      string,
      Set<string>
    >();

  for (
    const relation of relations
  ) {
    const relationProductIds =
      productIdsByPromotion.get(
        relation.promotionId,
      ) ??
      new Set<string>();

    relationProductIds.add(
      relation.productId,
    );

    productIdsByPromotion.set(
      relation.promotionId,
      relationProductIds,
    );
  }

  const items:
    ValidatedDealItem[] =
    itemPayloads.map(
      (itemPayload) => {
        const productId =
          getOptionalString(
            itemPayload.productId,
          ) as string;

        const product =
          productsById.get(
            productId,
          );

        if (!product) {
          throw new ApiError(
            "No fue posible identificar una de las partidas.",
            400,
          );
        }

        const promotionIds =
          getStringArray(
            itemPayload
              .promotionIds,
          );

        const promotions =
          promotionIds.map(
            (promotionId) => {
              const promotion =
                promotionRecordsById.get(
                  promotionId,
                );

              if (!promotion) {
                throw new ApiError(
                  "No fue posible identificar una de las promociones.",
                  400,
                );
              }

              validatePromotionEligibility(
                promotion,
                productId,
                productIdsByPromotion.get(
                  promotion.id,
                ) ??
                  new Set<string>(),
                acquisitionChannel,
                customerType,
                existingPromotionUsage.get(
                  promotion.id,
                ) ?? 0,
              );

              return mapPromotionForCalculation(
                promotion,
              );
            },
          );

        return {
          id:
            crypto.randomUUID(),

          productId:
            product.id,

          name:
            product.name,

          description:
            product.description,

          quantity:
            getOptionalNumber(
              itemPayload.quantity,
            ) as number,

          unitPrice:
            Number(
              product.unitPrice,
            ),

          paymentMethod:
            getOptionalString(
              itemPayload
                .paymentMethod,
            ) ??
            "Por definir",

          customerDownPayment:
            Math.max(
              getOptionalNumber(
                itemPayload
                  .customerDownPayment,
              ) ?? 0,
              0,
            ),

          financingMonths:
            getOptionalInteger(
              itemPayload
                .financingMonths,
            ) ??
            null,

          currency:
            product.currency,

          promotions,
        };
      },
    );

  const generalPromotions =
    generalPromotionIds.map(
      (promotionId) => {
        const promotion =
          promotionRecordsById.get(
            promotionId,
          );

        if (!promotion) {
          throw new ApiError(
            "No fue posible identificar una de las promociones generales.",
            400,
          );
        }

        validatePromotionEligibility(
          promotion,
          null,
          productIdsByPromotion.get(
            promotion.id,
          ) ??
            new Set<string>(),
          acquisitionChannel,
          customerType,
          existingPromotionUsage.get(
            promotion.id,
          ) ?? 0,
        );

        return mapPromotionForCalculation(
          promotion,
        );
      },
    );

  return {
    items,
    generalPromotions,

    currency:
      currencies[0] ??
      "mxn",
  };
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
      body as DealFormPayload;

    const validationError =
      validateBasicPayload(
        values,
      );

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

    const customerId =
      getOptionalString(
        values.customerId,
      );

    const sourceLeadId =
      getOptionalString(
        values.sourceLeadId,
      );

    const {
      customerType,
    } =
      await validateRelatedRecords(
        tenantId,
        customerId,
        sourceLeadId,
      );

    const owner =
      await getOwnerSnapshot(
        tenantId,
        getOptionalString(
          values.ownerClerkUserId,
        ),
        userId,
      );

    const itemPayloads =
      getDealItems(
        values.items,
      );

    const generalPromotionIds =
      getStringArray(
        values
          .generalPromotionIds,
      );

    const acquisitionChannel =
      getOptionalString(
        values
          .acquisitionChannel,
      );

    const prepared =
      await prepareDealItems(
        tenantId,
        itemPayloads,
        generalPromotionIds,
        acquisitionChannel,
        customerType,
      );

    const calculationItems:
      DealItemCalculationInput[] =
      prepared.items.map(
        (item) => ({
          id: item.id,
          productId:
            item.productId,

          name: item.name,

          quantity:
            item.quantity,

                    unitPrice:
            item.unitPrice,

          paymentMethod:
            item.paymentMethod,

          customerDownPayment:
            item
              .customerDownPayment,

          financingMonths:
            item.financingMonths,

          promotions:
            item.promotions,
        }),
      );

    const calculation =
      calculateDeal({
        items:
          calculationItems,

        generalPromotions:
          prepared
            .generalPromotions,

        customerDownPayment:
          getOptionalNumber(
            values
              .customerDownPayment,
          ),
      });

    if (
      calculation.errors.length >
      0
    ) {
      throw new ApiError(
        calculation.errors.join(
          " ",
        ),
        400,
      );
    }

    const dealId =
      crypto.randomUUID();

    const now = new Date();

    const status =
      getOptionalString(
        values.status,
      ) ?? "Abierta";

    const normalizedStatus =
      normalizeText(status);

    const isClosed =
      normalizedStatus ===
        "ganada" ||
      normalizedStatus ===
        "perdida" ||
      normalizedStatus ===
        "cancelada";

    const dealQuery = db
      .insert(crmDeals)
      .values({
        id: dealId,
        tenantId,

        name:
          getOptionalString(
            values.name,
          ) as string,

        customerId:
          customerId ?? null,

        sourceLeadId:
          sourceLeadId ?? null,

        ownerClerkUserId:
          owner.id,

        ownerName:
          owner.name,

        ownerEmail:
          owner.email,

        stage:
          getOptionalString(
            values.stage,
          ) as string,

        status,

        acquisitionChannel:
          acquisitionChannel ??
          null,

        currency:
          prepared.currency,

        baseAmount:
          String(
            calculation
              .baseAmount,
          ),

        discountAmount:
          String(
            calculation
              .discountAmount,
          ),

        totalAmount:
          String(
            calculation
              .totalAmount,
          ),

        paymentMethod:
          calculation
            .paymentMethod,

        minimumDownPayment:
          getNumericString(
            calculation
              .minimumDownPayment,
          ),

        customerDownPayment:
          getNumericString(
            calculation
              .customerDownPayment,
          ),

        financedAmount:
          getNumericString(
            calculation
              .financedAmount,
          ),

        financingMonths:
          calculation
            .financingMonths,

        estimatedPayment:
          getNumericString(
            calculation
              .estimatedPayment,
          ),

        probability:
          getOptionalInteger(
            values.probability,
          ),

        expectedCloseAt:
          getOptionalDate(
            values
              .expectedCloseAt,
          ),

        closedAt:
          isClosed
            ? now
            : null,

        nextStep:
          getOptionalString(
            values.nextStep,
          ) ?? null,

        notes:
          getOptionalString(
            values.notes,
          ) ?? null,

        calculationSnapshot:
          calculation,

        metadata: {},

        createdAt: now,
        updatedAt: now,
      });

    const itemQueries =
      calculation.items.map(
        (item, position) => {
          const sourceItem =
            prepared.items.find(
              (
                preparedItem,
              ) =>
                preparedItem.id ===
                item.id,
            );

          if (!sourceItem) {
            throw new ApiError(
              "No fue posible relacionar una de las partidas calculadas.",
              400,
            );
          }

          return db
            .insert(
              crmDealItems,
            )
            .values({
              id: item.id,
              tenantId,
              dealId,

              productId:
                item.productId,

              name: item.name,

              description:
                sourceItem
                  .description,

              quantity:
                String(
                  item.quantity,
                ),

              unitPrice:
                String(
                  item.unitPrice,
                ),

              discountAmount:
                String(
                  item
                    .discountAmount,
                ),

              totalAmount:
                String(
                  item.totalAmount,
                ),

              paymentMethod:
                item.paymentMethod,

              minimumDownPayment:
                getNumericString(
                  item
                    .minimumDownPayment,
                ),

              customerDownPayment:
                String(
                  item
                    .customerDownPayment,
                ),

              financedAmount:
                getNumericString(
                  item
                    .financedAmount,
                ),

              financingMonths:
                item
                  .financingMonths,

              estimatedPayment:
                getNumericString(
                  item
                    .estimatedPayment,
                ),

              calculationSnapshot:
                item,

              position,

              metadata: {},

              createdAt: now,
              updatedAt: now,
            });
        },
      );

    const promotionRows:
      Array<
        typeof crmDealPromotions
          .$inferInsert
      > = [];

    for (
      const item of
      calculation.items
    ) {
      const sourceItem =
        prepared.items.find(
          (
            preparedItem,
          ) =>
            preparedItem.id ===
            item.id,
        );

      for (
        const promotion of
        item.promotions
      ) {
        const sourcePromotion =
          sourceItem?.promotions.find(
            (
              preparedPromotion,
            ) =>
              preparedPromotion.id ===
              promotion.id,
          );

        promotionRows.push({
          id:
            crypto.randomUUID(),

          tenantId,
          dealId,

          dealItemId:
            item.id,

          promotionId:
            promotion.id,

          scope: "item",

          promotionName:
            promotion.name,

          promotionGroup:
            promotion
              .promotionGroup,

          benefitType:
            promotion
              .benefitType,

          paymentMethod:
            promotion
              .paymentMethod,

          requiresSelection:
            promotion
              .requiresSelection,

          promotionValue:
            getNumericString(
              promotion.value,
            ),

          calculatedBenefit:
            String(
              promotion
                .calculatedBenefit,
            ),

          snapshot: {
            ...sourcePromotion,

            calculatedBenefit:
              promotion
                .calculatedBenefit,
          },

          appliedAt: now,
        });
      }
    }

    for (
      const promotion of
      calculation.generalPromotions
    ) {
      const sourcePromotion =
        prepared
          .generalPromotions
          .find(
            (
              preparedPromotion,
            ) =>
              preparedPromotion.id ===
              promotion.id,
          );

      promotionRows.push({
        id:
          crypto.randomUUID(),

        tenantId,
        dealId,

        dealItemId: null,

        promotionId:
          promotion.id,

        scope: "deal",

        promotionName:
          promotion.name,

        promotionGroup:
          promotion
            .promotionGroup,

        benefitType:
          promotion
            .benefitType,

        paymentMethod:
          promotion
            .paymentMethod,

        requiresSelection:
          promotion
            .requiresSelection,

        promotionValue:
          getNumericString(
            promotion.value,
          ),

        calculatedBenefit:
          String(
            promotion
              .calculatedBenefit,
          ),

        snapshot: {
          ...sourcePromotion,

          calculatedBenefit:
            promotion
              .calculatedBenefit,
        },

        appliedAt: now,
      });
    }

    const promotionUsage =
      new Map<string, number>();

    for (
      const promotionRow of
      promotionRows
    ) {
      if (
        !promotionRow.promotionId
      ) {
        continue;
      }

      promotionUsage.set(
        promotionRow.promotionId,
        (
          promotionUsage.get(
            promotionRow.promotionId,
          ) ?? 0
        ) + 1,
      );
    }

    const promotionQuery =
      promotionRows.length > 0
        ? [
            db
              .insert(
                crmDealPromotions,
              )
              .values(
                promotionRows,
              ),
          ]
        : [];

    const usageQueries =
      Array.from(
        promotionUsage.entries(),
      ).map(
        ([
          promotionId,
          usage,
        ]) =>
          db
            .update(
              crmPromotions,
            )
            .set({
              usedBenefits:
                sql`
                  ${crmPromotions.usedBenefits}
                  + ${usage}
                `,

              updatedAt: now,
            })
            .where(
              and(
                eq(
                  crmPromotions
                    .tenantId,
                  tenantId,
                ),
                eq(
                  crmPromotions.id,
                  promotionId,
                ),
              ),
            ),
      );

    const batchQueries = [
      dealQuery,
      ...itemQueries,
      ...promotionQuery,
      ...usageQueries,
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
          "La oportunidad fue creada correctamente.",

        data: {
          id: dealId,

          createdTime:
            now.toISOString(),

          calculation,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible crear la oportunidad.",
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
      body as DealFormPayload;

    const dealId =
      getOptionalString(
        values.id,
      );

    if (!dealId) {
      throw new ApiError(
        "No fue posible identificar la oportunidad.",
        400,
      );
    }

    const validationError =
      validateBasicPayload(
        values,
      );

    if (validationError) {
      throw new ApiError(
        validationError,
        400,
      );
    }

    const [existingDeal] =
      await db
        .select()
        .from(crmDeals)
        .where(
          and(
            eq(
              crmDeals.tenantId,
              tenantId,
            ),
            eq(
              crmDeals.id,
              dealId,
            ),
          ),
        )
        .limit(1);

    if (!existingDeal) {
      throw new ApiError(
        "La oportunidad no existe o pertenece a otra empresa.",
        404,
      );
    }

    const existingPromotions =
      await db
        .select({
          promotionId:
            crmDealPromotions
              .promotionId,
        })
        .from(
          crmDealPromotions,
        )
        .where(
          and(
            eq(
              crmDealPromotions
                .tenantId,
              tenantId,
            ),
            eq(
              crmDealPromotions
                .dealId,
              dealId,
            ),
          ),
        );

    const existingUsage =
      new Map<string, number>();

    for (
      const promotion of
      existingPromotions
    ) {
      if (!promotion.promotionId) {
        continue;
      }

      existingUsage.set(
        promotion.promotionId,
        (
          existingUsage.get(
            promotion.promotionId,
          ) ?? 0
        ) + 1,
      );
    }

    const customerId =
      getOptionalString(
        values.customerId,
      );

    const sourceLeadId =
      getOptionalString(
        values.sourceLeadId,
      );

    const {
      customerType,
    } =
      await validateRelatedRecords(
        tenantId,
        customerId,
        sourceLeadId,
      );

    const owner =
      await getOwnerSnapshot(
        tenantId,
        getOptionalString(
          values.ownerClerkUserId,
        ),
        userId,
      );

    const acquisitionChannel =
      getOptionalString(
        values
          .acquisitionChannel,
      );

    const prepared =
      await prepareDealItems(
        tenantId,
        getDealItems(
          values.items,
        ),
        getStringArray(
          values
            .generalPromotionIds,
        ),
        acquisitionChannel,
        customerType,
        existingUsage,
      );

    const calculation =
      calculateDeal({
        items:
          prepared.items.map(
            (item) => ({
              id: item.id,
              productId:
                item.productId,

              name: item.name,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,

              paymentMethod:
                item.paymentMethod,

          customerDownPayment:
            item
              .customerDownPayment,

          financingMonths:
            item.financingMonths,

          promotions:
                item.promotions,
            }),
          ),

        generalPromotions:
          prepared
            .generalPromotions,

        customerDownPayment:
          getOptionalNumber(
            values
              .customerDownPayment,
          ),
      });

    if (
      calculation.errors.length >
      0
    ) {
      throw new ApiError(
        calculation.errors.join(
          " ",
        ),
        400,
      );
    }

    const now = new Date();

    const status =
      getOptionalString(
        values.status,
      ) ?? "Abierta";

    const normalizedStatus =
      normalizeText(status);

    const isClosed =
      normalizedStatus ===
        "ganada" ||
      normalizedStatus ===
        "perdida" ||
      normalizedStatus ===
        "cancelada";

    const updateDealQuery = db
      .update(crmDeals)
      .set({
        name:
          getOptionalString(
            values.name,
          ) as string,

        customerId:
          customerId ?? null,

        sourceLeadId:
          sourceLeadId ?? null,

        ownerClerkUserId:
          owner.id,

        ownerName:
          owner.name,

        ownerEmail:
          owner.email,

        stage:
          getOptionalString(
            values.stage,
          ) as string,

        status,

        acquisitionChannel:
          acquisitionChannel ??
          null,

        currency:
          prepared.currency,

        baseAmount:
          String(
            calculation
              .baseAmount,
          ),

        discountAmount:
          String(
            calculation
              .discountAmount,
          ),

        totalAmount:
          String(
            calculation
              .totalAmount,
          ),

        paymentMethod:
          calculation
            .paymentMethod,

        minimumDownPayment:
          getNumericString(
            calculation
              .minimumDownPayment,
          ),

        customerDownPayment:
          getNumericString(
            calculation
              .customerDownPayment,
          ),

        financedAmount:
          getNumericString(
            calculation
              .financedAmount,
          ),

        financingMonths:
          calculation
            .financingMonths,

        estimatedPayment:
          getNumericString(
            calculation
              .estimatedPayment,
          ),

        probability:
          getOptionalInteger(
            values.probability,
          ),

        expectedCloseAt:
          getOptionalDate(
            values
              .expectedCloseAt,
          ),

        closedAt:
          isClosed
            ? existingDeal
                .closedAt ??
              now
            : null,

        nextStep:
          getOptionalString(
            values.nextStep,
          ) ?? null,

        notes:
          getOptionalString(
            values.notes,
          ) ?? null,

        calculationSnapshot:
          calculation,

        updatedAt: now,
      })
      .where(
        and(
          eq(
            crmDeals.tenantId,
            tenantId,
          ),
          eq(
            crmDeals.id,
            dealId,
          ),
        ),
      );

    const deletePromotionsQuery =
      db
        .delete(
          crmDealPromotions,
        )
        .where(
          and(
            eq(
              crmDealPromotions
                .tenantId,
              tenantId,
            ),
            eq(
              crmDealPromotions
                .dealId,
              dealId,
            ),
          ),
        );

    const deleteItemsQuery =
      db
        .delete(crmDealItems)
        .where(
          and(
            eq(
              crmDealItems
                .tenantId,
              tenantId,
            ),
            eq(
              crmDealItems.dealId,
              dealId,
            ),
          ),
        );

        const itemQueries =
      calculation.items.map(
        (item, position) => {
          const sourceItem =
            prepared.items.find(
              (
                preparedItem,
              ) =>
                preparedItem.id ===
                item.id,
            );

          if (!sourceItem) {
            throw new ApiError(
              "No fue posible relacionar una de las partidas calculadas.",
              400,
            );
          }

          return db
            .insert(
              crmDealItems,
            )
            .values({
              id: item.id,
              tenantId,
              dealId,

              productId:
                item.productId,

              name: item.name,

              description:
                sourceItem
                  .description,

              quantity:
                String(
                  item.quantity,
                ),

              unitPrice:
                String(
                  item.unitPrice,
                ),

              discountAmount:
                String(
                  item
                    .discountAmount,
                ),

              totalAmount:
                String(
                  item.totalAmount,
                ),

              paymentMethod:
                item.paymentMethod,

              minimumDownPayment:
                getNumericString(
                  item
                    .minimumDownPayment,
                ),

              customerDownPayment:
                String(
                  item
                    .customerDownPayment,
                ),

              financedAmount:
                getNumericString(
                  item
                    .financedAmount,
                ),

              financingMonths:
                item
                  .financingMonths,

              estimatedPayment:
                getNumericString(
                  item
                    .estimatedPayment,
                ),

              calculationSnapshot:
                item,

              position,

              metadata: {},

              createdAt: now,
              updatedAt: now,
            });
        },
      );

    const promotionRows:
      Array<
        typeof crmDealPromotions
          .$inferInsert
      > = [];

    for (
      const item of
      calculation.items
    ) {
      const sourceItem =
        prepared.items.find(
          (
            preparedItem,
          ) =>
            preparedItem.id ===
            item.id,
        );

      for (
        const promotion of
        item.promotions
      ) {
        const sourcePromotion =
          sourceItem?.promotions.find(
            (
              preparedPromotion,
            ) =>
              preparedPromotion.id ===
              promotion.id,
          );

        promotionRows.push({
          id:
            crypto.randomUUID(),

          tenantId,
          dealId,

          dealItemId:
            item.id,

          promotionId:
            promotion.id,

          scope: "item",

          promotionName:
            promotion.name,

          promotionGroup:
            promotion
              .promotionGroup,

          benefitType:
            promotion
              .benefitType,

          paymentMethod:
            promotion
              .paymentMethod,

          requiresSelection:
            promotion
              .requiresSelection,

          promotionValue:
            getNumericString(
              promotion.value,
            ),

          calculatedBenefit:
            String(
              promotion
                .calculatedBenefit,
            ),

          snapshot: {
            ...sourcePromotion,

            calculatedBenefit:
              promotion
                .calculatedBenefit,
          },

          appliedAt: now,
        });
      }
    }

    for (
      const promotion of
      calculation.generalPromotions
    ) {
      const sourcePromotion =
        prepared
          .generalPromotions
          .find(
            (
              preparedPromotion,
            ) =>
              preparedPromotion.id ===
              promotion.id,
          );

      promotionRows.push({
        id:
          crypto.randomUUID(),

        tenantId,
        dealId,

        dealItemId: null,

        promotionId:
          promotion.id,

        scope: "deal",

        promotionName:
          promotion.name,

        promotionGroup:
          promotion
            .promotionGroup,

        benefitType:
          promotion
            .benefitType,

        paymentMethod:
          promotion
            .paymentMethod,

        requiresSelection:
          promotion
            .requiresSelection,

        promotionValue:
          getNumericString(
            promotion.value,
          ),

        calculatedBenefit:
          String(
            promotion
              .calculatedBenefit,
          ),

        snapshot: {
          ...sourcePromotion,

          calculatedBenefit:
            promotion
              .calculatedBenefit,
        },

        appliedAt: now,
      });
    }

    const nextUsage =
      new Map<string, number>();

    for (
      const promotionRow of
      promotionRows
    ) {
      if (
        !promotionRow.promotionId
      ) {
        continue;
      }

      nextUsage.set(
        promotionRow.promotionId,
        (
          nextUsage.get(
            promotionRow.promotionId,
          ) ?? 0
        ) + 1,
      );
    }

    const allUsageIds =
      Array.from(
        new Set([
          ...existingUsage.keys(),
          ...nextUsage.keys(),
        ]),
      );

    const usageQueries =
      allUsageIds
        .map((promotionId) => ({
          promotionId,

          delta:
            (
              nextUsage.get(
                promotionId,
              ) ?? 0
            ) -
            (
              existingUsage.get(
                promotionId,
              ) ?? 0
            ),
        }))
        .filter(
          ({ delta }) =>
            delta !== 0,
        )
        .map(
          ({
            promotionId,
            delta,
          }) =>
            db
              .update(
                crmPromotions,
              )
              .set({
                usedBenefits:
                  sql`
                    greatest(
                      0,
                      ${crmPromotions.usedBenefits}
                      + ${delta}
                    )
                  `,

                updatedAt: now,
              })
              .where(
                and(
                  eq(
                    crmPromotions
                      .tenantId,
                    tenantId,
                  ),
                  eq(
                    crmPromotions.id,
                    promotionId,
                  ),
                ),
              ),
        );

    const promotionQuery =
      promotionRows.length > 0
        ? [
            db
              .insert(
                crmDealPromotions,
              )
              .values(
                promotionRows,
              ),
          ]
        : [];

    const batchQueries = [
      updateDealQuery,
      deletePromotionsQuery,
      deleteItemsQuery,
      ...itemQueries,
      ...promotionQuery,
      ...usageQueries,
    ];

    await db.batch(
      batchQueries as unknown as
        Parameters<
          typeof db.batch
        >[0],
    );

    return NextResponse.json({
      success: true,

      message:
        "La oportunidad fue actualizada correctamente.",

      data: {
        id: dealId,

        modifiedTime:
          now.toISOString(),

        calculation,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible actualizar la oportunidad.",
    );
  }
}

// VALIDATION_HELPERS
