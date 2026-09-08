"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type PetCode = { id: string; entityId: string; status: string };
type QrState = {
  codes: PetCode[];
  loading: boolean;
  pending: string[];
  error: string | null;
  generate: (petId: string, name: string) => Promise<void>;
};
const PetQrContext = createContext<QrState | null>(null);

export function PetQrProvider({ children }: { children: ReactNode }) {
  const [codes, setCodes] = useState<PetCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/crm/qr-codes?entityType=pet", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { success: boolean; error?: string; data?: { codes: PetCode[] } };
        if (!response.ok || !result.success || !result.data) throw new Error(result.error ?? "No fue posible consultar los QR.");
        if (!controller.signal.aborted) setCodes(result.data.codes);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No fue posible consultar los QR.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function generate(petId: string, name: string) {
    setPending((current) => [...current, petId]);
    setError(null);
    try {
      const response = await fetch("/api/crm/qr-codes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "pet", entityId: petId, label: name, symbology: "qr", designTheme: "pet_paws" }),
      });
      const result = await response.json() as { success: boolean; error?: string; data?: { code: PetCode } };
      if (!response.ok || !result.success || !result.data) throw new Error(result.error ?? "No fue posible generar el QR.");
      const code = result.data.code as PetCode;
      setCodes((current) => [...current.filter((item) => item.entityId !== petId), code]);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No fue posible generar el QR.");
    } finally {
      setPending((current) => current.filter((id) => id !== petId));
    }
  }

  return <PetQrContext.Provider value={{ codes, loading, pending, error, generate }}>
    {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {children}
  </PetQrContext.Provider>;
}

export function PetQrCard({ petId, name }: { petId: string; name: string }) {
  const context = useContext(PetQrContext);
  if (!context) return null;
  const code = context.codes.find((item) => item.entityId === petId && item.status === "active");
  const pending = context.pending.includes(petId);
  return <div className="w-20 shrink-0 text-center">
    {code ? <a href={`/api/crm/qr-codes/${code.id}/image?v=pet-qr-v3`} target="_blank" rel="noreferrer" aria-label={`Ver e imprimir QR de ${name}`} className="group block">
      <Image src={`/api/crm/qr-codes/${code.id}/image?compact=1&v=pet-qr-v3`} alt={`QR de ${name}`} width={80} height={80} unoptimized className="rounded-xl border border-slate-200 bg-white group-hover:border-cyan-400" />
      <span className="mt-1 block text-[10px] font-bold text-cyan-700">Ver e imprimir</span>
    </a> : <button type="button" disabled={context.loading || pending} onClick={() => void context.generate(petId, name)} className="h-20 w-20 rounded-xl border border-dashed border-cyan-300 bg-cyan-50 px-1 text-xs font-semibold text-cyan-800 disabled:opacity-50">{context.loading ? "Consultando…" : pending ? "Generando…" : "Generar QR"}</button>}
  </div>;
}
