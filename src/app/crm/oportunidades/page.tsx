"use client";

import {
  useEffect,
  useState,
} from "react";

import CRMDataTable, {
  type CRMRecord,
} from "@/components/crm/CRMDataTable";
import DealFormDrawer from "@/components/crm/DealFormDrawer";
import CRMRecordDrawer from "@/components/crm/CRMRecordDrawer";
import PageHeader from "@/components/shared/PageHeader";
import { useCRMConfig } from "@/hooks/useCRMConfig";
import type {
  CRMFieldOption,
} from "@/types/crm-config";

type DrawerMode =
  | "view"
  | "edit"
  | "create";

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

type LeadApiRecord = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type LeadRecord = {
  id: string;
  displayName: string;
};

type CatalogResponse<T> = {
  success: boolean;
  data?: T[];
  error?: string;
};

type DealWriteResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export default function OportunidadesPage() {
  const {
    getModule,
  } = useCRMConfig();

  const dealsModule =
    getModule("deals");

  const [
    products,
    setProducts,
  ] = useState<ProductRecord[]>([]);

  const [
    customers,
    setCustomers,
  ] = useState<CustomerRecord[]>([]);

  const [
    leads,
    setLeads,
  ] = useState<LeadRecord[]>([]);

  const [
    members,
    setMembers,
  ] = useState<CRMFieldOption[]>([]);

  const [
    catalogsError,
    setCatalogsError,
  ] = useState<string | null>(null);

  const [
    isLoadingCatalogs,
    setIsLoadingCatalogs,
  ] = useState(true);

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

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadCatalogs() {
      try {
        setIsLoadingCatalogs(true);
        setCatalogsError(null);

        const [
          productsResponse,
          customersResponse,
          leadsResponse,
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
            "/api/crm/customers",
            {
              cache: "no-store",
              signal:
                controller.signal,
            },
          ),

          fetch(
            "/api/crm/leads",
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
          (await productsResponse.json()) as
            CatalogResponse<ProductRecord>;

        const customersPayload =
          (await customersResponse.json()) as
            CatalogResponse<CustomerRecord>;

        const leadsPayload =
          (await leadsResponse.json()) as
            CatalogResponse<LeadApiRecord>;

        const membersPayload =
          (await membersResponse.json()) as
            CatalogResponse<CRMFieldOption>;

        if (
          !productsResponse.ok ||
          !productsPayload.success
        ) {
          throw new Error(
            productsPayload.error ??
              "No fue posible cargar los productos.",
          );
        }

        if (
          !customersResponse.ok ||
          !customersPayload.success
        ) {
          throw new Error(
            customersPayload.error ??
              "No fue posible cargar los clientes.",
          );
        }

        if (
          !leadsResponse.ok ||
          !leadsPayload.success
        ) {
          throw new Error(
            leadsPayload.error ??
              "No fue posible cargar los prospectos.",
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

        setProducts(
          productsPayload.data ?? [],
        );

        setCustomers(
          customersPayload.data ?? [],
        );

        setLeads(
          (leadsPayload.data ?? []).map(
            (lead) => {
              const fullName = [
                lead.firstName,
                lead.lastName,
              ]
                .filter(Boolean)
                .join(" ")
                .trim();

              return {
                id: lead.id,
                displayName:
                  fullName ||
                  lead.email ||
                  "Prospecto",
              };
            },
          ),
        );

        setMembers(
          membersPayload.data ?? [],
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setCatalogsError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar los catálogos de la oportunidad.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCatalogs(false);
        }
      }
    }

    void loadCatalogs();

    return () => {
      controller.abort();
    };
  }, []);

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

  async function handleDealSubmit(
    payload: unknown,
    mode: "create" | "edit",
    record?: CRMRecord | null,
  ) {
    if (
      mode === "edit" &&
      !record?.id
    ) {
      setSubmitError(
        "No fue posible identificar la oportunidad.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSuccessMessage(null);

      const response = await fetch(
        "/api/crm/deals",
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
                  ...(payload as object),
                  id: record?.id,
                }
              : payload,
          ),
        },
      );

      const result =
        (await response.json()) as
          DealWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            (mode === "edit"
              ? "No fue posible actualizar la oportunidad."
              : "No fue posible crear la oportunidad."),
        );
      }

      setSuccessMessage(
        result.message ??
          (mode === "edit"
            ? "La oportunidad fue actualizada correctamente."
            : "La oportunidad fue creada correctamente."),
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
          : "No fue posible guardar la oportunidad.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!dealsModule) {
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
            El módulo de oportunidades no está habilitado para esta empresa.
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
            dealsModule.pluralLabel
          }
          description={
            dealsModule.description ??
            "Administra productos, promociones y condiciones de cada oportunidad comercial."
          }
          action={
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              Datos administrados por Datara
            </span>
          }
        />

        {catalogsError && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="font-semibold text-amber-800">
              Algunos catálogos no están disponibles
            </p>

            <p className="mt-1 text-sm text-amber-700">
              {catalogsError}
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
            module={dealsModule}
            endpoint="/api/crm/deals"
            createLabel={`Nueva ${dealsModule.singularLabel.toLowerCase()}`}
            searchPlaceholder="Buscar por oportunidad, cliente, etapa, responsable o producto..."
            emptyTitle={`No hay ${dealsModule.pluralLabel.toLowerCase()} registradas`}
            emptyDescription={`Registra la primera ${dealsModule.singularLabel.toLowerCase()} para comenzar el seguimiento comercial.`}
            onCreate={
              isLoadingCatalogs
                ? undefined
                : openCreateDrawer
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

      {drawerMode === "view" && (
        <CRMRecordDrawer
          isOpen={isDrawerOpen}
          mode="view"
          module={dealsModule}
          record={selectedRecord}
          isSubmitting={
            isSubmitting
          }
          onClose={closeDrawer}
          onEdit={
            openEditDrawer
          }
        />
      )}

      {drawerMode !== "view" && (
        <DealFormDrawer
          isOpen={isDrawerOpen}
          mode={drawerMode}
          module={dealsModule}
          record={selectedRecord}
          products={products}
          customers={customers}
          leads={leads}
          members={members}
          isSubmitting={
            isSubmitting
          }
          onClose={closeDrawer}
          onSubmit={
            handleDealSubmit
          }
        />
      )}

      {submitError &&
        isDrawerOpen && (
          <div className="fixed bottom-6 left-1/2 z-[140] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shadow-xl">
            <p className="font-semibold text-red-800">
              No fue posible guardar la oportunidad
            </p>

            <p className="mt-1 text-sm leading-6 text-red-700">
              {submitError}
            </p>
          </div>
        )}
    </>
  );
}