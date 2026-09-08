"use client";

import { useRef, useState, type ReactNode } from "react";
import CTA from "@/components/CTA";
import CatalogCard from "./CatalogCard";
import type { PublicServiceCatalogItem } from "@/lib/commercial/service-catalog";

type Props = { items: PublicServiceCatalogItem[]; categoryLabel: string; unavailable?: boolean; children?: ReactNode };

export default function ServiceCatalog({ items, categoryLabel, unavailable = false, children }: Props) {
  const [selection, setSelection] = useState<{ product: string; message: string } | null>(null);
  const contact = useRef<HTMLDivElement>(null);
  function select(item: PublicServiceCatalogItem) {
    setSelection({ product: categoryLabel, message: `Me interesa ${item.name}. Quisiera solicitar una cotización.` });
    contact.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    contact.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
  }
  return <>
    <section aria-label={`Catálogo de ${categoryLabel}`} className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
      {items.length > 0 ? <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <CatalogCard key={item.id} item={item} onSelect={select} />)}
      </div> : <div role="status" className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        <p>{unavailable ? "No pudimos cargar el catálogo en este momento." : "Estamos actualizando nuestras opciones de servicios."}</p>
        <a href="#contacto" className="mt-3 inline-block font-medium text-blue-700">Contáctanos para conocer las opciones</a>
        {unavailable && <a href="" className="ml-5 inline-block font-medium text-blue-700">Volver a intentar</a>}
      </div>}
    </section>
    {children}
    <div ref={contact} className="scroll-mt-28"><CTA selection={selection} /></div>
  </>;
}
