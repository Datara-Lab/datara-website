"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { featuresToText, serviceCatalogIcons, textToFeatures, type ServiceCatalogDraft } from "@/lib/commercial/service-catalog";

type Props = { initial: ServiceCatalogDraft; saving: boolean; onSave: (draft: ServiceCatalogDraft) => Promise<void>; onCancel: () => void };
const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

export default function ServiceCatalogItemForm({ initial, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initial);
  const [features, setFeatures] = useState(featuresToText(initial.features));
  function set<K extends keyof ServiceCatalogDraft>(key: K, value: ServiceCatalogDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    await onSave({ ...draft, features: textToFeatures(features) });
  }
  const texts = [
    { key: "name", label: "Nombre", max: 120, required: true },
    { key: "itemKey", label: "Clave (slug)", max: 80, required: true },
    { key: "pricePrefix", label: "Texto previo al precio", max: 80 },
    { key: "monthlyLabel", label: "Texto de mensualidad", max: 120 },
    { key: "badge", label: "Badge (opcional)", max: 60 },
    { key: "ctaLabel", label: "Texto del botón", max: 80, required: true },
  ] as const;
  return <form onSubmit={submit}>
    <fieldset disabled={saving} className="grid gap-5 sm:grid-cols-2">
      <legend className="sr-only">Datos comerciales del producto</legend>
      {texts.map((field) => <label key={field.key} className="text-sm font-medium text-slate-700">
        {field.label}
        <input className={inputClass} name={field.key} value={draft[field.key] ?? ""} maxLength={field.max}
          required={"required" in field && field.required} pattern={field.key === "itemKey" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
          onChange={(event) => set(field.key, event.target.value)} />
      </label>)}
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">Descripción corta
        <textarea name="shortDescription" required maxLength={400} rows={3} className={inputClass} value={draft.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} />
      </label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">Descripción completa (opcional)
        <textarea name="description" maxLength={5000} rows={4} className={inputClass} value={draft.description ?? ""} onChange={(event) => set("description", event.target.value)} />
      </label>
      <label className="text-sm font-medium text-slate-700">Precio inicial
        <input name="oneTimePrice" type="number" min="0" max="9999999999.99" step="0.01" required={!draft.requiresQuote} className={inputClass} value={draft.oneTimePrice ?? ""} onChange={(event) => set("oneTimePrice", event.target.value || null)} />
      </label>
      <label className="text-sm font-medium text-slate-700">Mensualidad (opcional)
        <input name="monthlyPrice" type="number" min="0" max="9999999999.99" step="0.01" className={inputClass} value={draft.monthlyPrice ?? ""} onChange={(event) => set("monthlyPrice", event.target.value || null)} />
      </label>
      <label className="text-sm font-medium text-slate-700">Moneda
        <select name="currency" className={inputClass} value={draft.currency} onChange={(event) => set("currency", event.target.value)}><option value="mxn">MXN</option></select>
      </label>
      <label className="text-sm font-medium text-slate-700">Orden
        <input name="sortOrder" type="number" required min="0" max="2147483647" step="1" className={inputClass} value={draft.sortOrder} onChange={(event) => set("sortOrder", Number(event.target.value))} />
      </label>
      <label className="text-sm font-medium text-slate-700">Icono
        <select name="icon" className={inputClass} value={draft.icon} onChange={(event) => set("icon", event.target.value)}>
          {serviceCatalogIcons.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">Características (una por línea)
        <textarea name="features" rows={8} className={inputClass} value={features} onChange={(event) => setFeatures(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-5 sm:col-span-2">
        {([{ key: "active", label: "Activo" }, { key: "recommended", label: "Destacado" }, { key: "requiresQuote", label: "Requiere cotización" }] as const).map((field) => <label key={field.key} className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name={field.key} checked={draft[field.key]} onChange={(event) => set(field.key, event.target.checked)} className="h-4 w-4 accent-blue-600" />{field.label}
        </label>)}
      </div>
      {draft.requiresQuote && <p className="text-sm text-slate-500 sm:col-span-2">Se mostrará “Cotización personalizada” y el botón “Solicitar cotización”.</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar producto"}</Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>Cancelar</Button>
      </div>
    </fieldset>
  </form>;
}
