import { auth } from "@clerk/nextjs/server";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  sql,
} from "drizzle-orm";

import { NextResponse } from "next/server";

import { db } from "@/db";

import {
  crmCustomers,
  crmDeals,
  crmLeads,
  crmProducts,
  crmPromotions,
  crmQuoteItems,
  crmQuotePromotions,
  crmQuotes,
  tenantBranches,
  tenantMembers,
  tenants,
} from "@/db/schema";

import {
  calculateDeal,
  type DealItemCalculationInput,
  type DealPromotionInput,
} from "@/lib/crm/deal-calculations";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
  validateCRMBranchId,
  type CRMBranchAccessContext,
} from "@/lib/crm/branch-access";

import {
  CRMPermissionError,
  type CRMModulePermission,
  type CRMModulePermissions,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

import type {
  CRMQuoteAddress,
  CRMQuoteStatus,
} from "@/types/crm-quotes";

export const dynamic =
  "force-dynamic";

type QuoteItemPayload = {
  id?: unknown;

  productId?: unknown;

  quantity?: unknown;
  unitPrice?: unknown;

  paymentMethod?: unknown;

  taxRate?: unknown;

  customerDownPayment?: unknown;

  financingMonths?: unknown;

  promotionIds?: unknown;
};

type QuotePayload = {
  id?: unknown;

  subject?: unknown;
  branchId?: unknown;
  status?: unknown;

  customerId?: unknown;
  sourceLeadId?: unknown;
  dealId?: unknown;

  ownerClerkUserId?: unknown;

  validUntil?: unknown;

  adjustmentAmount?: unknown;

  billingAddress?: unknown;
  shippingAddress?: unknown;

  commercialSummary?: unknown;

  termsAndConditions?: unknown;

  description?: unknown;

  items?: unknown;

  generalPromotionIds?: unknown;
};

type PreparedQuoteItem = {
  id: string;

  productId: string;

  name: string;

  description:
    | string
    | null;

  quantity: number;
  unitPrice: number;

  paymentMethod: string;

  taxRate: number;

  customerDownPayment: number;

  financingMonths:
  | number
  | null

  currency: string;

  promotions:
    DealPromotionInput[];

  technicalSpecifications:
    Record<string, unknown>;
  };

type PreparedQuote = {
  items:
    PreparedQuoteItem[];

  generalPromotions:
    DealPromotionInput[];
};

type TenantContext = {
  tenantId: string;
  userId: string;
  timezone: string;

  branchAccess:
    CRMBranchAccessContext;

  permissions:
    CRMModulePermissions;
};

type OwnerRecord = {
  id: string;
  name: string;
  email: string;
};

const quoteStatuses:
  CRMQuoteStatus[] = [
  "Borrador",
  "Enviada",
  "Aceptada",
  "Rechazada",
  "Vencida",
  "Convertida",
  "Cancelada",
];

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
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getOptionalString(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return (
    normalized ||
    undefined
  );
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
    Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : undefined;
}

function getRequiredValidityDate(
  value: unknown,
): Date {
  const stringValue =
    getOptionalString(value);

  if (!stringValue) {
    throw new ApiError(
      "La fecha de vigencia de la cotización es obligatoria.",
      400,
    );
  }

  const date =
    new Date(stringValue);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new ApiError(
      "La fecha de vigencia no es válida.",
      400,
    );
  }

  return date;
}

function validatePromotionValidity(
  validUntil: Date,
  prepared: PreparedQuote,
) {
  const promotions = [
    ...prepared.generalPromotions,

    ...prepared.items.flatMap(
      (item) =>
        item.promotions,
    ),
  ];

  const promotionLimit =
    promotions
      .map(
        (promotion) =>
          promotion.promotionEnd,
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      )
      .map(
        (value) =>
          new Date(value),
      )
      .filter(
        (date) =>
          !Number.isNaN(
            date.getTime(),
          ),
      )
      .sort(
        (first, second) =>
          first.getTime() -
          second.getTime(),
      )[0];

  if (
    promotionLimit &&
    validUntil.getTime() >
      promotionLimit.getTime()
  ) {
    throw new ApiError(
      "La vigencia de la cotización no puede superar la fecha final de las promociones seleccionadas.",
      400,
    );
  }
}

function getStringArray(
  value: unknown,
): string[] {
  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  if (
    !Array.isArray(value)
  ) {
    throw new ApiError(
      "La lista de promociones no tiene un formato válido.",
      400,
    );
  }

  return Array.from(
    new Set(
      value
        .map(getOptionalString)
        .filter(
          (
            item,
          ): item is string =>
            Boolean(item),
        ),
    ),
  );
}

function getItems(
  value: unknown,
): QuoteItemPayload[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some(
      (item) =>
        !isRecord(item),
    )
  ) {
    throw new ApiError(
      "Agrega por lo menos una partida a la cotización.",
      400,
    );
  }

  return value as
    QuoteItemPayload[];
}

function getStatus(
  value: unknown,
): CRMQuoteStatus {
  const status =
    getOptionalString(value) ??
    "Borrador";

  if (
    !quoteStatuses.includes(
      status as CRMQuoteStatus,
    )
  ) {
    throw new ApiError(
      "El estado de la cotización no es válido.",
      400,
    );
  }

  return status as
    CRMQuoteStatus;
}

