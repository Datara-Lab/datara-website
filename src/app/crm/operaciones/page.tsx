"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import MotorcycleDealOperationWorkspace from "@/components/crm/MotorcycleDealOperationWorkspace";

type Milestone =
  | "opportunity"
  | "quote"
  | "payment_financing"
  | "reservation"
  | "sales_order"
  | "invoice"
  | "delivery";

type Operation = {
  id: string;
  name: string;
  branchName: string | null;
  leadName: string | null;
  customerName: string | null;
  ownerName: string | null;
  dealStage: string;
  dealStatus: string;
  totalAmount: number;
  currency: string;
  updatedAt: string;
  quoteCount: number;
  financingCount: number;
  receivedPaymentCount: number;
  activeReservationCount: number;
  salesOrderCount: number;
  invoiceCount: number;
  milestone: Milestone;
  kanbanPosition: number | null;
};

type ApiResponse = {
  success: boolean;
  data?: { operations: Operation[]; total: number; industry: string | null };
  error?: string;
};

const motorcycleColumns: Array<{ id: Milestone; label: string; shortLabel: string }> = [
  { id: "opportunity", label: "Oportunidad", shortLabel: "Oportunidad" },
  { id: "quote", label: "Cotización", shortLabel: "Cotización" },
  { id: "payment_financing", label: "Pago o financiamiento", shortLabel: "Pago / crédito" },
  { id: "reservation", label: "Unidad apartada", shortLabel: "Apartado" },
  { id: "sales_order", label: "Orden de venta", shortLabel: "Orden" },
  { id: "invoice", label: "Factura", shortLabel: "Factura" },
  { id: "delivery", label: "Entrega", shortLabel: "Entrega" },
];

