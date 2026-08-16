"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";

import {
  DATARA_PRODUCTS,
  type DataraProductKey,
} from "@/config/datara-products";

import {
  CRM_MODULE_PACKAGES,
} from "@/lib/crm/module-catalog";

const CRM_MODULE_GROUPS =
  Object.values(
    CRM_MODULE_PACKAGES,
  );

type CatalogItem = {
  id: string;
  productKey: DataraProductKey;
  itemKey: string;
  itemType:
    | "package"
    | "expansion"
    | "addon";
  name: string;
  description: string | null;
  monthlyPrice: string;
  annualPrice: string;

  annualDiscountPercent:
    number;

  currency: string;
  includedUsers: number;
  includedStorageGb: string;
  moduleIds: string[];
  features: string[];
  required: boolean;
  recommended: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type CatalogResponse = {
  success: boolean;

  data?: {
    items?: CatalogItem[];
    item?: CatalogItem;
  };

  message?: string;
  error?: string;
};

type CatalogDraft = {
  id: string | null;
  productKey: DataraProductKey;
  itemKey: string;
  itemType:
    | "package"
    | "expansion"
    | "addon";
  name: string;
  description: string;
  monthlyPrice: string;

  annualDiscountPercent:
    string;

  currency: string;
  includedUsers: string;
  includedStorageGb: string;
  moduleIds: string;
  features: string;
  required: boolean;
  recommended: boolean;
  active: boolean;
  sortOrder: string;
};

const EMPTY_DRAFT:
  CatalogDraft = {
  id: null,
  productKey: "crm",
  itemKey: "",
  itemType: "package",
  name: "",
  description: "",
  monthlyPrice: "0.00",

  annualDiscountPercent:
    "0",

  currency: "mxn",
  includedUsers: "0",
  includedStorageGb: "0.00",
  moduleIds: "",
  features: "",
  required: false,
  recommended: false,
  active: true,
  sortOrder: "0",
};

function listToText(
  values: string[],
): string {
  return values.join("\n");
}

function textToList(
  value: string,
): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}

const COMMERCIAL_BENEFIT_OPTIONS = [
  "Usuarios y permisos",
  "Configuración del producto",
  "Integraciones comerciales",
  "Automatizaciones",
  "Actualizaciones incluidas",
  "Soporte por correo",
  "Soporte prioritario",
  "Implementación guiada",
  "Capacitación inicial",
  "Almacenamiento administrado",
  "Respaldos administrados",
  "Reportes operativos",
  "Acceso desde dispositivos móviles",
] as const;

