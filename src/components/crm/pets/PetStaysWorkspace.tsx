"use client";

import Image from "next/image";
import PetStayPolicyPanel from "@/components/crm/pets/PetStayPolicyPanel";
import { classifyPetStay, readPetBranchPolicy } from "@/lib/crm/pet-branch-policy";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Pet = {
  id: string; customerId: string; name: string; species: string; breed: string | null;
  tutorName: string | null; tutorLastName: string | null; tutorCompanyName: string | null;
};
type Stay = {
  timezone?: string | null; branchMetadata?: Record<string, unknown> | null;
  id: string; petId: string; petName: string; branchName: string | null;
  serviceType: string; status: string; startsAt: string; endsAt: string | null;
  checkedInAt: string | null; checkedOutAt: string | null;
};
type Option = { value: string; label: string };
type Preview = {
  lowUsagePercent?: number;
  options?: CheckoutOption[];
  serviceType: "daycare" | "boarding";
  nights: number;
  elapsedMinutes: number;
  billableHours: number;
  packageUnits: number;
  startedAt: string;
  checkoutAt: string;
  cashChargeMinutes: number;
  cashChargeHours: number;
  toleranceMinutes: number;
  lateCheckout: boolean;
  outsideBusinessHours: boolean;
  explanation: string;
  packageAccount: { id: string; name: string; available: number } | null;
  quote: {
    total: number;
    currency: string;
    lines: Array<{
      id: string;
      name: string;
      duration: number;
      unitPrice: number;
      quantity: number;
      unitType: "hour" | "night";
    }>;
  } | null;
};
type CheckoutOption = { id: string; label: string; billing: Omit<Preview, "options">; packageAccount: Preview["packageAccount"]; quote: Preview["quote"]; lowUsage: boolean; remaining: number | null };
type CashSession = { id: string; terminalName: string; branchId: string; status: string };
type Resolution = {
  pet: Pet;
  openStay: { id: string; branchId: string | null; serviceType: string; checkedInAt: string; branchName: string | null } | null;
  nextAction: "check_in" | "checkout";
};
type ApiResponse<T> = { success: boolean; data?: T; error?: string };

type OutsideBusinessHoursChallenge = {
  petId: string;
  petName: string;
  branchId: string;
  currentTime: string;
  openTime: string | null;
  closeTime: string | null;
  closed: boolean;
  automaticEntry: boolean;
};

type CheckInResponse = {
  success: boolean;
  data?: {
    warning?: string | null;
    currentTime?: string;
    openTime?: string | null;
    closeTime?: string | null;
    closed?: boolean;
  };
  error?: string;
  code?: string;
};

const primaryButton = "rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-50";
const fieldClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.error ?? "No fue posible completar la solicitud.");
  }
  return payload.data;
}

function tutorLabel(pet: Pet) {
  return pet.tutorCompanyName ?? [pet.tutorName, pet.tutorLastName].filter(Boolean).join(" ");
}

function elapsedLabel(value: string | null) {
  if (!value) return "Hora de entrada pendiente";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  return [days ? `${days} d` : "", hours ? `${hours} h` : "", `${rest} min`].filter(Boolean).join(" ");
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency.toUpperCase() }).format(value);
}

