"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  calculateDeal,
  type DealPromotionInput,
} from "@/lib/crm/deal-calculations";

import type {
  CRMQuoteAddress,
  CRMQuotePayload,
  CRMQuoteRecord,
  CRMQuoteStatus,
} from "@/types/crm-quotes";

import Button from "@/components/ui/Button";

type DrawerMode =
  | "create"
  | "edit";

type ProductRecord = {
  id: string;
  name: string;

  description?:
    | string
    | null;

  unitPrice: number;
  currency: string;
};

type CustomerRecord = {
  id: string;
  displayName: string;

  customerType?:
    | string
    | null;
};

type LeadRecord = {
  id: string;

  displayName: string;
};

type DealRecord = {
  id: string;
  name: string;

  customerId?:
    | string
    | null;

  sourceLeadId?:
    | string
    | null;

  acquisitionChannel?:
    | string
    | null;

  items: Array<{
    id: string;

    productId?:
      | string
      | null;

    name: string;
    quantity: number;
    unitPrice: number;

    paymentMethod?:
      | string
      | null;

    customerDownPayment:
      number;

    financingMonths?:
      | number
      | null;
  }>;

  promotions: Array<{
    id: string;

    promotionId?:
      | string
      | null;

    dealItemId?:
      | string
      | null;

    scope: string;

    name: string;

    promotionGroup?:
      | string
      | null;

    benefitType?:
      | string
      | null;

    paymentMethod?:
      | string
      | null;

    requiresSelection:
      boolean;

    value?:
      | number
      | null;
  }>;
};

type MemberOption = {
  value: string;
  label: string;
};

type BranchOption = {
  id: string;
  value: string;
  name: string;
  code?: string | null;
  regionId?: string | null;
  label: string;
  isPrimary: boolean;
};

type EditableQuoteItem = {
  key: string;

  originalId?: string;

  productId: string;

  quantity: number;

  unitPrice: number;

  paymentMethod: string;

  taxRate: number;

  customerDownPayment:
    string;

  financingMonths:
    | number
    | null;

  promotionIds:
    string[];

  eligiblePromotions:
    DealPromotionInput[];

  isLoadingPromotions:
    boolean;

  promotionsError:
    | string
    | null;
};

type QuoteFormDrawerProps = {
  isOpen: boolean;

  mode: DrawerMode;

  record?:
    | CRMQuoteRecord
    | null;

  products:
    ProductRecord[];

  customers:
    CustomerRecord[];

  leads:
    LeadRecord[];

  deals:
    DealRecord[];

  members:
    MemberOption[];

  branches:
    BranchOption[];

  primaryBranchId:
    | string
    | null;

  onClose: () => void;

  onSaved: () =>
    void | Promise<void>;
};

type EligibleResponse = {
  success: boolean;

  data?: {
    promotions:
      DealPromotionInput[];
  };

  error?: string;
};

const statusOptions:
  CRMQuoteStatus[] = [
  "Borrador",
  "Enviada",
  "Aceptada",
  "Rechazada",
  "Vencida",
  "Convertida",
  "Cancelada",
];

const emptyAddress:
  CRMQuoteAddress = {
  country: "México",
  state: "",
  city: "",
  postalCode: "",
  street: "",
  exteriorNumber: "",
  interiorNumber: "",
  neighborhood: "",
  reference: "",
};

function createEmptyItem():
  EditableQuoteItem {
  return {
    key: crypto.randomUUID(),

    productId: "",

    quantity: 1,

    unitPrice: 0,

    paymentMethod:
      "Por definir",

    taxRate: 0,

    customerDownPayment:
      "",

    financingMonths:
      null,

    promotionIds: [],

    eligiblePromotions: [],

    isLoadingPromotions:
      false,

    promotionsError:
      null,
  };
}

function getDateInputValue(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value.slice(
      0,
      10,
    );
  }

  return date
    .toISOString()
    .slice(0, 10);
}

function getValidityDate(
  days: number,
): string {
  const date = new Date();

  date.setHours(
    12,
    0,
    0,
    0,
  );

  date.setDate(
    date.getDate() + days,
  );

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(
  value: number,
  currency = "mxn",
): string {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",

      currency:
        currency.toUpperCase(),

      maximumFractionDigits: 2,
    },
  ).format(value);
}

function getAvailableMonths(
  item: EditableQuoteItem,
): number[] {
  const selectedPromotions =
    item.eligiblePromotions.filter(
      (promotion) =>
        item.promotionIds.includes(
          promotion.id,
        ),
    );

  return Array.from(
    new Set(
      selectedPromotions
        .flatMap(
          (promotion) =>
            promotion
              .availableMonths ??
            [],
        )
        .map(Number)
        .filter(
          (month) =>
            Number.isInteger(
              month,
            ) &&
            month > 0,
        ),
    ),
  ).sort(
    (a, b) => a - b,
  );
}

function getCustomerType(
  customerId: string,
  customers:
    CustomerRecord[],
): string | undefined {
  return customers.find(
    (customer) =>
      customer.id ===
      customerId,
  )?.customerType ??
    undefined;
}

