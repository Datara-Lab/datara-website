"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import POSSalesWorkspace from "@/components/pos/POSSalesWorkspace";

type Terminal = { id: string; code: string; name: string; status: string; branchId: string; branchName: string; openSessionId: string | null };
type Branch = { id: string; name: string; code: string };
type CashSession = { id: string; terminalId: string; terminalName: string; status: "open" | "closed"; openedAt: string; openedByName: string; openingAmount: number; closedAt: string | null; expectedCashAmount: number | null; countedCashAmount: number | null; differenceAmount: number | null };

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: string } | null;
  if (!response.ok || !payload?.success) throw new Error(payload?.error ?? "No fue posible completar la operación.");
  return payload.data as T;
}

export default function POSCashWorkspace() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState("");
  const [openingAmount, setOpeningAmount] = useState("0");
  const [movementType, setMovementType] = useState<"cash_in" | "cash_out">("cash_in");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [countedAmount, setCountedAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [terminalForm, setTerminalForm] = useState({ branchId: "", name: "", code: "", receiptPrefix: "POS" });

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [terminalResponse, sessionResponse] = await Promise.all([fetch("/api/pos/terminals", { cache: "no-store" }), fetch("/api/pos/cash-sessions", { cache: "no-store" })]);
      const terminalPayload = await terminalResponse.json().catch(() => null) as { success?: boolean; data?: Terminal[]; options?: { branches?: Branch[] }; error?: string } | null;
      if (!terminalResponse.ok || !terminalPayload?.success) throw new Error(terminalPayload?.error ?? "No fue posible consultar las terminales.");
      const sessionData = await readResponse<CashSession[]>(sessionResponse);
      setTerminals(terminalPayload.data ?? []);
      setBranches(terminalPayload.options?.branches ?? []);
      setSessions(sessionData);
      setSelectedTerminalId((current) => current || terminalPayload.data?.[0]?.id || "");
      setTerminalForm((current) => ({ ...current, branchId: current.branchId || terminalPayload.options?.branches?.[0]?.id || "" }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar Datara POS."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void loadWorkspace();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadWorkspace]);

  const selectedTerminal = terminals.find((item) => item.id === selectedTerminalId) ?? null;
  const openSession = useMemo(() => sessions.find((item) => item.status === "open" && item.terminalId === selectedTerminalId) ?? null, [sessions, selectedTerminalId]);
  const recentSessions = sessions.filter((item) => item.status === "closed").slice(0, 5);

  async function submit(action: () => Promise<unknown>, message: string) {
    setBusy(true); setError(null); setNotice(null);
    try { await action(); setNotice(message); await loadWorkspace(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible completar la operación."); }
    finally { setBusy(false); }
  }

  function createTerminal(event: FormEvent) {
    event.preventDefault();
    void submit(async () => readResponse(await fetch("/api/pos/terminals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(terminalForm) })), "Terminal creada correctamente.");
  }

  function openCash(event: FormEvent) {
    event.preventDefault();
    void submit(async () => readResponse(await fetch("/api/pos/cash-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ terminalId: selectedTerminalId, openingAmount }) })), "Caja abierta. Ya puedes comenzar a operar.");
  }

  function addMovement(event: FormEvent) {
    event.preventDefault(); if (!openSession) return;
    void submit(async () => readResponse(await fetch(`/api/pos/cash-sessions/${openSession.id}/movements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movementType, amount: movementAmount, reason: movementReason }) })), "Movimiento registrado.");
    setMovementAmount(""); setMovementReason("");
  }

  function closeCash(event: FormEvent) {
    event.preventDefault(); if (!openSession) return;
    void submit(async () => readResponse(await fetch(`/api/pos/cash-sessions/${openSession.id}/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ countedCashAmount: countedAmount, closingNotes }) })), "Corte realizado y caja cerrada.");
    setCountedAmount(""); setClosingNotes("");
  }

  const input = "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";
  const primary = "rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";

  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-lg font-black text-white">P</div><div><p className="text-lg font-black">Datara POS</p><p className="text-xs font-semibold text-slate-500">Punto de venta conectado</p></div></div>
        <Link href="/portal" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Volver al portal</Link>
      </div>
    </header>
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
      <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl"/><div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"/>
      <div className="relative mx-auto max-w-[1500px] px-5 py-10 sm:px-8"><p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">Centro de operación</p><div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Vende rápido. Cuadra fácil.</h1><p className="mt-3 max-w-2xl text-slate-300">Controla cada terminal y cada peso desde un punto de venta listo para conectarse con toda tu operación.</p></div>{terminals.length > 0 && <label className="text-sm font-bold text-slate-300">Terminal<select className="ml-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white" value={selectedTerminalId} onChange={(event) => setSelectedTerminalId(event.target.value)}>{terminals.map((terminal) => <option className="text-slate-950" key={terminal.id} value={terminal.id}>{terminal.name} · {terminal.branchName}</option>)}</select></label>}</div></div>
    </section>
    <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-8 sm:px-8">
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{error}</div>}{notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">{notice}</div>}
      {loading ? <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">Preparando tu punto de venta…</div> : terminals.length === 0 ? <section className="mx-auto max-w-2xl rounded-[30px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-950/5"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Primer paso</p><h2 className="mt-2 text-3xl font-black">Configura tu primera terminal</h2><p className="mt-2 text-sm text-slate-500">Así sabremos en qué sucursal registrar las ventas y cortes.</p><form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={createTerminal}><label className="text-sm font-bold">Sucursal<select required className={input} value={terminalForm.branchId} onChange={(e) => setTerminalForm({ ...terminalForm, branchId: e.target.value })}><option value="">Selecciona</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label className="text-sm font-bold">Nombre<input required className={input} value={terminalForm.name} onChange={(e) => setTerminalForm({ ...terminalForm, name: e.target.value })} placeholder="Caja principal"/></label><label className="text-sm font-bold">Código<input required className={input} value={terminalForm.code} onChange={(e) => setTerminalForm({ ...terminalForm, code: e.target.value })} placeholder="CAJA-01"/></label><label className="text-sm font-bold">Prefijo de ticket<input required className={input} value={terminalForm.receiptPrefix} onChange={(e) => setTerminalForm({ ...terminalForm, receiptPrefix: e.target.value })}/></label><button disabled={busy || branches.length === 0} className={`${primary} sm:col-span-2`}>Crear terminal</button></form></section> : <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-600">{selectedTerminal?.branchName}</p><h2 className="mt-2 text-2xl font-black">{selectedTerminal?.name}</h2></div><span className={`rounded-full px-3 py-1.5 text-xs font-black ${openSession ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{openSession ? "Caja abierta" : "Caja cerrada"}</span></div>
          {!openSession ? <form onSubmit={openCash} className="mt-10 max-w-md"><h3 className="text-xl font-black">Comienza tu turno</h3><p className="mt-2 text-sm text-slate-500">Registra el efectivo con el que inicia la caja.</p><label className="mt-6 block text-sm font-bold">Fondo inicial<input className={input} required min="0" step="0.01" type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)}/></label><button disabled={busy} className={`${primary} mt-5 w-full`}>Abrir caja</button></form> : <div className="mt-8 grid gap-5 lg:grid-cols-2"><div className="rounded-[26px] bg-slate-950 p-6 text-white"><p className="text-xs font-black uppercase tracking-[.15em] text-cyan-300">Fondo inicial</p><p className="mt-3 text-4xl font-black">{money.format(openSession.openingAmount)}</p><p className="mt-3 text-sm text-slate-400">Abierta por {openSession.openedByName}</p><p className="mt-1 text-xs text-slate-500">{new Date(openSession.openedAt).toLocaleString("es-MX")}</p></div><form onSubmit={addMovement} className="rounded-[26px] border border-slate-200 p-5"><h3 className="font-black">Movimiento de efectivo</h3><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setMovementType("cash_in")} className={`rounded-xl px-3 py-2 text-sm font-bold ${movementType === "cash_in" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>Entrada</button><button type="button" onClick={() => setMovementType("cash_out")} className={`rounded-xl px-3 py-2 text-sm font-bold ${movementType === "cash_out" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>Retiro</button></div><input className={input} required min="0.01" step="0.01" type="number" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)} placeholder="Importe"/><input className={input} required value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Motivo"/><button disabled={busy} className={`${primary} mt-4 w-full`}>Registrar</button></form></div>}
        </section>
        <aside className="space-y-6"><section className="rounded-[30px] border border-slate-200 bg-white p-6"><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Venta</p><h2 className="mt-2 text-2xl font-black">{openSession ? "Caja lista para vender" : "Abre la caja para vender"}</h2><p className="mt-3 text-sm leading-6 text-slate-500">Las ventas directas y las órdenes de Pets o DBP se cobran desde el espacio inferior.</p></section>{openSession && <form onSubmit={closeCash} className="rounded-[30px] border border-amber-200 bg-amber-50 p-6"><h2 className="text-xl font-black">Corte de caja</h2><p className="mt-2 text-sm text-amber-800/70">Cuenta el efectivo físico antes de cerrar.</p><input required min="0" step="0.01" type="number" className={input} value={countedAmount} onChange={(e) => setCountedAmount(e.target.value)} placeholder="Efectivo contado"/><textarea className={`${input} min-h-24 resize-none`} value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Notas opcionales"/><button disabled={busy} className="mt-4 w-full rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white hover:bg-amber-600">Cerrar caja</button></form>}</aside>
      </div>}
      {openSession && selectedTerminal && <POSSalesWorkspace terminalId={selectedTerminal.id} cashSessionId={openSession.id} onCompleted={loadWorkspace}/>}
      {recentSessions.length > 0 && <section className="rounded-[30px] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Cortes recientes</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Terminal</th><th className="pb-3">Cierre</th><th className="pb-3">Esperado</th><th className="pb-3">Contado</th><th className="pb-3">Diferencia</th></tr></thead><tbody>{recentSessions.map((session) => <tr className="border-t border-slate-100" key={session.id}><td className="py-4 font-bold">{session.terminalName}</td><td>{session.closedAt ? new Date(session.closedAt).toLocaleString("es-MX") : "—"}</td><td>{money.format(session.expectedCashAmount ?? 0)}</td><td>{money.format(session.countedCashAmount ?? 0)}</td><td className={(session.differenceAmount ?? 0) === 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>{money.format(session.differenceAmount ?? 0)}</td></tr>)}</tbody></table></div></section>}
    </div>
  </main>;
}