export default function PetStaysWorkspace({
  pets,
  stays,
  branches,
  canCreate,
  onReload,
  onNotice,
  onError,
  initialCheckoutPetId,
  initialColumn,
  onCheckoutClosed,
}: {
  pets: Pet[];
  initialCheckoutPetId?: string;
  initialColumn?: "arrivals" | "daycare" | "boarding";
  onCheckoutClosed?: () => void;
  stays: Stay[];
  branches: Option[];
  canCreate: boolean;
  onReload: () => Promise<void>;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const scannerRef = useRef<HTMLInputElement>(null);
  const scanInFlight = useRef(false);
  const recentEntry = useRef<{ petId: string; at: number } | null>(null);
  const requestedCheckout = useRef<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [manualPetId, setManualPetId] = useState(pets[0]?.id ?? "");
  const [manualPetSearch, setManualPetSearch] = useState("");
  const [activeColumn, setActiveColumn] = useState<
    "arrivals" | "daycare" | "boarding" | ""
  >(initialColumn ?? "");
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const showPaymentPanel =
    Boolean(preview?.quote) &&
    (preview?.quote?.total ?? 0) > 0;
  const [optionId, setOptionId] = useState("");
  const serviceType = "daycare";
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const [branchId, setBranchId] = useState(branches.length === 1 ? branches[0].value : "");
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [cashSessionId, setCashSessionId] = useState("");
  const [cashError, setCashError] = useState("");
  const [tenderedAmount, setTenderedAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentReference, setPaymentReference] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [outsideHoursChallenge, setOutsideHoursChallenge] =
    useState<OutsideBusinessHoursChallenge | null>(null);
  const [outsideHoursReason, setOutsideHoursReason] = useState("");

  useEffect(() => {
    scannerRef.current?.focus();
  }, []);

    async function requestCheckIn({
    petId,
    petName,
    activeBranchId,
    automaticEntry,
    reason,
  }: {
    petId: string;
    petName: string;
    activeBranchId: string;
    automaticEntry: boolean;
    reason?: string;
  }) {
    const response = await fetch("/api/crm/pet-stays/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        petId,
        serviceType,
        branchId: activeBranchId,
        outsideBusinessHoursReason: reason?.trim() || undefined,
      }),
    });

    const payload = await response.json() as CheckInResponse;

    if (
      response.status === 409 &&
      payload.code === "OUTSIDE_BUSINESS_HOURS"
    ) {
      setOutsideHoursChallenge({
        petId,
        petName,
        branchId: activeBranchId,
        currentTime: payload.data?.currentTime ?? "",
        openTime: payload.data?.openTime ?? null,
        closeTime: payload.data?.closeTime ?? null,
        closed: payload.data?.closed ?? false,
        automaticEntry,
      });
      setOutsideHoursReason("");
      return null;
    }

    if (!response.ok || !payload.success || payload.data === undefined) {
      throw new Error(
        payload.error ?? "No fue posible registrar la entrada.",
      );
    }

    return payload.data;
  }


  const resolvePet = useCallback(async (petId: string, automaticEntry = false) => {
    const response = await fetch(`/api/crm/pet-stays/status?petId=${encodeURIComponent(petId)}`, { cache: "no-store" });
    const next = await readResponse<Resolution>(response);
    if (automaticEntry && !next.openStay) {
      if (!canCreate) throw new Error("No tienes permiso para registrar entradas.");
      const activeBranchId = branchId || (branches.length === 1 ? branches[0].value : "");
      if (!activeBranchId) throw new Error("Selecciona la sucursal antes de escanear.");
      const entry = await requestCheckIn({
        petId,
        petName: next.pet.name,
        activeBranchId,
        automaticEntry: true,
      });

      if (!entry) {
        setResolution(null);
        setPreview(null);
        return;
      }

      recentEntry.current = { petId, at: Date.now() };
      setResolution(null);
      setPreview(null);
      const message = `Entrada registrada para ${next.pet.name}.${entry.warning ? ` ${entry.warning}` : ""}`;
      setLastScan(message);
      onNotice(message);
      await onReload();
      return;
    }
    setResolution(next);
    setPreview(null);
    setOptionId("");
    if (next.openStay) {
      const previewResponse = await fetch(`/api/crm/pet-stays/${next.openStay.id}/checkout-preview`, { cache: "no-store" });
      const prepared = await readResponse<Preview>(previewResponse);
      setPreview(prepared); setCashSessions([]); setCashSessionId(""); setCashError(""); setTenderedAmount("");
      if (prepared.options?.some(option => (option.quote?.total ?? 0) > 0)) {
        try {
          const sessions = await readResponse<CashSession[]>(await fetch("/api/pos/cash-sessions", {cache:"no-store"}));
          const available = sessions.filter(session => session.status === "open" && session.branchId === next.openStay?.branchId);
          setCashSessions(available);
          if (available.length === 1) setCashSessionId(available[0].id);
          if (!available.length) setCashError("Abre una caja POS en esta sucursal para cobrar.");
        } catch(error) { setCashError(error instanceof Error ? error.message : "No se pudo consultar la caja."); }
      }
    }
  }, [branchId, branches, canCreate, onNotice, onReload, serviceType]);

  useEffect(() => {
    if (!initialCheckoutPetId || requestedCheckout.current === initialCheckoutPetId) return;
    const timer = window.setTimeout(() => {
      requestedCheckout.current = initialCheckoutPetId;
      void resolvePet(initialCheckoutPetId).catch((error: unknown) => {
        onError(error instanceof Error ? error.message : "No fue posible preparar la salida.");
        onCheckoutClosed?.();
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialCheckoutPetId, resolvePet, onError, onCheckoutClosed]);

  async function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scanValue.trim() || scanInFlight.current || resolution) return;
    scanInFlight.current = true;
    setIsWorking(true);
    try {
      const response = await fetch("/api/crm/qr-codes/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: scanValue, branchId: branchId || null, action: "pet_stay" }),
      });
      const resolved = await readResponse<{ entityType: string; entityId: string }>(response);
      if (resolved.entityType !== "pet") throw new Error("El código leído no pertenece a una mascota.");
      if (recentEntry.current?.petId === resolved.entityId && Date.now() - recentEntry.current.at < 5000) {
        setLastScan("Entrada ya registrada. Lectura repetida ignorada.");
        setScanValue("");
        return;
      }
      setLastScan(null);
      await resolvePet(resolved.entityId, true);
      setScanValue("");
    } catch (error) {
      setLastScan(null);
      onError(error instanceof Error ? error.message : "No fue posible leer el código.");
    } finally {
      scanInFlight.current = false;
      setIsWorking(false);
      scannerRef.current?.focus();
    }
  }

  async function confirmCheckIn() {
    if (!resolution) return;

    const activeBranchId =
      branchId ||
      (branches.length === 1 ? branches[0].value : "");

    if (!activeBranchId) {
      onError("Selecciona la sucursal antes de registrar la entrada.");
      return;
    }

    setIsWorking(true);

    try {
      const entry = await requestCheckIn({
        petId: resolution.pet.id,
        petName: resolution.pet.name,
        activeBranchId,
        automaticEntry: false,
      });

      if (!entry) {
        return;
      }

      onNotice(
        `Entrada registrada para ${resolution.pet.name}.${entry.warning ? ` ${entry.warning}` : ""}`,
      );
      setResolution(null);
      await onReload();
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "No fue posible registrar la entrada.",
      );
    } finally {
      setIsWorking(false);
      window.setTimeout(() => scannerRef.current?.focus(), 0);
    }
  }

    async function confirmOutsideHoursCheckIn() {
    if (!outsideHoursChallenge || !outsideHoursReason.trim()) {
      return;
    }

    setIsWorking(true);

    try {
      const entry = await requestCheckIn({
        petId: outsideHoursChallenge.petId,
        petName: outsideHoursChallenge.petName,
        activeBranchId: outsideHoursChallenge.branchId,
        automaticEntry: outsideHoursChallenge.automaticEntry,
        reason: outsideHoursReason,
      });

      if (!entry) {
        return;
      }

      const message =
        `Entrada fuera de horario registrada para ${outsideHoursChallenge.petName}.` +
        `${entry.warning ? ` ${entry.warning}` : ""}`;

      if (outsideHoursChallenge.automaticEntry) {
        recentEntry.current = {
          petId: outsideHoursChallenge.petId,
          at: Date.now(),
        };
        setLastScan(message);
      } else {
        setResolution(null);
      }

      setOutsideHoursChallenge(null);
      setOutsideHoursReason("");
      setPreview(null);

      onNotice(message);
      await onReload();
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "No fue posible autorizar la entrada fuera de horario.",
      );
    } finally {
      setIsWorking(false);
      window.setTimeout(() => scannerRef.current?.focus(), 0);
    }
  }

  async function confirmCheckout() {
    if (!resolution?.openStay || !preview || !optionId) return;
    setIsWorking(true);
    try {
      const checkout = await readResponse<{ reference: string; totalAmount: number; currency: string; coveredByPackage: boolean }>(
        await fetch(`/api/crm/pet-reservations/${resolution.openStay.id}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            optionId,
            cashSessionId,
            tenderedAmount: tenderedAmount ? Number(tenderedAmount) : undefined,
            paymentMethod: preview.quote?.total ? paymentMethod : null,
            paymentReference: preview.quote?.total ? paymentReference : null,
          }),
        }),
      );
      onNotice(checkout.coveredByPackage
        ? checkout.totalAmount > 0
          ? `Salida completada. Se aplicó el paquete y se cobró el excedente de ${money(checkout.totalAmount, checkout.currency)} en la orden ${checkout.reference}.`
          : `Salida completada. Se aplicó el paquete y se generó la orden ${checkout.reference}.`
        : `Salida y cobro registrados en la orden ${checkout.reference} por ${money(checkout.totalAmount, checkout.currency)}.`);
      setResolution(null);
      setPreview(null);
      onCheckoutClosed?.();
      await onReload();
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible completar la salida.");
    } finally {
      setIsWorking(false);
      window.setTimeout(() => scannerRef.current?.focus(), 0);
    }
  }

  const classifiedStays = useMemo(() => stays.map(stay => stay.status === "checked_in" ? { ...stay, serviceType: classifyPetStay(new Date(stay.checkedInAt ?? stay.startsAt), new Date(clock), stay.timezone ?? "America/Mexico_City", readPetBranchPolicy(stay.branchMetadata), stay.serviceType).serviceType } : stay), [stays, clock]);
  const columns = useMemo(() => [
    { id: "arrivals", title: "Por llegar", accent: "border-blue-200", records: classifiedStays.filter((stay) => ["pending", "confirmed"].includes(stay.status)) },
    { id: "daycare", title: "En guardería", accent: "border-cyan-200", records: classifiedStays.filter((stay) => stay.status === "checked_in" && stay.serviceType === "daycare") },
    { id: "boarding", title: "En pensión", accent: "border-violet-200", records: classifiedStays.filter((stay) => stay.status === "checked_in" && stay.serviceType === "boarding") },
    { id: "departed", title: "Salieron hoy", accent: "border-emerald-200", records: classifiedStays.filter((stay) => stay.status === "checked_out" && stay.checkedOutAt && new Date(stay.checkedOutAt).toDateString() === new Date().toDateString()) },
  ], [classifiedStays]);
  const visibleColumns = useMemo(
    () =>
      activeColumn
        ? columns.filter(
            (column) =>
              column.id === activeColumn,
          )
        : columns,
    [activeColumn, columns],
  );
  const filteredPets = useMemo(() => {
    const query = manualPetSearch.trim().toLocaleLowerCase("es-MX");
    if (!query) return pets;
    return pets.filter((pet) =>
      [pet.name, pet.species, pet.breed, tutorLabel(pet)]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("es-MX").includes(query)),
    );
  }, [manualPetSearch, pets]);

  return <section className={initialCheckoutPetId ? "[&>div:not(.fixed)]:hidden" : "space-y-6"}>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <form onSubmit={handleScan} className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Entradas y salidas</h2>
          <span className="text-xs text-slate-500">Escanea el QR de la mascota</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-slate-600">Sucursal
            <select aria-label="Sucursal de las entradas" value={branchId || (branches.length === 1 ? branches[0].value : "")} disabled={isWorking || Boolean(resolution)} onChange={(event) => setBranchId(event.target.value)} className={fieldClass}>
              <option value="">Selecciona la sucursal</option>
              {branches.map((branch) => <option key={branch.value} value={branch.value}>{branch.label}</option>)}
            </select>
          </label>
          <p className="text-xs text-slate-500">Sin estancia abierta: entrada automática. Con estancia abierta: revisar salida.</p>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input ref={scannerRef} value={scanValue} onChange={(event) => setScanValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Tab" && scanValue.trim()) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          aria-label="Código de la mascota" autoComplete="off" placeholder="Escanea o pega el código…"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
        <button disabled={isWorking || !scanValue.trim()} className={`${primaryButton} shrink-0`}>{isWorking ? "Consultando…" : "Continuar"}</button>
        </div>
        {lastScan && <p role="status" className="mt-3 text-xs font-medium text-emerald-700">{lastScan}</p>}
      </form>

      <details className="border-t border-slate-100 px-4 py-3 sm:px-5">
        <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900">Buscar mascota sin código</summary>
        <div className="mt-3 grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs font-medium text-slate-600">Mascota o tutor
        <input value={manualPetSearch} onChange={(event) => { setManualPetSearch(event.target.value); setManualPetId(""); }} placeholder="Nombre, especie o raza…" className={fieldClass} /></label>
        <label className="text-xs font-medium text-slate-600">Resultados
        <select value={manualPetId} onChange={(event) => setManualPetId(event.target.value)} className={fieldClass}>
          <option value="">Selecciona una mascota</option>
          {filteredPets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} · {tutorLabel(pet)}</option>)}
        </select></label>
        <button type="button" disabled={!manualPetId || isWorking} className={secondaryButton}
          onClick={() => void resolvePet(manualPetId).catch((error: unknown) => onError(error instanceof Error ? error.message : "No fue posible consultar la mascota."))}>
          Consultar
        </button>
        </div>
      </details>
    </div>
    {!initialCheckoutPetId && (branchId || branches.length === 1) && <PetStayPolicyPanel key={branchId || branches[0].value} branchId={branchId || branches[0].value} onSaved={onReload} />}

    {activeColumn && (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-cyan-900">
            {activeColumn === "daycare"
              ? "Mostrando mascotas en guardería"
              : activeColumn === "boarding"
                ? "Mostrando mascotas en pensión"
                : "Mostrando próximas llegadas"}
          </p>
          <p className="text-xs text-cyan-700">
            Vista filtrada desde el resumen.
          </p>
        </div>

        <button
          type="button"
          className={secondaryButton}
          onClick={() => setActiveColumn("")}
        >
          Ver todas las estancias
        </button>
      </div>
    )}
    <div
      className={
        activeColumn
          ? "grid gap-4"
          : "grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      }
    >
      {visibleColumns.map((column) => <div key={column.id} className={`min-h-64 rounded-2xl border ${column.accent} bg-slate-50/60 p-3`}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-950">{column.title}</h3><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">{column.records.length}</span></div>
        <div className="space-y-3">{column.records.map((stay) => <article key={stay.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-bold text-slate-950">{stay.petName}</p>
          <p className="mt-1 text-sm text-slate-700">Tutor: {(() => {
            const pet = pets.find((item) => item.id === stay.petId);
            return pet ? [pet.tutorName, pet.tutorLastName].filter(Boolean).join(" ").trim() || pet.tutorCompanyName || "Sin tutor identificado" : "Sin tutor identificado";
          })()}</p>
          <p className="mt-1 text-xs text-slate-500">{stay.branchName ?? "Sin sucursal"}</p>
          {stay.status === "checked_in" && <p className="mt-3 text-sm font-semibold text-cyan-700">{elapsedLabel(stay.checkedInAt)}</p>}
          {stay.status === "checked_in" && <button type="button" className={`${secondaryButton} mt-3 w-full`} onClick={() => {
            const pet = pets.find((item) => item.id === stay.petId);
            if (pet) void resolvePet(pet.id).catch((error: unknown) => onError(error instanceof Error ? error.message : "No fue posible preparar la salida."));
          }}>Preparar salida</button>}
        </article>)}</div>
        {column.records.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Sin mascotas</p>}
      </div>)}
    </div>

        {outsideHoursChallenge && (
      <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/70 p-4">
        <div className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
            Entrada fuera de horario
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            {outsideHoursChallenge.petName}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Esta entrada se está intentando registrar fuera del horario
            laboral configurado para la sucursal.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Hora actual
              </p>
              <p className="mt-1 text-xl font-bold text-slate-950">
                {outsideHoursChallenge.currentTime}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Horario de hoy
              </p>
              <p className="mt-1 text-xl font-bold text-amber-950">
                {outsideHoursChallenge.closed
                  ? "Sucursal cerrada"
                  : outsideHoursChallenge.openTime &&
                      outsideHoursChallenge.closeTime
                    ? `${outsideHoursChallenge.openTime} – ${outsideHoursChallenge.closeTime}`
                    : "Sin horario completo"}
              </p>
            </div>
          </div>

          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Justificación de la entrada
            <textarea
              value={outsideHoursReason}
              onChange={(event) =>
                setOutsideHoursReason(event.target.value)
              }
              rows={4}
              autoFocus
              placeholder="Ej. El tutor avisó que llegaría después del cierre y la sucursal autorizó recibir a la mascota."
              className={`${fieldClass} resize-none`}
            />
          </label>

          <p className="mt-2 text-xs text-slate-500">
            La justificación, el usuario y la fecha de autorización quedarán
            registrados en la estancia.
          </p>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={isWorking}
              className={secondaryButton}
              onClick={() => {
                setOutsideHoursChallenge(null);
                setOutsideHoursReason("");
                window.setTimeout(
                  () => scannerRef.current?.focus(),
                  0,
                );
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={
                isWorking ||
                outsideHoursReason.trim().length === 0
              }
              className={primaryButton}
              onClick={() =>
                void confirmOutsideHoursCheckIn()
              }
            >
              {isWorking
                ? "Registrando…"
                : "Autorizar y registrar entrada"}
            </button>
          </div>
        </div>
      </div>
    )}

    {resolution && <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/65 p-4">
      <div
  className={`max-h-[92vh] w-full ${
    showPaymentPanel ? "max-w-5xl" : "max-w-xl"
  } overflow-y-auto rounded-[32px] border border-white/80 bg-[radial-gradient(circle_at_bottom_right,_rgb(207,250,254)_0%,_rgb(236,254,255)_28%,_rgb(248,253,255)_48%,_rgb(255,255,255)_72%)] p-7 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5`}
>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">{resolution.nextAction === "check_in" ? "Registrar entrada" : "Preparar salida"}</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">{resolution.pet.name}</h2>
        <p className="text-sm text-slate-500">{resolution.pet.species} · {tutorLabel(resolution.pet)}</p>
        {resolution.nextAction === "check_in" ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <p className="text-sm text-slate-600">Entrada a guardería. La clasificación final se determina al salir.</p>
          <label className="text-sm font-semibold text-slate-700">Sucursal<select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={fieldClass}><option value="">Sin sucursal</option>{branches.map((branch) => <option key={branch.value} value={branch.value}>{branch.label}</option>)}</select></label>
          <div className="sm:col-span-2 rounded-2xl bg-cyan-50 p-4 text-sm text-cyan-800">El paquete no se descuenta ahora. Se evaluará automáticamente al registrar la salida.</div>
        </div> : preview ? (
          <div
            className={`mt-6 grid gap-6 ${
              showPaymentPanel
                ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]"
                : "grid-cols-1"
            }`}
          >
            <div className="space-y-4">
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold text-slate-900">Elige cómo cubrir la estancia</legend>
            {preview.options?.map((option) => <label key={option.id} className={`block cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
            optionId === option.id
              ? "border-cyan-300 bg-gradient-to-br from-cyan-50 via-white to-blue-50 shadow-[0_12px_30px_-18px_rgba(6,182,212,0.55)] ring-1 ring-cyan-100"
              : "border-slate-200/80 bg-white/80 shadow-sm hover:border-cyan-200 hover:shadow-md"
          }`}>
              <span className="flex items-center gap-2"><input type="radio" name="checkout-option" value={option.id} checked={optionId === option.id} onChange={() => {
                setOptionId(option.id); setPreview((current) => current ? { ...current, ...option.billing, packageAccount: option.packageAccount, quote: option.quote, options: current.options } : current);
              }} /><span className="text-sm font-semibold text-slate-900">{option.label}</span></span>
              <span className="mt-2 block text-xs text-slate-600">{option.packageAccount ? `Consume ${option.billing.packageUnits} unidad(es). Saldo restante: ${option.remaining}.` : "No consume paquetes."} {money(option.quote?.total ?? 0, option.quote?.currency ?? "mxn")} por pagar.</span>
              {option.lowUsage && <span className="mt-1 block text-xs font-medium text-amber-700">Uso menor o igual al {preview.lowUsagePercent ?? 50}% del tiempo incluido. Compara con el pago completo.</span>}
            </label>)}
            {!preview.options?.length && <p className="text-sm text-amber-700">No hay alternativas disponibles. Revisa las tarifas horarias del catálogo y los paquetes vigentes.</p>}
          </fieldset>

          <div className="rounded-[28px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 p-6 text-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.9)]">
            {preview.serviceType === "boarding" ? (
              <>
                <p className="text-sm text-slate-400">
                  Noches
                </p>

                <p className="mt-1 text-3xl font-bold">
                  {preview.nights}{" "}
                  {preview.nights === 1
                    ? "noche"
                    : "noches"}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Tiempo transcurrido:{" "}
                  <span className="font-semibold text-slate-200">
                    {Math.floor(
                      preview.elapsedMinutes /
                        60,
                    )}{" "}
                    h{" "}
                    {preview.elapsedMinutes %
                      60}{" "}
                    min
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300">
                  Tiempo transcurrido
                </p>

                <p className="mt-1 text-3xl font-bold">
                  {Math.floor(
                    preview.elapsedMinutes /
                      60,
                  )}{" "}
                  h{" "}
                  {preview.elapsedMinutes %
                    60}{" "}
                  min
                </p>
              </>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
              <div>
                <p className="text-slate-400">
                  Entrada
                </p>

                <p className="font-semibold">
                  {new Date(
                    preview.startedAt,
                  ).toLocaleString(
                    "es-MX",
                    {
                      dateStyle:
                        "medium",
                      timeStyle:
                        "short",
                    },
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-400">
                  Salida
                </p>

                <p className="font-semibold">
                  {new Date(
                    preview.checkoutAt,
                  ).toLocaleString(
                    "es-MX",
                    {
                      dateStyle:
                        "medium",
                      timeStyle:
                        "short",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
          {preview.outsideBusinessHours && <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-800">La salida se está registrando después de la hora de cierre configurada.</div>}
          {preview.lateCheckout && <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-semibold text-violet-800">Se rebasó la hora límite de pensión y su tolerancia; se descontará una noche adicional.</div>}
          {preview.packageAccount && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-800">Paquete disponible</p><p className="mt-1 text-sm text-emerald-700">{preview.packageAccount.name}: se descontarán {preview.packageUnits} {preview.packageUnits === 1 ? "unidad" : "unidades"}.</p><p className="mt-2 text-xs font-semibold text-emerald-800">{preview.explanation} Tolerancia: {preview.toleranceMinutes} min.</p></div>}
          </div>

          {showPaymentPanel && (
            <div className="space-y-4">
      {preview.quote && (
  <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4 shadow-sm">
    <p className="font-bold text-cyan-700">
      {preview.packageAccount
        ? "Cobro del excedente"
        : "Cobro por estancia"}
    </p>

    <p className="mt-1 text-xl font-bold text-blue-700">
      {money(
        preview.quote.total,
        preview.quote.currency,
      )}
    </p>

    {preview.quote.lines.map((line) => (
      <p
        key={line.id}
        className="mt-1 text-sm text-cyan-700"
      >
        {line.quantity} × {line.name} (
        {line.duration}{" "}
        {line.unitType === "night"
          ? line.duration === 1
            ? "noche"
            : "noches"
          : line.duration === 1
            ? "hora"
            : "horas"}
        )
      </p>
    ))}
  </div>
)}
          {!preview.options?.length && !preview.packageAccount && !preview.quote && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">No existe un paquete compatible ni tarifas configuradas para completar la salida.</div>}
          {preview.quote && preview.quote.total > 0 && <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            <label className="block text-sm font-semibold text-slate-700">Caja de la sucursal<select value={cashSessionId} onChange={event=>setCashSessionId(event.target.value)} className={fieldClass}><option value="">Selecciona una caja abierta</option>{cashSessions.map(session=><option key={session.id} value={session.id}>{session.terminalName}</option>)}</select></label>
            {cashError && <p role="alert" className="text-sm text-amber-700">{cashError}</p>}
            {paymentMethod === "cash" && <label className="block text-sm text-slate-700">Efectivo recibido<input type="number" min={preview.quote.total} step="0.01" value={tenderedAmount} placeholder={String(preview.quote.total)} onChange={event=>setTenderedAmount(event.target.value)} className={fieldClass} /><span className="text-xs text-slate-500">Cambio: {money(Math.max(0, Number(tenderedAmount || preview.quote.total) - preview.quote.total), preview.quote.currency)}</span></label>}
          </div>}
          {preview.quote && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Método de pago<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={fieldClass}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></label><label className="text-sm font-semibold text-slate-700">Referencia<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className={fieldClass} /></label></div>}
            </div>
          )}
        </div>
        ) : (
          <p className="mt-5 text-sm text-slate-500">
            Calculando estancia y paquete…
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3"><button type="button" className={secondaryButton} onClick={() => { setResolution(null); setPreview(null); onCheckoutClosed?.(); window.setTimeout(() => scannerRef.current?.focus(), 0); }}>Cancelar</button><button type="button" disabled={isWorking || !canCreate || (resolution.nextAction === "checkout" && (!preview || !optionId || ((preview.quote?.total ?? 0) > 0 && (!cashSessionId || (paymentMethod === "cash" && tenderedAmount !== "" && Number(tenderedAmount) < (preview.quote?.total ?? 0)))) || (!preview.packageAccount && !preview.quote) || (preview.cashChargeHours > 0 && !preview.quote)))} className={primaryButton} onClick={() => void (resolution.nextAction === "check_in" ? confirmCheckIn() : confirmCheckout())}>{resolution.nextAction === "check_in" ? "Confirmar entrada" : preview?.quote ? "Registrar cobro y salida" : "Aplicar paquete y completar salida"}</button></div>
      </div>
    </div>}
  </section>;
}

export function PetIdentifiers({ pets, onError }: { pets: Pet[]; onError: (message: string) => void }) {
  type PetCode = { id: string; entityId: string; status: string; symbology: string; displayCode: string; label: string | null };
  const [codes, setCodes] = useState<PetCode[]>([]);
  const [formats, setFormats] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedPetId, setSavedPetId] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    const response = await fetch("/api/crm/qr-codes?entityType=pet", { cache: "no-store" });
    const data = await readResponse<{ codes: PetCode[] }>(response);
    setCodes(data.codes);
    setFormats((current) => ({
      ...Object.fromEntries(data.codes.filter((code) => code.status === "active").map((code) => [code.entityId, code.symbology])),
      ...current,
    }));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCodes().catch((error: unknown) => onError(error instanceof Error ? error.message : "No fue posible cargar los identificadores.")), 0);
    return () => window.clearTimeout(timer);
  }, [loadCodes, onError]);

  async function createCode(pet: Pet) {
    setIsSaving(true);
    try {
      const species = pet.species.toLowerCase();
      const designTheme = species.includes("gat") || species.includes("cat") ? "pet_cat"
        : species.includes("perr") || species.includes("dog") ? "pet_dog" : "pet_paws";
      await readResponse(await fetch("/api/crm/qr-codes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "pet", entityId: pet.id, label: pet.name, symbology: formats[pet.id] ?? "qr", designTheme }),
      }));
      await loadCodes();
      setSavedPetId(pet.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible generar el identificador.");
    } finally { setIsSaving(false); }
  }

  return <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
    <h3 className="text-lg font-bold text-slate-950">Identificadores permanentes</h3>
    <p className="mt-1 text-sm text-slate-500">Elige QR o Código 128. El diseño se adapta automáticamente a la especie.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{pets.map((pet) => {
      const code = codes.find((item) => item.entityId === pet.id && item.status === "active");
      return <article key={pet.id} className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3"><div><p className="font-bold text-slate-950">{pet.name}</p><p className="text-xs text-slate-500">{pet.species}</p></div>{code && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Activo</span>}</div>
        {code && <p className="mt-2 font-mono text-xs font-semibold tracking-wide text-slate-500">{code.displayCode}</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><select value={formats[pet.id] ?? code?.symbology ?? "qr"} onChange={(event) => setFormats((current) => ({ ...current, [pet.id]: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="qr">QR con huellitas</option><option value="code128">Código 128</option></select><button type="button" disabled={isSaving} className={primaryButton} onClick={() => void createCode(pet)}>{code ? "Aplicar formato" : "Generar"}</button></div>
        {savedPetId === pet.id && <p className="mt-2 text-xs font-bold text-emerald-700">Identificador guardado y listo para probar.</p>}
        {code && <div className="mt-3 flex items-center gap-3"><a href={`/api/crm/qr-codes/${code.id}/image`} target="_blank" rel="noreferrer" className={secondaryButton}>Ver e imprimir</a><Image key={`${code.id}:${code.symbology}`} src={`/api/crm/qr-codes/${code.id}/image`} alt={`Identificador de ${pet.name}`} width={90} height={58} unoptimized className="rounded-lg border bg-white object-contain" /></div>}
      </article>;
    })}</div>
  </div>;
}
