"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DataraTableScroll from "@/components/shared/DataraTableScroll";
import Button from "@/components/ui/Button";

type AuditRecord = {
  id: string;

  entityType: string;
  entityId: string;
  action: string;
  summary: string;

  reason:
    | string
    | null;

  actorName:
    | string
    | null;

  before:
    | Record<
        string,
        unknown
      >
    | null;

  after:
    | Record<
        string,
        unknown
      >
    | null;

  metadata: Record<
    string,
    unknown
  >;

  branchLabel: string;
  locationLabel: string;
  productLabel: string;

  createdAt: string;
};

type AuditResponse = {
  success: boolean;
  data?: AuditRecord[];
  error?: string;
};

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "es-MX",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

const snapshotLabels:
  Record<string, string> = {
    status: "Estado",
    itemCount: "Partidas",
    differenceCount:
      "Partidas con diferencia",
    reference: "Referencia",
    locationName:
      "Ubicación",
    expectedQuantity:
      "Cantidad en sistema",
    countedQuantity:
      "Cantidad física",
    difference:
      "Diferencia",
    foundDuringCount:
      "Encontrado durante conteo",
    approvedAt:
      "Fecha de aprobación",
    cancelledAt:
      "Fecha de cancelación",
    notes: "Notas",

    minimumQuantity:
      "Existencia mínima",

    maximumQuantity:
      "Existencia máxima",

    reorderPoint:
      "Punto de reorden",

    binLocation:
      "Posición física",

    quantity:
      "Existencia",

    reservedQuantity:
      "Cantidad reservada",

    availableQuantity:
      "Cantidad disponible",

    previousQuantity:
      "Existencia anterior",

    resultingQuantity:
      "Existencia resultante",

    averageUnitCost:
      "Costo promedio",

    movementQuantity:
      "Cantidad del movimiento",

    transferredQuantity:
      "Cantidad transferida",

    source:
      "Ubicación de origen",

    destination:
      "Ubicación de destino",

    stockQuantity:
      "Existencia física",

    customerName:
      "Cliente",

    sourceType:
      "Tipo de origen",

    sourceReference:
      "Referencia de origen",

    expiresAt:
      "Fecha de vencimiento",

    reservationCount:
      "Número de reservas",

    manualHours:
      "Plazo de reserva manual",

    qualifiedHours:
      "Plazo de oportunidad calificada",

    proposalHours:
      "Plazo de propuesta",

    negotiationHours:
      "Plazo de negociación",

    depositHours:
      "Plazo con anticipo",

    maximumHours:
      "Plazo máximo",

    allowExtensions:
      "Permitir extensiones",

    autoReleaseExpired:
      "Liberar automáticamente al vencer",

    branchId:
      "Sucursal",

    name:
      "Nombre",

    code:
      "Código",

    type:
      "Tipo",

    active:
      "Activa",

    isDefault:
      "Predeterminada",

    addressLine:
      "Dirección",

    city:
      "Ciudad",

    state:
      "Estado",

    postalCode:
      "Código postal",

    country:
      "País",
  };

function formatSnapshotValue(
  value: unknown,
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Sí"
      : "No";
  }

  if (
    value === null ||
    value === undefined
  ) {
    return "Sin información";
  }

  if (
    typeof value ===
      "object"
  ) {
    return JSON.stringify(
      value,
    );
  }

  return String(value);
}

function SnapshotDetails({
  value,
  comparison,
  tone,
}: {
  value:
    | Record<
        string,
        unknown
      >
    | null;

  comparison:
    | Record<
        string,
        unknown
      >
    | null;

  tone:
    | "before"
    | "after";
}) {
  if (
    !value ||
    Object.keys(value).length ===
      0
  ) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        Sin información
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {Object.entries(value).map(
        ([key, entryValue]) => {
          const comparisonValue =
            comparison?.[key];

          const hasChanged =
            JSON.stringify(
              entryValue,
            ) !==
            JSON.stringify(
              comparisonValue,
            );

          const label =
            snapshotLabels[key] ??
            key;

          return (
            <div
              key={key}
              className={[
                "rounded-xl border px-3 py-2.5 transition",
                hasChanged
                  ? tone === "before"
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-300 bg-emerald-100"
                  : "border-transparent bg-white/60",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">
                  {label}
                </p>

                {hasChanged && (
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      tone === "before"
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-200 text-emerald-800",
                    ].join(" ")}
                  >
                    Modificado
                  </span>
                )}
              </div>

              <p
                className={[
                  "mt-1 break-words text-sm font-semibold",
                  hasChanged
                    ? tone === "before"
                      ? "text-red-800"
                      : "text-emerald-900"
                    : "text-slate-700",
                ].join(" ")}
              >
                {formatSnapshotValue(
                  entryValue,
                )}
              </p>
            </div>
          );
        },
      )}
    </div>
  );
}

