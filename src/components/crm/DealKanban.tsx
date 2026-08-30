"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  CRMFieldOption,
} from "@/types/crm-config";

type DealRecord = {
  id: string;
  name?: unknown;
  stage?: unknown;
  value?: unknown;
  expectedAmount?: unknown;
  customer?: unknown;
  customerName?: unknown;
  owner?: unknown;
  ownerName?: unknown;
  probability?: unknown;
};

type DealsResponse = {
  success: boolean;
  data?: DealRecord[] | { records?: DealRecord[] };
  permissions?: {
    canEdit?: boolean;
  };
  meta?: {
    permissions?: {
      canEdit?: boolean;
    };
  };
  error?: string;
};

function textValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return textValue(
      record.name ??
      record.label ??
      record.displayName ??
      "",
    );
  }

  return "";
}

function moneyValue(record: DealRecord): string | null {
  const raw = record.value ?? record.expectedAmount;
  const amount = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DealKanban({
  stages,
  version,
  onView,
}: {
  stages: CRMFieldOption[];
  version: number;
  onView: (record: DealRecord) => void;
}) {
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/crm/deals", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json() as DealsResponse;

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.error ?? "No fue posible cargar el pipeline.",
          );
        }

        if (!controller.signal.aborted) {
          const loadedRecords = Array.isArray(payload.data)
            ? payload.data
            : payload.data?.records ?? [];

          setRecords(loadedRecords);
          setCanEdit(
            payload.permissions?.canEdit === true ||
            payload.meta?.permissions?.canEdit === true,
          );
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar el pipeline.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [version]);

  const columns = useMemo(() => {
    const configured = stages.length > 0
      ? stages
      : [
          { label: "Nueva", value: "Nueva" },
          { label: "En seguimiento", value: "En seguimiento" },
          { label: "Propuesta", value: "Propuesta" },
          { label: "Negociación", value: "Negociación" },
          { label: "Ganada", value: "Ganada" },
          { label: "Perdida", value: "Perdida" },
        ];

    const normalizedConfigured = configured.filter(
      (stage) => Boolean(stage.value),
    );
    const known = new Set(
      normalizedConfigured.map((stage) => stage.value),
    );
    const hasUnassigned = records.some(
      (record) => !textValue(record.stage),
    );
    const additional = records
      .map((record) => textValue(record.stage))
      .filter((stage) => stage && !known.has(stage));

    return [
      ...(hasUnassigned
        ? [{ label: "Sin etapa", value: "__unassigned__" }]
        : []),
      ...normalizedConfigured,
      ...Array.from(new Set(additional)).map((stage) => ({
        label: stage,
        value: stage,
      })),
    ];
  }, [records, stages]);

  async function move(record: DealRecord, stage: string) {
    if (!canEdit || textValue(record.stage) === stage) {
      return;
    }

    const previousStage = textValue(record.stage);
    setMovingId(record.id);
    setError(null);
    setRecords((current) =>
      current.map((item) =>
        item.id === record.id ? { ...item, stage } : item,
      ),
    );

    try {
      const response = await fetch(
        "/api/crm/deals/" +
          encodeURIComponent(record.id) +
          "/stage",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage }),
        },
      );
      const payload = await response.json() as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No fue posible cambiar la etapa.");
      }
    } catch (moveError) {
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? { ...item, stage: previousStage }
            : item,
        ),
      );
      setError(
        moveError instanceof Error
          ? moveError.message
          : "No fue posible cambiar la etapa.",
      );
    } finally {
      setMovingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-72 place-items-center rounded-[28px] border border-slate-200 bg-white text-sm font-semibold text-slate-500">
        Cargando pipeline...
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3">
        <p className="text-sm font-bold text-slate-700">
          {records.length} {records.length === 1 ? "operación" : "operaciones"}
        </p>
        <p className="text-xs font-semibold text-slate-400">
          Pipeline de oportunidades
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {columns.map((column) => {
            const cards = records.filter((record) => {
              const currentStage = textValue(record.stage);
              return column.value === "__unassigned__"
                ? !currentStage
                : currentStage === column.value;
            });
            const total = cards.reduce(
              (sum, record) => {
                const amount = Number(record.value ?? record.expectedAmount);
                return sum + (Number.isFinite(amount) ? amount : 0);
              },
              0,
            );

            return (
              <div
                key={column.value}
                className="w-[310px] shrink-0 rounded-[24px] border border-slate-200 bg-slate-50/80 p-3"
                onDragOver={(event) => {
                  if (canEdit) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("text/plain");
                  const record = records.find((item) => item.id === id);
                  if (record) void move(record, column.value);
                }}
              >
                <header className="px-2 pb-3 pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-900">{column.label}</h3>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm">
                      {cards.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      maximumFractionDigits: 0,
                    }).format(total)}
                  </p>
                </header>

                <div className="space-y-3">
                  {cards.map((record) => (
                    <article
                      key={record.id}
                      draggable={canEdit}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", record.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => onView(record)}
                      >
                        <p className="font-bold leading-5 text-slate-950">
                          {textValue(record.name) || "Oportunidad"}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {textValue(record.customerName ?? record.customer) || "Sin cliente"}
                        </p>
                        {moneyValue(record) && (
                          <p className="mt-3 text-sm font-black text-emerald-700">
                            {moneyValue(record)}
                          </p>
                        )}
                      </button>

                      {canEdit && (
                        <select
                          aria-label="Cambiar etapa"
                          value={textValue(record.stage)}
                          disabled={movingId === record.id}
                          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
                          onChange={(event) => void move(record, event.target.value)}
                        >
                          {columns.map((stage) => (
                            <option key={stage.value} value={stage.value}>
                              {stage.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </article>
                  ))}

                  {cards.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs font-semibold text-slate-400">
                      Arrastra una oportunidad aquí
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
