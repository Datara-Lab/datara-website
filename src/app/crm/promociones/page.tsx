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
import type { CRMFormValues } from "@/components/crm/DynamicForm";
import PageHeader from "@/components/shared/PageHeader";
import { useCRMConfig } from "@/hooks/useCRMConfig";

type DrawerMode =
  | "view"
  | "edit"
  | "create";

type PromotionWriteResponse = {
  success: boolean;

  message?: string;
  error?: string;

  data?: {
    id?: string;
    createdTime?: string | null;
  };
};

type ProductOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type ProductsResponse = {
  success: boolean;
  data?: ProductOption[];
  error?: string;
};

export default function PromocionesPage() {
  const { getModule } = useCRMConfig();

  const configuredPromotionsModule =
    getModule("promotions");

  const [productOptions, setProductOptions] =
    useState<ProductOption[]>([]);

  const [productsError, setProductsError] =
    useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        setProductsError(null);

        const response = await fetch(
          "/api/crm/products?includeInactive=true",
          {
            signal: controller.signal,
          },
        );

        const payload =
          (await response.json()) as ProductsResponse;

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.error ??
              "No fue posible cargar el catálogo de productos.",
          );
        }

        setProductOptions(payload.data ?? []);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setProductsError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el catálogo de productos.",
        );
      }
    }

    void loadProducts();

    return () => controller.abort();
  }, []);

  const promotionsModule = useMemo(() => {
    if (!configuredPromotionsModule) {
      return undefined;
    }

    return {
      ...configuredPromotionsModule,
      fields: configuredPromotionsModule.fields.map(
        (field) =>
          field.key === "applicableProducts"
            ? {
                ...field,
                options: productOptions,
                description: productsError
                  ? productsError
                  : field.description,
              }
            : field,
      ),
    };
  }, [
    configuredPromotionsModule,
    productOptions,
    productsError,
  ]);

  const [isDrawerOpen, setIsDrawerOpen] =
    useState(false);

  const [drawerMode, setDrawerMode] =
    useState<DrawerMode>("view");

  const [selectedRecord, setSelectedRecord] =
    useState<CRMRecord | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  /*
   * Al incrementar esta llave,
   * React vuelve a montar la tabla
   * y consulta nuevamente PostgreSQL.
   */
  const [tableVersion, setTableVersion] =
    useState(0);

  /*
useEffect(() => {
  const intervalId = window.setInterval(() => {
    if (!isDrawerOpen && !isSubmitting) {
      setTableVersion(
        (currentVersion) => currentVersion + 1,
      );
    }
  }, 15 * 60 * 1000);

  return () => {
    window.clearInterval(intervalId);
  };
}, [isDrawerOpen, isSubmitting]);
*/

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

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
    if (mode === "edit" && !record?.id) {
      setSubmitError(
        "No fue posible identificar la promoción.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSuccessMessage(null);

      const response = await fetch(
        "/api/crm/promotions",
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
        (await response.json()) as PromotionWriteResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
            (mode === "edit"
              ? "No fue posible actualizar la promoción."
              : "No fue posible crear la promoción."),
        );
      }

      setSuccessMessage(
        payload.message ??
          (mode === "edit"
            ? "La promoción fue actualizada correctamente."
            : "La promoción fue creada correctamente."),
      );

      /*
       * Cerramos el formulario después
       * de que PostgreSQL confirmó la creación.
       */
      setIsDrawerOpen(false);

      setSelectedRecord(null);
      setDrawerMode("view");

      /*
       * Forzamos una nueva consulta GET
       * para mostrar el registro creado.
       */
      setTableVersion(
        (currentVersion) =>
          currentVersion + 1,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : mode === "edit"
            ? "No fue posible actualizar la promoción."
            : "No fue posible crear la promoción.";

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!promotionsModule) {
    return (
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-amber-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <span className="text-2xl font-black text-amber-700">
              D
            </span>
          </div>

          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
            Datara CRM
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Módulo no configurado
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">
            El módulo de promociones no está
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
          eyebrow="Operación comercial"
          title={
            promotionsModule.pluralLabel
          }
          description={
            promotionsModule.description ??
            "Administra las promociones comerciales disponibles para tus clientes."
          }
          action={
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              Datos administrados por Datara
            </span>
          }
        />

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

        {submitError && !isDrawerOpen && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="font-semibold text-red-800">
              No fue posible guardar
            </p>

            <p className="mt-1 text-sm text-red-700">
              {submitError}
            </p>
          </section>
        )}

        <section className="mt-8">
          <CRMDataTable
            key={tableVersion}
            module={promotionsModule}
            endpoint="/api/crm/promotions"
            createLabel="Nueva promoción"
            searchPlaceholder="Buscar por nombre, estado, beneficio o canal..."
            emptyTitle="No hay promociones registradas"
            emptyDescription="Crea la primera promoción para comenzar a administrar los beneficios comerciales disponibles."
            onCreate={openCreateDrawer}
            onView={openViewDrawer}
            onEdit={openEditDrawer}
          />
        </section>
      </div>

      <CRMRecordDrawer
        isOpen={isDrawerOpen}
        mode={drawerMode}
        module={promotionsModule}
        record={selectedRecord}
        isSubmitting={isSubmitting}
        onClose={closeDrawer}
        onEdit={openEditDrawer}
        onSubmit={handleDrawerSubmit}
      />

      {submitError && isDrawerOpen && (
        <div className="fixed bottom-6 left-1/2 z-[120] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shadow-xl">
          <p className="font-semibold text-red-800">
            No fue posible guardar la
            promoción
          </p>

          <p className="mt-1 text-sm leading-6 text-red-700">
            {submitError}
          </p>
        </div>
      )}
    </>
  );
}
