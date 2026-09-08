import { BookOpen, Building2, CalendarDays, ChartNoAxesCombined, Code2, Globe, LayoutTemplate, ShoppingBag, Workflow } from "lucide-react";
import Button from "@/components/ui/Button";
import FeatureList from "./FeatureList";
import PriceDisplay from "./PriceDisplay";
import type { PublicServiceCatalogItem, ServiceCatalogIcon } from "@/lib/commercial/service-catalog";

const icons = {
  layout: LayoutTemplate, building: Building2, catalog: BookOpen, calendar: CalendarDays,
  "shopping-bag": ShoppingBag, code: Code2, globe: Globe, workflow: Workflow, chart: ChartNoAxesCombined,
};

export default function CatalogCard({ item, onSelect }: { item: PublicServiceCatalogItem; onSelect: (item: PublicServiceCatalogItem) => void }) {
  const Icon = icons[item.icon as ServiceCatalogIcon] ?? Globe;
  return <article className={[
    "row-span-5 grid grid-rows-subgrid gap-6 rounded-3xl border bg-white p-6 sm:p-7",
    item.recommended ? "border-cyan-400 shadow-lg shadow-cyan-950/5" : "border-slate-200 shadow-sm",
  ].join(" ")} data-catalog-card>
    <div className="flex min-h-10 items-center justify-between gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon aria-hidden="true" className="h-5 w-5" /></span>
      {item.badge && <span className="max-w-[75%] break-words rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{item.badge}</span>}
    </div>
    <div className="min-w-0">
      <h2 className="break-words text-xl font-bold tracking-tight text-slate-950">{item.name}</h2>
      <p className="mt-3 break-words text-sm leading-6 text-slate-600">{item.shortDescription}</p>
      {item.description && <details className="mt-3 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-blue-700">Ver detalles</summary>
        <p className="mt-2 whitespace-pre-line break-words leading-6">{item.description}</p>
      </details>}
    </div>
    <PriceDisplay {...item} />
    <FeatureList features={item.features} />
    <Button type="button" data-analytics-action="quote_click" data-analytics-target={item.itemKey} variant={item.recommended ? "primary" : "secondary"} className={`min-h-12 w-full self-end border text-center ${item.recommended ? "border-transparent" : ""}`} onClick={() => onSelect(item)}>
      {item.requiresQuote ? "Solicitar cotización" : item.ctaLabel}
    </Button>
  </article>;
}
