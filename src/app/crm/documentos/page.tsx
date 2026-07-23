"use client";

import DocumentsWorkspace from "@/components/crm/DocumentsWorkspace";
import PageHeader from "@/components/shared/PageHeader";
import { useCRMConfig } from "@/hooks/useCRMConfig";

export default function DocumentosPage() {
  const {
    getModule,
  } = useCRMConfig();

  const documentsModule =
    getModule("documents");

  if (!documentsModule) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        El módulo de documentos no está configurado.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operación comercial"
        title={
          documentsModule.pluralLabel
        }
        description={
          documentsModule.description ??
          "Administra documentos relacionados con la operación comercial."
        }
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

            Archivos protegidos por Datara
          </span>
        }
      />

      <DocumentsWorkspace />
    </div>
  );
}