function getAddress(
  value: unknown,
): CRMQuoteAddress {
  if (
    value === null ||
    value === undefined
  ) {
    return {};
  }

  if (!isRecord(value)) {
    throw new ApiError(
      "La dirección no tiene un formato válido.",
      400,
    );
  }

  const address:
    CRMQuoteAddress = {};

  const keys:
    Array<
      keyof CRMQuoteAddress
    > = [
    "country",
    "state",
    "city",
    "postalCode",
    "street",
    "exteriorNumber",
    "interiorNumber",
    "neighborhood",
    "reference",
  ];

  for (const key of keys) {
    const fieldValue =
      getOptionalString(
        value[key],
      );

    if (fieldValue) {
      address[key] =
        fieldValue;
    }
  }

  return address;
}

function toNumber(
  value: unknown,
  fallback = 0,
): number {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : fallback;
}

function toNullableNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : null;
}

function getNumericString(
  value:
    | number
    | null
    | undefined,
): string | null {
  return value === null ||
    value === undefined
    ? null
    : String(value);
}

function roundMoney(
  value: number,
): number {
  return (
    Math.round(
      (value +
        Number.EPSILON) *
        100,
    ) / 100
  );
}

function createQuoteNumber() {
  const date =
    new Date();

  const datePart = [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      date.getDate(),
    ).padStart(2, "0"),
  ].join("");

  const randomPart =
    crypto
      .randomUUID()
      .slice(0, 6)
      .toUpperCase();

  return `COT-${datePart}-${randomPart}`;
}

async function getTenantContext(
  permission:
    CRMModulePermission,
): Promise<TenantContext> {
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

        timezone:
          tenants.timezone,
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
      "quotes",
      permission,
    ),
  ]);

  return {
    tenantId: tenant.id,
    userId,

    timezone:
      tenant.timezone,

    branchAccess,
    permissions,
  };
}

async function getOwner(
  tenantId: string,
  currentUserId: string,
  requestedOwnerId: unknown,
): Promise<OwnerRecord> {
  const ownerId =
    getOptionalString(
      requestedOwnerId,
    ) ?? currentUserId;

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
            tenantMembers.tenantId,
            tenantId,
          ),

          eq(
            tenantMembers
              .clerkUserId,
            ownerId,
          ),
        ),
      )
      .limit(1);

  if (!member) {
    throw new ApiError(
      "El responsable seleccionado no pertenece a la empresa.",
      400,
    );
  }

  const name = [
    member.firstName,
    member.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: member.clerkUserId,

    name:
      name ||
      member.email,

    email: member.email,
  };
}

