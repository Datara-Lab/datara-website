"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Summary = { branch: string; timezone: string; updatedAt: string; sections: Array<{
  key: string; title: string; description: string; href: string; count: number;
}> };

const highlights = [
  { key: "daycare", label: "En guardería", caption: "Mascotas presentes", color: "from-cyan-100 via-sky-50 to-white", glow: "bg-cyan-300", ink: "text-cyan-700", symbol: "☀" },
  { key: "boarding", label: "En pensión", caption: "Estancias abiertas", color: "from-indigo-100 via-violet-50 to-white", glow: "bg-violet-300", ink: "text-indigo-700", symbol: "☾" },
  { key: "unpaid", label: "Por cobrar", caption: "Órdenes con saldo pendiente", color: "from-amber-100 via-orange-50 to-white", glow: "bg-amber-300", ink: "text-amber-700", symbol: "$" },
];
const groups = [
  { title: "Grooming", subtitle: "Trabajo en curso", accent: "bg-cyan-500", tint: "bg-cyan-50 text-cyan-700", keys: ["grooming-pending", "grooming-working", "grooming-ready"], labels: ["Pendientes", "En proceso", "Listas para entregar"] },
  { title: "Agenda", subtitle: "Próximos 7 días", accent: "bg-indigo-500", tint: "bg-indigo-50 text-indigo-700", keys: ["arrivals", "appointments"], labels: ["Llegadas previstas", "Citas de grooming"] },
  { title: "Veterinaria", subtitle: "Seguimiento clínico", accent: "bg-emerald-500", tint: "bg-emerald-50 text-emerald-700", keys: ["veterinary-today", "veterinary-followups", "veterinary-vaccines"], labels: ["Consultas de hoy", "Revisiones próximas", "Próximas vacunas"] },
  { title: "Cartillas", subtitle: "Control de vigencias", accent: "bg-rose-400", tint: "bg-rose-50 text-rose-700", keys: ["vaccination-expiring", "vaccination-expired", "vaccination-review"], labels: ["Vencen en 7 días", "Vencidas", "Por completar"] },
  { title: "Paquetes", subtitle: "Control de saldos y vigencias", accent: "bg-amber-500", tint: "bg-amber-50 text-amber-700", keys: ["packages-low", "packages-expiring"], labels: ["Por agotarse", "Por vencer"] },
  { title: "Inventarios", subtitle: "Control de existencias", accent: "bg-blue-500", tint: "bg-blue-50 text-blue-700", keys: ["inventory-low-stock", "inventory-out-of-stock", "inventory-overstock", ], labels: ["Stock bajo", "Agotado", "Sobre existencia",] },
];

export default function PetsSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/crm/pets/summary", { cache: "no-store", signal: controller.signal });
        const result = await response.json() as { success: boolean; data?: Summary; error?: string };
        if (!response.ok || !result.success || !result.data) throw new Error(result.error || "No fue posible cargar el resumen.");
        if (!controller.signal.aborted) { setData(result.data); setError(null); }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No fue posible cargar el resumen.");
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [revision]);
  const find = (key: string) => data?.sections.find(section => section.key === key);
  return <main className="relative isolate space-y-3 pb-2">
    <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 -z-10 h-64 w-64 rounded-full bg-cyan-100/60 blur-3xl" />
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-600">
          Datara Pets · Resumen
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Todo bajo control.
          </h1>
          <p className="text-xs text-slate-500">
            {data ? `${data.branch} · Datos de la sucursal activa` : "Consultando la sucursal activa…"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setRevision(value => value + 1)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
      >
        Actualizar
      </button>
    </header>
    {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}{data && " Los datos mostrados corresponden a la última actualización correcta."}</div>}
    {!data && !error && <p role="status" className="py-10 text-sm text-slate-500">Cargando presencia, servicios y pendientes…</p>}
    {data && <>
      {!data.sections.length && <p className="rounded-2xl border border-slate-200 p-6 text-slate-600">No tienes módulos operativos autorizados para mostrar en este resumen.</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{highlights.map(card => {
        const section = find(card.key);
        if (!section) return null;
        return <Link key={card.key} href={section.href} title={section.description} className={`group relative overflow-hidden rounded-2xl border border-white bg-gradient-to-br ${card.color} p-3.5 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600`}>
          <div aria-hidden="true" className={`absolute -right-8 -top-10 h-28 w-28 rounded-full ${card.glow} opacity-30 blur-2xl`} />
          <div className="relative flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">{card.label}</h2><span aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-base ${card.ink}`}>{card.symbol}</span></div>
          <p className="relative mt-1 text-4xl font-semibold tracking-tight text-slate-950 tabular-nums">{section.count}</p>
          <div className="relative mt-1.5 flex items-center justify-between"><p className="text-[11px] text-slate-600">{card.caption}</p><span aria-hidden="true" className={`${card.ink} transition group-hover:translate-x-1`}>↗</span></div>
        </Link>;
      })}</div>
      <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">{groups.map(group => {
        const available = group.keys.flatMap((key, index) => { const section = find(key); return section ? [{ section, label: group.labels[index] }] : []; });
        if (!available.length) return null;
        return <section key={group.title} className="relative flex h-[170px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_3px_16px_-10px_rgba(15,23,42,0.2)]">
          <div aria-hidden="true" className={`absolute inset-x-8 top-0 h-px ${group.accent}`} />
          <div className="mb-1.5 flex items-center gap-2.5"><span aria-hidden="true" className={`h-6 w-1 rounded-full ${group.accent}`} /><div><h2 className="text-sm font-semibold text-slate-950">{group.title}</h2><p className="mt-0.5 text-[10px] text-slate-500">{group.subtitle}</p></div></div>
          <div className="flex flex-1 flex-col justify-center gap-0.5 pb-2">{available.map(({ section, label }) => <Link key={section.key} href={section.href} title={section.description} className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
            <span className="text-[13px] text-slate-600 group-hover:text-slate-950">{label}</span>
            <span className="flex items-center gap-1.5"><span className={`min-w-8 rounded-lg px-1.5 py-0.5 text-center text-base font-semibold tabular-nums ${section.count > 0 ? group.tint : "bg-slate-50 text-slate-500"}`}>{section.count}</span><span aria-hidden="true" className="text-[10px] text-slate-300 group-hover:text-slate-700">↗</span></span>
          </Link>)}</div>
        </section>;
      })}</div>
      <footer className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${error ? "bg-amber-500" : "bg-emerald-500"}`} />Última actualización: {new Date(data.updatedAt).toLocaleTimeString("es-MX", { timeZone: data.timezone, hour: "2-digit", minute: "2-digit" })}<span aria-hidden="true">·</span>Selecciona un indicador para abrir su módulo.</footer>
    </>}
  </main>;
}