const professionalServicesColumns: typeof motorcycleColumns = [
  { id: "opportunity", label: "Oportunidad", shortLabel: "Oportunidad" },
  { id: "quote", label: "Propuesta", shortLabel: "Propuesta" },
  { id: "payment_financing", label: "Negociación", shortLabel: "Negociación" },
  { id: "reservation", label: "Aprobación o contrato", shortLabel: "Contrato" },
  { id: "sales_order", label: "Orden de servicio", shortLabel: "Orden" },
  { id: "invoice", label: "Factura", shortLabel: "Factura" },
  { id: "delivery", label: "Servicio activo", shortLabel: "Servicio activo" },
];

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CommercialOperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draggedOperationId, setDraggedOperationId] = useState<string | null>(null);
  const [savingOperationId, setSavingOperationId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/crm/operations", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "No fue posible cargar las operaciones.");
      }
      setOperations(payload.data.operations);
      setIndustry(payload.data.industry);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar las operaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOperations(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOperations]);

  const visibleOperations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return operations;
    return operations.filter((operation) =>
      [operation.name, operation.customerName, operation.leadName, operation.ownerName, operation.branchName]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("es").includes(normalized)),
    );
  }, [operations, query]);

  const columns = useMemo(
    () => industry === "professional_services"
      ? professionalServicesColumns
      : motorcycleColumns,
    [industry],
  );

  const grouped = useMemo(
    () => new Map(columns.map((column) => [
      column.id,
      visibleOperations
        .filter((operation) => operation.milestone === column.id)
        .sort((left, right) =>
          (left.kanbanPosition ?? Number.MAX_SAFE_INTEGER) -
            (right.kanbanPosition ?? Number.MAX_SAFE_INTEGER) ||
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        ),
    ])),
    [columns, visibleOperations],
  );

  const moveOperation = useCallback(async (
    operationId: string,
    milestone: Milestone,
    beforeOperationId?: string,
  ) => {
    const current = operations.find((operation) => operation.id === operationId);
    if (!current || savingOperationId || beforeOperationId === operationId) return;

    const destination = operations
      .filter((operation) => operation.milestone === milestone && operation.id !== operationId)
      .sort((left, right) =>
        (left.kanbanPosition ?? Number.MAX_SAFE_INTEGER) -
          (right.kanbanPosition ?? Number.MAX_SAFE_INTEGER) ||
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
    const insertionIndex = beforeOperationId
      ? Math.max(0, destination.findIndex((operation) => operation.id === beforeOperationId))
      : destination.length;
    destination.splice(insertionIndex, 0, { ...current, milestone });
    const updates = destination.map((operation, index) => ({
      operationId: operation.id,
      milestone,
      position: (index + 1) * 1000,
    }));
    const previousOperations = operations;

    setSavingOperationId(operationId);
    setError(null);
    setOperations((items) => items.map((item) => {
      const update = updates.find((candidate) => candidate.operationId === item.id);
      return update ? { ...item, milestone: update.milestone, kanbanPosition: update.position } : item;
    }));

    try {
      const response = await fetch("/api/crm/operations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No fue posible mover la operación.");
      }
    } catch (moveError) {
      setOperations(previousOperations);
      setError(moveError instanceof Error ? moveError.message : "No fue posible mover la operación.");
    } finally {
      setSavingOperationId(null);
      setDraggedOperationId(null);
    }
  }, [operations, savingOperationId]);

  return (
    <main className="min-h-screen bg-slate-50/60 px-5 py-8 sm:px-7 lg:px-9">
      <div className="mx-auto max-w-[1800px]">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Ciclo comercial</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950">Operaciones</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Seguimiento integral desde la oportunidad hasta la entrega, construido con los registros reales de cada operación.
            </p>
          </div>
          <div className="flex w-full gap-3 lg:w-auto">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar operación, cliente o responsable"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 lg:w-80"
            />
            <button
              type="button"
              onClick={() => void loadOperations()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
          <span>{visibleOperations.length} operaciones</span>
          <span>Prospecto y cliente permanecen vinculados durante todo el ciclo</span>
          <Link href="/crm/oportunidades" className="text-blue-600 hover:text-blue-800">Administrar oportunidades →</Link>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-7">
            {columns.map((column) => <div key={column.id} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto pb-5">
            <div className="grid min-w-[1540px] grid-cols-7 gap-4">
              {columns.map((column) => {
                const columnOperations = grouped.get(column.id) ?? [];
                return (
                  <section
                    key={column.id}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedOperationId) void moveOperation(draggedOperationId, column.id);
                    }}
                    className="min-h-[520px] rounded-2xl border border-slate-200 bg-slate-100/60 p-3 transition has-[[data-dragging=true]]:border-blue-300"
                  >
                    <header className="flex items-center justify-between px-1 pb-3">
                      <h2 className="text-xs font-black uppercase tracking-[0.1em] text-slate-700">{column.shortLabel}</h2>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500 shadow-sm">{columnOperations.length}</span>
                    </header>
                    <div className="space-y-3">
                      {columnOperations.map((operation) => (
                        <button
                          key={operation.id}
                          type="button"
                          draggable={savingOperationId !== operation.id}
                          data-dragging={draggedOperationId === operation.id}
                          onDragStart={() => setDraggedOperationId(operation.id)}
                          onDragEnd={() => setDraggedOperationId(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (draggedOperationId) {
                              void moveOperation(draggedOperationId, column.id, operation.id);
                            }
                          }}
                          onClick={() => setSelectedOperationId(operation.id)}
                          className="block w-full cursor-grab rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:cursor-grabbing disabled:opacity-60"
                        >
                          <p className="line-clamp-2 text-sm font-black leading-5 text-slate-950">{operation.name}</p>
                          <p className="mt-2 truncate text-xs font-semibold text-slate-600">{operation.customerName ?? operation.leadName ?? "Sin cliente vinculado"}</p>
                          <p className="mt-1 truncate text-[11px] text-slate-400">{operation.branchName ?? "Sin sucursal"}{operation.ownerName ? ` · ${operation.ownerName}` : ""}</p>
                          <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                            <span className="text-xs font-black text-slate-800">{money(operation.totalAmount, operation.currency)}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{operation.dealStage}</span>
                          </div>
                        </button>
                      ))}
                      {columnOperations.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs font-semibold text-slate-400">Sin operaciones</div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {selectedOperationId && industry === "motorcycle_dealership" && (
        <MotorcycleDealOperationWorkspace
          dealId={selectedOperationId}
          onClose={() => setSelectedOperationId(null)}
        />
      )}
      {selectedOperationId && industry !== "motorcycle_dealership" && (() => {
        const selected = operations.find((operation) => operation.id === selectedOperationId);
        if (!selected) return null;
        return (
          <div className="fixed inset-0 z-[180] flex justify-end bg-slate-950/35 backdrop-blur-sm" onClick={() => setSelectedOperationId(null)}>
            <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <header className="sticky top-0 border-b border-slate-200 bg-white px-7 py-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Operación comercial</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">{selected.name}</h2>
                  </div>
                  <button type="button" onClick={() => setSelectedOperationId(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">Cerrar</button>
                </div>
              </header>
              <div className="space-y-6 p-7">
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cliente</p>
                  <p className="mt-2 font-black text-slate-900">{selected.customerName ?? selected.leadName ?? "Sin cliente vinculado"}</p>
                  <p className="mt-1 text-sm text-slate-500">{selected.branchName ?? "Sin sucursal"}{selected.ownerName ? ` · ${selected.ownerName}` : ""}</p>
                </section>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 p-5"><p className="text-xs font-bold text-slate-400">Valor</p><p className="mt-2 text-lg font-black">{money(selected.totalAmount, selected.currency)}</p></div>
                  <div className="rounded-2xl border border-slate-200 p-5"><p className="text-xs font-bold text-slate-400">Etapa</p><p className="mt-2 text-sm font-black">{columns.find((column) => column.id === selected.milestone)?.label}</p></div>
                </div>
                <section className="rounded-2xl border border-slate-200 p-5 text-sm text-slate-600">
                  <p><strong>{selected.quoteCount}</strong> propuestas o cotizaciones</p>
                  <p className="mt-2"><strong>{selected.salesOrderCount}</strong> órdenes relacionadas</p>
                  <p className="mt-2"><strong>{selected.invoiceCount}</strong> facturas relacionadas</p>
                </section>
                <Link href="/crm/oportunidades" className="flex w-full justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Administrar oportunidad</Link>
              </div>
            </aside>
          </div>
        );
      })()}
    </main>
  );
}