async function validateRelations(
  tenantId: string,
  values: QuotePayload,
) {
  const customerId =
    getOptionalString(
      values.customerId,
    );

  const sourceLeadId =
    getOptionalString(
      values.sourceLeadId,
    );

  const dealId =
    getOptionalString(
      values.dealId,
    );

  if (
    !customerId &&
    !sourceLeadId
  ) {
    throw new ApiError(
      "Selecciona un cliente o un prospecto.",
      400,
    );
  }

  if (customerId) {
    const [customer] =
      await db
        .select({
          id: crmCustomers.id,
        })
        .from(crmCustomers)
        .where(
          and(
            eq(
              crmCustomers.id,
              customerId,
            ),

            eq(
              crmCustomers.tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!customer) {
      throw new ApiError(
        "El cliente seleccionado no existe.",
        400,
      );
    }
  }

  if (sourceLeadId) {
    const [lead] =
      await db
        .select({
          id: crmLeads.id,
        })
        .from(crmLeads)
        .where(
          and(
            eq(
              crmLeads.id,
              sourceLeadId,
            ),

            eq(
              crmLeads.tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!lead) {
      throw new ApiError(
        "El prospecto seleccionado no existe.",
        400,
      );
    }
  }

  if (dealId) {
    const [deal] =
      await db
        .select({
          id: crmDeals.id,
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
        "La oportunidad seleccionada no existe.",
        400,
      );
    }
  }

  return {
    customerId:
      customerId ?? null,

    sourceLeadId:
      sourceLeadId ?? null,

    dealId:
      dealId ?? null,
  };
}

function mapPromotion(
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
      toNullableNumber(
        promotion.value,
      ),

    availableMonths:
      Array.isArray(
        promotion.availableMonths,
      )
        ? promotion.availableMonths.map(
            String,
          )
        : [],

    promotionEnd:
      promotion.promotionEnd
        ?.toISOString() ?? null,

    minimumDownPayment:
      toNullableNumber(
        promotion
          .minimumDownPayment,
      ),

    commercialMessage:
      promotion.commercialMessage,
  };
}

async function prepareQuote(
  tenantId: string,
  itemPayloads:
    QuoteItemPayload[],
  generalPromotionIds:
    string[],
): Promise<PreparedQuote> {
  const productIds =
    Array.from(
      new Set(
        itemPayloads.map(
          (item) => {
            const productId =
              getOptionalString(
                item.productId,
              );

            if (!productId) {
              throw new ApiError(
                "Selecciona un producto en cada partida.",
                400,
              );
            }

            return productId;
          },
        ),
      ),
    );

  const productRecords =
    await db
      .select()
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
      "Uno o más productos no existen o no pertenecen a la empresa.",
      400,
    );
  }

  const productsById =
    new Map(
      productRecords.map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );

  const itemPromotionIds =
    itemPayloads.flatMap(
      (item) =>
        getStringArray(
          item.promotionIds,
        ),
    );

  const promotionIds =
    Array.from(
      new Set([
        ...itemPromotionIds,
        ...generalPromotionIds,
      ]),
    );

  const promotionRecords =
    promotionIds.length > 0
      ? await db
          .select()
          .from(crmPromotions)
          .where(
            and(
              eq(
                crmPromotions.tenantId,
                tenantId,
              ),

              inArray(
                crmPromotions.id,
                promotionIds,
              ),
            ),
          )
      : [];

  if (
    promotionRecords.length !==
    promotionIds.length
  ) {
    throw new ApiError(
      "Una o más promociones no existen o no pertenecen a la empresa.",
      400,
    );
  }

  const promotionsById =
    new Map(
      promotionRecords.map(
        (promotion) => [
          promotion.id,
          mapPromotion(
            promotion,
          ),
        ],
      ),
    );

  const items =
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
            "El producto seleccionado no existe.",
            400,
          );
        }

        const quantity =
          getOptionalNumber(
            itemPayload.quantity,
          );

        if (
          quantity === undefined ||
          quantity <= 0
        ) {
          throw new ApiError(
            `La cantidad de "${product.name}" debe ser mayor que cero.`,
            400,
          );
        }

        const customUnitPrice =
          getOptionalNumber(
            itemPayload.unitPrice,
          );

        const unitPrice =
          customUnitPrice ??
          Number(
            product.unitPrice,
          );

        if (unitPrice < 0) {
          throw new ApiError(
            `El precio de "${product.name}" no puede ser negativo.`,
            400,
          );
        }

        const taxRate =
          Math.max(
            getOptionalNumber(
              itemPayload.taxRate,
            ) ?? 0,
            0,
          );

        if (taxRate > 100) {
          throw new ApiError(
            `El impuesto de "${product.name}" no puede superar el 100%.`,
            400,
          );
        }

        const selectedPromotionIds =
          getStringArray(
            itemPayload
              .promotionIds,
          );

        const promotions =
          selectedPromotionIds.map(
            (promotionId) => {
              const promotion =
                promotionsById.get(
                  promotionId,
                );

              if (!promotion) {
                throw new ApiError(
                  "La promoción seleccionada no existe.",
                  400,
                );
              }

              return promotion;
            },
          );

        return {
          id:
            getOptionalString(
              itemPayload.id,
            ) ??
            crypto.randomUUID(),

          productId,

          name: product.name,

          description:
            product.description,

          technicalSpecifications:
            isRecord(
              product.metadata
                ?.technicalSpecifications,
            )
              ? {
                  ...product.metadata
                    .technicalSpecifications,
                }
              : {},

          quantity,
          unitPrice,

          paymentMethod:
            getOptionalString(
              itemPayload
                .paymentMethod,
            ) ?? "Por definir",

          taxRate,

          customerDownPayment:
            Math.max(
              getOptionalNumber(
                itemPayload
                  .customerDownPayment,
              ) ?? 0,
              0,
            ),

          financingMonths:
            getOptionalNumber(
              itemPayload
                .financingMonths,
            ) ?? null,

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
          promotionsById.get(
            promotionId,
          );

        if (!promotion) {
          throw new ApiError(
            "La promoción general seleccionada no existe.",
            400,
          );
        }

        return promotion;
      },
    );

  return {
    items,
    generalPromotions,
  };
}

function calculateQuote(
  prepared: PreparedQuote,
  adjustmentAmount: number,
) {
  const currencies =
    Array.from(
      new Set(
        prepared.items.map(
          (item) =>
            item.currency
              .trim()
              .toLowerCase(),
        ),
      ),
    );

  if (
    currencies.length > 1
  ) {
    throw new ApiError(
      "Todos los productos de la cotización deben usar la misma moneda.",
      400,
    );
  }

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
          item.customerDownPayment,

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

  const items =
    calculation.items.map(
      (itemResult) => {
        const preparedItem =
          prepared.items.find(
            (item) =>
              item.id ===
              itemResult.id,
          );

        if (!preparedItem) {
          throw new ApiError(
            "No fue posible calcular una partida.",
            500,
          );
        }

        const taxAmount =
          roundMoney(
            itemResult
              .totalAmount *
              (
                preparedItem
                  .taxRate /
                100
              ),
          );

        return {
          ...itemResult,

          description:
            preparedItem.description,

          technicalSpecifications:
            preparedItem
              .technicalSpecifications,

          taxRate:
            preparedItem
              .taxRate,

          taxAmount,

          totalWithTax:
            roundMoney(
              itemResult
                .totalAmount +
                taxAmount,
            ),
        };
      },
    );

  const taxAmount =
    roundMoney(
      items.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.taxAmount,
        0,
      ),
    );

  const normalizedAdjustment =
    roundMoney(
      adjustmentAmount,
    );

  const totalAmount =
    Math.max(
      roundMoney(
        calculation.totalAmount +
          taxAmount +
          normalizedAdjustment,
      ),
      0,
    );

  return {
    calculation,

    items,

    currency:
      currencies[0] ??
      "mxn",

    taxAmount,

    adjustmentAmount:
      normalizedAdjustment,

    totalAmount,
  };
}

