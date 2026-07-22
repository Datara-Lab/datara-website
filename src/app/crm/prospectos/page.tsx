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
import type {
  CRMFieldOption,
} from "@/types/crm-config";

type DrawerMode =
  | "view"
  | "edit"
  | "create";

type OptionsResponse = {
  success: boolean;
  data?: CRMFieldOption[];
  error?: string;
};

type LeadWriteResponse = {
  success: boolean;
  message?: string;
  error?: string;

  data?: {
    id?: string;
    createdTime?: string | null;
    modifiedTime?: string | null;
  };
};

export default function ProspectosPage() {
  const {
    getModule,
  } = useCRMConfig();

  const configuredLeadsModule =
    getModule("leads");

  const [
    productOptions,
    setProductOptions,
  ] = useState<CRMFieldOption[]>([]);

  const [
    memberOptions,
    setMemberOptions,
  ] = useState<CRMFieldOption[]>([]);

  const [
    optionsError,
    setOptionsError,
  ] = useState<string | null>(null);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadOptions() {
      try {
        setOptionsError(null);

        const [
          productsResponse,
          membersResponse,
        ] = await Promise.all([
          fetch(
            "/api/crm/products",
            {
              cache: "no-store",
              signal:
                controller.signal,
            },
          ),

          fetch(
            "/api/crm/members/options",
            {
              cache: "no-store",
              signal:
                controller.signal,
            },
          ),
        ]);

        const productsPayload =
          (await productsResponse.json()) as OptionsResponse;

        const membersPayload =
          (await membersResponse.json()) as OptionsResponse;

        if (
          !productsResponse.ok ||
          !productsPayload.success
        ) {
          throw new Error(
            productsPayload.error ??
              "No fue posible cargar el catálogo de productos.",
          );
        }

        if (
          !membersResponse.ok ||
          !membersPayload.success
        ) {
          throw new Error(
            membersPayload.error ??
              "No fue posible cargar los responsables.",
          );
        }

        setProductOptions(
          productsPayload.data ?? [],
        );

        setMemberOptions(
          membersPayload.data ?? [],
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setOptionsError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar las opciones del formulario.",
        );
      }
    }

    void loadOptions();

    return () => {
      controller.abort();
    };
  }, []);

  const leadsModule =
    useMemo(() => {
      if (!configuredLeadsModule) {
        return undefined;
      }

      return {
        ...configuredLeadsModule,

        fields:
          configuredLeadsModule.fields.map(
            (field) => {
              if (
                field.key ===
                "productId"
              ) {
                return {
                  ...field,
                  options:
                    productOptions,
                };
              }

              if (
                field.key ===
                "ownerClerkUserId"
              ) {
                return {
                  ...field,
                  options:
                    memberOptions,
                };
              }

              return field;
            },
          ),
      };
    }, [
      configuredLeadsModule,
      productOptions,
      memberOptions,
    ]);

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
  ] = useState<string | null>(
    null,
  );

  const [
    submitError,
    setSubmitError,
  ] = useState<string | null>(
    null,
  );

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
        "No fue posible identificar el prospecto.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSuccessMessage(null);

      const response = await fetch(
        "/api/crm/leads",
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
        (await response.json()) as LeadWriteResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
            (mode === "edit"
              ? "No fue posible actualizar el prospecto."
              : "No fue posible crear el prospecto."),
        );
      }

      setSuccessMessage(
        payload.message ??
          (mode === "edit"
            ? "El prospecto fue actualizado correctamente."
            : "El prospecto fue creado correctamente."),
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
          : "No fue posible guardar el prospecto.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!leadsModule) {
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
            El módulo de prospectos no está habilitado para esta empresa.
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
            leadsModule.pluralLabel
          }
          description={
            leadsModule.description ??
            "Registra y da seguimiento a los prospectos de tu empresa."
          }
          action={
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              Datos administrados por Datara
            </span>
          }
        />

        {optionsError && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="font-semibold text-amber-800">
              Algunas opciones no están disponibles
            </p>

            <p className="mt-1 text-sm text-amber-700">
              {optionsError}
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

        {submitError &&
          !isDrawerOpen && (
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
            module={leadsModule}
            endpoint="/api/crm/leads"
            createLabel={`Nuevo ${leadsModule.singularLabel.toLowerCase()}`}
            searchPlaceholder="Buscar por nombre, correo, teléfono, estado u origen..."
            emptyTitle={`No hay ${leadsModule.pluralLabel.toLowerCase()} registrados`}
            emptyDescription={`Registra el primer ${leadsModule.singularLabel.toLowerCase()} para comenzar a dar seguimiento comercial.`}
            onCreate={
              openCreateDrawer
            }
            onView={
              openViewDrawer
            }
            onEdit={
              openEditDrawer
            }
          />
        </section>
      </div>

      <CRMRecordDrawer
        isOpen={isDrawerOpen}
        mode={drawerMode}
        module={leadsModule}
        record={selectedRecord}
        isSubmitting={
          isSubmitting
        }
        onClose={closeDrawer}
        onEdit={
          openEditDrawer
        }
        onSubmit={
          handleDrawerSubmit
        }
      />

      {submitError &&
        isDrawerOpen && (
          <div className="fixed bottom-6 left-1/2 z-[120] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shadow-xl">
            <p className="font-semibold text-red-800">
              No fue posible guardar el prospecto
            </p>

            <p className="mt-1 text-sm leading-6 text-red-700">
              {submitError}
            </p>
          </div>
        )}
    </>
  );
}