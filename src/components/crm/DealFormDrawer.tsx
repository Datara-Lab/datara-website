"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  CRMRecord,
} from "@/components/crm/CRMDataTable";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateDeal,
  type DealPromotionInput,
  validatePromotionSelection,
} from "@/lib/crm/deal-calculations";
import type {
  CRMFieldOption,
  CRMModuleConfig,
} from "@/types/crm-config";

type DrawerMode =
  | "create"
  | "edit";

type ProductRecord = {
  id: string;
  name: string;
  code?: string | null;
  unitPrice: number;
  currency: string;
  active: boolean;
  label: string;
};

type CustomerRecord = {
  id: string;
  displayName: string;
  customerType?: string | null;
};

type LeadRecord = {
  id: string;
  displayName: string;
};

type MemberOption =
  CRMFieldOption;

type DealRecordItem = {
  id: string;
  productId: string;
  quantity: number;
  paymentMethod?: string | null;
  customerDownPayment?: number;
  financingMonths?: number | null;
};

type DealRecordPromotion = {
  promotionId: string | null;
  dealItemId: string | null;
  scope: string;
};

type EditableDealItem = {
  key: string;
  originalId?: string;

  productId: string;
  quantity: number;
  paymentMethod: string;
  customerDownPayment: number;
  financingMonths: number | null;

  promotionIds: string[];

  eligiblePromotions:
    DealPromotionInput[];

  isLoadingPromotions: boolean;
  promotionsError: string | null;
};

type DealPayload = {
  id?: string;

  name: string;
  customerId?: string;
  sourceLeadId?: string;

  ownerClerkUserId: string;

  stage: string;
  status: string;

  acquisitionChannel?: string;

  probability?: number;
  expectedCloseAt?: string;

  items: Array<{
    productId: string;
    quantity: number;
    paymentMethod: string;
    customerDownPayment: number;
    financingMonths: number | null;
    promotionIds: string[];
  }>;

  generalPromotionIds: string[];

  nextStep?: string;
  notes?: string;
};

type DealFormDrawerProps = {
  isOpen: boolean;
  mode: DrawerMode;

  module: CRMModuleConfig;
  record?: CRMRecord | null;

  products: ProductRecord[];
  customers: CustomerRecord[];
  leads: LeadRecord[];
  members: MemberOption[];

  isSubmitting?: boolean;

  onClose: () => void;

  onSubmit: (
    payload: DealPayload,
    mode: DrawerMode,
    record?: CRMRecord | null,
  ) => void | Promise<void>;
};

type EligiblePromotionsResponse = {
  success: boolean;

  data?: {
    product: {
      id: string;
      name: string;
      code?: string | null;
      unitPrice: number;
      currency: string;
    };

    promotions:
      DealPromotionInput[];
  };

  error?: string;
};

function createEmptyItem():
  EditableDealItem {
  return {
    key: crypto.randomUUID(),

    productId: "",
    quantity: 1,
    paymentMethod: "Por definir",
    customerDownPayment: 0,
    financingMonths: null,

    promotionIds: [],
    eligiblePromotions: [],

    isLoadingPromotions: false,
    promotionsError: null,
  };
}

function getStringValue(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function getNumberValue(
  value: unknown,
  fallback = 0,
): number {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : fallback;
}

function formatDateInput(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !value
  ) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
}

