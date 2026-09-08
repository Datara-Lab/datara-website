"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import PageHeader from "@/components/shared/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import ChartCard from "@/components/shared/ChartCard";
import SectionCard from "@/components/shared/SectionCard";
import Button from "@/components/ui/Button";
import { websiteEventLabels, type WebsiteAnalyticsOverview } from "@/lib/website/analytics";

const number = (value: number) => new Intl.NumberFormat("es-MX").format(value);
const deviceLabels: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Escritorio" };

function Breakdown({ rows, unit }: { rows: { label: string; count: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) return <p className="text-sm text-slate-500">Todavía no hay datos en este periodo.</p>;
  return <ul className="space-y-4">{rows.map((row) => <li key={row.label}>
    <div className="mb-2 flex justify-between gap-3 text-sm"><span className="min-w-0 break-words text-slate-700">{row.label}</span><span className="shrink-0 font-semibold text-slate-950">{number(row.count)} <span className="font-normal text-slate-400">{unit}</span></span></div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${row.count / max * 100}%` }} /></div>
  </li>)}</ul>;
}

export default function WebsiteAnalyticsDashboard({ initial }: { initial: WebsiteAnalyticsOverview }) {
  const [data, setData] = useState(initial);
  const [days, setDays] = useState(initial.days);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seoPath, setSeoPath] = useState("/");
  const requestId = useRef(0);
  const refresh = useCallback(async (period: number) => {
    const id = ++requestId.current;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/platform/website-analytics?days=${period}`, { cache: "no-store" });
      const result = await response.json() as { success?: boolean; error?: string; data?: WebsiteAnalyticsOverview };
      if (!response.ok || !result.success || !result.data) throw new Error(result.error ?? "No fue posible actualizar las métricas.");
      if (requestId.current === id) setData(result.data);
    } catch (error) { if (requestId.current === id) setError(error instanceof Error ? error.message : "No fue posible actualizar las métricas."); }
    finally { if (requestId.current === id) setLoading(false); }
  }, []);
  useEffect(() => {
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(days); }, 30000);
    return () => { clearInterval(interval); };
  }, [days, refresh]);

  const conversion = data.totals.sessions ? data.totals.convertingSessions / data.totals.sessions * 100 : 0;
  const maxViews = Math.max(1, ...data.daily.map((day) => day.views));
  const seoPage = data.seo.pages.find((page) => page.path === seoPath) ?? data.seo.pages[0];
  return <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Datara Lab · Medición propia" title="Analítica web" description={`Actividad real del sitio, vinculada a ${data.tenantName}.`} action={<Button href="/" target="_blank" rel="noreferrer" variant="secondary">Abrir sitio público</Button>} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3 text-sm text-slate-600">Periodo
          <select value={days} onChange={(event) => { const period = Number(event.target.value); setDays(period); void refresh(period); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900">
            {[7, 30, 90].map((period) => <option key={period} value={period}>Últimos {period} días</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3"><span className="text-xs text-slate-500">Actualizado {new Date(data.generatedAt).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })} · Ciudad de México</span><Button type="button" size="sm" disabled={loading} onClick={() => void refresh(days)}>{loading ? "Actualizando…" : "Actualizar"}</Button></div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} Se conservan los últimos datos cargados.</p>}
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5 text-sm leading-6 text-slate-700">
        <strong>Para verlo funcionar:</strong> abre la página pública, acepta la medición y visita una sección o pulsa “Solicitar cotización”. Los resultados se actualizan cada 30 segundos mientras este panel está visible.
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Visitas a páginas" value={number(data.totals.pageViews)} helperText="Cargas de páginas con medición aceptada." />
        <MetricCard label="Sesiones anónimas" value={number(data.totals.sessions)} helperText="Por pestaña; una nueva tras 30 min de inactividad." />
        <MetricCard label="Clics de interés" value={number(data.totals.clicks)} helperText="Contacto, cotización, productos y WhatsApp." />
        <MetricCard label="Formularios enviados" value={number(data.totals.formSubmits)} helperText={`${conversion.toFixed(1)}% de sesiones con un formulario enviado.`} />
      </section>
      <ChartCard eyebrow="Actividad del sitio" title="Visitas por día" description="Días calendario de Ciudad de México. Los días sin actividad se muestran en cero.">
        {data.totals.pageViews === 0 && <p className="mb-4 text-sm text-slate-500">Aún no hay visitas registradas. No se muestran datos simulados.</p>}
        <svg viewBox="0 0 900 220" role="img" aria-label={`Visitas diarias durante ${data.days} días`} className="h-56 w-full">
          <defs><linearGradient id="website-views-gradient" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#155eef" /><stop offset="1" stopColor="#18b8a9" /></linearGradient></defs>
          <line x1="0" y1="210" x2="900" y2="210" stroke="#e2e8f0" />
          {data.daily.map((day, index) => <rect key={day.date} x={index * 900 / data.daily.length + 2} y={210 - day.views / maxViews * 190} width={Math.max(1, 900 / data.daily.length - 4)} height={day.views / maxViews * 190} rx="3" fill="url(#website-views-gradient)"><title>{day.date}: {day.views} visitas, {day.submissions} formularios enviados</title></rect>)}
        </svg>
        <div className="flex justify-between text-xs text-slate-400"><span>{data.daily[0]?.date}</span><span>Máximo: {number(maxViews === 1 && !data.totals.pageViews ? 0 : maxViews)} visitas</span><span>{data.daily.at(-1)?.date}</span></div>
      </ChartCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Páginas más visitadas"><Breakdown rows={data.pages.map((page) => ({ label: page.path, count: page.views }))} unit="visitas" /></SectionCard>
        <SectionCard title="Origen de las visitas"><Breakdown rows={data.sources.map((source) => ({ label: source.source, count: source.sessions }))} unit="sesiones" /><p className="mt-5 text-xs leading-5 text-slate-400">Clasificación del referente o utm_source. Sin información disponible se muestra “Directo / desconocido”.</p></SectionCard>
        <SectionCard title="Acciones y conversiones"><Breakdown rows={data.actions.map((action) => ({ label: websiteEventLabels[action.name], count: action.count }))} unit="eventos" /></SectionCard>
        <SectionCard title="Dispositivos"><Breakdown rows={data.devices.map((device) => ({ label: deviceLabels[device.device] ?? device.device, count: device.sessions }))} unit="sesiones" /></SectionCard>
      </div>
      <SectionCard title="Actividad reciente" subtitle="Solo eventos; no se muestran identidades de visitantes">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-3 pr-4">Acción</th><th className="py-3 pr-4">Página</th><th className="py-3">Hora</th></tr></thead><tbody>
          {data.recent.length ? data.recent.map((event, index) => <tr key={`${event.createdAt}-${index}`} className="border-b border-slate-100"><td className="py-3 pr-4 text-slate-700">{websiteEventLabels[event.name]}{event.target && <span className="block text-xs text-slate-400">{event.target}</span>}</td><td className="py-3 pr-4 text-slate-600">{event.path}</td><td className="whitespace-nowrap py-3 text-slate-500">{new Date(event.createdAt).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}</td></tr>) : <tr><td colSpan={3} className="py-6 text-slate-500">La actividad aparecerá después de aceptar la medición en el sitio.</td></tr>}
        </tbody></table></div>
      </SectionCard>
      <SectionCard title="Así se presenta el SEO" subtitle="Vista previa orientativa para buscadores y enlaces compartidos">
        <label className="text-sm text-slate-600">Página <select value={seoPath} onChange={(event) => setSeoPath(event.target.value)} className="mb-5 ml-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900">{data.seo.pages.map((page) => <option key={page.path} value={page.path}>{page.path}</option>)}</select></label>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs text-slate-500">{data.seo.siteUrl}{seoPage.path === "/" ? "" : seoPage.path}</p>
            <p className="mt-3 text-xl font-medium text-blue-700">{seoPage.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{seoPage.description}</p>
            <p className="mt-6 text-xs leading-5 text-slate-400">La apariencia final puede cambiar en Google. Esta vista muestra el título, descripción y URL canónica configurados.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><Image src="/opengraph-image" alt="Vista previa de Datara Lab al compartir un enlace" width={1200} height={630} className="h-auto w-full" /><p className="px-4 py-3 text-xs text-slate-500">Imagen Open Graph para enlaces compartidos.</p></div>
        </div>
        <p className="mt-5 text-sm text-slate-600">{data.seo.production ? "Entorno de producción: páginas comerciales habilitadas para indexación." : "Entorno de desarrollo o demo: indexación desactivada para evitar publicar pruebas en buscadores."} El SEO no garantiza una posición en Google.</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-blue-700"><a href="/robots.txt" target="_blank" rel="noreferrer">Ver robots.txt</a><a href="/sitemap.xml" target="_blank" rel="noreferrer">Ver sitemap</a></div>
      </SectionCard>
      <p className="text-xs leading-6 text-slate-500">Solo se mide la actividad de quienes aceptan. Las sesiones no equivalen a personas únicas. La medición no registra nombres, correos, IP ni el contenido de los formularios. El formulario enviado se verifica en el servidor; los clics por sí solos no son ventas.</p>
    </div>
  </main>;
}