export default function QuoteFormDrawer({
  isOpen,
  mode,
  record,
  products,
  customers,
  leads,
  deals,
  members,
  branches,
  primaryBranchId,
  onClose,
  onSaved,
}: QuoteFormDrawerProps) {
  const [
    subject,
    setSubject,
  ] = useState("");

  const [
    branchId,
    setBranchId,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<
    CRMQuoteStatus
  >("Borrador");

  const [
    customerId,
    setCustomerId,
  ] = useState("");

  const [
    sourceLeadId,
    setSourceLeadId,
  ] = useState("");

  const [
    dealId,
    setDealId,
  ] = useState("");

  const [
    ownerClerkUserId,
    setOwnerClerkUserId,
  ] = useState("");

  const [
    validUntil,
    setValidUntil,
  ] = useState("");

  const [
    validityDays,
    setValidityDays,
  ] = useState("15");

  const [
    adjustmentAmount,
    setAdjustmentAmount,
  ] = useState(0);

  const [
    billingAddress,
    setBillingAddress,
  ] = useState<
    CRMQuoteAddress
  >({
    ...emptyAddress,
  });

  const [
    shippingAddress,
    setShippingAddress,
  ] = useState<
    CRMQuoteAddress
  >({
    ...emptyAddress,
  });

  const [
    useBillingForShipping,
    setUseBillingForShipping,
  ] = useState(true);

  const [
    commercialSummary,
    setCommercialSummary,
  ] = useState("");

  const [
    termsAndConditions,
    setTermsAndConditions,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    items,
    setItems,
  ] = useState<
    EditableQuoteItem[]
  >([
    createEmptyItem(),
  ]);

  const [
    formError,
    setFormError,
  ] = useState<
    string | null
  >(null);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSubject(
      record?.subject ?? "",
    );

    setBranchId(
      record?.branchId ??
        primaryBranchId ??
        "",
    );

    setStatus(
      record?.status ??
        "Borrador",
    );

    setCustomerId(
      record?.customerId ??
        "",
    );

    setSourceLeadId(
      record
        ?.sourceLeadId ??
        "",
    );

    setDealId(
      record?.dealId ?? "",
    );

    setOwnerClerkUserId(
      record
        ?.ownerClerkUserId ??
        members[0]?.value ??
        "",
    );

    setValidityDays(
      record?.validUntil
        ? "custom"
        : "15",
    );

    setValidUntil(
      record?.validUntil
        ? getDateInputValue(
            record.validUntil,
          )
        : getValidityDate(15),
    );

    setAdjustmentAmount(
      record
        ?.adjustmentAmount ??
        0,
    );

    setBillingAddress({
      ...emptyAddress,

      ...(
        record
          ?.billingAddress ??
        {}
      ),
    });

    setShippingAddress({
      ...emptyAddress,

      ...(
        record
          ?.shippingAddress ??
        {}
      ),
    });

    setUseBillingForShipping(
      !record ||
        JSON.stringify(
          record.billingAddress,
        ) ===
          JSON.stringify(
            record
              .shippingAddress,
          ),
    );

    setCommercialSummary(
      record
        ?.commercialSummary ??
        "",
    );

    setTermsAndConditions(
      record
        ?.termsAndConditions ??
        "",
    );

    setDescription(
      record?.description ??
        "",
    );

    const initialItems =
      record?.items.length
        ? record.items.map(
            (item) => ({
              key:
                crypto.randomUUID(),

              originalId:
                item.id,

              productId:
                item.productId ??
                "",

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,

              paymentMethod:
                item.paymentMethod ??
                "Por definir",

              taxRate:
                item.taxRate,

              customerDownPayment:
                item.customerDownPayment
                  ? String(
                      item
                        .customerDownPayment,
                    )
                  : "",

              financingMonths:
                item.financingMonths ??
                null,

              promotionIds:
                item.promotions
                  .map(
                    (promotion) =>
                      promotion
                        .promotionId,
                  )
                  .filter(
                    (
                      promotionId,
                    ): promotionId is string =>
                      Boolean(
                        promotionId,
                      ),
                  ),

              eligiblePromotions:
                [],

              isLoadingPromotions:
                false,

              promotionsError:
                null,
            }),
          )
        : [
            createEmptyItem(),
          ];

    setItems(
      initialItems,
    );

    setFormError(null);

    for (
      const item of
      initialItems
    ) {
      if (item.productId) {
        void loadPromotions(
          item.key,
          item.productId,
          record?.customerId ??
            "",
          record?.dealId ??
            "",
        );
      }
    }
  }, [
    isOpen,
    record,
    primaryBranchId,
  ]);

  const productsById =
    useMemo(
      () =>
        new Map(
          products.map(
            (product) => [
              product.id,
              product,
            ],
          ),
        ),
      [products],
    );

  const calculation =
    useMemo(() => {
      const validItems =
        items.filter(
          (item) =>
            item.productId &&
            productsById.has(
              item.productId,
            ),
        );

      const dealCalculation =
        calculateDeal({
          items:
            validItems.map(
              (item) => {
                const product =
                  productsById.get(
                    item.productId,
                  );

                const promotions =
                  item
                    .eligiblePromotions
                    .filter(
                      (
                        promotion,
                      ) =>
                        item
                          .promotionIds
                          .includes(
                            promotion.id,
                          ),
                    );

                return {
                  id: item.key,

                  productId:
                    item.productId,

                  name:
                    product?.name ??
                    "Partida",

                  quantity:
                    item.quantity,

                  unitPrice:
                    item.unitPrice,

                  paymentMethod:
                    item
                      .paymentMethod,

                  customerDownPayment:
                    Number(
                      item
                        .customerDownPayment ||
                        0,
                    ),

                  financingMonths:
                    item
                      .financingMonths,

                  promotions,
                };
              },
            ),

          generalPromotions:
            [],
        });

      const itemTaxes =
        dealCalculation
          .items.map(
            (result) => {
              const sourceItem =
                validItems.find(
                  (item) =>
                    item.key ===
                    result.id,
                );

              return {
                itemId:
                  result.id,

                taxAmount:
                  Math.round(
                    (
                      result
                        .totalAmount *
                        (
                          sourceItem
                            ?.taxRate ??
                          0
                        ) /
                        100
                    ) *
                      100,
                  ) / 100,
              };
            },
          );

      const taxAmount =
        itemTaxes.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.taxAmount,
          0,
        );

      const totalAmount =
        Math.max(
          Math.round(
            (
              dealCalculation
                .totalAmount +
              taxAmount +
              adjustmentAmount
            ) *
              100,
          ) / 100,
          0,
        );

      return {
        ...dealCalculation,

        itemTaxes,
        taxAmount,
        adjustmentAmount,
        totalAmount,
      };
    }, [
      adjustmentAmount,
      items,
      productsById,
    ]);

  const currency =
    items
      .map(
        (item) =>
          productsById.get(
            item.productId,
          )?.currency,
      )
      .find(Boolean) ??
    "mxn";

  const promotionValidityLimit =
    useMemo(() => {
      const selectedPromotions =
        items.flatMap((item) =>
          item.eligiblePromotions
            .filter(
              (promotion) =>
                item.promotionIds.includes(
                  promotion.id,
                ) &&
                Boolean(
                  promotion.promotionEnd,
                ),
            )
            .map((promotion) => ({
              name:
                promotion.name,

              date:
                promotion
                  .promotionEndDate ??
                "",
            })),
        );

      if (
        selectedPromotions.length ===
        0
      ) {
        return null;
      }

      const limitDate =
        selectedPromotions
          .map(
            (promotion) =>
              promotion.date,
          )
          .filter(Boolean)
          .sort()[0];

      if (!limitDate) {
        return null;
      }

      return {
        date: limitDate,

        promotionNames:
          selectedPromotions
            .filter(
              (promotion) =>
                promotion.date ===
                limitDate,
            )
            .map(
              (promotion) =>
                promotion.name,
            ),
      };
    }, [items]);

  useEffect(() => {
    if (
      !promotionValidityLimit ||
      !validUntil ||
      validUntil <=
        promotionValidityLimit.date
    ) {
      return;
    }

    setValidUntil(
      promotionValidityLimit.date,
    );

    setValidityDays("custom");
  }, [
    promotionValidityLimit,
    validUntil,
  ]);

  function updateItem(
    itemKey: string,
    patch:
      Partial<
        EditableQuoteItem
      >,
  ) {
    setItems(
      (current) =>
        current.map(
          (item) =>
            item.key ===
            itemKey
              ? {
                  ...item,
                  ...patch,
                }
              : item,
        ),
    );
  }

  function removeItem(
    itemKey: string,
  ) {
    setItems(
      (current) =>
        current.length === 1
          ? current
          : current.filter(
              (item) =>
                item.key !==
                itemKey,
            ),
    );
  }

  async function loadPromotions(
    itemKey: string,
    productId: string,
    selectedCustomerId =
      customerId,
    selectedDealId =
      dealId,
  ) {
    if (!productId) {
      updateItem(
        itemKey,
        {
          eligiblePromotions:
            [],

          promotionIds: [],

          financingMonths:
            null,

          promotionsError:
            null,
        },
      );

      return;
    }

    updateItem(
      itemKey,
      {
        isLoadingPromotions:
          true,

        promotionsError:
          null,
      },
    );

    try {
      const selectedDeal =
        deals.find(
          (deal) =>
            deal.id ===
            selectedDealId,
        );

      const params =
        new URLSearchParams({
          productId,
        });

      if (
        selectedDeal
          ?.acquisitionChannel
      ) {
        params.set(
          "channel",

          selectedDeal
            .acquisitionChannel,
        );
      }

      const customerType =
        getCustomerType(
          selectedCustomerId,
          customers,
        );

      if (customerType) {
        params.set(
          "customerType",
          customerType,
        );
      }

      const response =
        await fetch(
          `/api/crm/promotions/eligible?${params.toString()}`,
          {
            cache:
              "no-store",
          },
        );

      const result =
        (await response.json()) as
          EligibleResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible consultar las promociones.",
        );
      }

      const promotions =
        result.data
          ?.promotions ??
        [];

      setItems(
        (current) =>
          current.map(
            (item) => {
              if (
                item.key !==
                itemKey
              ) {
                return item;
              }

              const availableIds =
                new Set(
                  promotions.map(
                    (
                      promotion,
                    ) =>
                      promotion.id,
                  ),
                );

              const promotionIds =
                item
                  .promotionIds
                  .filter(
                    (
                      promotionId,
                    ) =>
                      availableIds.has(
                        promotionId,
                      ),
                  );

              return {
                ...item,

                eligiblePromotions:
                  promotions,

                promotionIds,

                financingMonths:
                  promotionIds
                    .length > 0
                    ? item
                        .financingMonths
                    : null,

                isLoadingPromotions:
                  false,

                promotionsError:
                  null,
              };
            },
          ),
      );
    } catch (error) {
      updateItem(
        itemKey,
        {
          eligiblePromotions:
            [],

          promotionIds: [],

          financingMonths:
            null,

          isLoadingPromotions:
            false,

          promotionsError:
            error instanceof Error
              ? error.message
              : "No fue posible consultar las promociones.",
        },
      );
    }
  }

    function togglePromotion(
    itemKey: string,
    promotion:
      DealPromotionInput,
  ) {
    setItems(
      (current) =>
        current.map(
          (item) => {
            if (
              item.key !==
              itemKey
            ) {
              return item;
            }

            const isSelected =
              item
                .promotionIds
                .includes(
                  promotion.id,
                );

            if (isSelected) {
              const promotionIds =
                item
                  .promotionIds
                  .filter(
                    (id) =>
                      id !==
                      promotion.id,
                  );

              return {
                ...item,

                promotionIds,

                financingMonths:
                  promotionIds
                    .length > 0
                    ? item
                        .financingMonths
                    : null,
              };
            }

            const normalizedGroup =
              promotion
                .promotionGroup
                ?.trim()
                .toLowerCase();

            const normalizedPayment =
              promotion
                .paymentMethod
                ?.trim()
                .toLowerCase();

            const universalPayments =
              new Set([
                "",
                "todos",
                "todas",
                "cualquiera",
              ]);

            const retainedIds =
              item
                .promotionIds
                .filter(
                  (selectedId) => {
                    const selected =
                      item
                        .eligiblePromotions
                        .find(
                          (
                            candidate,
                          ) =>
                            candidate.id ===
                            selectedId,
                        );

                    if (!selected) {
                      return false;
                    }

                    const selectedGroup =
                      selected
                        .promotionGroup
                        ?.trim()
                        .toLowerCase();

                    if (
                      normalizedGroup &&
                      selectedGroup ===
                        normalizedGroup &&
                      (
                        promotion
                          .requiresSelection ||
                        selected
                          .requiresSelection
                      )
                    ) {
                      return false;
                    }

                    const selectedPayment =
                      selected
                        .paymentMethod
                        ?.trim()
                        .toLowerCase();

                    if (
                      normalizedPayment &&
                      selectedPayment &&
                      !universalPayments.has(
                        normalizedPayment,
                      ) &&
                      !universalPayments.has(
                        selectedPayment,
                      ) &&
                      normalizedPayment !==
                        selectedPayment
                    ) {
                      return false;
                    }

                    return true;
                  },
                );

            return {
              ...item,

              promotionIds: [
                ...retainedIds,
                promotion.id,
              ],

              paymentMethod:
                promotion
                  .paymentMethod ??
                item
                  .paymentMethod,
            };
          },
        ),
    );

    setFormError(null);
  }

  function handleDealChange(
    nextDealId: string,
  ) {
    setDealId(
      nextDealId,
    );

    const selectedDeal =
      deals.find(
        (deal) =>
          deal.id ===
          nextDealId,
      );

    if (!selectedDeal) {
      return;
    }

    if (
      selectedDeal.customerId
    ) {
      setCustomerId(
        selectedDeal.customerId,
      );

      setSourceLeadId("");
    } else if (
      selectedDeal.sourceLeadId
    ) {
      setSourceLeadId(
        selectedDeal.sourceLeadId,
      );

      setCustomerId("");
    }

    if (!subject.trim()) {
      setSubject(
        selectedDeal.name,
      );
    }

    const nextItems:
      EditableQuoteItem[] =
      selectedDeal.items
        .filter(
          (dealItem) =>
            Boolean(
              dealItem.productId,
            ),
        )
        .map(
          (dealItem) => ({
            key:
              crypto.randomUUID(),

            originalId:
              dealItem.id,

            productId:
              dealItem.productId as string,

            quantity:
              dealItem.quantity,

            unitPrice:
              dealItem.unitPrice,

            paymentMethod:
              dealItem
                .paymentMethod ??
              "Por definir",

            taxRate: 0,

            customerDownPayment:
              dealItem
                .customerDownPayment >
              0
                ? String(
                    dealItem
                      .customerDownPayment,
                  )
                : "",

            financingMonths:
              dealItem
                .financingMonths ??
              null,

            promotionIds:
              selectedDeal.promotions
                .filter(
                  (promotion) =>
                    promotion.scope ===
                      "item" &&
                    promotion
                      .dealItemId ===
                      dealItem.id &&
                    Boolean(
                      promotion
                        .promotionId,
                    ),
                )
                .map(
                  (promotion) =>
                    promotion
                      .promotionId as string,
                ),

            eligiblePromotions:
              [],

            isLoadingPromotions:
              false,

            promotionsError:
              null,
          }),
        );

    if (
      nextItems.length === 0
    ) {
      setItems([
        createEmptyItem(),
      ]);

      return;
    }

    setItems(nextItems);

    for (
      const item of nextItems
    ) {
      void loadPromotions(
        item.key,
        item.productId,

        selectedDeal.customerId ??
          "",

        selectedDeal.id,
      );
    }

    setFormError(null);
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError(null);

    if (!subject.trim()) {
      setFormError(
        "El asunto de la cotización es obligatorio.",
      );

      return;
    }

    if (!branchId) {
      setFormError(
        "Selecciona una sucursal.",
      );

      return;
    }

    if (
      !customerId &&
      !sourceLeadId
    ) {
      setFormError(
        "Selecciona un cliente o un prospecto.",
      );

      return;
    }

    if (!ownerClerkUserId) {
      setFormError(
        "Selecciona un responsable.",
      );

      return;
    }

    if (!validUntil) {
      setFormError(
        "Selecciona la fecha de vigencia de la cotización.",
      );

      return;
    }

    if (
      items.some(
        (item) =>
          !item.productId,
      )
    ) {
      setFormError(
        "Selecciona un producto en cada partida.",
      );

      return;
    }

    if (
      items.some(
        (item) =>
          item.quantity <= 0,
      )
    ) {
      setFormError(
        "La cantidad de cada partida debe ser mayor que cero.",
      );

      return;
    }

    if (
      calculation.errors
        .length > 0
    ) {
      setFormError(
        calculation.errors.join(
          " ",
        ),
      );

      return;
    }

    const payload:
      CRMQuotePayload = {
      id:
        mode === "edit"
          ? record?.id
          : undefined,

      subject:
        subject.trim(),

      branchId,

      status,

      customerId:
        customerId ||
        undefined,

      sourceLeadId:
        sourceLeadId ||
        undefined,

      dealId:
        dealId ||
        undefined,

      ownerClerkUserId,

      validUntil:
        validUntil ||
        undefined,

      adjustmentAmount,

      billingAddress,

      shippingAddress:
        useBillingForShipping
          ? billingAddress
          : shippingAddress,

      commercialSummary:
        commercialSummary
          .trim() ||
        undefined,

      termsAndConditions:
        termsAndConditions
          .trim() ||
        undefined,

      description:
        description.trim() ||
        undefined,

      items:
        items.map(
          (item) => ({
            id:
              item.originalId,

            productId:
              item.productId,

            quantity:
              item.quantity,

            unitPrice:
              item.unitPrice,

            paymentMethod:
              item
                .paymentMethod,

            taxRate:
              item.taxRate,

            customerDownPayment:
              Number(
                item
                  .customerDownPayment ||
                  0,
              ),

            financingMonths:
              item
                .financingMonths,

            promotionIds:
              item
                .promotionIds,
          }),
        ),

      generalPromotionIds:
        [],
    };

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/crm/quotes",
          {
            method:
              mode === "create"
                ? "POST"
                : "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const result =
        (await response.json()) as {
          success: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible guardar la cotización.",
        );
      }

      await onSaved();

      onClose();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la cotización.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

    return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Cerrar panel"
        disabled={
          isSubmitting
        }
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                {mode ===
                "create"
                  ? "Nueva cotización"
                  : "Editar cotización"}
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {subject ||
                  record
                    ?.quoteNumber ||
                  "Cotización"}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Productos, promociones, impuestos y condiciones comerciales.
              </p>
            </div>

            <button
              type="button"
              aria-label="Cerrar"
              disabled={
                isSubmitting
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={
            handleSubmit
          }
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
            {formError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                {formError}
              </div>
            )}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                  Información general
                </h3>
              </header>

              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  Asunto *

                  <input
                    value={
                      subject
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950"
                    onChange={(
                      event,
                    ) =>
                      setSubject(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Sucursal *

                  <select
                    value={
                      branchId
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                    onChange={(
                      event,
                    ) =>
                      setBranchId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecciona una sucursal
                    </option>

                    {branches.map(
                      (branch) => (
                        <option
                          key={
                            branch.value
                          }
                          value={
                            branch.value
                          }
                        >
                          {branch.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Responsable *

                  <select
                    value={
                      ownerClerkUserId
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) =>
                      setOwnerClerkUserId(
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      Selecciona un responsable
                    </option>

                    {members.map(
                      (member) => (
                        <option
                          key={
                            member.value
                          }
                          value={
                            member.value
                          }
                        >
                          {
                            member.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Estado

                  <select
                    value={
                      status
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) =>
                      setStatus(
                        event
                          .target
                          .value as
                          CRMQuoteStatus,
                      )
                    }
                  >
                    {statusOptions.map(
                      (option) => (
                        <option
                          key={
                            option
                          }
                          value={
                            option
                          }
                        >
                          {option}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Cliente

                  <select
                    value={
                      customerId
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) => {
                      const value =
                        event.target.value;

                      setCustomerId(value);

                      if (value) {
                        setSourceLeadId("");
                      }

                      if (dealId) {
                        setDealId("");

                        setItems([
                          createEmptyItem(),
                        ]);

                        setFormError(null);
                        return;
                      }

                      for (const item of items) {
                        if (item.productId) {
                          void loadPromotions(
                            item.key,
                            item.productId,
                            value,
                            "",
                          );
                        }
                      }
                    }}
                  >
                    <option value="">
                      Sin cliente
                    </option>

                    {customers.map(
                      (customer) => (
                        <option
                          key={
                            customer.id
                          }
                          value={
                            customer.id
                          }
                        >
                          {
                            customer.displayName
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Prospecto

                  <select
                    value={
                      sourceLeadId
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) => {
                      const value =
                        event.target.value;

                      setSourceLeadId(value);

                      if (value) {
                        setCustomerId("");
                      }

                      if (dealId) {
                        setDealId("");

                        setItems([
                          createEmptyItem(),
                        ]);

                        setFormError(null);
                      }
                    }}
                  >
                    <option value="">
                      Sin prospecto
                    </option>

                    {leads.map(
                      (lead) => (
                        <option
                          key={
                            lead.id
                          }
                          value={
                            lead.id
                          }
                        >
                          {
                            lead.displayName
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Oportunidad relacionada

                  <select
                    value={
                      dealId
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) =>
                      handleDealChange(
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      Sin oportunidad
                    </option>

                    {deals.map(
                      (deal) => (
                        <option
                          key={
                            deal.id
                          }
                          value={
                            deal.id
                          }
                        >
                          {
                            deal.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="text-sm font-semibold text-slate-700">
                  <p>Válida hasta *</p>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <select
                      value={validityDays}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                      onChange={(event) => {
                        const value =
                          event.target.value;

                        setValidityDays(value);

                        if (value !== "custom") {
                          setValidUntil(
                            getValidityDate(
                              Number(value),
                            ),
                          );
                        }
                      }}
                    >
                      <option value="7">
                        7 días
                      </option>

                      <option value="15">
                        15 días
                      </option>

                      <option value="30">
                        30 días
                      </option>

                      <option value="60">
                        60 días
                      </option>

                      <option value="custom">
                        Fecha personalizada
                      </option>
                    </select>

                    <input
                      type="date"
                      required
                      max={
                        promotionValidityLimit
                          ?.date
                      }
                      value={validUntil}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                      onChange={(event) => {
                        setValidityDays(
                          "custom",
                        );

                        setValidUntil(
                          event.target.value,
                        );
                      }}
                    />
                  </div>
                  {promotionValidityLimit && (
                    <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                      🔒 Vigencia limitada hasta{" "}
                      {new Date(
                        `${promotionValidityLimit.date}T12:00:00`,
                      ).toLocaleDateString(
                        "es-MX",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        },
                      )}{" "}
                      por{" "}
                      {promotionValidityLimit
                        .promotionNames
                        .join(", ")}
                      .
                    </p>
                  )}
                </div>
              </div>
            </section>

                        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <h3 className="font-bold text-slate-950">
                    Productos y servicios
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Agrega las partidas incluidas en la cotización.
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700"
                  onClick={() =>
                    setItems(
                      (
                        current,
                      ) => [
                        ...current,
                        createEmptyItem(),
                      ],
                    )
                  }
                >
                  + Agregar partida
                </button>
              </header>

              <div className="space-y-5 p-5">
                {items.map(
                  (
                    item,
                    index,
                  ) => {
                    const result =
                      calculation
                        .items
                        .find(
                          (
                            candidate,
                          ) =>
                            candidate.id ===
                            item.key,
                        );

                    const tax =
                      calculation
                        .itemTaxes
                        .find(
                          (
                            candidate,
                          ) =>
                            candidate.itemId ===
                            item.key,
                        )
                        ?.taxAmount ??
                      0;

                    const promotionMonths =
                      getAvailableMonths(
                        item,
                      );

                    const isFinancing =
                      item.paymentMethod ===
                      "Financiamiento";

                    const availableMonths =
                      promotionMonths.length > 0
                        ? promotionMonths
                        : isFinancing
                          ? [
                              6,
                              12,
                              18,
                              24,
                              36,
                              48,
                              60,
                            ]
                          : [];

                    return (
                      <article
                        key={
                          item.key
                        }
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="mb-5 flex items-center justify-between gap-4">
                          <h4 className="font-bold text-slate-950">
                            Partida{" "}
                            {index +
                              1}
                          </h4>

                          <button
                            type="button"
                            disabled={
                              items.length ===
                              1
                            }
                            className="text-sm font-semibold text-red-600 disabled:opacity-30"
                            onClick={() =>
                              removeItem(
                                item.key,
                              )
                            }
                          >
                            Quitar
                          </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                            Producto *

                            <select
                              value={
                                item.productId
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                              onChange={(
                                event,
                              ) => {
                                const productId =
                                  event
                                    .target
                                    .value;

                                const product =
                                  productsById.get(
                                    productId,
                                  );

                                updateItem(
                                  item.key,
                                  {
                                    productId,

                                    unitPrice:
                                      product
                                        ?.unitPrice ??
                                      0,

                                    promotionIds:
                                      [],

                                    eligiblePromotions:
                                      [],

                                    financingMonths:
                                      null,

                                    customerDownPayment:
                                      "",
                                  },
                                );

                                void loadPromotions(
                                  item.key,
                                  productId,
                                );
                              }}
                            >
                              <option value="">
                                Selecciona un producto
                              </option>

                              {products.map(
                                (
                                  product,
                                ) => (
                                  <option
                                    key={
                                      product.id
                                    }
                                    value={
                                      product.id
                                    }
                                  >
                                    {
                                      product.name
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <label className="text-sm font-semibold text-slate-700">
                            Cantidad *

                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={
                                item.quantity
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  item.key,
                                  {
                                    quantity:
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ),
                                  },
                                )
                              }
                            />
                          </label>

                          <label className="text-sm font-semibold text-slate-700">
                            Precio unitario

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.unitPrice
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-100 cursor-not-allowed text-slate-600 px-4 py-3 font-normal"

                              readOnly

                            />
                          </label>

                          <label className="text-sm font-semibold text-slate-700">
                            Forma de pago

                            <select
                              value={
                                item.paymentMethod
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  item.key,
                                  {
                                    paymentMethod:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                            >
                              <option value="Por definir">
                                Por definir
                              </option>

                              <option value="Contado">
                                Contado
                              </option>

                              <option value="Financiamiento">
                                Financiamiento
                              </option>
                            </select>
                          </label>

                          <label className="text-sm font-semibold text-slate-700">
                            Impuesto (%)

                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={
                                item.taxRate
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  item.key,
                                  {
                                    taxRate:
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ),
                                  },
                                )
                              }
                            />
                          </label>
                        </div>

                        {item.isLoadingPromotions && (
                          <p className="mt-5 text-sm font-medium text-slate-500">
                            Consultando promociones compatibles...
                          </p>
                        )}

                        {item.promotionsError && (
                          <p className="mt-5 text-sm font-semibold text-red-600">
                            {
                              item.promotionsError
                            }
                          </p>
                        )}

                        {item.eligiblePromotions.length >
                          0 && (
                          <div className="mt-5">
                            <p className="text-sm font-bold text-slate-700">
                              Promociones disponibles
                            </p>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {item.eligiblePromotions.map(
                                (
                                  promotion,
                                ) => {
                                  const selected =
                                    item
                                      .promotionIds
                                      .includes(
                                        promotion.id,
                                      );

                                  return (
                                    <button
                                      key={
                                        promotion.id
                                      }
                                      type="button"
                                      className={[
                                        "rounded-xl border p-4 text-left transition",
                                        selected
                                          ? "border-emerald-500 bg-emerald-50"
                                          : "border-slate-200 bg-white hover:border-emerald-300",
                                      ].join(
                                        " ",
                                      )}
                                      onClick={() =>
                                        togglePromotion(
                                          item.key,
                                          promotion,
                                        )
                                      }
                                    >
                                      <div className="flex items-start gap-3">
                                        <span
                                          className={[
                                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs",
                                            selected
                                              ? "border-emerald-600 bg-emerald-600 text-white"
                                              : "border-slate-300",
                                          ].join(
                                            " ",
                                          )}
                                        >
                                          {selected
                                            ? "✓"
                                            : ""}
                                        </span>

                                        <div>
                                          <p className="font-semibold text-slate-900">
                                            {
                                              promotion.name
                                            }
                                          </p>

                                          <p className="mt-1 text-xs text-slate-500">
                                            {promotion.benefitType ??
                                              "Beneficio"}
                                            {promotion.promotionGroup
                                              ? ` · ${promotion.promotionGroup}`
                                              : ""}
                                          </p>

                                          {promotion.commercialMessage && (
                                            <p className="mt-2 text-xs text-emerald-700">
                                              {
                                                promotion.commercialMessage
                                              }
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        )}

                        {availableMonths.length >
                          0 && (
                          <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-semibold text-slate-700">
                              Plazo de financiamiento *

                              <select
                                value={
                                  item.financingMonths ??
                                  ""
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    item.key,
                                    {
                                      financingMonths:
                                        event
                                          .target
                                          .value
                                          ? Number(
                                              event
                                                .target
                                                .value,
                                            )
                                          : null,
                                    },
                                  )
                                }
                              >
                                <option value="">
                                  Selecciona un plazo
                                </option>

                                {availableMonths.map(
                                  (
                                    months,
                                  ) => (
                                    <option
                                      key={
                                        months
                                      }
                                      value={
                                        months
                                      }
                                    >
                                      {
                                        months
                                      }{" "}
                                      meses
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>

                            <label className="text-sm font-semibold text-slate-700">
                              Enganche del cliente

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.customerDownPayment
                                }
                                placeholder="0.00"
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    item.key,
                                    {
                                      customerDownPayment:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                              />
                            </label>
                          </div>
                        )}

                        {result && (
                          <div className="mt-5 grid gap-3 rounded-xl bg-white p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
                            <div>
                              <p className="text-slate-500">
                                Subtotal
                              </p>

                              <p className="mt-1 font-bold text-slate-900">
                                {formatMoney(
                                  result.baseAmount,
                                  currency,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-500">
                                Descuento
                              </p>

                              <p className="mt-1 font-bold text-emerald-700">
                                -
                                {formatMoney(
                                  result.discountAmount,
                                  currency,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-500">
                                Impuesto
                              </p>

                              <p className="mt-1 font-bold text-slate-900">
                                {formatMoney(
                                  tax,
                                  currency,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-500">
                                Total
                              </p>

                              <p className="mt-1 font-bold text-slate-900">
                                {formatMoney(
                                  result.totalAmount +
                                    tax,
                                  currency,
                                )}
                              </p>
                            </div>

                            {result.financingMonths && (
                              <>
                                <div>
                                  <p className="text-slate-500">
                                    Saldo a financiar
                                  </p>

                                  <p className="mt-1 font-bold text-slate-900">
                                    {formatMoney(
                                      result.financedAmount,
                                      currency,
                                    )}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-slate-500">
                                    Mensualidad
                                  </p>

                                  <p className="mt-1 font-bold text-emerald-700">
                                    {formatMoney(
                                      result.estimatedPayment,
                                      currency,
                                    )}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  },
                )}
              </div>
            </section>

                        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                  Direcciones
                </h3>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={
                      useBillingForShipping
                    }
                    onChange={(
                      event,
                    ) =>
                      setUseBillingForShipping(
                        event
                          .target
                          .checked,
                      )
                    }
                  />

                  Usar la dirección de facturación para envío
                </label>
              </header>

              <div className="grid gap-6 p-5 lg:grid-cols-2">
                <div>
                  <h4 className="font-bold text-slate-900">
                    Dirección de facturación
                  </h4>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      País

                      <input
                        value={
                          billingAddress.country ??
                          ""
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                        onChange={(
                          event,
                        ) =>
                          setBillingAddress(
                            (
                              current,
                            ) => ({
                              ...current,

                              country:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Estado

                      <input
                        value={
                          billingAddress.state ??
                          ""
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                        onChange={(
                          event,
                        ) =>
                          setBillingAddress(
                            (
                              current,
                            ) => ({
                              ...current,

                              state:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Ciudad

                      <input
                        value={
                          billingAddress.city ??
                          ""
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                        onChange={(
                          event,
                        ) =>
                          setBillingAddress(
                            (
                              current,
                            ) => ({
                              ...current,

                              city:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Código postal

                      <input
                        value={
                          billingAddress.postalCode ??
                          ""
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                        onChange={(
                          event,
                        ) =>
                          setBillingAddress(
                            (
                              current,
                            ) => ({
                              ...current,

                              postalCode:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Calle y número

                      <input
                        value={[
                          billingAddress.street,
                          billingAddress.exteriorNumber,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            " ",
                          )}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                        onChange={(
                          event,
                        ) =>
                          setBillingAddress(
                            (
                              current,
                            ) => ({
                              ...current,

                              street:
                                event
                                  .target
                                  .value,

                              exteriorNumber:
                                "",
                            }),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                {!useBillingForShipping && (
                  <div>
                    <h4 className="font-bold text-slate-900">
                      Dirección de envío
                    </h4>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-700">
                        País

                        <input
                          value={
                            shippingAddress.country ??
                            ""
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                          onChange={(
                            event,
                          ) =>
                            setShippingAddress(
                              (
                                current,
                              ) => ({
                                ...current,

                                country:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                        />
                      </label>

                      <label className="text-sm font-semibold text-slate-700">
                        Estado

                        <input
                          value={
                            shippingAddress.state ??
                            ""
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                          onChange={(
                            event,
                          ) =>
                            setShippingAddress(
                              (
                                current,
                              ) => ({
                                ...current,

                                state:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                        />
                      </label>

                      <label className="text-sm font-semibold text-slate-700">
                        Ciudad

                        <input
                          value={
                            shippingAddress.city ??
                            ""
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                          onChange={(
                            event,
                          ) =>
                            setShippingAddress(
                              (
                                current,
                              ) => ({
                                ...current,

                                city:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                        />
                      </label>

                      <label className="text-sm font-semibold text-slate-700">
                        Código postal

                        <input
                          value={
                            shippingAddress.postalCode ??
                            ""
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                          onChange={(
                            event,
                          ) =>
                            setShippingAddress(
                              (
                                current,
                              ) => ({
                                ...current,

                                postalCode:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                        />
                      </label>

                      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                        Calle y número

                        <input
                          value={[
                            shippingAddress.street,
                            shippingAddress.exteriorNumber,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              " ",
                            )}
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                          onChange={(
                            event,
                          ) =>
                            setShippingAddress(
                              (
                                current,
                              ) => ({
                                ...current,

                                street:
                                  event
                                    .target
                                    .value,

                                exteriorNumber:
                                  "",
                              }),
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                  Condiciones comerciales
                </h3>
              </header>

              <div className="grid gap-5 p-5">
                <label className="text-sm font-semibold text-slate-700">
                  Resumen comercial

                  <textarea
                    rows={3}
                    value={
                      commercialSummary
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) =>
                      setCommercialSummary(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Términos y condiciones

                  <textarea
                    rows={4}
                    value={
                      termsAndConditions
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) =>
                      setTermsAndConditions(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Descripción interna

                  <textarea
                    rows={3}
                    value={
                      description
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) =>
                      setDescription(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[28px] bg-slate-950 p-6 text-white shadow-xl">
              <h3 className="text-lg font-black">
                Resumen de la cotización
              </h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <p className="text-sm text-slate-400">
                    Subtotal
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {formatMoney(
                      calculation.baseAmount,
                      currency,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">
                    Descuentos
                  </p>

                  <p className="mt-1 text-xl font-black text-emerald-400">
                    -
                    {formatMoney(
                      calculation.discountAmount,
                      currency,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">
                    Impuestos
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {formatMoney(
                      calculation.taxAmount,
                      currency,
                    )}
                  </p>
                </div>

                <label className="text-sm font-semibold text-slate-300">
                  Ajuste

                  <input
                    type="number"
                    step="0.01"
                    value={
                      adjustmentAmount
                    }
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white"
                    onChange={(
                      event,
                    ) =>
                      setAdjustmentAmount(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                  />
                </label>

                <div>
                  <p className="text-sm text-slate-400">
                    Total
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {formatMoney(
                      calculation.totalAmount,
                      currency,
                    )}
                  </p>
                </div>
              </div>

              {calculation.items.length >
                0 && (
                <div className="mt-6 border-t border-slate-700 pt-5">
                  <p className="text-sm font-semibold text-slate-300">
                    Condiciones de pago
                  </p>

                  <div className="mt-3 grid gap-3">
                    {calculation.items.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="rounded-xl bg-slate-900 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <p className="font-bold">
                              {item.name}
                            </p>

                            <span className="font-semibold text-emerald-400">
                              {item.paymentMethod ??
                                (
                                  item.financingMonths
                                    ? "Financiamiento"
                                    : "Contado"
                                )}
                            </span>
                          </div>

                          <div
                            className={[
                              "mt-4 grid gap-3",
                              item.financingMonths
                                ? "sm:grid-cols-2 lg:grid-cols-5"
                                : "sm:grid-cols-2",
                            ].join(
                              " ",
                            )}
                          >
                            <div>
                              <p className="text-xs text-slate-400">
                                Total de la partida
                              </p>

                              <p className="mt-1 font-bold">
                                {formatMoney(
                                  item.totalAmount,
                                  currency,
                                )}
                              </p>
                            </div>

                            {item.financingMonths ? (
                              <>
                                <div>
                                  <p className="text-xs text-slate-400">
                                    Plazo
                                  </p>

                                  <p className="mt-1 font-bold">
                                    {
                                      item.financingMonths
                                    }{" "}
                                    meses
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400">
                                    Enganche
                                  </p>

                                  <p className="mt-1 font-bold">
                                    {formatMoney(
                                      item.customerDownPayment,
                                      currency,
                                    )}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400">
                                    Saldo a financiar
                                  </p>

                                  <p className="mt-1 font-bold">
                                    {formatMoney(
                                      item.financedAmount,
                                      currency,
                                    )}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400">
                                    Mensualidad
                                  </p>

                                  <p className="mt-1 font-bold text-emerald-400">
                                    {formatMoney(
                                      item.estimatedPayment,
                                      currency,
                                    )}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <div>
                                <p className="text-xs text-slate-400">
                                  Importe a pagar
                                </p>

                                <p className="mt-1 font-bold">
                                  {formatMoney(
                                    item.totalAmount,
                                    currency,
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-4">
                    <span className="text-sm font-semibold text-slate-300">
                      Suma de las partidas
                    </span>

                    <span className="text-xl font-black">
                      {formatMoney(
                        calculation.items.reduce(
                          (
                            total,
                            item,
                          ) =>
                            total +
                            item.totalAmount,
                          0,
                        ),
                        currency,
                      )}
                    </span>
                  </div>
                </div>
              )}
            </section>
          </div>

          <footer className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={
                  isSubmitting
                }
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                onClick={onClose}
              >
                Cancelar
              </button>

              <Button
                type="submit"
                disabled={
                  isSubmitting
                }
              >
                {isSubmitting
                  ? "Guardando..."
                  : mode ===
                      "create"
                    ? "Crear cotización"
                    : "Guardar cambios"}
              </Button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
