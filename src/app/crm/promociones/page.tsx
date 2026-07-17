"use client";

import { useState } from "react";

import CRMDataTable, {
  type CRMRecord,
} from "@/components/crm/CRMDataTable";
import CRMRecordDrawer from "@/components/crm/CRMRecordDrawer";
import PageHeader from "@/components/shared/PageHeader";
import { useCRMConfig } from "@/hooks/useCRMConfig";

type DrawerMode = "view" | "edit" | "create";

export default function PromocionesPage() {
  const { getModule } = useCRMConfig();

  const promotionsModule = getModule("promotions");

  const [isDrawerOpen, setIsDrawerOpen] =
    useState(false);

  const [drawerMode, setDrawerMode] =
    useState<DrawerMode>("view");

  const [selectedRecord, setSelectedRecord] =
    useState<CRMRecord | null>(null);

  function openCreateDrawer() {
    /*
     * Limpiamos cualquier registro seleccionado
     * para que el formulario inicie vacío.
     */
    setSelectedRecord(null);
    setDrawerMode("create");
    setIsDrawerOpen(true);
  }

  function openViewDrawer(record: CRMRecord) {
    setSelectedRecord(record);
    setDrawerMode("view");
    setIsDrawerOpen(true);
  }

  function openEditDrawer(record: CRMRecord) {
    setSelectedRecord(record);
    setDrawerMode("edit");
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);

    /*
     * Limpiamos el registro después de cerrar
     * para evitar reutilizar datos accidentalmente.
     */
    window.setTimeout(() => {
      setSelectedRecord(null);
      setDrawerMode("view");
    }, 200);
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
            El módulo de promociones no está habilitado para esta empresa.
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
          title={promotionsModule.pluralLabel}
          description={
            promotionsModule.description ??
            "Administra las promociones comerciales disponibles para tus clientes."
          }
          action={
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              Conectado con Zoho CRM
            </span>
          }
        />

        <section className="mt-8">
          <CRMDataTable
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
        onClose={closeDrawer}
        onEdit={openEditDrawer}
      />
    </>
  );
}