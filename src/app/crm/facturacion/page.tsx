"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";

type Invoice = {
  id: string;
  branchName: string | null;
  dealId: string | null;
  dealName: string | null;
  customerName: string | null;
  salesOrderReference: string;
  status: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  amount: number;
  currency: string;
  documentReference: string | null;
  externalSystem: string | null;
  externalReference: string | null;
  series: string | null;
  folio: string | null;
  paymentForm: string | null;
  paymentMethod: string | null;
  fiscalProvider: string | null;
  fiscalEnvironment: string | null;
  fiscalUuid: string | null;
  stampedAt: string | null;
  cancellationReasonCode: string | null;
  replacementUuid: string | null;
  createdAt: string;
};

type InvoicesResponse = {
  success: boolean;
  data?: {
    invoices: Invoice[];
    salesOrders: Array<{
      id: string;
      dealId: string;
      dealName: string;
      customerName: string | null;
      reference: string;
      totalAmount: number;
      currency: string;
      status: string;
    }>;
    summary: {
      count: number;
      total: number;
      byStatus: Record<string, number>;
    };
    capabilities: {
      invoiceControl: boolean;
      cfdiStamping: boolean;
    };
  };
  error?: string;
};

type FiscalMovement = {
  id: string;
  invoiceId: string | null;
  entryType: "monthly_grant" | "top_up" | "stamp" | "refund" | "adjustment";
  stampDelta: number;
  monthlyRemainingAfter: number;
  topUpRemainingAfter: number;
  providerCost: number;
  currency: string;
  createdAt: string;
};

