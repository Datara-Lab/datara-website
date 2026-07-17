"use client";

import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import type {
  CRMFieldConfig,
  CRMModuleConfig,
} from "@/types/crm-config";

export type CRMRecord = {
  id: string;
  [key: string]: unknown;
};

type CRMApiResponse = {
  success: boolean;
  data?: CRMRecord[];
  error?: string;
  meta?: {
    count?: number;
    page?: number;
    perPage?: number;
    moreRecords?: boolean;
  };
};

type CRMDataTableProps = {
  module: CRMModuleConfig;
  endpoint: string;

  createLabel?: string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;

  onCreate?: () => void;
  onView?: (record: CRMRecord) => void;
  onEdit?: (record: CRMRecord) => void;
};

type SortDirection = "asc" | "desc";

function getTableFields(
  module: CRMModuleConfig,
): CRMFieldConfig[] {
  return [...module.fields]
    .filter(
      (field) =>
        field.showInTable === true &&
        field.hidden !== true,
    )
    .sort(
      (a, b) =>
        (a.tableOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.tableOrder ?? Number.MAX_SAFE_INTEGER),
    );
}

function normalizeSearchValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeSearchValue(item))
      .join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => normalizeSearchValue(item))
      .join(" ");
  }

  return String(value);
}

function formatDateValue(
  value: unknown,
  includeTime: boolean,
): string {
  if (typeof value !== "string" || !value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
}

function formatCurrencyValue(value: unknown): string {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function formatNumberValue(value: unknown): string {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return new Intl.NumberFormat("es-MX").format(
    numberValue,
  );
}

function getStatusBadgeClassName(
  value: string,
): string {
  const normalizedValue = value
    .trim()
    .toLowerCase();

  if (
    normalizedValue.includes("activa") ||
    normalizedValue.includes("activo") ||
    normalizedValue.includes("ganado") ||
    normalizedValue.includes("convertido")
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    normalizedValue.includes("programada") ||
    normalizedValue.includes("pendiente") ||
    normalizedValue.includes("negociación") ||
    normalizedValue.includes("contactado")
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (
    normalizedValue.includes("pausada") ||
    normalizedValue.includes("pausado")
  ) {
    return "bg-blue-50 text-blue-700";
  }

  if (
    normalizedValue.includes("inactiva") ||
    normalizedValue.includes("inactivo") ||
    normalizedValue.includes("expirada") ||
    normalizedValue.includes("perdido") ||
    normalizedValue.includes("cancelado")
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function formatFieldValue(
  field: CRMFieldConfig,
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return (
      <span className="text-slate-400">—</span>
    );
  }

  switch (field.type) {
    case "currency":
      return formatCurrencyValue(value);

    case "number":
      return formatNumberValue(value);

    case "percentage":
      return `${formatNumberValue(value)}%`;

    case "date":
      return formatDateValue(value, false);

    case "datetime":
      return formatDateValue(value, true);

    case "checkbox":
      return (
        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            Boolean(value)
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {Boolean(value) ? "Sí" : "No"}
        </span>
      );

    case "multiselect": {
      const values = Array.isArray(value)
        ? value
        : [value];

      return (
        <div className="flex flex-wrap gap-1.5">
          {values.map((item, index) => (
            <span
              key={`${String(item)}-${index}`}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    case "lookup": {
      if (
        typeof value === "object" &&
        value !== null
      ) {
        const lookupValue = value as {
          name?: string;
          label?: string;
        };

        return (
          lookupValue.name ??
          lookupValue.label ??
          "Registro relacionado"
        );
      }

      return String(value);
    }

    case "select": {
      const textValue = String(value);

      return (
        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            getStatusBadgeClassName(textValue),
          ].join(" ")}
        >
          {textValue}
        </span>
      );
    }

    default:
      return String(value);
  }
}

function compareValues(
  a: unknown,
  b: unknown,
): number {
  if (a === null || a === undefined) {
    return 1;
  }

  if (b === null || b === undefined) {
    return -1;
  }

  if (
    typeof a === "number" &&
    typeof b === "number"
  ) {
    return a - b;
  }

  return String(a).localeCompare(
    String(b),
    "es-MX",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function LoadingRows({
  columns,
}: {
  columns: number;
}) {
  return (
    <>
      {Array.from({ length: 5 }).map(
        (_, rowIndex) => (
          <tr
            key={rowIndex}
            className="border-b border-slate-100"
          >
            {Array.from({
              length: columns,
            }).map((__, columnIndex) => (
              <td
                key={columnIndex}
                className="px-5 py-5"
              >
                <div className="h-4 animate-pulse rounded-full bg-slate-200" />
              </td>
            ))}
          </tr>
        ),
      )}
    </>
  );
}

export default function CRMDataTable({
  module,
  endpoint,
  createLabel,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  onCreate,
  onView,
  onEdit,
}: CRMDataTableProps) {
  const [records, setRecords] = useState<
    CRMRecord[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState<
    string | null
  >(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [sortField, setSortField] = useState<
    string | null
  >(module.defaultSortField ?? null);

  const [sortDirection, setSortDirection] =
    useState<SortDirection>(
      module.defaultSortDirection ?? "asc",
    );

  const tableFields = useMemo(
    () => getTableFields(module),
    [module],
  );

  async function loadRecords() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      });

      const payload =
        (await response.json()) as CRMApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error ??
            `No fue posible cargar ${module.pluralLabel.toLowerCase()}.`,
        );
      }

      setRecords(payload.data ?? []);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : `No fue posible cargar ${module.pluralLabel.toLowerCase()}.`;

      setError(message);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const visibleRecords = useMemo(() => {
    const normalizedSearchTerm = searchTerm
      .trim()
      .toLowerCase();

    const searchFields =
      module.searchFields?.length
        ? module.searchFields
        : tableFields.map(
            (field) => field.key,
          );

    const filteredRecords =
      normalizedSearchTerm.length === 0
        ? records
        : records.filter((record) =>
            searchFields.some((fieldKey) =>
              normalizeSearchValue(
                record[fieldKey],
              )
                .toLowerCase()
                .includes(normalizedSearchTerm),
            ),
          );

    if (!sortField) {
      return filteredRecords;
    }

    return [...filteredRecords].sort(
      (a, b) => {
        const result = compareValues(
          a[sortField],
          b[sortField],
        );

        return sortDirection === "asc"
          ? result
          : -result;
      },
    );
  }, [
    module.searchFields,
    records,
    searchTerm,
    sortDirection,
    sortField,
    tableFields,
  ]);

  function handleSort(fieldKey: string) {
    if (sortField === fieldKey) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc"
          ? "desc"
          : "asc",
      );

      return;
    }

    setSortField(fieldKey);
    setSortDirection("asc");
  }

  const hasActions = Boolean(
    onView || onEdit,
  );

  const totalColumns =
    tableFields.length +
    (hasActions ? 1 : 0);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-950">
              {module.pluralLabel}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isLoading
                ? "Cargando registros..."
                : `${visibleRecords.length} de ${records.length} registros`}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-80">
              <input
                type="search"
                value={searchTerm}
                placeholder={
                  searchPlaceholder ??
                  `Buscar ${module.pluralLabel.toLowerCase()}...`
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
              />

              {searchTerm && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 transition hover:text-slate-700"
                  onClick={() =>
                    setSearchTerm("")
                  }
                >
                  ×
                </button>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={() =>
                void loadRecords()
              }
            >
              Actualizar
            </Button>

            {module.allowCreate !== false &&
              onCreate && (
                <Button onClick={onCreate}>
                  {createLabel ??
                    `Nueva ${module.singularLabel.toLowerCase()}`}
                </Button>
              )}
          </div>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-red-700">
                No fue posible cargar la
                información
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={() =>
                void loadRecords()
              }
            >
              Reintentar
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {tableFields.map((field) => (
                <th
                  key={field.key}
                  scope="col"
                  style={{
                    minWidth:
                      field.tableWidth ??
                      "160px",
                  }}
                  className="px-5 py-4 text-left"
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                    onClick={() =>
                      handleSort(field.key)
                    }
                  >
                    {field.label}

                    {sortField === field.key && (
                      <span className="text-xs text-emerald-600">
                        {sortDirection === "asc"
                          ? "↑"
                          : "↓"}
                      </span>
                    )}
                  </button>
                </th>
              ))}

              {hasActions && (
                <th
                  scope="col"
                  className="sticky right-0 min-w-[170px] bg-slate-50 px-5 py-4 text-right text-sm font-semibold text-slate-700"
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <LoadingRows
                columns={totalColumns}
              />
            ) : visibleRecords.length > 0 ? (
              visibleRecords.map(
                (record) => (
                  <tr
                    key={record.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/80"
                  >
                    {tableFields.map(
                      (field) => (
                        <td
                          key={`${record.id}-${field.key}`}
                          className="px-5 py-4 align-middle text-sm text-slate-700"
                        >
                          {formatFieldValue(
                            field,
                            record[field.key],
                          )}
                        </td>
                      ),
                    )}

                    {hasActions && (
                      <td className="sticky right-0 bg-white px-5 py-4 text-right group-hover:bg-slate-50">
                        <div className="flex justify-end gap-2">
                          {onView && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                onView(record)
                              }
                            >
                              Ver
                            </Button>
                          )}

                          {onEdit &&
                            module.allowEdit !==
                              false && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  onEdit(record)
                                }
                              >
                                Editar
                              </Button>
                            )}
                        </div>
                      </td>
                    )}
                  </tr>
                ),
              )
            ) : (
              <tr>
                <td
                  colSpan={Math.max(
                    totalColumns,
                    1,
                  )}
                  className="px-6 py-16 text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-black text-emerald-700">
                    D
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-slate-950">
                    {searchTerm
                      ? "No encontramos coincidencias"
                      : emptyTitle ??
                        `No hay ${module.pluralLabel.toLowerCase()}`}
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    {searchTerm
                      ? "Prueba con otro nombre, estado o término de búsqueda."
                      : emptyDescription ??
                        `Cuando registres ${module.pluralLabel.toLowerCase()}, aparecerán aquí.`}
                  </p>

                  {!searchTerm &&
                    module.allowCreate !==
                      false &&
                    onCreate && (
                      <div className="mt-6">
                        <Button
                          onClick={onCreate}
                        >
                          {createLabel ??
                            `Nueva ${module.singularLabel.toLowerCase()}`}
                        </Button>
                      </div>
                    )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}