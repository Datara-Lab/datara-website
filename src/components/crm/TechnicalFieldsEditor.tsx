"use client";

import type { TechnicalFieldDefinition } from "@/lib/crm/technical-fields";

type Props = {
  fields: TechnicalFieldDefinition[];
  disabled?: boolean;
  onChange: (fields: TechnicalFieldDefinition[]) => void;
};

export default function TechnicalFieldsEditor({ fields, disabled, onChange }: Props) {
  function update(index: number, patch: Partial<TechnicalFieldDefinition>) {
    onChange(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field));
  }

  return (
    <section className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-black text-slate-950">Ficha técnica editable</h3>
          <p className="mt-1 text-sm text-slate-600">Define qué datos debe capturar este tipo de producto.</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => onChange([...fields, {
            key: `campo-${fields.length + 1}`,
            label: "Nuevo campo",
            type: "text",
            required: false,
            active: true,
            sortOrder: (fields.length + 1) * 10,
          }])}
        >
          Agregar campo
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {fields.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
            Este tipo todavía no tiene campos técnicos.
          </p>
        )}
        {fields.map((field, index) => (
          <div key={`${field.key}:${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_160px_90px_90px_80px_auto] lg:items-center">
            <div className="grid gap-2 sm:grid-cols-2">
              <input aria-label="Etiqueta" value={field.label} maxLength={100} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onChange={(event) => update(index, { label: event.target.value })} />
              <input aria-label="Clave" value={field.key} maxLength={64} className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" onChange={(event) => update(index, { key: event.target.value })} />
            </div>
            <select value={field.type} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => update(index, { type: event.target.value as TechnicalFieldDefinition["type"] })}>
              <option value="text">Texto</option>
              <option value="textarea">Texto largo</option>
              <option value="number">Número</option>
              <option value="select">Lista</option>
            </select>
            <input aria-label="Orden" type="number" min={0} value={field.sortOrder} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => update(index, { sortOrder: Number(event.target.value) })} />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={field.required} onChange={(event) => update(index, { required: event.target.checked })} /> Obligatorio</label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={field.active} onChange={(event) => update(index, { active: event.target.checked })} /> Visible</label>
            <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700" onClick={() => onChange(fields.filter((_, fieldIndex) => fieldIndex !== index))}>Quitar</button>
            {field.type === "select" && (
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm lg:col-span-6"
                value={(field.options ?? []).join(", ")}
                placeholder="Opciones separadas por coma"
                onChange={(event) => update(index, { options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) })}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
