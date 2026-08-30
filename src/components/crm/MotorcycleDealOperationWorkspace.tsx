"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "@/components/ui/Button";

type OperationData = {
  deal: {
    id: string;
    name: string;
    customerName: string | null;
    operationType: string;
    status: string;
    stage: string | null;
    totalAmount: number;
    currency: string;
  };
  summary: {
    receivedAmount: number;
    requiredDownPayment: number;
    downPaymentCovered: boolean;
    hasActiveReservation: boolean;
  };
  payments: Array<{
    id: string;
    paymentType: string;
    status: string;
    amount: number;
    currency: string;
    paymentMethod: string | null;
    reference: string | null;
    receivedAt: string;
  }>;
  financingApplications: Array<{
    id: string;
    providerName: string;
    productName: string | null;
    folio: string | null;
    status: string;
    requiredDownPaymentAmount: number;
    requestedAmount: number;
    approvedAmount: number | null;
    termMonths: number | null;
    monthlyPayment: number | null;
    updatedAt: string;
  }>;
  reservations: Array<{
    id: string;
    status: string;
    inventoryUnitId: string;
    vin: string | null;
    serialNumber: string | null;
    productName: string;
    requiredDownPaymentAmount: number;
    eligiblePaymentAmount: number;
    reservedByName: string | null;
    reservedAt: string;
    releasedAt: string | null;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    summary: string;
    actorName: string | null;
    occurredAt: string;
  }>;
};

