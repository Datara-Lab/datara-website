"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ServiceCatalogItemForm from "./ServiceCatalogItemForm";
import { createServiceCatalogDraft, formatCatalogMoney, serviceCatalogCategories, type ServiceCatalogDraft, type ServiceCatalogItem, type ServiceCategory } from "@/lib/commercial/service-catalog";

type ResponseData = { success?: boolean; error?: string; data?: { items?: ServiceCatalogItem[]; item?: ServiceCatalogItem } };
const endpoint = "/api/platform/services/catalog";

export default function ServiceCatalogManager({ category }: { category: ServiceCategory }) {
  const config = serviceCatalogCategories[category];
  const [items, setItems] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ key: number; item?: ServiceCatalogItem; draft: ServiceCatalogDraft } | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const mutationPending = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`${endpoint}?category=${category}`, { cache: "no-store", signal });
    const result: ResponseData = await response.json();
    if (!response.ok || !result.success || !result.data?.items) throw new Error(result.error ?? "No fue posible cargar el catálogo.");
    return result.data.items;
  }, [category]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then((records) => {
      if (!controller.signal.aborted) setItems(records);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "No fue posible cargar el catálogo.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load]);

  async function refresh() {
    setEditor(null); setLoading(true); setError(null);
    try { setItems(await load()); }
    catch (error) { setError(error instanceof Error ? error.message : "No fue posible cargar el catálogo."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!editor) return;
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    editorRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
  }, [editor]);

  function open(item?: ServiceCatalogItem) {
    if (mutationPending.current) return;
    setError(null); setMessage(null);
    const draft = item ? {
      category: item.category, itemKey: item.itemKey, name: item.name,
      shortDescription: item.shortDescription, description: item.description,
      oneTimePrice: item.oneTimePrice, pricePrefix: item.pricePrefix,
      monthlyPrice: item.monthlyPrice, monthlyLabel: item.monthlyLabel, currency: item.currency,
      features: item.features, icon: item.icon, badge: item.badge, recommended: item.recommended,
      requiresQuote: item.requiresQuote, ctaLabel: item.ctaLabel, active: item.active, sortOrder: item.sortOrder,
    } : createServiceCatalogDraft(category, Math.min(2147483647, Math.max(0, ...items.map((entry) => entry.sortOrder)) + 10));
    setEditor({ key: Date.now(), item, draft });
  }

  async function mutate(method: string, payload: object, success: string): Promise<boolean> {
    if (mutationPending.current) return false;
    mutationPending.current = true;
    setSaving(true); setError(null); setMessage(null);
    try {
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result: ResponseData = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "No fue posible guardar el cambio.");
      if (method === "DELETE") {
        setItems((current) => current.filter((item) => item.id !== (payload as { id: string }).id));
      } else if (result.data?.item) {
        const saved = result.data.item;
        setItems((current) => [...current.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.sortOrder - b.sortOrder || a.itemKey.localeCompare(b.itemKey)));
      }
      setMessage(success);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "No fue posible guardar el cambio.");
      return false;
    } finally { mutationPending.current = false; setSaving(false); }
  }

  async function save(draft: ServiceCatalogDraft) {
    const existing = editor?.item;
    const ok = await mutate(existing ? "PATCH" : "POST", {
      ...draft, category, ...(existing ? { id: existing.id, updatedAt: existing.updatedAt } : {}),
    }, "Producto guardado. El catálogo público ya refleja el cambio.");
    if (ok) setEditor(null);
  }

  async function remove(item: ServiceCatalogItem) {
    if (!window.confirm(`¿Eliminar “${item.name}” del catálogo? Esta acción no se puede deshacer.`)) return;
    const ok = await mutate("DELETE", { id: item.id, category, updatedAt: item.updatedAt }, "Producto eliminado.");
    if (ok && editor?.item?.id === item.id) setEditor(null);
  }

  return <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Catálogo de servicios" title={config.label} description="Administra las opciones y precios que se muestran públicamente."
        action={<Button type="button" disabled={saving || loading} onClick={() => open()}>Nuevo producto</Button>} />
      <div className="flex flex-wrap items-center gap-4">
        <Button href={config.href} variant="secondary" target="_blank" rel="noreferrer">Ver catálogo público</Button>
        <Button type="button" variant="ghost" disabled={saving || loading} onClick={() => void refresh()}>Recargar catálogo</Button>
      </div>
      {message && <p role="status" className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {editor && <section ref={editorRef} className="scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8" aria-label="Editor de producto">
        <h2 className="mb-6 text-xl font-bold text-slate-950">{editor.item ? `Editar ${editor.item.name}` : "Nuevo producto"}</h2>
        <ServiceCatalogItemForm key={editor.key} initial={editor.draft} saving={saving} onSave={save} onCancel={() => setEditor(null)} />
      </section>}
      <Card className="overflow-hidden !shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Productos de {config.label}</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr>
              {['Orden', 'Producto', 'Precio inicial', 'Mensualidad', 'Estado', 'Acciones'].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-5 py-4 font-medium">{heading}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">Cargando catálogo…</td></tr> : items.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">No hay productos en esta categoría.</td></tr> : items.map((item) => <tr key={item.id}>
                <td className="px-5 py-4 text-slate-500">{item.sortOrder}</td>
                <th scope="row" className="min-w-48 px-5 py-4 font-medium text-slate-900">{item.name}
                  {item.recommended && <span className="mt-1 block text-xs text-cyan-700">Destacado</span>}
                  {item.badge && <span className="mt-1 block text-xs text-slate-500">{item.badge}</span>}
                </th>
                <td className="whitespace-nowrap px-5 py-4">{item.requiresQuote ? "Cotización" : `${formatCatalogMoney(item.oneTimePrice ?? '0', item.currency)} ${item.currency.toUpperCase()}`}</td>
                <td className="whitespace-nowrap px-5 py-4">{item.requiresQuote || item.monthlyPrice === null ? "—" : formatCatalogMoney(item.monthlyPrice, item.currency)}</td>
                <td className="px-5 py-4"><button type="button" disabled={saving || !!editor} aria-label={`${item.active ? 'Desactivar' : 'Activar'} ${item.name}`} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium disabled:opacity-50" onClick={() => void mutate("PATCH", { id: item.id, category, updatedAt: item.updatedAt, active: !item.active }, "Estado actualizado.")}>{item.active ? "Activo" : "Inactivo"}</button></td>
                <td className="px-5 py-4"><div className="flex gap-2">
                  <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => open(item)}>Editar<span className="sr-only"> {item.name}</span></Button>
                  <Button type="button" size="sm" variant="danger" disabled={saving} onClick={() => void remove(item)}>Eliminar<span className="sr-only"> {item.name}</span></Button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </main>;
}
