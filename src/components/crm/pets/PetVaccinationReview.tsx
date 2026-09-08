"use client";
import { useEffect, useState } from "react";

export default function PetVaccinationReview({ petId, documentId, onSaved }: { petId: string; documentId: string; onSaved?: () => Promise<void> }) {
  const [validUntil, setValidUntil] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState("Consultando vigencia…");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/crm/pets/${petId}/vaccination`, { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { success: boolean; error?: string; data?: { message: string; validUntil: string } };
      if (!response.ok || !result.success || !result.data) throw new Error(result.error ?? "No fue posible consultar la vigencia.");
      if (!cancelled) { setMessage(result.data.message); setValidUntil(result.data.validUntil); }
    }).catch((error: unknown) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "No fue posible consultar la vigencia."); });
    return () => { cancelled = true; };
  }, [petId, documentId]);
  return <form className="mt-3 space-y-2 border-t border-slate-200 pt-3" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch(`/api/crm/pets/${petId}/vaccination`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId, validUntil, reviewed }) });
      const result = await response.json() as { success: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "No fue posible guardar la revisión.");
      setMessage(`Revisión guardada. Vigencia: ${validUntil}.`); setReviewed(false);
      await onSaved?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible guardar la revisión."); }
    finally { setBusy(false); }
  }}>
    <p role="status" className="text-xs text-slate-700">{message}</p>
    <label className="block text-xs font-semibold text-slate-700">Vigente hasta<input type="date" required value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
    <label className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" required checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />Revisé la cartilla y confirmé su vigencia.</label>
    <button disabled={busy || !reviewed} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{busy ? "Guardando…" : "Guardar revisión"}</button>
  </form>;
}
