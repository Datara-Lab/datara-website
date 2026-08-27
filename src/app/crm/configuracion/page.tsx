"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ConfiguracionPage() {
  const [canManageImports, setCanManageImports] =
    useState(false);

  useEffect(() => {
    void fetch(
      "/api/crm/imports",
      {
        cache: "no-store",
      },
    ).then((response) => {
      setCanManageImports(
        response.ok,
      );
    });
  }, []);

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

          <Link
            href="/crm/configuracion/menu"
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-black text-slate-950">
              🧭 Menú del CRM
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Define el orden en que los módulos aparecen en la navegación para los usuarios de tu empresa.
            </p>
          </Link>

          <Link
            href="/crm/configuracion/asistente"
            className="rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-black text-slate-950">
              🤖 Dara e inteligencia artificial
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Controla el asistente interno, el chatbot público y el consumo mensual compartido de IA.
            </p>
          </Link>

          <Link
            href="/crm/configuracion/integraciones"
            className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-white via-blue-50 to-fuchsia-50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-black text-slate-950">
              🌐 Facebook e Instagram
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Prepara las cuentas de Meta que se conectarán con Datara para captar prospectos y conversaciones.
            </p>
          </Link>

          <Link
            href="/crm/configuracion/catalogo"
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-black text-slate-950">
              🗂️ Categorías del catálogo
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Administra las categorías disponibles para modelos, productos y servicios.
            </p>
          </Link>

          <Link
            href="/crm/configuracion/reservas"
            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-xl font-black text-slate-950">
              ⏱️ Política de reservas
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Configura los plazos de vencimiento, extensiones y liberación automática del inventario reservado.
            </p>
          </Link>

          {canManageImports && (
            <Link
              href="/crm/configuracion/carga"
              className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-white to-cyan-50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h2 className="text-xl font-black text-slate-950">
                📥 Centro de carga
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Importa prospectos, clientes y catálogo desde Excel o CSV con validación previa.
              </p>
            </Link>
          )}

        </div>

      </div>
    </main>
  );
}