export default function InventoryAuditWorkspace() {
  const [
    records,
    setRecords,
  ] = useState<AuditRecord[]>(
    [],
  );

  const [
    selectedRecord,
    setSelectedRecord,
  ] = useState<AuditRecord | null>(
    null,
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    entityFilter,
    setEntityFilter,
  ] = useState("");

  const [
    actionFilter,
    setActionFilter,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadAudit =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/crm/inventory/audit?limit=500",
            {
              cache: "no-store",
            },
          );

        const payload =
          (await response.json()) as
            AuditResponse;

        if (
          !response.ok ||
          !payload.success
        ) {
          throw new Error(
            payload.error ??
              "No fue posible cargar la auditoría.",
          );
        }

        setRecords(
          payload.data ?? [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar la auditoría.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadAudit();
  }, [
    loadAudit,
  ]);

  const entityOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            records.map(
              (record) =>
                record.entityType,
            ),
          ),
        ).sort(),
      [
        records,
      ],
    );

  const actionOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            records.map(
              (record) =>
                record.action,
            ),
          ),
        ).sort(),
      [
        records,
      ],
    );

  const visibleRecords =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return records.filter(
        (record) => {
          if (
            entityFilter &&
            record.entityType !==
              entityFilter
          ) {
            return false;
          }

          if (
            actionFilter &&
            record.action !==
              actionFilter
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return [
            record.summary,
            record.reason,
            record.actorName,
            record.branchLabel,
            record.locationLabel,
            record.productLabel,
            record.entityType,
            record.action,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(
                  normalizedSearch,
                ),
            );
        },
      );
    }, [
      records,
      search,
      entityFilter,
      actionFilter,
    ]);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Trazabilidad operativa
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Auditoría de inventario
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Consulta quién realizó cada cambio, cuándo ocurrió y cuáles fueron sus valores anteriores y nuevos.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              void loadAudit()
            }
          >
            Actualizar historial
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="search"
            value={search}
            placeholder="Buscar usuario, modelo, motivo..."
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />

          <select
            value={entityFilter}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
            onChange={(event) =>
              setEntityFilter(
                event.target.value,
              )
            }
          >
            <option value="">
              Todos los registros
            </option>

            {entityOptions.map(
              (entity) => (
                <option
                  key={entity}
                  value={entity}
                >
                  {entity}
                </option>
              ),
            )}
          </select>

          <select
            value={actionFilter}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
            onChange={(event) =>
              setActionFilter(
                event.target.value,
              )
            }
          >
            <option value="">
              Todas las acciones
            </option>

            {actionOptions.map(
              (action) => (
                <option
                  key={action}
                  value={action}
                >
                  {action}
                </option>
              ),
            )}
          </select>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <p className="text-sm font-semibold text-slate-500">
              Cargando auditoría...
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <DataraTableScroll>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Fecha",
                      "Registro",
                      "Acción",
                      "Descripción",
                      "Ubicación",
                      "Modelo",
                      "Usuario",
                      "Detalle",
                    ].map(
                      (header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {visibleRecords.map(
                    (record) => (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {formatDate(
                            record.createdAt,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {
                              record.entityType
                            }
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            {record.action}
                          </span>
                        </td>

                        <td className="min-w-72 px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {record.summary}
                          </p>

                          {record.reason && (
                            <p className="mt-1 text-xs text-slate-500">
                              Motivo:{" "}
                              {record.reason}
                            </p>
                          )}
                        </td>

                        <td className="min-w-52 px-4 py-3 text-sm text-slate-600">
                          {
                            record.locationLabel
                          }
                        </td>

                        <td className="min-w-52 px-4 py-3 text-sm text-slate-600">
                          {
                            record.productLabel
                          }
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">
                          {record.actorName ??
                            "Usuario"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setSelectedRecord(
                                record,
                              )
                            }
                          >
                            Ver cambios
                          </Button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>

              {visibleRecords.length ===
                0 && (
                <div className="px-6 py-16 text-center">
                  <p className="font-bold text-slate-800">
                    No hay eventos de auditoría
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Los nuevos cambios de inventario aparecerán aquí.
                  </p>
                </div>
              )}
            </DataraTableScroll>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-[190]">
          <button
            type="button"
            aria-label="Cerrar detalle"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() =>
              setSelectedRecord(null)
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                    Detalle de auditoría
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {
                      selectedRecord.action
                    }
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {
                      selectedRecord.summary
                    }
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                  onClick={() =>
                    setSelectedRecord(
                      null,
                    )
                  }
                >
                  ×
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Fecha
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(
                        selectedRecord
                          .createdAt,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Usuario
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedRecord
                        .actorName ??
                        "Usuario"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Ubicación
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {
                        selectedRecord
                          .locationLabel
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Modelo
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {
                        selectedRecord
                          .productLabel
                      }
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="font-bold text-amber-900">
                    Antes
                  </p>

                  <SnapshotDetails
                    value={
                      selectedRecord.before
                    }
                    comparison={
                      selectedRecord.after
                    }
                    tone="before"
                  />
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="font-bold text-emerald-900">
                    Después
                  </p>

                  <SnapshotDetails
                    value={
                      selectedRecord.after
                    }
                    comparison={
                      selectedRecord.before
                    }
                    tone="after"
                  />
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}