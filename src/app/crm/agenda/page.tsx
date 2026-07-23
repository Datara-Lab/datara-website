"use client";

import ActivitiesWorkspace from "@/components/crm/ActivitiesWorkspace";
import PageHeader from "@/components/shared/PageHeader";
import { useCRMConfig } from "@/hooks/useCRMConfig";

export default function AgendaPage() {
  const {
    getModule,
  } = useCRMConfig();

  const activitiesModule =
    getModule("activities");

  if (!activitiesModule) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        El módulo de actividades no está configurado.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operación comercial"
        title="Agenda"
        description={
          activitiesModule.description ??
          "Administra tareas, llamadas y reuniones desde una agenda central."
        }
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

            Agenda administrada por Datara
          </span>
        }
      />

      <ActivitiesWorkspace />
    </div>
  );
}
