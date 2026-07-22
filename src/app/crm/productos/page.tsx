"use client";

import {
  useState,
} from "react";

import CRMDataTable, {
  type CRMRecord,
} from "@/components/crm/CRMDataTable";

import CRMRecordDrawer from "@/components/crm/CRMRecordDrawer";

import type {
  CRMFormValues,
} from "@/components/crm/DynamicForm";

import PageHeader from "@/components/shared/PageHeader";

import {
  useCRMConfig,
} from "@/hooks/useCRMConfig";

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

export default function ProductosPage() {
  const {
    getModule,
  } = useCRMConfig();

  const productsModule =
    getModule("products");

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
          <CRMDataTable
            key={tableVersion}
            module={productsModule}
            endpoint="/api/crm/products?includeInactive=true"
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