export default function CommercialCatalogManager() {
  const [
    items,
    setItems,
  ] = useState<CatalogItem[]>([]);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState<DataraProductKey>(
    "crm",
  );

  const [
    draft,
    setDraft,
  ] = useState<CatalogDraft>({
    ...EMPTY_DRAFT,
  });

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const productItems =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.productKey ===
            selectedProduct,
        ),
      [
        items,
        selectedProduct,
      ],
    );

  const monthlyPrice =
    Number(
      draft.monthlyPrice,
    ) || 0;

  const annualBasePrice =
    monthlyPrice * 12;

  const annualDiscountPercent =
    Number(
      draft
        .annualDiscountPercent,
    ) || 0;

  const discountedAnnualPrice =
    annualBasePrice *
    (
      1 -
      annualDiscountPercent /
        100
    );

  const includedModuleIds =
    textToList(
      draft.moduleIds,
    );

  const includedModuleIdSet =
    new Set(
      includedModuleIds,
    );

  const includedModuleGroups =
    CRM_MODULE_GROUPS.filter(
      (moduleGroup) =>
        moduleGroup.moduleIds.every(
          (moduleId) =>
            includedModuleIdSet.has(
              moduleId,
            ),
        ),
    );

  const availableModuleGroups =
    CRM_MODULE_GROUPS.filter(
      (moduleGroup) =>
        !moduleGroup.moduleIds.every(
          (moduleId) =>
            includedModuleIdSet.has(
              moduleId,
            ),
        ),
    );

  function includeModuleGroup(
    moduleIds:
      readonly string[],
  ) {
    const nextModuleIds =
      new Set(
        includedModuleIds,
      );

    moduleIds.forEach(
      (moduleId) =>
        nextModuleIds.add(
          moduleId,
        ),
    );

    setDraft(
      (currentDraft) => ({
        ...currentDraft,

        moduleIds:
          listToText(
            Array.from(
              nextModuleIds,
            ),
          ),
      }),
    );
  }

  function removeModuleGroup(
    moduleIds:
      readonly string[],
  ) {
    const moduleIdSet =
      new Set(moduleIds);

    setDraft(
      (currentDraft) => ({
        ...currentDraft,

        moduleIds:
          listToText(
            textToList(
              currentDraft
                .moduleIds,
            ).filter(
              (moduleId) =>
                !moduleIdSet.has(
                  moduleId,
                ),
            ),
          ),
      }),
    );
  }

    const includedBenefits =
    textToList(
      draft.features,
    );

  const includedBenefitSet =
    new Set(
      includedBenefits,
    );

  const availableBenefits =
    COMMERCIAL_BENEFIT_OPTIONS.filter(
      (benefit) =>
        !includedBenefitSet.has(
          benefit,
        ),
    );

  function includeBenefit(
    benefit: string,
  ) {
    setDraft(
      (currentDraft) => ({
        ...currentDraft,

        features:
          listToText([
            ...textToList(
              currentDraft
                .features,
            ),

            benefit,
          ]),
      }),
    );
  }

  function removeBenefit(
    benefit: string,
  ) {
    setDraft(
      (currentDraft) => ({
        ...currentDraft,

        features:
          listToText(
            textToList(
              currentDraft
                .features,
            ).filter(
              (currentBenefit) =>
                currentBenefit !==
                benefit,
            ),
          ),
      }),
    );
  }

  useEffect(() => {
    let isActive = true;

    async function loadCatalog() {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/platform/commercial-catalog",
            {
              cache:
                "no-store",
            },
          );

        const result =
          (await response.json()) as
            CatalogResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ??
              "No fue posible cargar el catálogo comercial.",
          );
        }

        if (!isActive) {
          return;
        }

        setItems(
          result.data?.items ??
            [],
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar el catálogo comercial.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      isActive = false;
    };
  }, []);

  function createNewItem() {
    setDraft({
      ...EMPTY_DRAFT,
      productKey:
        selectedProduct,
    });

    setMessage(null);
    setError(null);
  }

  function editItem(
    item: CatalogItem,
  ) {
    setSelectedProduct(
      item.productKey,
    );

    setDraft({
      id: item.id,
      productKey:
        item.productKey,
      itemKey:
        item.itemKey,
      itemType:
        item.itemType,
      name: item.name,
      description:
        item.description ?? "",
      monthlyPrice:
        item.monthlyPrice,

      annualDiscountPercent:
        String(
          item.annualDiscountPercent,
        ),

      currency:
        item.currency,
      includedUsers:
        String(
          item.includedUsers,
        ),
      includedStorageGb:
        item.includedStorageGb,
      moduleIds:
        listToText(
          item.moduleIds,
        ),
      features:
        listToText(
          item.features,
        ),
      required:
        item.required,
      recommended:
        item.recommended,
      active:
        item.active,
      sortOrder:
        String(
          item.sortOrder,
        ),
    });

    setMessage(null);
    setError(null);
  }

  async function handleSave(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setMessage(null);
      setError(null);

      const payload = {
        id: draft.id,
        productKey:
          draft.productKey,
        itemKey:
          draft.itemKey,
        itemType:
          draft.itemType,
        name:
          draft.name,
        description:
          draft.description,
        monthlyPrice:
          draft.monthlyPrice,

        annualDiscountPercent:
          draft
            .annualDiscountPercent,

        currency:
          draft.currency,
        includedUsers:
          draft.includedUsers,
        includedStorageGb:
          draft.includedStorageGb,
        moduleIds:
          textToList(
            draft.moduleIds,
          ),
        features:
          textToList(
            draft.features,
          ),
        required:
          draft.required,
        recommended:
          draft.recommended,
        active:
          draft.active,
        sortOrder:
          draft.sortOrder,
      };

      const response =
        await fetch(
          "/api/platform/commercial-catalog",
          {
            method:
              draft.id
                ? "PATCH"
                : "POST",

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
        (await response.json()) as
          CatalogResponse;

      const savedItem =
        result.data?.item;

      if (
        !response.ok ||
        !result.success ||
        !savedItem
      ) {
        throw new Error(
          result.error ??
            "No fue posible guardar el catálogo comercial.",
        );
      }

      setItems(
        (currentItems) => {
          const existingIndex =
            currentItems.findIndex(
              (item) =>
                item.id ===
                savedItem.id,
            );

          if (
            existingIndex === -1
          ) {
            return [
              ...currentItems,
              savedItem,
            ];
          }

          return currentItems.map(
            (item) =>
              item.id ===
              savedItem.id
                ? savedItem
                : item,
          );
        },
      );

      setSelectedProduct(
        savedItem.productKey,
      );

      if (draft.id) {
        setDraft(
          (currentDraft) => ({
            ...currentDraft,

            id:
              savedItem.id,

            productKey:
              savedItem.productKey,

            itemKey:
              savedItem.itemKey,
          }),
        );
      } else {
        setDraft({
          ...EMPTY_DRAFT,

          productKey:
            savedItem.productKey,
        });
      }

      setMessage(
        result.message ??
          "El catálogo comercial fue guardado correctamente.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar el catálogo comercial.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          eyebrow="Administración interna"
          title="Catálogo comercial"
          description="Administra precios, paquetes, expansiones, módulos y beneficios de los productos Datara."
          action={
            <Button
              href="/administracion"
              variant="secondary"
            >
              Volver a administración
            </Button>
          }
        />

        {(message || error) && (
          <div
            role="status"
            aria-live="polite"
            className="fixed right-4 top-24 z-50 w-[calc(100%-2rem)] max-w-md sm:right-6"
          >
            <div
              className={[
                "flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-xl backdrop-blur",
                error
                  ? "border-red-200 bg-red-50/95 text-red-700"
                  : "border-emerald-200 bg-emerald-50/95 text-emerald-800",
              ].join(" ")}
            >
              <p>
                {error ?? message}
              </p>

              <button
                type="button"
                aria-label="Cerrar notificación"
                onClick={() => {
                  setMessage(null);
                  setError(null);
                }}
                className="shrink-0 text-lg leading-none opacity-60 transition hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {Object.values(
              DATARA_PRODUCTS,
            ).map(
              (product) => (
                <button
                  key={
                    product.key
                  }
                  type="button"
                  onClick={() => {
                    setSelectedProduct(
                      product.key,
                    );

                    setDraft(
                      (currentDraft) => ({
                        ...currentDraft,
                        productKey:
                          product.key,
                      }),
                    );
                  }}
                  className={[
                    "rounded-xl border px-5 py-3 text-sm font-bold transition",
                    selectedProduct ===
                    product.key
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700",
                  ].join(" ")}
                >
                  {product.name}
                </button>
              ),
            )}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-950">
                  Ofertas configuradas
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    productItems.length
                  }{" "}
                  elementos
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={
                  createNewItem
                }
              >
                Nueva
              </Button>
            </header>

            {isLoading ? (
              <div className="p-8 text-center text-sm font-semibold text-slate-500">
                Cargando catálogo...
              </div>
            ) : productItems.length ===
              0 ? (
              <div className="p-8 text-center">
                <p className="font-bold text-slate-800">
                  No hay ofertas configuradas
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Crea el paquete principal, sus expansiones y adicionales.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {productItems.map(
                  (item) => (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      onClick={() =>
                        editItem(
                          item,
                        )
                      }
                      className={[
                        "w-full px-5 py-4 text-left transition hover:bg-slate-50",
                        draft.id ===
                        item.id
                          ? "bg-blue-50"
                          : "bg-white",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-950">
                            {
                              item.name
                            }
                          </p>

                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                            {
                              item.itemType
                            }{" "}
                            ·{" "}
                            {
                              item.itemKey
                            }
                          </p>
                        </div>

                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-bold",
                            item.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600",
                          ].join(" ")}
                        >
                          {item.active
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-bold text-blue-700">
                        $
                        {Number(
                          item.monthlyPrice,
                        ).toLocaleString(
                          "es-MX",
                          {
                            minimumFractionDigits:
                              2,
                          },
                        )}{" "}
                        MXN/mes
                      </p>
                    </button>
                  ),
                )}
              </div>
            )}
          </aside>
                    <form
            onSubmit={
              handleSave
            }
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
          >
            <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <h2 className="font-bold text-slate-950">
                {draft.id
                  ? "Editar oferta"
                  : "Nueva oferta"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Los cambios quedarán registrados en el historial de auditoría.
              </p>
            </header>

            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-800">
                Producto

                <select
                  value={
                    draft.productKey
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event,
                  ) => {
                    const productKey =
                      event.target
                        .value as
                        DataraProductKey;

                    setDraft(
                      (
                        currentDraft,
                      ) => ({
                        ...currentDraft,
                        productKey,
                      }),
                    );

                    setSelectedProduct(
                      productKey,
                    );
                  }}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {Object.values(
                    DATARA_PRODUCTS,
                  ).map(
                    (
                      product,
                    ) => (
                      <option
                        key={
                          product.key
                        }
                        value={
                          product.key
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

              <label className="text-sm font-bold text-slate-800">
                Tipo

                <select
                  value={
                    draft.itemType
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        currentDraft,
                      ) => ({
                        ...currentDraft,
                        itemType:
                          event.target
                            .value as
                            CatalogDraft[
                              "itemType"
                            ],
                      }),
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="package">
                    Paquete
                  </option>

                  <option value="expansion">
                    Expansión
                  </option>

                  <option value="addon">
                    Adicional
                  </option>
                </select>
              </label>

              <label className="text-sm font-bold text-slate-800">
                Nombre

                <input
                  type="text"
                  required
                  maxLength={120}
                  value={
                    draft.name
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        currentDraft,
                      ) => ({
                        ...currentDraft,
                        name:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Ej. CRM Core"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-bold text-slate-800">
                Clave interna

                <input
                  type="text"
                  required
                  maxLength={80}
                  value={
                    draft.itemKey
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        currentDraft,
                      ) => ({
                        ...currentDraft,
                        itemKey:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Ej. core"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-bold text-slate-800 sm:col-span-2">
                Descripción

                <textarea
                  rows={3}
                  maxLength={1000}
                  value={
                    draft.description
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        currentDraft,
                      ) => ({
                        ...currentDraft,
                        description:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Describe el alcance comercial de esta oferta."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm font-bold text-slate-800">
                  Precio mensual

                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={
                      draft.monthlyPrice
                    }
                    disabled={
                      isSaving
                    }
                    onFocus={(
                      event,
                    ) =>
                      event.currentTarget
                        .select()
                    }
                    onChange={(
                      event,
                    ) =>
                      setDraft(
                        (
                          currentDraft,
                        ) => ({
                          ...currentDraft,
                          monthlyPrice:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    MXN por mes
                  </span>
                </label>

                <label className="text-sm font-bold text-slate-800">
                  Precio anual

                  <input
                    type="text"
                    readOnly
                    value={
                      annualBasePrice
                        .toFixed(2)
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 font-normal text-slate-700"
                  />

                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Mensual × 12
                  </span>
                </label>

                <label className="text-sm font-bold text-slate-800">
                  Descuento anual

                  <select
                    value={
                      draft
                        .annualDiscountPercent
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setDraft(
                        (
                          currentDraft,
                        ) => ({
                          ...currentDraft,
                          annualDiscountPercent:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {[
                      0,
                      5,
                      10,
                      15,
                      20,
                      25,
                      30,
                    ].map(
                      (
                        discount,
                      ) => (
                        <option
                          key={
                            discount
                          }
                          value={
                            discount
                          }
                        >
                          {
                            discount
                          }
                          %
                        </option>
                      ),
                    )}
                  </select>

                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Aplicado al pago anual
                  </span>
                </label>

                <label className="text-sm font-bold text-slate-800">
                  Anual con descuento

                  <input
                    type="text"
                    readOnly
                    value={
                      discountedAnnualPrice
                        .toFixed(2)
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 font-bold text-emerald-800"
                  />

                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    MXN por año
                  </span>
                </label>
              </div>
                <label className="text-sm font-bold text-slate-800">
                Usuarios incluidos

                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  onFocus={(
                    event,
                  ) =>
                    event.currentTarget
                      .select()
                  }
                  value={
                    draft.includedUsers
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        currentDraft,
                      ) => ({
                        ...currentDraft,
                        includedUsers:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-bold text-slate-800">
                Almacenamiento incluido (GB)

                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  onFocus={(
                    event,
                  ) =>
                    event.currentTarget
                      .select()
                  }
                  value={
                    draft.includedStorageGb
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        currentDraft,
                      ) => ({
                        ...currentDraft,
                        includedStorageGb:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-bold text-slate-800">
                Posición en el catálogo

                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  onFocus={(
                    event,
                  ) =>
                    event.currentTarget
                      .select()
                  }
                  value={
                    draft.sortOrder
                  }
                  disabled={
                    isSaving
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        currentDraft,
                      ) => ({
                        ...currentDraft,
                        sortOrder:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-bold text-slate-800">
                Moneda

                <input
                  type="text"
                  value="MXN"
                  disabled
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 font-normal text-slate-500"
                />
              </label>

              <section className="sm:col-span-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Módulos incluidos
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Agrega o retira grupos completos para conservar todos los módulos necesarios.
                  </p>
                </div>

                {draft.productKey ===
                "crm" ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-bold text-slate-800">
                          Grupos disponibles
                        </p>
                      </header>

                      <div className="min-h-64 space-y-3 p-4">
                        {availableModuleGroups.length ===
                        0 ? (
                          <p className="py-8 text-center text-sm text-slate-500">
                            Todos los grupos están incluidos.
                          </p>
                        ) : (
                          availableModuleGroups.map(
                            (
                              moduleGroup,
                            ) => (
                              <article
                                key={
                                  moduleGroup.key
                                }
                                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                              >
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900">
                                    {
                                      moduleGroup.name
                                    }
                                  </p>

                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {
                                      moduleGroup.description
                                    }
                                  </p>

                                  <p className="mt-2 text-xs font-semibold text-blue-700">
                                    {
                                      moduleGroup
                                        .moduleIds
                                        .length
                                    }{" "}
                                    módulos
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  title={`Incluir ${moduleGroup.name}`}
                                  disabled={
                                    isSaving
                                  }
                                  onClick={() =>
                                    includeModuleGroup(
                                      moduleGroup.moduleIds,
                                    )
                                  }
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  →
                                </button>
                              </article>
                            ),
                          )
                        )}
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-emerald-200">
                      <header className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-sm font-bold text-emerald-800">
                          Grupos incluidos
                        </p>
                      </header>

                      <div className="min-h-64 space-y-3 p-4">
                        {includedModuleGroups.length ===
                        0 ? (
                          <p className="py-8 text-center text-sm text-slate-500">
                            Todavía no hay grupos incluidos.
                          </p>
                        ) : (
                          includedModuleGroups.map(
                            (
                              moduleGroup,
                            ) => (
                              <article
                                key={
                                  moduleGroup.key
                                }
                                className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
                              >
                                <button
                                  type="button"
                                  title={`Retirar ${moduleGroup.name}`}
                                  disabled={
                                    isSaving
                                  }
                                  onClick={() =>
                                    removeModuleGroup(
                                      moduleGroup.moduleIds,
                                    )
                                  }
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-white text-lg font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  ←
                                </button>

                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900">
                                    {
                                      moduleGroup.name
                                    }
                                  </p>

                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {
                                      moduleGroup.description
                                    }
                                  </p>

                                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                                    {
                                      moduleGroup
                                        .moduleIds
                                        .length
                                    }{" "}
                                    módulos incluidos
                                  </p>
                                </div>
                              </article>
                            ),
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
                    El catálogo de módulos de este producto todavía no está configurado.
                  </div>
                )}
              </section>

              <section className="sm:col-span-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Beneficios incluidos
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Agrega o retira los beneficios que formarán parte de esta oferta.
                  </p>
                </div>

                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Disponibles
                    </p>

                    <div className="mt-3 space-y-2">
                      {availableBenefits.length >
                      0 ? (
                        availableBenefits.map(
                          (benefit) => (
                            <button
                              key={
                                benefit
                              }
                              type="button"
                              disabled={
                                isSaving
                              }
                              onClick={() =>
                                includeBenefit(
                                  benefit,
                                )
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <span>
                                {
                                  benefit
                                }
                              </span>

                              <span
                                aria-hidden="true"
                                className="shrink-0 text-lg"
                              >
                                →
                              </span>
                            </button>
                          ),
                        )
                      ) : (
                        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
                          Todos los beneficios están incluidos.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                      Incluidos
                    </p>

                    <div className="mt-3 space-y-2">
                      {includedBenefits.length >
                      0 ? (
                        includedBenefits.map(
                          (benefit) => (
                            <button
                              key={
                                benefit
                              }
                              type="button"
                              disabled={
                                isSaving
                              }
                              onClick={() =>
                                removeBenefit(
                                  benefit,
                                )
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <span
                                aria-hidden="true"
                                className="shrink-0 text-lg"
                              >
                                ←
                              </span>

                              <span className="flex-1">
                                {
                                  benefit
                                }
                              </span>
                            </button>
                          ),
                        )
                      ) : (
                        <p className="rounded-xl border border-dashed border-blue-300 px-4 py-5 text-center text-sm text-slate-500">
                          Aún no hay beneficios incluidos.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={
                      draft.required
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setDraft(
                        (
                          currentDraft,
                        ) => ({
                          ...currentDraft,
                          required:
                            event.target
                              .checked,
                        }),
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />

                  Obligatorio
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={
                      draft.recommended
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setDraft(
                        (
                          currentDraft,
                        ) => ({
                          ...currentDraft,
                          recommended:
                            event.target
                              .checked,
                        }),
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />

                  Recomendado
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={
                      draft.active
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setDraft(
                        (
                          currentDraft,
                        ) => ({
                          ...currentDraft,
                          active:
                            event.target
                              .checked,
                        }),
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />

                  Disponible
                </label>
              </div>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isSaving
                }
                onClick={
                  createNewItem
                }
              >
                Limpiar formulario
              </Button>

              <Button
                type="submit"
                disabled={
                  isSaving
                }
              >
                {isSaving
                  ? "Guardando..."
                  : draft.id
                    ? "Guardar cambios"
                    : "Crear oferta"}
              </Button>
            </footer>
          </form>
        </div>
      </div>
    </main>
  );
}