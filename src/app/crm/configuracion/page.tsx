"use client";

import { useState } from "react";

import ImageUploader from "@/components/upload/ImageUploader";

type UploadResponse = {
  success: boolean;
  error?: string;
  data?: {
    objectKey: string;
    contentUrl: string;
  };
};

export default function ConfiguracionPage() {
  const [companyLogo, setCompanyLogo] =
    useState<File | null>(null);

  const [savedLogoUrl, setSavedLogoUrl] =
    useState<string | null>(
      "/api/settings/company-logo/content",
    );

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  async function handleSaveLogo() {
    if (!companyLogo) {
      setMessage(
        "Selecciona una imagen antes de guardar.",
      );
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", companyLogo);

      const response = await fetch(
        "/api/settings/company-logo",
        {
          method: "POST",
          body: formData,
        },
      );

      const result =
        (await response.json()) as UploadResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            "No fue posible guardar el logo.",
        );
      }

      setSavedLogoUrl(
        `${
          result.data?.contentUrl ??
          "/api/settings/company-logo/content"
        }?v=${Date.now()}`,
      );

      setCompanyLogo(null);
      setMessage(
        "El logo se guardó correctamente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el logo.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLogo() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/settings/company-logo",
        {
          method: "DELETE",
        },
      );

      const result =
        (await response.json()) as UploadResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            "No fue posible eliminar el logo.",
        );
      }

      setCompanyLogo(null);
      setSavedLogoUrl(null);
      setMessage(
        "El logo se eliminó correctamente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible eliminar el logo.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Datara CRM
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Configuración
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Administra todos los aspectos de tu empresa y de tu espacio de trabajo.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          <a
            href="/crm/configuracion/menu"
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-black text-slate-950">
              🧭 Menú del CRM
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Define el orden en que los módulos aparecen en la navegación para los usuarios de tu empresa.
            </p>
          </a>

          <a
            href="/crm/configuracion/catalogo"
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-black text-slate-950">
              🗂️ Categorías del catálogo
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Administra las categorías disponibles para modelos, productos y servicios.
            </p>
          </a>

          <a
            href="/crm/configuracion/reservas"
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-black text-slate-950">
              ⏱️ Política de reservas
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Configura los plazos de vencimiento, extensiones y liberación automática del inventario reservado.
            </p>
          </a>

        </div>

      </div>
    </main>
  );
}