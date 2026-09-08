import { formatCatalogMoney, type PublicServiceCatalogItem } from "@/lib/commercial/service-catalog";

type Props = Pick<PublicServiceCatalogItem, "requiresQuote" | "oneTimePrice" | "pricePrefix" | "monthlyPrice" | "monthlyLabel" | "currency">;

export default function PriceDisplay(item: Props) {
  return (
    <div className="grid min-h-32 grid-rows-[1.5rem_auto_1.75rem] content-start gap-1" data-catalog-price>
      <p className="text-sm text-slate-500">{!item.requiresQuote && item.pricePrefix}</p>
      <p className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        {item.requiresQuote ? "Cotización personalizada" : <>
          {formatCatalogMoney(item.oneTimePrice ?? "0", item.currency)}
          <span className="ml-2 text-sm font-medium text-slate-500">{item.currency.toUpperCase()}</span>
        </>}
      </p>
      <p className="text-sm text-slate-600">
        {!item.requiresQuote && item.monthlyPrice !== null && <>
          + {formatCatalogMoney(item.monthlyPrice, item.currency)} {item.monthlyLabel}
        </>}
      </p>
    </div>
  );
}
