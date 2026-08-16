"use client";

import QuotesWorkspace from "@/components/crm/QuotesWorkspace";
import PageHeader from "@/components/shared/PageHeader";
import { useCRMConfig } from "@/hooks/useCRMConfig";

export default function CotizacionesPage() {
  const { getModule } =
    useCRMConfig();

  const quotesModule =
    getModule("quotes");

  if (!quotesModule) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        El módulo de cotizaciones no está configurado.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operación comercial"
        title={
          quotesModule.pluralLabel
        }
        description={
          quotesModule.description ??
          "Crea y administra propuestas económicas para tus clientes."
        }
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

            Cotizaciones administradas por Datara
          </span>
        }
      />

      <QuotesWorkspace />
    </div>
  );
}