function formatMoney(
  value: number,
  currency = "MXN",
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

function getFieldOptions(
  module: CRMModuleConfig,
  fieldKey: string,
): CRMFieldOption[] {
  return (
    module.fields.find(
      (field) =>
        field.key === fieldKey,
    )?.options ?? []
  );
}

function buildInitialItems(
  record?: CRMRecord | null,
): EditableDealItem[] {
  const recordItems =
    Array.isArray(record?.items)
      ? record.items as DealRecordItem[]
      : [];

  const recordPromotions =
    Array.isArray(
      record?.promotions,
    )
      ? record
          .promotions as DealRecordPromotion[]
      : [];

  if (
    recordItems.length === 0
  ) {
    return [
      createEmptyItem(),
    ];
  }

  return recordItems.map(
    (item) => ({
      key: crypto.randomUUID(),
      originalId: item.id,

      productId:
        item.productId ?? "",

      quantity:
        getNumberValue(
          item.quantity,
          1,
        ),

      paymentMethod:
        item.paymentMethod ??
        "Por definir",

      customerDownPayment:
        getNumberValue(
          item
            .customerDownPayment,
          0,
        ),

      financingMonths:
        item.financingMonths ??
        null,


      promotionIds:
        recordPromotions
          .filter(
            (promotion) =>
              promotion.scope ===
                "item" &&
              promotion.dealItemId ===
                item.id &&
              promotion.promotionId,
          )
          .map(
            (promotion) =>
              promotion
                .promotionId as string,
          ),

      eligiblePromotions: [],

      isLoadingPromotions: false,
      promotionsError: null,
    }),
  );
}

export default function DealFormDrawer({
  isOpen,
  mode,
  module,
  record,
  products,
  customers,
  leads,
  members,
  isSubmitting = false,
  onClose,
  onSubmit,
}: DealFormDrawerProps) {
  const {
    user,
  } = useAuth();

  const stageOptions =
    useMemo(
      () =>
        getFieldOptions(
          module,
          "stage",
        ),
      [module],
    );

  const statusOptions =
    useMemo(
      () =>
        getFieldOptions(
          module,
          "status",
        ),
      [module],
    );

  const channelOptions =
    useMemo(
      () =>
        getFieldOptions(
          module,
          "acquisitionChannel",
        ),
      [module],
    );

  const [
    name,
    setName,
  ] = useState("");

  const [
    isNameManuallyEdited,
    setIsNameManuallyEdited,
  ] = useState(false);

  const [
    customerId,
    setCustomerId,
  ] = useState("");

  const [
    sourceLeadId,
    setSourceLeadId,
  ] = useState("");

  const [
    ownerClerkUserId,
    setOwnerClerkUserId,
  ] = useState("");

  const [
    stage,
    setStage,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("Abierta");

  const [
    acquisitionChannel,
    setAcquisitionChannel,
  ] = useState("");

  const [
    probability,
    setProbability,
  ] = useState("");

  const [
    expectedCloseAt,
    setExpectedCloseAt,
  ] = useState("");

  const [
    nextStep,
    setNextStep,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    items,
    setItems,
  ] = useState<
    EditableDealItem[]
  >([
    createEmptyItem(),
  ]);

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null,
  );

  const selectedCustomer =
    useMemo(
      () =>
        customers.find(
          (customer) =>
            customer.id ===
            customerId,
        ),
      [
        customers,
        customerId,
      ],
    );

  const selectedLead =
    useMemo(
      () =>
        leads.find(
          (lead) =>
            lead.id ===
            sourceLeadId,
        ),
      [
        leads,
        sourceLeadId,
      ],
    );

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(
      getStringValue(
        record?.name,
      ),
    );

    setIsNameManuallyEdited(
      mode === "edit" &&
        Boolean(record?.name),
    );

    setCustomerId(
      getStringValue(
        record?.customerId,
      ),
    );

    setSourceLeadId(
      getStringValue(
        record?.sourceLeadId,
      ),
    );

    setOwnerClerkUserId(
      getStringValue(
        record
          ?.ownerClerkUserId,
        user?.id ?? "",
      ),
    );

    setStage(
      getStringValue(
        record?.stage,
        stageOptions[0]
          ?.value ?? "Nueva",
      ),
    );

    setStatus(
      getStringValue(
        record?.status,
        "Abierta",
      ),
    );

    setAcquisitionChannel(
      getStringValue(
        record
          ?.acquisitionChannel,
      ),
    );

    const recordProbability =
      record?.probability;

    setProbability(
      recordProbability ===
        null ||
      recordProbability ===
        undefined
        ? ""
        : String(
            recordProbability,
          ),
    );

    setExpectedCloseAt(
      formatDateInput(
        record
          ?.expectedCloseAt,
      ),
    );

    setNextStep(
      getStringValue(
        record?.nextStep,
      ),
    );

    setNotes(
      getStringValue(
        record?.notes,
      ),
    );

    setItems(
      buildInitialItems(
        mode === "edit"
          ? record
          : null,
      ),
    );

    setFormError(null);
  }, [
    isOpen,
    mode,
    record,
    stageOptions,
    user?.id,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      mode === "edit" ||
      isNameManuallyEdited
    ) {
      return;
    }

    const relationshipName =
      selectedCustomer
        ?.displayName ??
      selectedLead
        ?.displayName ??
      "";

    if (!relationshipName) {
      setName("");
      return;
    }

    const selectedProductNames =
      items
        .map((item) =>
          productsById.get(
            item.productId,
          )?.name,
        )
        .filter(
          (
            productName,
          ): productName is string =>
            Boolean(productName),
        );

    if (
      selectedProductNames.length ===
      0
    ) {
      setName(relationshipName);
      return;
    }

    if (
      selectedProductNames.length ===
      1
    ) {
      setName(
        `${relationshipName} - ${selectedProductNames[0]}`,
      );
      return;
    }

    setName(
      `${relationshipName} - ${selectedProductNames.length} productos`,
    );
  }, [
    isOpen,
    mode,
    isNameManuallyEdited,
    items,
    productsById,
    selectedCustomer,
    selectedLead,
  ]);

  const eligibilityKey =
    useMemo(
      () =>
        JSON.stringify({
          productIds:
            items.map(
              (item) =>
                item.productId,
            ),

          acquisitionChannel,

          customerType:
            selectedCustomer
              ?.customerType ??
            "",
        }),
      [
        items,
        acquisitionChannel,
        selectedCustomer
          ?.customerType,
      ],
    );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller =
      new AbortController();

    async function loadPromotions() {
      const currentItems =
        items;

      await Promise.all(
        currentItems.map(
          async (item) => {
            if (!item.productId) {
              return;
            }

            setItems(
              (current) =>
                current.map(
                  (currentItem) =>
                    currentItem.key ===
                    item.key
                      ? {
                          ...currentItem,
                          isLoadingPromotions:
                            true,
                          promotionsError:
                            null,
                        }
                      : currentItem,
                ),
            );

            try {
              const searchParams =
                new URLSearchParams({
                  productId:
                    item.productId,
                });

              if (
                acquisitionChannel
              ) {
                searchParams.set(
                  "channel",
                  acquisitionChannel,
                );
              }

              if (
                selectedCustomer
                  ?.customerType
              ) {
                searchParams.set(
                  "customerType",
                  selectedCustomer
                    .customerType,
                );
              }

              const response =
                await fetch(
                  `/api/crm/promotions/eligible?${searchParams.toString()}`,
                  {
                    cache: "no-store",
                    signal:
                      controller.signal,
                  },
                );

              const payload =
                await response.json() as
                  EligiblePromotionsResponse;

              if (
                !response.ok ||
                !payload.success
              ) {
                throw new Error(
                  payload.error ??
                    "No fue posible cargar las promociones.",
                );
              }

              setItems(
                (current) =>
                  current.map(
                    (currentItem) =>
                      currentItem.key ===
                      item.key
                        ? {
                            ...currentItem,

                            eligiblePromotions:
                              payload.data
                                ?.promotions ??
                              [],

                            isLoadingPromotions:
                              false,

                            promotionsError:
                              null,
                          }
                        : currentItem,
                  ),
              );
            } catch (error) {
              if (
                error instanceof
                  DOMException &&
                error.name ===
                  "AbortError"
              ) {
                return;
              }

              setItems(
                (current) =>
                  current.map(
                    (currentItem) =>
                      currentItem.key ===
                      item.key
                        ? {
                            ...currentItem,

                            eligiblePromotions:
                              [],

                            isLoadingPromotions:
                              false,

                            promotionsError:
                              error instanceof
                                Error
                                ? error.message
                                : "No fue posible cargar las promociones.",
                          }
                        : currentItem,
                  ),
              );
            }
          },
        ),
      );
    }

    void loadPromotions();

    return () => {
      controller.abort();
    };
    // eligibilityKey representa únicamente
    // los datos que cambian la elegibilidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    eligibilityKey,
    isOpen,
  ]);

  const calculation =
    useMemo(
      () =>
        calculateDeal({
          items:
            items
              .filter(
                (item) =>
                  item.productId,
              )
              .map((item) => {
                const product =
                  productsById.get(
                    item.productId,
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
                    product
                      ?.unitPrice ??
                    0,

                  paymentMethod:
                    item.paymentMethod,

                  financingMonths:
                    item.financingMonths,

                  customerDownPayment:
                    item
                      .customerDownPayment,

                  promotions:
                    item
                      .eligiblePromotions
                      .filter(
                        (promotion) =>
                          item
                            .promotionIds
                            .includes(
                              promotion.id,
                            ),
                      ),
                };
              }),

          generalPromotions: [],
        }),
      [
        items,
        productsById,
      ],
    );

  function updateItem(
    itemKey: string,
    changes:
      Partial<
        EditableDealItem
      >,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.key === itemKey
          ? {
              ...item,
              ...changes,
            }
          : item,
      ),
    );
  }

  function removeItem(
    itemKey: string,
  ) {
    setItems((current) =>
      current.length === 1
        ? current
        : current.filter(
            (item) =>
              item.key !== itemKey,
          ),
    );
  }

  function togglePromotion(
    itemKey: string,
    promotion:
      DealPromotionInput,
  ) {
    const item =
      items.find(
        (candidate) =>
          candidate.key ===
          itemKey,
      );

    if (!item) {
      return;
    }

    const isSelected =
      item.promotionIds.includes(
        promotion.id,
      );

    let nextIds: string[];

    if (isSelected) {
      nextIds =
        item.promotionIds.filter(
          (id) =>
            id !== promotion.id,
        );
    } else {
      const promotionGroup =
        promotion.promotionGroup
          ?.trim()
          .toLowerCase();

      const conflictingIds =
        new Set(
          item.eligiblePromotions
            .filter(
              (candidate) => {
                if (
                  candidate.id ===
                  promotion.id
                ) {
                  return false;
                }

                const candidateGroup =
                  candidate
                    .promotionGroup
                    ?.trim()
                    .toLowerCase();

                return (
                  Boolean(
                    promotionGroup,
                  ) &&
                  candidateGroup ===
                    promotionGroup &&
                  (
                    promotion
                      .requiresSelection ||
                    candidate
                      .requiresSelection
                  )
                );
              },
            )
            .map(
              (candidate) =>
                candidate.id,
            ),
        );

      nextIds = [
        ...item.promotionIds.filter(
          (id) =>
            !conflictingIds.has(id),
        ),
        promotion.id,
      ];
    }

    const nextPromotions =
      item.eligiblePromotions.filter(
        (candidate) =>
          nextIds.includes(
            candidate.id,
          ),
      );

    const errors =
      validatePromotionSelection(
        nextPromotions,
      );

    if (errors.length > 0) {
      setFormError(
        errors.join(" "),
      );
      return;
    }

    setFormError(null);

    updateItem(
      itemKey,
      {
        promotionIds:
          nextIds,
      },
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError(null);

    if (!name.trim()) {
      setFormError(
        "El nombre de la oportunidad es obligatorio.",
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

    if (
      !ownerClerkUserId
    ) {
      setFormError(
        "Selecciona un responsable.",
      );
      return;
    }

    if (
      items.length === 0 ||
      items.some(
        (item) =>
          !item.productId ||
          item.quantity <= 0,
      )
    ) {
      setFormError(
        "Todas las partidas deben tener un producto y una cantidad válida.",
      );
      return;
    }

    if (
      calculation.errors.length >
      0
    ) {
      setFormError(
        calculation.errors.join(
          " ",
        ),
      );
      return;
    }

    await onSubmit(
      {
        ...(mode === "edit" &&
        record?.id
          ? {
              id: record.id,
            }
          : {}),

        name:
          name.trim(),

        customerId:
          customerId ||
          undefined,

        sourceLeadId:
          sourceLeadId ||
          undefined,

        ownerClerkUserId,

        stage,
        status,

        acquisitionChannel:
          acquisitionChannel ||
          undefined,

        probability:
          probability
            ? Number(
                probability,
              )
            : undefined,

        expectedCloseAt:
          expectedCloseAt ||
          undefined,

                items:
          items.map(
            (item) => ({
              productId:
                item.productId,

              quantity:
                item.quantity,

              paymentMethod:
                item.paymentMethod,

              customerDownPayment:
                item
                  .customerDownPayment,

              financingMonths:
                item.financingMonths,

              promotionIds:
                item
                  .promotionIds,
            }),
          ),

        generalPromotionIds: [],

        nextStep:
          nextStep.trim() ||
          undefined,

        notes:
          notes.trim() ||
          undefined,
      },
      mode,
      record,
    );
  }

  if (!isOpen) {
    return null;
  }

  const currency =
    productsById.get(
      items.find(
        (item) =>
          item.productId,
      )?.productId ?? "",
    )?.currency ??
    "MXN";

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Cerrar panel"
        disabled={isSubmitting}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                {mode === "create"
                  ? `Nueva ${module.singularLabel.toLowerCase()}`
                  : `Editar ${module.singularLabel.toLowerCase()}`}
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {name ||
                  module.singularLabel}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {module.description}
              </p>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
            {formError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
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
                <label className="text-sm font-semibold text-slate-700">
                  Nombre de la oportunidad *

                  <input
                    value={name}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-emerald-600"
                    onChange={(event) => {
                      setName(
                        event.target.value,
                      );

                      setIsNameManuallyEdited(
                        true,
                      );
                    }}
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Responsable *

                  <select
                    value={
                      ownerClerkUserId
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setOwnerClerkUserId(
                        event.target.value,
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
                          {member.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Cliente

                  <select
                    value={customerId}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setCustomerId(
                        event.target.value,
                      )
                    }
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
                  Prospecto de origen

                  <select
                    value={
                      sourceLeadId
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setSourceLeadId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Sin prospecto
                    </option>

                    {leads.map(
                      (lead) => (
                        <option
                          key={lead.id}
                          value={lead.id}
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
                  Etapa *

                  <select
                    value={stage}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setStage(
                        event.target.value,
                      )
                    }
                  >
                    {stageOptions.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Estado *

                  <select
                    value={status}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setStatus(
                        event.target.value,
                      )
                    }
                  >
                    {statusOptions.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Canal de adquisición

                  <select
                    value={
                      acquisitionChannel
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setAcquisitionChannel(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecciona un canal
                    </option>

                    {channelOptions.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Fecha estimada de cierre

                  <input
                    type="date"
                    value={
                      expectedCloseAt
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setExpectedCloseAt(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Probabilidad de cierre

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={probability}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setProbability(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <h3 className="font-bold text-slate-950">
                    Productos o servicios
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Cada partida conserva sus promociones y cálculos.
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                  onClick={() =>
                    setItems(
                      (current) => [
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
                  (item, index) => {
                    const result =
                      calculation.items.find(
                        (
                          calculationItem,
                        ) =>
                          calculationItem.id ===
                          item.key,
                      );

                    return (
                      <article
                        key={item.key}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="font-bold text-slate-900">
                            Partida {index + 1}
                          </h4>

                          <button
                            type="button"
                            disabled={
                              items.length ===
                              1
                            }
                            className="text-sm font-semibold text-red-600 disabled:opacity-40"
                            onClick={() =>
                              removeItem(
                                item.key,
                              )
                            }
                          >
                            Eliminar
                          </button>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                            Producto o servicio *

                            <select
                              value={
                                item.productId
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  item.key,
                                  {
                                    productId:
                                      event
                                        .target
                                        .value,

                                    promotionIds:
                                      [],
                                  },
                                )
                              }
                            >
                              <option value="">
                                Selecciona una opción
                              </option>

                              {products.map(
                                (product) => (
                                  <option
                                    key={
                                      product.id
                                    }
                                    value={
                                      product.id
                                    }
                                  >
                                    {
                                      product.label
                                    }
                                    {" · "}
                                    {formatMoney(
                                      product.unitPrice,
                                      product.currency,
                                    )}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <label className="text-sm font-semibold text-slate-700">
                            Cantidad *

                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={
                                item.quantity
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
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
                        </div>

                        {item.productId && (
                          <div className="mt-5">
                            <p className="text-sm font-bold text-slate-900">
                              Promociones disponibles
                            </p>

                            {item.isLoadingPromotions ? (
                              <p className="mt-3 text-sm text-slate-500">
                                Consultando promociones...
                              </p>
                            ) : item.promotionsError ? (
                              <p className="mt-3 text-sm text-red-600">
                                {item.promotionsError}
                              </p>
                            ) : item.eligiblePromotions.length ===
                              0 ? (
                              <p className="mt-3 text-sm text-slate-500">
                                No hay promociones aplicables.
                              </p>
                            ) : (
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {item.eligiblePromotions.map(
                                  (
                                    promotion,
                                  ) => {
                                    const selected =
                                      item.promotionIds.includes(
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
                                              {
                                                promotion.benefitType
                                              }
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
                            )}
                          </div>
                        )}

                        <label className="mt-5 block text-sm font-semibold text-slate-700">
                          Forma de pago

                          <select
                            value={
                              result
                                ?.paymentMethod ??
                              item.paymentMethod
                            }
                            disabled={
                              Boolean(
                                result
                                  ?.financingMonths,
                              ) ||
                              item
                                .eligiblePromotions
                                .some(
                                  (
                                    promotion,
                                  ) =>
                                    item
                                      .promotionIds
                                      .includes(
                                        promotion.id,
                                      ) &&
                                    Boolean(
                                      promotion.paymentMethod,
                                    ) &&
                                    promotion.paymentMethod !==
                                      "Ambos",
                                )
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:max-w-xs"
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

                          <p className="mt-1 text-xs font-normal text-slate-500">
                            Las promociones pueden determinar automáticamente esta opción.
                          </p>
                        </label>

                                                {item
                          .eligiblePromotions
                          .some(
                            (promotion) =>
                              item
                                .promotionIds
                                .includes(
                                  promotion.id,
                                ) &&
                              (
                                promotion
                                  .availableMonths
                                  ?.length ??
                                0
                              ) > 0,
                          ) && (
                          <label className="mt-4 block text-sm font-semibold text-slate-700">
                            Meses disponibles *

                            <select
                              value={
                                item.financingMonths ??
                                ""
                              }
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 sm:max-w-xs"
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

                              {Array.from(
                                new Set(
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
                                    )
                                    .flatMap(
                                      (
                                        promotion,
                                      ) =>
                                        promotion
                                          .availableMonths ??
                                        [],
                                    )
                                    .map(Number)
                                    .filter(
                                      (
                                        months,
                                      ) =>
                                        Number.isInteger(
                                          months,
                                        ) &&
                                        months >
                                          0,
                                    ),
                                ),
                              )
                                .sort(
                                  (a, b) =>
                                    a - b,
                                )
                                .map(
                                  (months) => (
                                    <option
                                      key={
                                        months
                                      }
                                      value={
                                        months
                                      }
                                    >
                                      {months} meses
                                    </option>
                                  ),
                                )}
                            </select>
                          </label>
                        )}

                        {result && (
                          <div className="mt-5 grid gap-3 rounded-xl bg-white p-4 text-sm sm:grid-cols-4">
                            <div>
                              <p className="text-slate-500">
                                Precio original
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
                                Total
                              </p>
                              <p className="mt-1 font-bold text-slate-900">
                                {formatMoney(
                                  result.totalAmount,
                                  currency,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-500">
                                Forma de pago
                              </p>
                              <p className="mt-1 font-bold text-slate-900">
                                {result.paymentMethod ??
                                  "Por definir"}
                              </p>
                            </div>
                          </div>
                        )}

                        {result?.financingMonths && (
                          <div className="mt-4 grid gap-4 sm:grid-cols-4">
                            <div className="rounded-xl bg-amber-50 p-4 text-sm">
                              <p className="text-amber-700">
                                Enganche mínimo
                              </p>
                              <p className="mt-1 font-bold text-amber-900">
                                {formatMoney(
                                  result.minimumDownPayment,
                                  currency,
                                )}
                              </p>
                            </div>

                            <label className="text-sm font-semibold text-slate-700">
                              Enganche del cliente

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.customerDownPayment ===
                                  0
                                    ? ""
                                    : item.customerDownPayment
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    item.key,
                                    {
                                      customerDownPayment:
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

                            <div className="rounded-xl bg-blue-50 p-4 text-sm">
                              <p className="text-blue-700">
                                Saldo a financiar
                              </p>
                              <p className="mt-1 font-bold text-blue-900">
                                {formatMoney(
                                  result.financedAmount,
                                  currency,
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-violet-50 p-4 text-sm">
                              <p className="text-violet-700">
                                Mensualidad estimada
                              </p>
                              <p className="mt-1 font-bold text-violet-900">
                                {formatMoney(
                                  result.estimatedPayment,
                                  currency,
                                )}
                                {" · "}
                                {
                                  result.financingMonths
                                }
                                {" meses"}
                              </p>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  },
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <h3 className="text-lg font-bold">
                Resumen de la oportunidad
              </h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
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

              <div className="mt-6 border-t border-slate-700 pt-5">
                <p className="text-sm font-semibold text-slate-300">
                  Condiciones de pago
                </p>

                <div className="mt-3 space-y-4">
                  {calculation.items.map(
                    (item) => (
                      <div
                        key={`payment-${item.id}`}
                        className="rounded-2xl bg-slate-900/70 p-4"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-semibold text-white">
                            {item.name}
                          </p>

                          <span className="text-sm font-semibold text-emerald-400">
                            {item.paymentMethod ??
                              "Por definir"}
                          </span>
                        </div>

                        {item.financingMonths ? (
                          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                                Enganche mínimo
                              </p>

                              <p className="mt-1 font-bold">
                                {formatMoney(
                                  item.minimumDownPayment,
                                  currency,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                Enganche del cliente
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
                                Mensualidad estimada
                              </p>

                              <p className="mt-1 font-bold text-emerald-400">
                                {formatMoney(
                                  item.estimatedPayment,
                                  currency,
                                )}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4">
                            <p className="text-xs text-slate-400">
                              Importe de la partida
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
                    ),
                  )}
                </div>
              </div>


              {calculation.items.some(
                (item) =>
                  item.promotions.length >
                  0,
              ) && (
                <div className="mt-6 border-t border-slate-700 pt-5">
                  <p className="text-sm font-semibold text-slate-300">
                    Promociones aplicadas
                  </p>

                  <div className="mt-3 space-y-2">
                    {calculation.items.flatMap(
                      (item) =>
                        item.promotions.map(
                          (promotion) => (
                            <div
                              key={`${item.id}-${promotion.id}`}
                              className="flex justify-between gap-4 text-sm"
                            >
                              <span>
                                {item.name}
                                {" · "}
                                {
                                  promotion.name
                                }
                              </span>

                              <span className="font-semibold text-emerald-400">
                                {promotion.calculatedBenefit >
                                0
                                  ? `-${formatMoney(
                                      promotion.calculatedBenefit,
                                      currency,
                                    )}`
                                  : promotion.benefitType ??
                                    "Beneficio"}
                              </span>
                            </div>
                          ),
                        ),
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                  Información adicional
                </h3>
              </header>

              <div className="grid gap-5 p-5">
                <label className="text-sm font-semibold text-slate-700">
                  Siguiente paso

                  <input
                    value={nextStep}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setNextStep(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Observaciones

                  <textarea
                    rows={4}
                    value={notes}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setNotes(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            </section>
          </div>

          <footer className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                onClick={onClose}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting
                  ? "Guardando..."
                  : mode === "create"
                    ? `Crear ${module.singularLabel.toLowerCase()}`
                    : "Guardar cambios"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