function getLifecycleDates(
  status: CRMQuoteStatus,
  previous?: {
    sentAt:
      | Date
      | null;

    acceptedAt:
      | Date
      | null;

    rejectedAt:
      | Date
      | null;

    convertedAt:
      | Date
      | null;
  },
) {
  const now =
    new Date();

  return {
    sentAt:
      status === "Enviada"
        ? previous?.sentAt ??
          now
        : previous?.sentAt ??
          null,

    acceptedAt:
      status === "Aceptada"
        ? previous
            ?.acceptedAt ??
          now
        : previous
            ?.acceptedAt ??
          null,

    rejectedAt:
      status === "Rechazada"
        ? previous
            ?.rejectedAt ??
          now
        : previous
            ?.rejectedAt ??
          null,

    convertedAt:
      status === "Convertida"
        ? previous
            ?.convertedAt ??
          now
        : previous
            ?.convertedAt ??
          null,
  };
}

function serializePromotion(
  promotion:
    typeof crmQuotePromotions.$inferSelect,
) {
  return {
    id: promotion.id,

    promotionId:
      promotion.promotionId,

    quoteItemId:
      promotion.quoteItemId,

    scope: promotion.scope,

    promotionName:
      promotion.promotionName,

    promotionGroup:
      promotion.promotionGroup,

    benefitType:
      promotion.benefitType,

    paymentMethod:
      promotion.paymentMethod,

    requiresSelection:
      promotion
        .requiresSelection,

    promotionValue:
      toNullableNumber(
        promotion
          .promotionValue,
      ),

    calculatedBenefit:
      toNumber(
        promotion
          .calculatedBenefit,
      ),

    snapshot:
      isRecord(
        promotion.snapshot,
      )
        ? promotion.snapshot
        : {},
  };
}

function serializeQuote(
  quote:
    typeof crmQuotes.$inferSelect,
  items:
    Array<
      typeof crmQuoteItems.$inferSelect
    >,
  promotions:
    Array<
      typeof crmQuotePromotions.$inferSelect
    >,
  relations: {
    customerName?:
      | string
      | null;

    customerEmail?:
      | string
      | null;

    leadName?:
      | string
      | null;

    leadEmail?:
      | string
      | null;

    dealName?:
      | string
      | null;

    branchName?:
      | string
      | null;
  } = {},
) {
  const serializedPromotions =
    promotions.map(
      serializePromotion,
    );

  return {
    id: quote.id,

    branchId:
      quote.branchId,

    branchName:
      relations.branchName ??
      "Sin sucursal",

    quoteNumber:
      quote.quoteNumber,

    subject: quote.subject,

    status:
      quote.status as
        CRMQuoteStatus,

    customerId:
      quote.customerId,

    sourceLeadId:
      quote.sourceLeadId,

    dealId: quote.dealId,

    customerName:
      relations.customerName ??
      null,

    leadName:
      relations.leadName ??
      null,

    dealName:
      relations.dealName ??
      null,

    relatedName:
      relations.customerName ??
      relations.leadName ??
      relations.dealName ??
      null,

    relatedEmail:
      relations.customerEmail ??
      relations.leadEmail ??
      null,

    ownerClerkUserId:
      quote.ownerClerkUserId,

    owner: {
      id:
        quote
          .ownerClerkUserId,

      name:
        quote.ownerName,

      email:
        quote.ownerEmail,
    },

    currency:
      quote.currency,

    validUntil:
      quote.validUntil
        ?.toISOString() ??
      null,

    baseAmount:
      toNumber(
        quote.baseAmount,
      ),

    discountAmount:
      toNumber(
        quote.discountAmount,
      ),

    taxAmount:
      toNumber(
        quote.taxAmount,
      ),

    adjustmentAmount:
      toNumber(
        quote
          .adjustmentAmount,
      ),

    totalAmount:
      toNumber(
        quote.totalAmount,
      ),

    paymentMethod:
      quote.paymentMethod,

    minimumDownPayment:
      toNullableNumber(
        quote
          .minimumDownPayment,
      ),

    customerDownPayment:
      toNullableNumber(
        quote
          .customerDownPayment,
      ),

    financedAmount:
      toNullableNumber(
        quote
          .financedAmount,
      ),

    financingMonths:
      quote.financingMonths,

    estimatedPayment:
      toNullableNumber(
        quote
          .estimatedPayment,
      ),

    billingAddress:
      isRecord(
        quote.billingAddress,
      )
        ? quote.billingAddress
        : {},

    shippingAddress:
      isRecord(
        quote.shippingAddress,
      )
        ? quote.shippingAddress
        : {},

    commercialSummary:
      quote
        .commercialSummary,

    termsAndConditions:
      quote
        .termsAndConditions,

    description:
      quote.description,

    items:
      items
        .sort(
          (a, b) =>
            a.position -
            b.position,
        )
        .map(
          (item) => ({
            id: item.id,

            productId:
              item.productId,

            name: item.name,

            description:
              item.description,

            quantity:
              toNumber(
                item.quantity,
                1,
              ),

            unitPrice:
              toNumber(
                item.unitPrice,
              ),

            baseAmount:
              toNumber(
                item.baseAmount,
              ),

            discountAmount:
              toNumber(
                item
                  .discountAmount,
              ),

            taxRate:
              toNumber(
                item.taxRate,
              ),

            taxAmount:
              toNumber(
                item.taxAmount,
              ),

            totalAmount:
              toNumber(
                item.totalAmount,
              ),

            paymentMethod:
              item
                .paymentMethod,

            minimumDownPayment:
              toNullableNumber(
                item
                  .minimumDownPayment,
              ),

            customerDownPayment:
              toNumber(
                item
                  .customerDownPayment,
              ),

            financedAmount:
              toNullableNumber(
                item
                  .financedAmount,
              ),

            financingMonths:
              item
                .financingMonths,

            estimatedPayment:
              toNullableNumber(
                item
                  .estimatedPayment,
              ),

            technicalSpecifications:
              isRecord(
                item
                  .calculationSnapshot,
              ) &&
              isRecord(
                item
                  .calculationSnapshot
                  .technicalSpecifications,
              )
                ? item
                    .calculationSnapshot
                    .technicalSpecifications
                : {},

            position:
              item.position,

            promotions:
              serializedPromotions.filter(
                (promotion) =>
                  promotion
                    .quoteItemId ===
                  item.id,
              ),
          }),
        ),

    promotions:
      serializedPromotions,

    sentAt:
      quote.sentAt
        ?.toISOString() ??
      null,

    acceptedAt:
      quote.acceptedAt
        ?.toISOString() ??
      null,

    rejectedAt:
      quote.rejectedAt
        ?.toISOString() ??
      null,

    convertedAt:
      quote.convertedAt
        ?.toISOString() ??
      null,

    createdTime:
      quote.createdAt
        .toISOString(),

    modifiedTime:
      quote.updatedAt
        .toISOString(),
  };
}