type FiscalProviderRequest = {
  id: string;
  invoiceId: string | null;
  operation: string;
  status: "pending" | "success" | "error";
  provider: string;
  fiscalUuid: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type FiscalUsageResponse = {
  success: boolean;
  data?: {
    account: {
      configured: boolean;
      enabled: boolean;
      status: "active" | "paused" | "blocked";
      includedMonthlyStamps: number;
      usedMonthlyStamps: number;
      monthlyRemaining: number;
      topUpRemaining: number;
      totalRemaining: number;
      monthlyWindowStart: string | null;
      monthlyWindowEnd: string | null;
    };
    movements: FiscalMovement[];
    providerRequests: FiscalProviderRequest[];
    permissions: {
      canView: boolean;
      canManage: boolean;
    };
  };
  error?: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  requested: "Solicitada",
  issued: "Emitida",
  cancelled: "Cancelada",
  error: "Con error",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  requested: "bg-blue-50 text-blue-700",
  issued: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
  error: "bg-red-50 text-red-700",
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function FacturacionPage() {
  const [data, setData] = useState<InvoicesResponse["data"]>();
  const [fiscalUsage, setFiscalUsage] = useState<FiscalUsageResponse["data"]>();
  const [fiscalError, setFiscalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [version, setVersion] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fiscalMessage, setFiscalMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    salesOrderId: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    amount: "",
    status: "issued",
    externalSystem: "",
    externalReference: "",
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    amount: "",
    status: "pending",
    externalSystem: "",
    externalReference: "",
    cancellationReason: "",
  });
  const [fiscalForm, setFiscalForm] = useState({
    series: "",
    folio: "",
    paymentForm: "03",
    paymentMethod: "PUE",
    cancellationReasonCode: "02",
    replacementUuid: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/crm/invoices", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as InvoicesResponse;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error ?? "No fue posible cargar las facturas.");
        }

        setData(result.data);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar las facturas.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [version]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/crm/fiscal/usage", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as FiscalUsageResponse;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error ?? "No fue posible cargar los timbres fiscales.");
        }

        setFiscalUsage(result.data);
        setFiscalError(null);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setFiscalError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar los timbres fiscales.",
          );
        }
      });

    return () => controller.abort();
  }, [version]);

  const selectedOrder = data?.salesOrders.find(
    (order) => order.id === form.salesOrderId,
  );

  function handleOrderChange(salesOrderId: string) {
    const order = data?.salesOrders.find((item) => item.id === salesOrderId);
    setForm((current) => ({
      ...current,
      salesOrderId,
      amount: order ? String(order.totalAmount) : "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedOrder) {
      setFormError("Selecciona una orden de venta.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const response = await fetch(
        `/api/crm/deals/${encodeURIComponent(selectedOrder.dealId)}/invoices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            salesOrderId: selectedOrder.id,
            invoiceNumber: form.invoiceNumber || undefined,
            invoiceDate: form.invoiceDate || undefined,
            amount: Number(form.amount),
            currency: selectedOrder.currency,
            status: form.status,
            externalSystem: form.externalSystem || undefined,
            externalReference: form.externalReference || undefined,
          }),
        },
      );

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "No fue posible registrar la factura.");
      }

      setIsFormOpen(false);
      setForm({
        salesOrderId: "",
        invoiceNumber: "",
        invoiceDate: new Date().toISOString().slice(0, 10),
        amount: "",
        status: "issued",
        externalSystem: "",
        externalReference: "",
      });
      setVersion((current) => current + 1);
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible registrar la factura.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openInvoice(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setFormError(null);
    setEditForm({
      invoiceNumber: invoice.invoiceNumber ?? "",
      invoiceDate: (invoice.invoiceDate ?? invoice.createdAt).slice(0, 10),
      amount: String(invoice.amount),
      status: invoice.status,
      externalSystem: invoice.externalSystem ?? "",
      externalReference: invoice.externalReference ?? "",
      cancellationReason: "",
    });
    setFiscalForm({
      series: invoice.series ?? "",
      folio: invoice.folio ?? invoice.invoiceNumber ?? "",
      paymentForm: invoice.paymentForm ?? "03",
      paymentMethod: invoice.paymentMethod ?? "PUE",
      cancellationReasonCode: invoice.cancellationReasonCode ?? "02",
      replacementUuid: invoice.replacementUuid ?? "",
    });
  }

  async function executeFiscalAction(action: "stamp" | "cancel") {
    if (!selectedInvoice) return;

    if (action === "stamp" && !fiscalForm.folio.trim()) {
      setFormError("Captura el folio antes de timbrar.");
      return;
    }

    if (
      action === "cancel" &&
      fiscalForm.cancellationReasonCode === "01" &&
      !fiscalForm.replacementUuid.trim()
    ) {
      setFormError("Captura el UUID del CFDI que sustituye a esta factura.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      setFiscalMessage(null);
      const endpoint = `/api/crm/invoices/${encodeURIComponent(selectedInvoice.id)}/${action}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(
          action === "stamp"
            ? {
                series: fiscalForm.series || undefined,
                folio: fiscalForm.folio,
                paymentForm: fiscalForm.paymentForm,
                paymentMethod: fiscalForm.paymentMethod,
                issuedAt: `${editForm.invoiceDate}T12:00:00`,
              }
            : {
                reasonCode: fiscalForm.cancellationReasonCode,
                replacementUuid:
                  fiscalForm.cancellationReasonCode === "01"
                    ? fiscalForm.replacementUuid
                    : undefined,
              },
        ),
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "No fue posible completar la operación fiscal.");
      }

      setSelectedInvoice(null);
      setFiscalMessage(
        result.message ??
          (action === "stamp"
            ? "La factura fue timbrada correctamente."
            : "La cancelación fiscal fue procesada."),
      );
      setVersion((current) => current + 1);
    } catch (actionError) {
      setFormError(
        actionError instanceof Error
          ? actionError.message
          : "No fue posible completar la operación fiscal.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateInvoice(action: "update" | "cancel") {
    if (!selectedInvoice?.dealId) {
      setFormError("La factura no tiene una operación relacionada.");
      return;
    }

    if (action === "cancel" && !editForm.cancellationReason.trim()) {
      setFormError("Captura el motivo de cancelación.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const response = await fetch(
        `/api/crm/deals/${encodeURIComponent(selectedInvoice.dealId)}/invoices/${encodeURIComponent(selectedInvoice.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "cancel"
              ? { action, reason: editForm.cancellationReason }
              : {
                  action,
                  invoiceNumber: editForm.invoiceNumber || null,
                  invoiceDate: editForm.invoiceDate || null,
                  amount: Number(editForm.amount),
                  currency: selectedInvoice.currency,
                  status: editForm.status,
                  externalSystem: editForm.externalSystem || null,
                  externalReference: editForm.externalReference || null,
                },
          ),
        },
      );

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "No fue posible actualizar la factura.");
      }

      setSelectedInvoice(null);
      setVersion((current) => current + 1);
    } catch (updateError) {
      setFormError(
        updateError instanceof Error
          ? updateError.message
          : "No fue posible actualizar la factura.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const visibleInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (data?.invoices ?? []).filter((invoice) => {
      if (status !== "all" && invoice.status !== status) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        invoice.invoiceNumber,
        invoice.customerName,
        invoice.dealName,
        invoice.salesOrderReference,
        invoice.externalReference,
        invoice.branchName,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [data?.invoices, query, status]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Administración comercial"
        title="Facturación"
        description="Controla las facturas relacionadas con las ventas sin perder la trazabilidad de la oportunidad, la orden y el cliente."
        action={<Button type="button" onClick={() => setIsFormOpen(true)}>Registrar factura</Button>}
      />

      {error ? (
        <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </section>
      ) : null}

      {fiscalMessage ? (
        <section className="mt-8 flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
          <span>{fiscalMessage}</span>
          <button
            type="button"
            aria-label="Cerrar mensaje"
            className="text-lg leading-none"
            onClick={() => setFiscalMessage(null)}
          >
            ×
          </button>
        </section>
      ) : null}

      {!isLoading && data ? (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Facturas registradas</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{data.summary.count}</p>
              <p className="mt-2 text-sm text-slate-500">Incluye registros externos y emitidos.</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Monto controlado</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                {formatMoney(data.summary.total, data.invoices[0]?.currency ?? "mxn")}
              </p>
              <p className="mt-2 text-sm text-slate-500">Suma de los documentos visibles.</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Timbrado CFDI</p>
              <p className="mt-3 text-xl font-black text-slate-950">
                {data.capabilities.cfdiStamping ? "Incluido en tu contratación" : "Disponible como extensión"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {data.capabilities.cfdiStamping
                  ? "La conexión con el PAC se habilitará desde esta misma sección."
                  : "El control de facturas funciona sin contratar timbres."}
              </p>
            </article>
          </section>

          {fiscalUsage ? (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Consumo de timbres</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{fiscalUsage.account.totalRemaining} disponibles</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Primero se utilizan los timbres mensuales y después el saldo de recargas.
                    {fiscalUsage.account.monthlyWindowEnd
                      ? ` El saldo mensual se reinicia el ${formatDate(fiscalUsage.account.monthlyWindowEnd)}.`
                      : " El periodo mensual se mostrará al activar el timbrado."}
                  </p>
                </div>

                {fiscalUsage.permissions.canManage ? (
                  <Button href="/contratar" variant="secondary">Comprar timbres</Button>
                ) : null}
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <article className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Timbres mensuales</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">
                        {fiscalUsage.account.monthlyRemaining} de {fiscalUsage.account.includedMonthlyStamps}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-500">{fiscalUsage.account.usedMonthlyStamps} utilizados</p>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${fiscalUsage.account.includedMonthlyStamps > 0
                          ? Math.min(100, (fiscalUsage.account.monthlyRemaining / fiscalUsage.account.includedMonthlyStamps) * 100)
                          : 0}%`,
                      }}
                    />
                  </div>
                </article>

                <article className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Timbres adicionales</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{fiscalUsage.account.topUpRemaining}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-500">Saldo de recargas</p>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-100">
                    <div
                      className="h-full rounded-full bg-violet-600 transition-all"
                      style={{ width: fiscalUsage.account.topUpRemaining > 0 ? "100%" : "0%" }}
                    />
                  </div>
                </article>
              </div>

              {!fiscalUsage.account.enabled ? (
                <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  El control de facturas está disponible, pero el timbrado CFDI todavía no está activo para tu empresa.
                </p>
              ) : null}
            </section>
          ) : null}

          {fiscalError ? (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{fiscalError}</p>
          ) : null}

          {fiscalUsage && fiscalUsage.movements.length > 0 ? (
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-black text-slate-950">Movimientos de timbres</h2>
                <p className="mt-1 text-sm text-slate-500">Asignaciones, compras, consumos, devoluciones y ajustes de tu empresa.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    <tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Movimiento</th><th className="px-5 py-3">Cantidad</th><th className="px-5 py-3">Mensuales</th><th className="px-5 py-3">Adicionales</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fiscalUsage.movements.slice(0, 20).map((movement) => (
                      <tr key={movement.id}>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(movement.createdAt)}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {{ monthly_grant: "Asignación mensual", top_up: "Recarga", stamp: "Timbre utilizado", refund: "Timbre devuelto", adjustment: "Ajuste" }[movement.entryType]}
                        </td>
                        <td className={`px-5 py-4 font-black ${movement.stampDelta > 0 ? "text-emerald-700" : "text-slate-900"}`}>
                          {movement.stampDelta > 0 ? "+" : ""}{movement.stampDelta}
                        </td>
                        <td className="px-5 py-4">{movement.monthlyRemainingAfter}</td>
                        <td className="px-5 py-4">{movement.topUpRemainingAfter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {fiscalUsage && fiscalUsage.providerRequests.length > 0 ? (
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-black text-slate-950">Operaciones CFDI</h2>
                <p className="mt-1 text-sm text-slate-500">Solicitudes reales enviadas al proveedor fiscal.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {fiscalUsage.providerRequests.slice(0, 10).map((request) => (
                  <article key={request.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-bold capitalize text-slate-900">{request.operation} · {request.provider}</p><p className="mt-1 text-xs text-slate-500">{formatDate(request.createdAt)}{request.fiscalUuid ? ` · UUID ${request.fiscalUuid}` : ""}</p></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${request.status === "success" ? "bg-emerald-50 text-emerald-700" : request.status === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{request.status}</span>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">Documentos fiscales</h2>
                <p className="mt-1 text-sm text-slate-500">Consulta el estado y abre la operación comercial relacionada.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar folio, cliente u orden..."
                  className="min-w-64 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="all">Todos los estados</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {visibleInvoices.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <h3 className="text-lg font-black text-slate-950">No hay facturas para mostrar</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Las facturas se registran desde la operación relacionada con una oportunidad y su orden de venta.
                </p>
                <Button href="/crm/oportunidades" className="mt-6">Ir a oportunidades</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Factura</th>
                      <th className="px-5 py-3">Cliente / operación</th>
                      <th className="px-5 py-3">Estado</th>
                      <th className="px-5 py-3">Fecha</th>
                      <th className="px-5 py-3 text-right">Monto</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleInvoices.map((invoice) => (
                      <tr key={invoice.id} className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">{invoice.invoiceNumber ?? "Sin folio"}</p>
                          <p className="mt-1 text-xs text-slate-500">Orden {invoice.salesOrderReference}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{invoice.customerName ?? "Cliente no identificado"}</p>
                          <p className="mt-1 text-xs text-slate-500">{invoice.dealName ?? invoice.branchName ?? "Operación comercial"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[invoice.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABELS[invoice.status] ?? invoice.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(invoice.invoiceDate ?? invoice.createdAt)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-black text-slate-950">{formatMoney(invoice.amount, invoice.currency)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {invoice.status !== "cancelled" ? (
                              <button type="button" onClick={() => openInvoice(invoice)} className="font-bold text-slate-700 transition hover:text-slate-950">Administrar</button>
                            ) : null}
                            {invoice.dealId ? (
                              <Link href={`/crm/oportunidades?dealId=${encodeURIComponent(invoice.dealId)}`} className="font-bold text-blue-600 transition hover:text-blue-800">Ver operación</Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {isLoading ? (
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          ))}
        </section>
      ) : null}

      {isFormOpen && data ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Control de facturas</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Registrar factura</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Relaciona el documento con una orden de venta existente.</p>
              </div>
              <button type="button" className="text-2xl text-slate-400 hover:text-slate-700" onClick={() => setIsFormOpen(false)}>×</button>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-sm font-bold text-slate-700">Orden de venta</span>
                <select required value={form.salesOrderId} onChange={(event) => handleOrderChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
                  <option value="">Selecciona una orden</option>
                  {data.salesOrders.map((order) => (
                    <option key={order.id} value={order.id}>{order.reference} · {order.customerName ?? order.dealName} · {formatMoney(order.totalAmount, order.currency)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-sm font-bold text-slate-700">Folio</span>
                <input value={form.invoiceNumber} onChange={(event) => setForm((current) => ({ ...current, invoiceNumber: event.target.value }))} placeholder="Ej. A-1042" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="text-sm font-bold text-slate-700">Fecha</span>
                <input type="date" value={form.invoiceDate} onChange={(event) => setForm((current) => ({ ...current, invoiceDate: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="text-sm font-bold text-slate-700">Monto</span>
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="text-sm font-bold text-slate-700">Estado</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
                  <option value="pending">Pendiente</option>
                  <option value="requested">Solicitada</option>
                  <option value="issued">Emitida externamente</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-bold text-slate-700">Sistema externo</span>
                <input value={form.externalSystem} onChange={(event) => setForm((current) => ({ ...current, externalSystem: event.target.value }))} placeholder="ERP o proveedor" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="text-sm font-bold text-slate-700">Referencia externa</span>
                <input value={form.externalReference} onChange={(event) => setForm((current) => ({ ...current, externalReference: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
              </label>
            </div>

            {formError ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p> : null}

            <div className="mt-7 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Registrando..." : "Registrar factura"}</Button>
            </div>
          </form>
        </div>
      ) : null}

      {selectedInvoice ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <section className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Factura {selectedInvoice.invoiceNumber ?? "sin folio"}</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Administrar documento</h2>
                <p className="mt-2 text-sm text-slate-500">Los cambios quedan registrados en la línea de vida de la operación.</p>
              </div>
              <button type="button" className="text-2xl text-slate-400 hover:text-slate-700" onClick={() => setSelectedInvoice(null)}>×</button>
            </div>

            {!selectedInvoice.fiscalUuid ? <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label><span className="text-sm font-bold text-slate-700">Folio</span><input value={editForm.invoiceNumber} onChange={(event) => setEditForm((current) => ({ ...current, invoiceNumber: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" /></label>
              <label><span className="text-sm font-bold text-slate-700">Fecha</span><input type="date" value={editForm.invoiceDate} onChange={(event) => setEditForm((current) => ({ ...current, invoiceDate: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" /></label>
              <label><span className="text-sm font-bold text-slate-700">Monto</span><input type="number" min="0" step="0.01" value={editForm.amount} onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" /></label>
              <label><span className="text-sm font-bold text-slate-700">Estado</span><select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"><option value="pending">Pendiente</option><option value="requested">Solicitada</option><option value="issued">Emitida externamente</option><option value="error">Con error</option></select></label>
              <label><span className="text-sm font-bold text-slate-700">Sistema externo</span><input value={editForm.externalSystem} onChange={(event) => setEditForm((current) => ({ ...current, externalSystem: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" /></label>
              <label><span className="text-sm font-bold text-slate-700">Referencia externa</span><input value={editForm.externalReference} onChange={(event) => setEditForm((current) => ({ ...current, externalReference: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" /></label>
              <label className="sm:col-span-2"><span className="text-sm font-bold text-slate-700">Motivo de cancelación administrativa</span><textarea value={editForm.cancellationReason} onChange={(event) => setEditForm((current) => ({ ...current, cancellationReason: event.target.value }))} rows={3} placeholder="Obligatorio únicamente al cancelar" className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm" /></label>
            </div> : (
              <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Los importes y datos fiscales quedan bloqueados después del timbrado. Para corregirlos, cancela el CFDI y emite el sustituto correspondiente.
              </p>
            )}

            {data?.capabilities.cfdiStamping ? (
              <section className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Timbrado CFDI 4.0</p>
                    <h3 className="mt-2 text-lg font-black text-slate-950">
                      {selectedInvoice.fiscalUuid ? "CFDI timbrado" : "Preparar timbrado con Finkok"}
                    </h3>
                  </div>
                  {selectedInvoice.fiscalUuid ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${selectedInvoice.status === "cancelled" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {selectedInvoice.status === "cancelled" ? "Cancelado" : "Vigente en Datara"}
                    </span>
                  ) : null}
                </div>

                {selectedInvoice.fiscalUuid ? (
                  <>
                    <div className="mt-4 rounded-xl border border-emerald-100 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Folio fiscal UUID</p>
                      <p className="mt-1 break-all font-mono text-sm font-bold text-slate-900">{selectedInvoice.fiscalUuid}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Timbrado {selectedInvoice.stampedAt ? formatDate(selectedInvoice.stampedAt) : "correctamente"}
                        {selectedInvoice.fiscalProvider ? ` mediante ${selectedInvoice.fiscalProvider}` : ""}.
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={`/api/crm/invoices/${encodeURIComponent(selectedInvoice.id)}/artifacts/pdf`}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        Descargar PDF
                      </a>
                      <a
                        href={`/api/crm/invoices/${encodeURIComponent(selectedInvoice.id)}/artifacts/xml`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400"
                      >
                        Descargar XML
                      </a>
                    </div>

                    {selectedInvoice.status !== "cancelled" ? (
                      <div className="mt-5 grid gap-4 border-t border-blue-100 pt-5 sm:grid-cols-2">
                        <label>
                          <span className="text-sm font-bold text-slate-700">Motivo SAT</span>
                          <select
                            value={fiscalForm.cancellationReasonCode}
                            onChange={(event) => setFiscalForm((current) => ({ ...current, cancellationReasonCode: event.target.value }))}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          >
                            <option value="01">01 · Comprobante emitido con errores con relación</option>
                            <option value="02">02 · Comprobante emitido con errores sin relación</option>
                            <option value="03">03 · No se llevó a cabo la operación</option>
                            <option value="04">04 · Operación nominativa en factura global</option>
                          </select>
                        </label>
                        {fiscalForm.cancellationReasonCode === "01" ? (
                          <label>
                            <span className="text-sm font-bold text-slate-700">UUID sustituto</span>
                            <input
                              value={fiscalForm.replacementUuid}
                              onChange={(event) => setFiscalForm((current) => ({ ...current, replacementUuid: event.target.value }))}
                              placeholder="UUID del nuevo CFDI"
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                            />
                          </label>
                        ) : null}
                        <div className="sm:col-span-2">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isSubmitting}
                            onClick={() => void executeFiscalAction("cancel")}
                          >
                            {isSubmitting ? "Procesando..." : "Solicitar cancelación ante el SAT"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm font-semibold text-slate-600">Este CFDI está cancelado.</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label>
                        <span className="text-sm font-bold text-slate-700">Serie</span>
                        <input value={fiscalForm.series} onChange={(event) => setFiscalForm((current) => ({ ...current, series: event.target.value }))} placeholder="Ej. A" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" />
                      </label>
                      <label>
                        <span className="text-sm font-bold text-slate-700">Folio</span>
                        <input required value={fiscalForm.folio} onChange={(event) => setFiscalForm((current) => ({ ...current, folio: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" />
                      </label>
                      <label>
                        <span className="text-sm font-bold text-slate-700">Forma de pago SAT</span>
                        <select value={fiscalForm.paymentForm} onChange={(event) => setFiscalForm((current) => ({ ...current, paymentForm: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
                          <option value="01">01 · Efectivo</option>
                          <option value="02">02 · Cheque nominativo</option>
                          <option value="03">03 · Transferencia electrónica</option>
                          <option value="04">04 · Tarjeta de crédito</option>
                          <option value="28">28 · Tarjeta de débito</option>
                          <option value="99">99 · Por definir</option>
                        </select>
                      </label>
                      <label>
                        <span className="text-sm font-bold text-slate-700">Método de pago SAT</span>
                        <select value={fiscalForm.paymentMethod} onChange={(event) => setFiscalForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
                          <option value="PUE">PUE · Pago en una sola exhibición</option>
                          <option value="PPD">PPD · Pago en parcialidades o diferido</option>
                        </select>
                      </label>
                    </div>
                    <p className="mt-4 text-xs leading-5 text-slate-500">Al confirmar se consumirá un timbre. Datara construirá el XML, lo enviará a Finkok y conservará los archivos fiscales de forma privada.</p>
                    <Button type="button" className="mt-4" disabled={isSubmitting} onClick={() => void executeFiscalAction("stamp")}>
                      {isSubmitting ? "Timbrando..." : "Confirmar y timbrar CFDI"}
                    </Button>
                  </>
                )}
              </section>
            ) : null}

            {formError ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p> : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {!selectedInvoice.fiscalUuid ? <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => void updateInvoice("cancel")}>Cancelar registro</Button> : <span />}
              <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setSelectedInvoice(null)}>Cerrar</Button>{!selectedInvoice.fiscalUuid ? <Button type="button" disabled={isSubmitting} onClick={() => void updateInvoice("update")}>{isSubmitting ? "Guardando..." : "Guardar cambios"}</Button> : null}</div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