type UnitOption = {
  id: string;
  vin: string | null;
  serialNumber: string | null;
  productName: string;
  modelYear: number | null;
  color: string | null;
  branchName: string | null;
  locationName: string;
  listPrice: number | null;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

type Eligibility = {
  eligible: boolean;
  reason: string | null;
  requiredAmount: string;
  eligiblePaymentAmount: string;
  financingApprovalRequired: boolean | null;
  financingStatus: string | null;
};

type FinancingProvider = {
  id: string;
  name: string;
  code: string;
  products: Array<{
    id: string;
    name: string;
    code: string;
    minimumDownPaymentPercent: string | null;
    minimumDownPaymentAmount: string | null;
    minimumTermMonths: number | null;
    maximumTermMonths: number | null;
  }>;
};

type Props = {
  dealId: string;
  onClose: () => void;
};

type PendingAction = {
  kind:
    | "cancel_payment"
    | "release_reservation"
    | "mark_sold"
    | "mark_delivered"
    | "financing";
  id: string;
  title: string;
  action?: "submit" | "review" | "approve" | "reject" | "cancel";
  requiresReason: boolean;
  requiresApprovedAmount?: boolean;
};

const tabs = [
  ["summary", "Resumen"],
  ["payments", "Pagos"],
  ["financing", "Financiamiento"],
  ["reservation", "Unidad"],
  ["timeline", "Línea de vida"],
] as const;

function formatMoney(value: number, currency = "mxn") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MotorcycleDealOperationWorkspace({
  dealId,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number][0]>("summary");
  const [data, setData] = useState<OperationData | null>(null);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [financingProviders, setFinancingProviders] =
    useState<FinancingProvider[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentType: "down_payment",
    paymentMethod: "Transferencia",
    reference: "",
    receivedAt: new Date().toISOString().slice(0, 10),
  });
  const [financingForm, setFinancingForm] = useState({
    providerId: "",
    productId: "",
    folio: "",
    unitPrice: "",
    requiredDownPaymentPercent: "",
    requiredDownPaymentAmount: "",
    requestedAmount: "",
    termMonths: "",
    monthlyPayment: "",
    action: "submit",
  });

  const loadOperation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [operationResponse, unitsResponse, financingCatalogResponse] =
        await Promise.all([
        fetch(`/api/crm/deals/${encodeURIComponent(dealId)}/operation`, {
          cache: "no-store",
        }),
        fetch("/api/crm/inventory/units?status=available", {
          cache: "no-store",
        }),
        fetch("/api/crm/financing/catalog", {
          cache: "no-store",
        }),
      ]);
      const operationPayload =
        (await operationResponse.json()) as ApiResponse<OperationData>;
      const unitsPayload =
        (await unitsResponse.json()) as ApiResponse<UnitOption[]>;
      const financingCatalogPayload =
        (await financingCatalogResponse.json()) as ApiResponse<{
          providers: FinancingProvider[];
        }>;

      if (!operationResponse.ok || !operationPayload.success || !operationPayload.data) {
        throw new Error(operationPayload.error ?? "No fue posible cargar la operación.");
      }

      setData(operationPayload.data);
      setUnits(unitsResponse.ok && unitsPayload.success ? unitsPayload.data ?? [] : []);
      setFinancingProviders(
        financingCatalogResponse.ok && financingCatalogPayload.success
          ? financingCatalogPayload.data?.providers ?? []
          : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar la operación.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadOperation();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadOperation]);

  useEffect(() => {
    if (!selectedUnitId) {
      return;
    }

    const controller = new AbortController();

    void fetch(
      `/api/crm/deals/${encodeURIComponent(dealId)}/unit-reservation?inventoryUnitId=${encodeURIComponent(selectedUnitId)}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<Eligibility>;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? "No fue posible evaluar el apartado.");
        }

        setEligibility(payload.data);
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setEligibility(null);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "No fue posible evaluar el apartado.",
          );
        }
      });

    return () => controller.abort();
  }, [dealId, selectedUnitId]);

  const activeReservation = useMemo(
    () =>
      data?.reservations.find(
        (reservation) =>
          reservation.status === "active" || reservation.status === "converted",
      ) ?? null,
    [data],
  );

  const selectedFinancingProvider = useMemo(
    () =>
      financingProviders.find(
        (provider) => provider.id === financingForm.providerId,
      ) ?? null,
    [financingForm.providerId, financingProviders],
  );

  const selectedFinancingProduct = useMemo(
    () =>
      selectedFinancingProvider?.products.find(
        (product) => product.id === financingForm.productId,
      ) ?? null,
    [financingForm.productId, selectedFinancingProvider],
  );

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/crm/deals/${encodeURIComponent(dealId)}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...paymentForm, currency: "mxn" }),
        },
      );
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No fue posible registrar el pago.");
      }

      setPaymentForm((current) => ({ ...current, amount: "", reference: "" }));
      setMessage(payload.message ?? "Pago registrado correctamente.");
      await loadOperation();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible registrar el pago.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFinancingProductChange(productId: string) {
    const product = selectedFinancingProvider?.products.find(
      (candidate) => candidate.id === productId,
    );

    setFinancingForm((current) => ({
      ...current,
      productId,
      requiredDownPaymentPercent:
        product?.minimumDownPaymentPercent ?? "",
      requiredDownPaymentAmount:
        product?.minimumDownPaymentAmount ?? "",
      termMonths:
        product?.minimumTermMonths?.toString() ?? current.termMonths,
    }));
  }

  async function handleFinancingCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/crm/deals/${encodeURIComponent(dealId)}/financing-applications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...financingForm,
            currency: "mxn",
          }),
        },
      );
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error ?? "No fue posible crear la solicitud de financiamiento.",
        );
      }

      setFinancingForm((current) => ({
        ...current,
        folio: "",
        requestedAmount: "",
        monthlyPayment: "",
      }));
      setMessage(payload.message ?? "Solicitud de financiamiento creada.");
      await loadOperation();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible crear la solicitud de financiamiento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReservation() {
    if (!selectedUnitId || !eligibility?.eligible) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/crm/deals/${encodeURIComponent(dealId)}/unit-reservation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryUnitId: selectedUnitId }),
        },
      );
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No fue posible apartar la unidad.");
      }

      setSelectedUnitId("");
      setEligibility(null);
      setMessage(payload.message ?? "Unidad apartada correctamente.");
      await loadOperation();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible apartar la unidad.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestAction(action: PendingAction) {
    setPendingAction(action);
    setActionReason("");
    setApprovedAmount("");
    setError(null);
  }

  async function executePendingAction() {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.requiresReason && !actionReason.trim()) {
      setError("Captura el motivo para continuar.");
      return;
    }

    if (
      pendingAction.requiresApprovedAmount &&
      (!Number.isFinite(Number(approvedAmount)) || Number(approvedAmount) <= 0)
    ) {
      setError("Captura un monto aprobado válido.");
      return;
    }

    let endpoint = "";
    let body: Record<string, unknown> = {};

    if (pendingAction.kind === "cancel_payment") {
      endpoint = `/api/crm/deals/${encodeURIComponent(dealId)}/payments/${encodeURIComponent(pendingAction.id)}`;
      body = { reason: actionReason };
    } else if (pendingAction.kind === "release_reservation") {
      endpoint = `/api/crm/deals/${encodeURIComponent(dealId)}/unit-reservation/${encodeURIComponent(pendingAction.id)}`;
      body = { reason: actionReason };
    } else if (
      pendingAction.kind === "mark_sold" ||
      pendingAction.kind === "mark_delivered"
    ) {
      endpoint = `/api/crm/deals/${encodeURIComponent(dealId)}/unit-reservation/${encodeURIComponent(pendingAction.id)}/lifecycle`;
      body = {
        action:
          pendingAction.kind === "mark_sold"
            ? "mark_sold"
            : "mark_delivered",
      };
    } else {
      endpoint = `/api/crm/deals/${encodeURIComponent(dealId)}/financing-applications/${encodeURIComponent(pendingAction.id)}`;
      body = {
        action: pendingAction.action,
        reason: actionReason || undefined,
        approvedAmount:
          pendingAction.requiresApprovedAmount
            ? approvedAmount
            : undefined,
      };
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No fue posible completar la acción.");
      }

      setPendingAction(null);
      setMessage(payload.message ?? "Acción completada correctamente.");
      await loadOperation();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible completar la acción.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[160] flex justify-end bg-slate-950/40 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <aside className="relative h-full w-full max-w-5xl overflow-y-auto bg-slate-50 shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Operación de motocicleta
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {data?.deal.name ?? "Ciclo comercial"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {data?.deal.customerName ?? "Seguimiento integral de la oportunidad"}
              </p>
            </div>
            <button type="button" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50" onClick={onClose}>
              Cerrar
            </button>
          </div>
          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {tabs.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={[
                  "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition",
                  activeTab === value
                    ? "bg-slate-950 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
                onClick={() => setActiveTab(value)}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="space-y-5 p-6 sm:p-8">
          {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">{message}</div>}
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>}
          {isLoading && <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm font-semibold text-slate-500">Cargando ciclo comercial...</div>}

          {!isLoading && data && activeTab === "summary" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Valor de operación", formatMoney(data.deal.totalAmount, data.deal.currency)],
                  ["Pagos recibidos", formatMoney(data.summary.receivedAmount, data.deal.currency)],
                  ["Enganche requerido", formatMoney(data.summary.requiredDownPayment, data.deal.currency)],
                  ["Unidad", data.summary.hasActiveReservation ? "Apartada" : "Sin apartar"],
                ].map(([label, value]) => (
                  <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
                  </article>
                ))}
              </div>
              <section className={[
                "rounded-3xl border p-6",
                data.summary.downPaymentCovered
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50",
              ].join(" ")}>
                <p className="text-lg font-black text-slate-950">
                  {data.summary.downPaymentCovered
                    ? "Enganche mínimo cubierto"
                    : "Enganche pendiente"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {data.summary.downPaymentCovered
                    ? "La operación ya puede evaluar el apartado de una unidad disponible."
                    : `Faltan ${formatMoney(Math.max(0, data.summary.requiredDownPayment - data.summary.receivedAmount), data.deal.currency)} para cubrir la condición actual.`}
                </p>
              </section>
            </>
          )}

          {!isLoading && data && activeTab === "payments" && (
            <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
              <form className="rounded-3xl border border-slate-200 bg-white p-6" onSubmit={handlePayment}>
                <h3 className="text-lg font-black text-slate-950">Registrar pago</h3>
                <div className="mt-5 space-y-4">
                  <input required type="number" min="0.01" step="0.01" value={paymentForm.amount} placeholder="Monto" className="w-full rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
                  <select value={paymentForm.paymentType} className="w-full rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setPaymentForm((current) => ({ ...current, paymentType: event.target.value }))}>
                    <option value="down_payment">Enganche</option>
                    <option value="payment">Pago</option>
                  </select>
                  <input value={paymentForm.paymentMethod} placeholder="Método de pago" className="w-full rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))} />
                  <input value={paymentForm.reference} placeholder="Referencia" className="w-full rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} />
                  <input type="date" value={paymentForm.receivedAt} className="w-full rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setPaymentForm((current) => ({ ...current, receivedAt: event.target.value }))} />
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Registrando..." : "Registrar pago"}</Button>
                </div>
              </form>
              <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-black text-slate-950">Historial de pagos</h3>
                <div className="mt-4 divide-y divide-slate-100">
                  {data.payments.map((payment) => (
                    <article key={payment.id} className="flex items-center justify-between gap-4 py-4">
                      <div><p className="font-bold text-slate-900">{payment.paymentType === "down_payment" ? "Enganche" : "Pago"}</p><p className="mt-1 text-xs text-slate-500">{formatDate(payment.receivedAt)} · {payment.paymentMethod ?? "Sin método"}</p></div>
                      <div className="text-right"><p className="font-black text-slate-950">{formatMoney(payment.amount, payment.currency)}</p><p className="mt-1 text-xs font-semibold text-slate-400">{payment.status}</p>{payment.status === "received" && <button type="button" className="mt-2 text-xs font-bold text-red-600 hover:text-red-800" onClick={() => requestAction({ kind: "cancel_payment", id: payment.id, title: "Cancelar pago", requiresReason: true })}>Cancelar pago</button>}</div>
                    </article>
                  ))}
                  {data.payments.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Aún no hay pagos registrados.</p>}
                </div>
              </section>
            </div>
          )}

          {!isLoading && data && activeTab === "financing" && (
            <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
              <form className="rounded-3xl border border-slate-200 bg-white p-6" onSubmit={handleFinancingCreate}>
                <h3 className="text-lg font-black text-slate-950">Nueva solicitud</h3>
                <p className="mt-1 text-sm text-slate-500">Las reglas se toman del producto financiero configurado.</p>
                <div className="mt-5 space-y-4">
                  <select required value={financingForm.providerId} className="w-full rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setFinancingForm((current) => ({ ...current, providerId: event.target.value, productId: "", requiredDownPaymentPercent: "", requiredDownPaymentAmount: "" }))}>
                    <option value="">Selecciona financiera</option>
                    {financingProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                  </select>
                  <select value={financingForm.productId} disabled={!selectedFinancingProvider} className="w-full rounded-xl border border-slate-300 px-4 py-3 disabled:bg-slate-100" onChange={(event) => handleFinancingProductChange(event.target.value)}>
                    <option value="">Producto financiero</option>
                    {selectedFinancingProvider?.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  {selectedFinancingProduct && <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">Regla: {selectedFinancingProduct.minimumDownPaymentPercent ? `${selectedFinancingProduct.minimumDownPaymentPercent}% de enganche` : selectedFinancingProduct.minimumDownPaymentAmount ? `${formatMoney(Number(selectedFinancingProduct.minimumDownPaymentAmount))} de enganche` : "sin enganche mínimo configurado"}.</div>}
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="number" min="0.01" step="0.01" value={financingForm.unitPrice} placeholder="Precio unidad" className="rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setFinancingForm((current) => ({ ...current, unitPrice: event.target.value }))} />
                    <input type="text" value={financingForm.folio} placeholder="Folio" className="rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setFinancingForm((current) => ({ ...current, folio: event.target.value }))} />
                    <input type="number" min="0" step="0.01" value={financingForm.requiredDownPaymentAmount} placeholder="Enganche $" className="rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setFinancingForm((current) => ({ ...current, requiredDownPaymentAmount: event.target.value }))} />
                    <input type="number" min="0" max="100" step="0.01" value={financingForm.requiredDownPaymentPercent} placeholder="Enganche %" className="rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setFinancingForm((current) => ({ ...current, requiredDownPaymentPercent: event.target.value }))} />
                    <input type="number" min="0" step="0.01" value={financingForm.requestedAmount} placeholder="Monto solicitado" className="rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setFinancingForm((current) => ({ ...current, requestedAmount: event.target.value }))} />
                    <input type="number" min="1" step="1" value={financingForm.termMonths} placeholder="Plazo meses" className="rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setFinancingForm((current) => ({ ...current, termMonths: event.target.value }))} />
                    <input type="number" min="0" step="0.01" value={financingForm.monthlyPayment} placeholder="Mensualidad" className="col-span-2 rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setFinancingForm((current) => ({ ...current, monthlyPayment: event.target.value }))} />
                  </div>
                  <select value={financingForm.action} className="w-full rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setFinancingForm((current) => ({ ...current, action: event.target.value }))}>
                    <option value="submit">Crear y enviar</option>
                    <option value="draft">Guardar borrador</option>
                  </select>
                  <Button type="submit" disabled={isSubmitting || financingProviders.length === 0}>{isSubmitting ? "Creando..." : "Crear solicitud"}</Button>
                  {financingProviders.length === 0 && <p className="text-xs leading-5 text-amber-700">Primero configura al menos una financiera en el catálogo de financiamiento.</p>}
                </div>
              </form>
              <section className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4"><div><h3 className="text-lg font-black text-slate-950">Solicitudes de financiamiento</h3><p className="mt-1 text-sm text-slate-500">Seguimiento de aprobación por financiera.</p></div></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {data.financingApplications.map((application) => (
                  <article key={application.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex justify-between gap-4"><div><p className="font-black text-slate-950">{application.providerName}</p><p className="mt-1 text-xs text-slate-500">{application.productName ?? "Producto por definir"} · {application.folio ?? "Sin folio"}</p></div><span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{application.status}</span></div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><p><span className="block text-xs text-slate-400">Solicitado</span>{formatMoney(application.requestedAmount)}</p><p><span className="block text-xs text-slate-400">Enganche</span>{formatMoney(application.requiredDownPaymentAmount)}</p></div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      {application.status === "draft" && <button type="button" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white" onClick={() => requestAction({ kind: "financing", id: application.id, action: "submit", title: "Enviar solicitud", requiresReason: false })}>Enviar</button>}
                      {application.status === "submitted" && <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold" onClick={() => requestAction({ kind: "financing", id: application.id, action: "review", title: "Pasar a revisión", requiresReason: false })}>En revisión</button>}
                      {(application.status === "submitted" || application.status === "under_review") && <><button type="button" className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white" onClick={() => requestAction({ kind: "financing", id: application.id, action: "approve", title: "Aprobar financiamiento", requiresReason: false, requiresApprovedAmount: true })}>Aprobar</button><button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700" onClick={() => requestAction({ kind: "financing", id: application.id, action: "reject", title: "Rechazar financiamiento", requiresReason: true })}>Rechazar</button></>}
                      {!["rejected", "cancelled"].includes(application.status) && <button type="button" className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100" onClick={() => requestAction({ kind: "financing", id: application.id, action: "cancel", title: "Cancelar solicitud", requiresReason: true })}>Cancelar</button>}
                    </div>
                  </article>
                ))}
                {data.financingApplications.length === 0 && <p className="md:col-span-2 py-10 text-center text-sm text-slate-500">La operación todavía no tiene solicitudes.</p>}
              </div>
              </section>
            </div>
          )}

          {!isLoading && data && activeTab === "reservation" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-black text-slate-950">Unidad de la operación</h3>
                {activeReservation ? (
                  <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5"><p className="text-xs font-black uppercase tracking-wide text-violet-600">{activeReservation.status === "active" ? "Apartada" : "Vendida"}</p><p className="mt-2 text-xl font-black text-slate-950">{activeReservation.vin ?? activeReservation.serialNumber}</p><p className="mt-1 text-sm text-slate-600">{activeReservation.productName}</p><p className="mt-4 text-xs text-slate-500">{formatDate(activeReservation.reservedAt)} · {activeReservation.reservedByName ?? "Usuario"}</p><div className="mt-5 flex flex-wrap gap-2">{activeReservation.status === "active" ? <><Button type="button" onClick={() => requestAction({ kind: "mark_sold", id: activeReservation.id, title: "Marcar unidad como vendida", requiresReason: false })}>Marcar vendida</Button><Button type="button" variant="secondary" onClick={() => requestAction({ kind: "release_reservation", id: activeReservation.id, title: "Liberar apartado", requiresReason: true })}>Liberar apartado</Button></> : <Button type="button" onClick={() => requestAction({ kind: "mark_delivered", id: activeReservation.id, title: "Confirmar entrega de unidad", requiresReason: false })}>Confirmar entrega</Button>}</div></div>
                ) : (
                  <p className="mt-5 rounded-2xl bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">No hay una unidad apartada.</p>
                )}
              </section>
              {!activeReservation && (
                <section className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h3 className="text-lg font-black text-slate-950">Evaluar apartado</h3>
                  <select value={selectedUnitId} className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => { setSelectedUnitId(event.target.value); setEligibility(null); }}><option value="">Selecciona una unidad disponible</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.vin ?? unit.serialNumber} · {unit.productName} · {unit.branchName ?? unit.locationName}</option>)}</select>
                  {selectedUnitId && !eligibility && <p className="mt-4 text-sm text-slate-500">Evaluando reglas comerciales...</p>}
                  {eligibility && <div className={[
                    "mt-4 rounded-2xl border p-4 text-sm",
                    eligibility.eligible ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800",
                  ].join(" ")}><p className="font-black">{eligibility.eligible ? "Unidad elegible para apartado" : "La unidad todavía no puede apartarse"}</p><p className="mt-1 leading-6">{eligibility.reason ?? `Enganche cubierto: ${formatMoney(Number(eligibility.eligiblePaymentAmount))}.`}</p></div>}
                  <Button type="button" disabled={isSubmitting || !eligibility?.eligible} className="mt-5" onClick={() => void handleReservation()}>{isSubmitting ? "Apartando..." : "Apartar unidad"}</Button>
                </section>
              )}
            </div>
          )}

          {!isLoading && data && activeTab === "timeline" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-black text-slate-950">Línea de vida de la operación</h3>
              <div className="mt-6 space-y-0">
                {data.events.map((event, index) => (
                  <article key={event.id} className="relative grid grid-cols-[20px_1fr] gap-4 pb-6"><div className="relative"><span className="relative z-10 mt-1 block h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />{index < data.events.length - 1 && <span className="absolute left-[5px] top-4 h-[calc(100%+4px)] w-px bg-slate-200" />}</div><div><p className="font-bold text-slate-900">{event.summary}</p><p className="mt-1 text-xs text-slate-500">{formatDate(event.occurredAt)}{event.actorName ? ` · ${event.actorName}` : ""}</p></div></article>
                ))}
                {data.events.length === 0 && <p className="py-10 text-center text-sm text-slate-500">La línea de vida comenzará con la primera acción de la operación.</p>}
              </div>
            </section>
          )}
        </div>
      </aside>

      {pendingAction && (
        <div className="fixed inset-0 z-[180] grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
              Confirmación
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-950">
              {pendingAction.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Esta acción quedará registrada en la línea de vida de la operación.
            </p>

            {pendingAction.requiresApprovedAmount && (
              <label className="mt-5 block text-sm font-semibold text-slate-700">
                Monto aprobado
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={approvedAmount}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  onChange={(event) => setApprovedAmount(event.target.value)}
                />
              </label>
            )}

            {pendingAction.requiresReason && (
              <label className="mt-5 block text-sm font-semibold text-slate-700">
                Motivo
                <textarea
                  rows={3}
                  value={actionReason}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3"
                  onChange={(event) => setActionReason(event.target.value)}
                />
              </label>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPendingAction(null)}
              >
                Volver
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => void executePendingAction()}
              >
                {isSubmitting ? "Procesando..." : "Confirmar"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