function createErrorResponse(
  error: unknown,
  fallback: string,
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

export async function GET() {
  try {
    const {
      tenantId,
      timezone,
      branchAccess,
      permissions,
    } =
      await getTenantContext(
        "view",
      );

    const quoteAccessCondition =
      branchAccess.allBranches
        ? eq(
            crmQuotes.tenantId,
            tenantId,
          )
        : and(
            eq(
              crmQuotes.tenantId,
              tenantId,
            ),

            branchAccess
              .branchIds.length >
            0
              ? inArray(
                  crmQuotes.branchId,
                  branchAccess
                    .branchIds,
                )
              : sql<boolean>`false`,
          );

    const todayParts =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        },
      ).formatToParts(
        new Date(),
      );

    const currentYear =
      Number(
        todayParts.find(
          (part) =>
            part.type === "year",
        )?.value,
      );

    const currentMonth =
      Number(
        todayParts.find(
          (part) =>
            part.type === "month",
        )?.value,
      );

    const currentDay =
      Number(
        todayParts.find(
          (part) =>
            part.type === "day",
        )?.value,
      );

    const today =
      new Date(
        Date.UTC(
          currentYear,
          currentMonth - 1,
          currentDay,
        ),
      );

    await db
      .update(crmQuotes)
      .set({
        status: "Vencida",

        updatedAt:
          new Date(),
      })
      .where(
        and(
          quoteAccessCondition,

          inArray(
            crmQuotes.status,
            [
              "Borrador",
              "Enviada",
            ],
          ),

          isNotNull(
            crmQuotes.validUntil,
          ),

          lt(
            crmQuotes.validUntil,
            today,
          ),
        ),
      );

    const records =
      await db
        .select({
          quote: crmQuotes,

          leadFirstName:
            crmLeads.firstName,

          leadLastName:
            crmLeads.lastName,

          leadEmail:
            crmLeads.email,

          customerType:
            crmCustomers
              .customerType,

          customerName:
            crmCustomers.name,

          customerLastName:
            crmCustomers
              .lastName,

          customerCompanyName:
            crmCustomers
              .companyName,

          customerEmail:
            crmCustomers.email,

          dealName:
            crmDeals.name,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,
        })
        .from(crmQuotes)
        .leftJoin(
          tenantBranches,
          and(
            eq(
              crmQuotes.branchId,
              tenantBranches.id,
            ),
            eq(
              tenantBranches.tenantId,
              tenantId,
            ),
          ),
        )
        .leftJoin(
          crmLeads,
          and(
            eq(
              crmQuotes
                .sourceLeadId,
              crmLeads.id,
            ),

            eq(
              crmLeads.tenantId,
              tenantId,
            ),
          ),
        )
        .leftJoin(
          crmCustomers,
          and(
            eq(
              crmQuotes.customerId,
              crmCustomers.id,
            ),

            eq(
              crmCustomers.tenantId,
              tenantId,
            ),
          ),
        )
        .leftJoin(
          crmDeals,
          and(
            eq(
              crmQuotes.dealId,
              crmDeals.id,
            ),

            eq(
              crmDeals.tenantId,
              tenantId,
            ),
          ),
        )
        .where(
          quoteAccessCondition,
        )
        .orderBy(
          desc(
            crmQuotes.createdAt,
          ),
        );

    const quoteIds =
      records.map(
        (record) =>
          record.quote.id,
      );

    const itemRecords =
      quoteIds.length > 0
        ? await db
            .select()
            .from(
              crmQuoteItems,
            )
            .where(
              and(
                eq(
                  crmQuoteItems
                    .tenantId,
                  tenantId,
                ),

                inArray(
                  crmQuoteItems
                    .quoteId,
                  quoteIds,
                ),
              ),
            )
            .orderBy(
              asc(
                crmQuoteItems
                  .position,
              ),
            )
        : [];

    const promotionRecords =
      quoteIds.length > 0
        ? await db
            .select()
            .from(
              crmQuotePromotions,
            )
            .where(
              and(
                eq(
                  crmQuotePromotions
                    .tenantId,
                  tenantId,
                ),

                inArray(
                  crmQuotePromotions
                    .quoteId,
                  quoteIds,
                ),
              ),
            )
        : [];

    const itemsByQuote =
      new Map<
        string,
        typeof itemRecords
      >();

    for (
      const item of
      itemRecords
    ) {
      const items =
        itemsByQuote.get(
          item.quoteId,
        ) ?? [];

      items.push(item);

      itemsByQuote.set(
        item.quoteId,
        items,
      );
    }

    const promotionsByQuote =
      new Map<
        string,
        typeof promotionRecords
      >();

    for (
      const promotion of
      promotionRecords
    ) {
      const promotions =
        promotionsByQuote.get(
          promotion.quoteId,
        ) ?? [];

      promotions.push(
        promotion,
      );

      promotionsByQuote.set(
        promotion.quoteId,
        promotions,
      );
    }

    const data =
      records.map(
        (record) => {
          const leadName = [
            record
              .leadFirstName,

            record
              .leadLastName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();

          const customerPersonName =
            [
              record
                .customerName,

              record
                .customerLastName,
            ]
              .filter(Boolean)
              .join(" ")
              .trim();

          const customerName =
            record.customerType ===
            "Empresa"
              ? record
                  .customerCompanyName ??
                customerPersonName
              : customerPersonName;

          return serializeQuote(
            record.quote,

            itemsByQuote.get(
              record.quote.id,
            ) ?? [],

            promotionsByQuote.get(
              record.quote.id,
            ) ?? [],

            {
              customerName:
                customerName ||
                null,

              customerEmail:
                record
                  .customerEmail,

              leadName:
                leadName ||
                record
                  .leadEmail,

              leadEmail:
                record
                  .leadEmail,

              dealName:
                record.dealName,

              branchName:
                record.branchName
                  ? record.branchCode
                    ? `${record.branchName} (${record.branchCode})`
                    : record.branchName
                  : "Sin sucursal",
            },
          );
        },
      );

    return NextResponse.json({
      success: true,
      data,
      permissions,

      meta: {
        count: data.length,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible cargar las cotizaciones.",
    );
  }
}

async function replaceQuoteChildren(
  tenantId: string,
  quoteId: string,
  prepared: PreparedQuote,
  result:
    ReturnType<
      typeof calculateQuote
    >,
  replaceExisting = false,
) {
  if (replaceExisting) {
    await db
      .delete(
        crmQuotePromotions,
      )
      .where(
        and(
          eq(
            crmQuotePromotions
              .tenantId,
            tenantId,
          ),

          eq(
            crmQuotePromotions
              .quoteId,
            quoteId,
          ),
        ),
      );

    await db
      .delete(
        crmQuoteItems,
      )
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
            quoteId,
          ),
        ),
      );
  }

  const itemRows =
    result.items.map(
      (
        item,
        position,
      ) => {
        const sourceItem =
          prepared.items.find(
            (candidate) =>
              candidate.id ===
              item.id,
          );

        if (!sourceItem) {
          throw new ApiError(
            "No fue posible preparar una partida.",
            500,
          );
        }

        return {
          id: item.id,
          tenantId,
          quoteId,

          productId:
            sourceItem.productId,

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

          baseAmount:
            String(
              item.baseAmount,
            ),

          discountAmount:
            String(
              item
                .discountAmount,
            ),

          taxRate:
            String(
              item.taxRate,
            ),

          taxAmount:
            String(
              item.taxAmount,
            ),

          totalAmount:
            String(
              item
                .totalWithTax,
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

          updatedAt:
            new Date(),
        };
      },
    );

  const insertedItems =
    await db
      .insert(crmQuoteItems)
      .values(itemRows)
      .returning();

  const promotionRows =
    result.items.flatMap(
      (item) =>
        item.promotions.map(
          (promotion) => ({
            id:
              crypto.randomUUID(),

            tenantId,
            quoteId,

            quoteItemId:
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

            snapshot:
              promotion,
          }),
        ),
    );

  const generalPromotionRows =
    result.calculation
      .generalPromotions
      .map(
        (promotion) => ({
          id:
            crypto.randomUUID(),

          tenantId,
          quoteId,

          quoteItemId: null,

          promotionId:
            promotion.id,

          scope: "general",

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

          snapshot:
            promotion,
        }),
      );

  const allPromotionRows = [
    ...promotionRows,
    ...generalPromotionRows,
  ];

  const insertedPromotions =
    allPromotionRows.length > 0
      ? await db
          .insert(
            crmQuotePromotions,
          )
          .values(
            allPromotionRows,
          )
          .returning()
      : [];

  return {
    items:
      insertedItems,

    promotions:
      insertedPromotions,
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
    } =
      await getTenantContext(
        "create",
      );

    const values =
      (await request.json()) as
        QuotePayload;

    const branchId =
      await validateCRMBranchId(
        tenantId,
        branchAccess,
        getOptionalString(
          values.branchId,
        ),
      );

    const subject =
      getOptionalString(
        values.subject,
      );

    if (!subject) {
      throw new ApiError(
        "El asunto de la cotización es obligatorio.",
        400,
      );
    }

    const status =
      getStatus(
        values.status,
      );

    const owner =
      await getOwner(
        tenantId,
        userId,
        values
          .ownerClerkUserId,
      );

    const relations =
      await validateRelations(
        tenantId,
        values,
      );

    const itemPayloads =
      getItems(
        values.items,
      );

    const generalPromotionIds =
      getStringArray(
        values
          .generalPromotionIds,
      );

    const prepared =
      await prepareQuote(
        tenantId,
        itemPayloads,
        generalPromotionIds,
      );

    const validUntil =
      getRequiredValidityDate(
        values.validUntil,
      );

    validatePromotionValidity(
      validUntil,
      prepared,
    );

    const adjustmentAmount =
      getOptionalNumber(
        values
          .adjustmentAmount,
      ) ?? 0;

    const result =
      calculateQuote(
        prepared,
        adjustmentAmount,
      );

    const quoteId =
      crypto.randomUUID();

    const lifecycleDates =
      getLifecycleDates(
        status,
      );

    const now =
      new Date();

    const [quote] =
      await db
        .insert(crmQuotes)
        .values({
          id: quoteId,
          tenantId,
          branchId,

          quoteNumber:
            createQuoteNumber(),

          subject,
          status,

          customerId:
            relations
              .customerId,

          sourceLeadId:
            relations
              .sourceLeadId,

          dealId:
            relations.dealId,

          ownerClerkUserId:
            owner.id,

          ownerName:
            owner.name,

          ownerEmail:
            owner.email,

          currency:
            result.currency,

          validUntil,

          baseAmount:
            String(
              result
                .calculation
                .baseAmount,
            ),

          discountAmount:
            String(
              result
                .calculation
                .discountAmount,
            ),

          taxAmount:
            String(
              result.taxAmount,
            ),

          adjustmentAmount:
            String(
              result
                .adjustmentAmount,
            ),

          totalAmount:
            String(
              result.totalAmount,
            ),

          paymentMethod:
            result
              .calculation
              .paymentMethod,

          minimumDownPayment:
            getNumericString(
              result
                .calculation
                .minimumDownPayment,
            ),

          customerDownPayment:
            getNumericString(
              result
                .calculation
                .customerDownPayment,
            ),

          financedAmount:
            getNumericString(
              result
                .calculation
                .financedAmount,
            ),

          financingMonths:
            result
              .calculation
              .financingMonths,

          estimatedPayment:
            getNumericString(
              result
                .calculation
                .estimatedPayment,
            ),

          billingAddress:
            getAddress(
              values
                .billingAddress,
            ),

          shippingAddress:
            getAddress(
              values
                .shippingAddress,
            ),

          commercialSummary:
            getOptionalString(
              values
                .commercialSummary,
            ) ?? null,

          termsAndConditions:
            getOptionalString(
              values
                .termsAndConditions,
            ) ?? null,

          description:
            getOptionalString(
              values.description,
            ) ?? null,

          calculationSnapshot: {
            ...result
              .calculation,

            taxAmount:
              result.taxAmount,

            adjustmentAmount:
              result
                .adjustmentAmount,

            totalWithTax:
              result.totalAmount,
          },

          sentAt:
            lifecycleDates
              .sentAt,

          acceptedAt:
            lifecycleDates
              .acceptedAt,

          rejectedAt:
            lifecycleDates
              .rejectedAt,

          convertedAt:
            lifecycleDates
              .convertedAt,

          createdAt: now,
          updatedAt: now,
        })
        .returning();

    try {
      const children =
        await replaceQuoteChildren(
          tenantId,
          quoteId,
          prepared,
          result,
        );

      return NextResponse.json(
        {
          success: true,

          message:
            "La cotización fue creada correctamente.",

          data:
            serializeQuote(
              quote,

              children.items,

              children
                .promotions,
            ),
        },
        {
          status: 201,
        },
      );
    } catch (
      childrenError
    ) {
      await db
        .delete(crmQuotes)
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
        );

      throw childrenError;
    }
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible crear la cotización.",
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
    } =
      await getTenantContext(
        "edit",
      );

    const quoteAccessCondition =
      branchAccess.allBranches
        ? eq(
            crmQuotes.tenantId,
            tenantId,
          )
        : and(
            eq(
              crmQuotes.tenantId,
              tenantId,
            ),

            branchAccess
              .branchIds.length >
            0
              ? inArray(
                  crmQuotes.branchId,
                  branchAccess
                    .branchIds,
                )
              : sql<boolean>`false`,
          );

    const values =
      (await request.json()) as
        QuotePayload;

    const quoteId =
      getOptionalString(
        values.id,
      );

    if (!quoteId) {
      throw new ApiError(
        "El identificador de la cotización es obligatorio.",
        400,
      );
    }

    const [existingQuote] =
      await db
        .select()
        .from(crmQuotes)
        .where(
          and(
            eq(
              crmQuotes.id,
              quoteId,
            ),

            quoteAccessCondition,
          ),
        )
        .limit(1);

    if (!existingQuote) {
      throw new ApiError(
        "La cotización no existe.",
        404,
      );
    }

    const branchId =
      await validateCRMBranchId(
        tenantId,
        branchAccess,
        getOptionalString(
          values.branchId,
        ) ??
          existingQuote.branchId,
      );

    const subject =
      getOptionalString(
        values.subject,
      );

    if (!subject) {
      throw new ApiError(
        "El asunto de la cotización es obligatorio.",
        400,
      );
    }

    const status =
      getStatus(
        values.status,
      );

    const owner =
      await getOwner(
        tenantId,
        userId,
        values
          .ownerClerkUserId,
      );

    const relations =
      await validateRelations(
        tenantId,
        values,
      );

    const itemPayloads =
      getItems(
        values.items,
      );

    const generalPromotionIds =
      getStringArray(
        values
          .generalPromotionIds,
      );

    const prepared =
      await prepareQuote(
        tenantId,
        itemPayloads,
        generalPromotionIds,
      );

    const validUntil =
      getRequiredValidityDate(
        values.validUntil,
      );

    validatePromotionValidity(
      validUntil,
      prepared,
    );

    const adjustmentAmount =
      getOptionalNumber(
        values
          .adjustmentAmount,
      ) ?? 0;

    const result =
      calculateQuote(
        prepared,
        adjustmentAmount,
      );

    const lifecycleDates =
      getLifecycleDates(
        status,
        {
          sentAt:
            existingQuote
              .sentAt,

          acceptedAt:
            existingQuote
              .acceptedAt,

          rejectedAt:
            existingQuote
              .rejectedAt,

          convertedAt:
            existingQuote
              .convertedAt,
        },
      );

    const [quote] =
      await db
        .update(crmQuotes)
        .set({
          branchId,
          subject,
          status,

          customerId:
            relations
              .customerId,

          sourceLeadId:
            relations
              .sourceLeadId,

          dealId:
            relations.dealId,

          ownerClerkUserId:
            owner.id,

          ownerName:
            owner.name,

          ownerEmail:
            owner.email,

          currency:
            result.currency,

          validUntil,

          baseAmount:
            String(
              result
                .calculation
                .baseAmount,
            ),

          discountAmount:
            String(
              result
                .calculation
                .discountAmount,
            ),

          taxAmount:
            String(
              result.taxAmount,
            ),

          adjustmentAmount:
            String(
              result
                .adjustmentAmount,
            ),

          totalAmount:
            String(
              result.totalAmount,
            ),

          paymentMethod:
            result
              .calculation
              .paymentMethod,

          minimumDownPayment:
            getNumericString(
              result
                .calculation
                .minimumDownPayment,
            ),

          customerDownPayment:
            getNumericString(
              result
                .calculation
                .customerDownPayment,
            ),

          financedAmount:
            getNumericString(
              result
                .calculation
                .financedAmount,
            ),

          financingMonths:
            result
              .calculation
              .financingMonths,

          estimatedPayment:
            getNumericString(
              result
                .calculation
                .estimatedPayment,
            ),

          billingAddress:
            getAddress(
              values
                .billingAddress,
            ),

          shippingAddress:
            getAddress(
              values
                .shippingAddress,
            ),

          commercialSummary:
            getOptionalString(
              values
                .commercialSummary,
            ) ?? null,

          termsAndConditions:
            getOptionalString(
              values
                .termsAndConditions,
            ) ?? null,

          description:
            getOptionalString(
              values.description,
            ) ?? null,

          calculationSnapshot: {
            ...result
              .calculation,

            taxAmount:
              result.taxAmount,

            adjustmentAmount:
              result
                .adjustmentAmount,

            totalWithTax:
              result.totalAmount,
          },

          sentAt:
            lifecycleDates
              .sentAt,

          acceptedAt:
            lifecycleDates
              .acceptedAt,

          rejectedAt:
            lifecycleDates
              .rejectedAt,

          convertedAt:
            lifecycleDates
              .convertedAt,

          updatedAt:
            new Date(),
        })
        .where(
          and(
            eq(
              crmQuotes.id,
              quoteId,
            ),

            quoteAccessCondition,
          ),
        )
        .returning();

    const children =
      await replaceQuoteChildren(
        tenantId,
        quoteId,
        prepared,
        result,
        true,
      );

    return NextResponse.json({
      success: true,

      message:
        "La cotización fue actualizada correctamente.",

      data:
        serializeQuote(
          quote,

          children.items,

          children
            .promotions,
        ),
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible actualizar la cotización.",
    );
  }
}
