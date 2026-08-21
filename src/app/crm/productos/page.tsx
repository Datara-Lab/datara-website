"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import CRMDataTable, {
  type CRMRecord,
} from "@/components/crm/CRMDataTable";

import CRMRecordDrawer from "@/components/crm/CRMRecordDrawer";

import ProductImagePanel from "@/components/crm/ProductImagePanel";

import type {
  CRMFormValues,
} from "@/components/crm/DynamicForm";

import PageHeader from "@/components/shared/PageHeader";

import {
  useCRMConfig,
} from "@/hooks/useCRMConfig";

import {
  useAuth,
} from "@/contexts/AuthContext";

type DrawerMode =
  | "view"
  | "edit"
  | "create";

type ProductWriteResponse = {
  success: boolean;
  message?: string;
  error?: string;

  data?: {
    id?: string;
  };
};

type ProductType = {
  id: string;
  key: string;
  name: string;
  inventoryTracked: boolean;
  technicalProfile:
    | string
    | null;
  active: boolean;
  sortOrder: number;
};

type ProductCategory = {
  id: string;
  productTypeId: string;
  productTypeName: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

type ProductTypesResponse = {
  success: boolean;
  data?: ProductType[];
  error?: string;
};

type ProductCategoriesResponse = {
  success: boolean;
  data?: ProductCategory[];
  error?: string;
};

export default function ProductosPage() {
  const {
    getModule,
  } = useCRMConfig();

  const {
    user,
  } = useAuth();

  const canAdministerCatalog =
    user?.role ===
      "owner" ||
    user?.role ===
      "admin";

  const baseProductsModule =
    getModule("products");

  const [
    productTypes,
    setProductTypes,
  ] = useState<
    ProductType[]
  >([]);

  const [
    categories,
    setCategories,
  ] = useState<
    ProductCategory[]
  >([]);

  const [
    categoriesError,
    setCategoriesError,
  ] = useState<
    string |
    null
  >(null);

  useEffect(() => {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(
        () => {
          void Promise.all([
            fetch(
              "/api/crm/product-types",
              {
                cache:
                  "no-store",
                signal:
                  controller.signal,
              },
            ),

            fetch(
              "/api/crm/product-categories",
              {
                cache:
                  "no-store",
                signal:
                  controller.signal,
              },
            ),
          ])
            .then(
              async ([
                typesResponse,
                categoriesResponse,
              ]) => {
                const typesResult =
                  (await typesResponse.json()) as
                    ProductTypesResponse;

                const categoriesResult =
                  (await categoriesResponse.json()) as
                    ProductCategoriesResponse;

                if (
                  !typesResponse.ok ||
                  !typesResult.success ||
                  !typesResult.data
                ) {
                  throw new Error(
                    typesResult.error ??
                      "No fue posible cargar los tipos del catálogo.",
                  );
                }

                if (
                  !categoriesResponse.ok ||
                  !categoriesResult.success ||
                  !categoriesResult.data
                ) {
                  throw new Error(
                    categoriesResult.error ??
                      "No fue posible cargar las categorías.",
                  );
                }

                setProductTypes(
                  typesResult.data,
                );

                setCategories(
                  categoriesResult.data,
                );

                setCategoriesError(
                  null,
                );
              },
            )
            .catch(
              (loadError) => {
                if (
                  loadError instanceof
                    DOMException &&
                  loadError.name ===
                    "AbortError"
                ) {
                  return;
                }

                setCategoriesError(
                  loadError instanceof
                    Error
                    ? loadError.message
                    : "No fue posible cargar la configuración del catálogo.",
                );
              },
            );
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );

      controller.abort();
    };
  }, []);

  const productsModule =
    useMemo(
      () => {
        if (
          !baseProductsModule
        ) {
          return undefined;
        }

        const typeOptions =
          productTypes.map(
            (productType) => ({
              label:
                productType.active
                  ? productType.name
                  : `${productType.name} · Inactivo`,

              value:
                productType.id,

              disabled:
                !productType.active,
            }),
          );

        const firstActiveType =
          productTypes.find(
            (productType) =>
              productType.active,
          );

        const optionsByType:
          Record<
            string,
            Array<{
              label: string;
              value: string;
              disabled?: boolean;
            }>
          > = {};

        for (
          const productType of
          productTypes
        ) {
          optionsByType[
            productType.id
          ] = [];
        }

        for (
          const category of
          categories
        ) {
          const typeCategories =
            optionsByType[
              category.productTypeId
            ];

          if (!typeCategories) {
            continue;
          }

          typeCategories.push({
            label:
              category.active
                ? category.name
                : `${category.name} · Inactiva`,

            value:
              category.name,

            disabled:
              !category.active,
          });
        }

        return {
          ...baseProductsModule,

          fields:
            baseProductsModule
              .fields
              .map((field) => {
                if (
                  field.key ===
                  "productTypeId"
                ) {
                  return {
                    ...field,

                    options:
                      typeOptions,

                    defaultValue:
                      firstActiveType
                        ?.id,
                  };
                }

                if (
                  field.key ===
                  "category"
                ) {
                  return {
                    ...field,

                    options: [],

                    optionsByFieldValue: {
                      fieldKey:
                        "productTypeId",

                      options:
                        optionsByType,
                    },
                  };
                }

                if (
                  field.key ===
                  "active" &&
                  !canAdministerCatalog
                ) {
                  return {
                    ...field,

                    showInForm:
                      false,
                  };
                }

                if (
                  field.technicalProfile
                ) {
                  const applicableTypeIds =
                    productTypes
                      .filter(
                        (productType) =>
                          productType
                            .technicalProfile ===
                          field
                            .technicalProfile,
                      )
                      .map(
                        (productType) =>
                          productType.id,
                      );

                  return {
                    ...field,

                    visibleWhen: {
                      fieldKey:
                        "productTypeId",

                      in:
                        applicableTypeIds,
                    },
                  };
                }

                return field;
              }),
        };
      },
      [
        baseProductsModule,
        categories,
        productTypes,
        canAdministerCatalog,
      ],
    );

  const [
    isDrawerOpen,
    setIsDrawerOpen,
  ] = useState(false);

  const [
    drawerMode,
    setDrawerMode,
  ] = useState<DrawerMode>("view");

  const [
    selectedRecord,
    setSelectedRecord,
  ] = useState<CRMRecord | null>(
    null,
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isStatusUpdating,
    setIsStatusUpdating,
  ] = useState(false);

  const [
    productStatus,
    setProductStatus,
  ] = useState<
    "active" |
    "inactive" |
    "all"
  >("active");

  const tableProductsModule =
    useMemo(
      () =>
        productsModule
          ? {
              ...productsModule,

              /*
               * Cada vista conserva sus propias
               * preferencias de columnas. Así,
               * Activos no elimina Estado de Todos.
               */
              id:
                `${productsModule.id}-${productStatus}`,

              fields:
                productsModule.fields.map(
                  (field) =>
                    field.key ===
                    "active"
                      ? {
                          ...field,

                          showInTable:
                            productStatus ===
                            "all",

                          /*
                           * CRMDataTable conserva preferencias
                           * de columnas. `hidden` evita que el
                           * estado reaparezca desde localStorage
                           * en las vistas donde es redundante.
                           */
                          hidden:
                            productStatus !==
                            "all",
                        }
                      : field,
                ),
            }
          : undefined,
      [
        productsModule,
        productStatus,
      ],
    );

  const [
    tableVersion,
    setTableVersion,
  ] = useState(0);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [
    submitError,
    setSubmitError,
  ] = useState<string | null>(null);

  function openCreateDrawer() {
    setSelectedRecord(null);
    setDrawerMode("create");
    setSubmitError(null);
    setSuccessMessage(null);
    setIsDrawerOpen(true);
  }

  function openViewDrawer(
    record: CRMRecord,
  ) {
    setSelectedRecord(record);
    setDrawerMode("view");
    setSubmitError(null);
    setIsDrawerOpen(true);
  }

  function openEditDrawer(
    record: CRMRecord,
  ) {
    setSelectedRecord(record);
    setDrawerMode("edit");
    setSubmitError(null);
    setSuccessMessage(null);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    if (isSubmitting) {
      return;
    }

    setIsDrawerOpen(false);
    setSubmitError(null);

    window.setTimeout(() => {
      setSelectedRecord(null);
      setDrawerMode("view");
    }, 200);
  }

  async function handleDrawerSubmit(
    values: CRMFormValues,
    mode: "create" | "edit",
    record?: CRMRecord | null,
  ) {
    if (
      mode === "edit" &&
      !record?.id
    ) {
      setSubmitError(
        "No fue posible identificar el producto.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSuccessMessage(null);

      const response = await fetch(
        "/api/crm/products",
        {
          method:
            mode === "edit"
              ? "PATCH"
              : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            mode === "edit"
              ? {
                  ...values,
                  id: record?.id,
                }
              : values,
          ),
        },
      );

      const payload =
        (await response.json()) as
          ProductWriteResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
            (
              mode === "edit"
                ? "No fue posible actualizar el producto."
                : "No fue posible crear el producto."
            ),
        );
      }

      setSuccessMessage(
        payload.message ??
          (
            mode === "edit"
              ? "El producto fue actualizado correctamente."
              : "El producto fue creado correctamente."
          ),
      );

      setIsDrawerOpen(false);
      setSelectedRecord(null);
      setDrawerMode("view");

      setTableVersion(
        (currentVersion) =>
          currentVersion + 1,
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el producto.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(
    record: CRMRecord,
  ) {
    if (!record.id) {
      setSubmitError(
        "No fue posible identificar el elemento.",
      );
      return;
    }

    const isCurrentlyActive =
      record.active !== false;

    if (
      isCurrentlyActive &&
      !window.confirm(
        "¿Deseas descontinuar este elemento? Dejará de aparecer en nuevas operaciones, pero conservará su historial.",
      )
    ) {
      return;
    }

    try {
      setIsStatusUpdating(true);
      setSubmitError(null);
      setSuccessMessage(null);

      const response =
        await fetch(
          "/api/crm/products",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...record,
                active:
                  !isCurrentlyActive,
              }),
          },
        );

      const payload =
        (await response.json()) as
          ProductWriteResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
            "No fue posible actualizar el estado del elemento.",
        );
      }

      setSuccessMessage(
        isCurrentlyActive
          ? "El elemento fue descontinuado correctamente."
          : "El elemento fue reactivado correctamente.",
      );

      setSelectedRecord(null);
      setDrawerMode("view");
      setIsDrawerOpen(false);

      setTableVersion(
        (current) =>
          current + 1,
      );
    } catch (statusError) {
      setSubmitError(
        statusError instanceof
          Error
          ? statusError.message
          : "No fue posible actualizar el estado del elemento.",
      );
    } finally {
      setIsStatusUpdating(false);
    }
  }

  if (!productsModule) {
    return (
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-amber-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
            Datara CRM
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Módulo no configurado
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-500">
            El módulo de productos no está
            habilitado para esta empresa.
          </p>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Comercial"
          title={
            productsModule.pluralLabel
          }
          description={
            productsModule.description ??
            "Administra el catálogo comercial de la empresa."
          }
          action={
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              Datos administrados por Datara
            </span>
          }
        />

        {categoriesError && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="font-semibold text-red-800">
              No fue posible cargar las categorías
            </p>

            <p className="mt-1 text-sm text-red-700">
              {categoriesError}
            </p>
          </section>
        )}

        {successMessage && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-emerald-800">
                  Operación completada
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  {successMessage}
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar mensaje"
                className="text-xl leading-none text-emerald-700 transition hover:text-emerald-950"
                onClick={() =>
                  setSuccessMessage(null)
                }
              >
                ×
              </button>
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4 inline-flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {[
              {
                value:
                  "active" as const,
                label:
                  "Activos",
              },
              {
                value:
                  "inactive" as const,
                label:
                  "Descontinuados",
              },
              {
                value:
                  "all" as const,
                label:
                  "Todos",
              },
            ].map(
              (option) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  className={[
                    "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition",
                    productStatus ===
                    option.value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                  onClick={() =>
                    setProductStatus(
                      option.value,
                    )
                  }
                >
                  {option.label}
                </button>
              ),
            )}
          </div>

          <CRMDataTable
            key={`${tableVersion}-${productStatus}`}
            module={
              tableProductsModule ??
              productsModule
            }
            endpoint={`/api/crm/products?status=${productStatus}`}
            createLabel={`Nuevo ${productsModule.singularLabel.toLowerCase()}`}
            searchPlaceholder={`Buscar ${productsModule.pluralLabel.toLowerCase()} por nombre, código o categoría...`}
            emptyTitle={`No hay ${productsModule.pluralLabel.toLowerCase()} registrados`}
            emptyDescription={`Crea el primer ${productsModule.singularLabel.toLowerCase()} para comenzar a administrar el catálogo.`}
            onCreate={openCreateDrawer}
            onView={openViewDrawer}
            onEdit={openEditDrawer}
          />
        </section>
      </div>

      <CRMRecordDrawer
        isOpen={isDrawerOpen}
        mode={drawerMode}
        module={productsModule}
        record={selectedRecord}
        isSubmitting={isSubmitting}
        contentBefore={
          selectedRecord?.id ? (
            <div className="space-y-4">
              <ProductImagePanel
              key={`${selectedRecord.id}-${String(
                selectedRecord.imageUrl ?? "",
              )}`}
              productId={selectedRecord.id}
              productName={
                typeof selectedRecord.name ===
                "string"
                  ? selectedRecord.name
                  : productsModule.singularLabel
              }
              imageUrl={
                typeof selectedRecord.imageUrl ===
                "string"
                  ? selectedRecord.imageUrl
                  : null
              }
              readOnly={
                drawerMode === "view"
              }
              onUpdated={(imageUrl) => {
                setSelectedRecord(
                  (current) =>
                    current
                      ? {
                          ...current,
                          imageUrl,
                          hasImage:
                            Boolean(imageUrl),
                        }
                      : current,
                );

                setTableVersion(
                  (current) =>
                    current + 1,
                );
              }}
            />

              {drawerMode ===
                "view" &&
                canAdministerCatalog && (
                <section
                  className={[
                    "rounded-2xl border px-5 py-4",
                    selectedRecord.active !==
                    false
                      ? "border-amber-200 bg-amber-50"
                      : "border-emerald-200 bg-emerald-50",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">
                        {selectedRecord.active !==
                        false
                          ? "Elemento activo"
                          : "Elemento descontinuado"}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {selectedRecord.active !==
                        false
                          ? "Puedes descontinuarlo sin perder su historial."
                          : "Puedes reactivarlo para utilizarlo nuevamente."}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        isStatusUpdating
                      }
                      className={[
                        "rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50",
                        selectedRecord.active !==
                        false
                          ? "bg-amber-600 text-white hover:bg-amber-700"
                          : "bg-emerald-600 text-white hover:bg-emerald-700",
                      ].join(" ")}
                      onClick={() =>
                        void handleStatusChange(
                          selectedRecord,
                        )
                      }
                    >
                      {isStatusUpdating
                        ? "Actualizando..."
                        : selectedRecord.active !==
                            false
                          ? "Descontinuar"
                          : "Reactivar"}
                    </button>
                  </div>
                </section>
              )}
            </div>
          ) : drawerMode === "create" ? (
            <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              Guarda primero el elemento para poder cargar su imagen.
            </section>
          ) : null
        }
        onClose={closeDrawer}
        onEdit={openEditDrawer}
        onSubmit={
          handleDrawerSubmit
        }
      />

      {submitError && isDrawerOpen && (
        <div className="fixed bottom-6 left-1/2 z-[120] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shadow-xl">
          <p className="font-semibold text-red-800">
            No fue posible guardar
          </p>

          <p className="mt-1 text-sm leading-6 text-red-700">
            {submitError}
          </p>
        </div>
      )}
    </>
  );
}
