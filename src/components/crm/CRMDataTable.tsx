"use client";

import {
  useOrganization,
} from "@clerk/nextjs";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Button from "@/components/ui/Button";

import { useAuth } from "@/contexts/AuthContext";

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

function getAvailableTableFields(
  module: CRMModuleConfig,
): CRMFieldConfig[] {
  return [...module.fields]
    .filter(
      (field) =>
        field.hidden !== true &&
        (
          field.showInTable === true ||
          field.showInDetail === true
        ),
    )
    .sort(
      (a, b) =>
        (
          a.tableOrder ??
          a.detailOrder ??
          Number.MAX_SAFE_INTEGER
        ) -
        (
          b.tableOrder ??
          b.detailOrder ??
          Number.MAX_SAFE_INTEGER
        ),
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

function getExportValue(
  field: CRMFieldConfig,
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        getExportValue(
          field,
          item,
        ),
      )
      .filter(Boolean)
      .join(" | ");
  }

  if (
    typeof value === "object"
  ) {
    const relatedValue =
      value as {
        name?: string;
        label?: string;
        email?: string;
        value?: string;
        id?: string;
      };

    return (
      relatedValue.name ??
      relatedValue.label ??
      relatedValue.email ??
      relatedValue.value ??
      relatedValue.id ??
      ""
    );
  }

  if (field.type === "checkbox") {
    return Boolean(value)
      ? "Sí"
      : "No";
  }

  if (field.type === "date") {
    return formatDateValue(
      value,
      false,
    );
  }

  if (field.type === "datetime") {
    return formatDateValue(
      value,
      true,
    );
  }

  return String(value);
}

function escapeCsvValue(
  value: string,
): string {
  return `"${value.replace(
    /"/g,
    "\"\"",
  )}"`;
}

function escapeHtml(
  value: string,
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getExportFileName(
  label: string,
  extension: "csv" | "pdf",
): string {
  const normalizedLabel = label
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-|-$/g,
      "",
    );

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  return `${normalizedLabel || "registros"}-${date}.${extension}`;
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
  const {
    organization,
  } = useOrganization();
  const [records, setRecords] = useState<
    CRMRecord[]
  >([]);

  const {
    user,
  } = useAuth();

  const columnMenuRef =
    useRef<HTMLDivElement>(null);

  const [
    isColumnMenuOpen,
    setIsColumnMenuOpen,
  ] = useState(false);

  const [
    visibleColumnKeys,
    setVisibleColumnKeys,
  ] = useState<string[]>(() =>
    getTableFields(module).map(
      (field) => field.key,
    ),
  );

  const [
    columnPreferencesLoaded,
    setColumnPreferencesLoaded,
  ] = useState(false);

  const columnStorageKey =
    useMemo(() => {
      if (!user) {
        return null;
      }

      return [
        "datara",
        "crm",
        "columns",
        user.tenantId,
        user.id,
        module.id,
      ].join(":");
    }, [
      module.id,
      user,
    ]);

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

    const availableTableFields =
    useMemo(
      () =>
        getAvailableTableFields(
          module,
        ),
      [module],
    );

  useEffect(() => {
    setColumnPreferencesLoaded(false);

    const availableKeys =
      availableTableFields.map(
        (field) => field.key,
      );

    if (!columnStorageKey) {
      setVisibleColumnKeys(
        tableFields.map(
          (field) => field.key,
        ),
      );
      setColumnPreferencesLoaded(
        true,
      );
      return;
    }

    try {
      const storedValue =
        window.localStorage.getItem(
          columnStorageKey,
        );

      if (!storedValue) {
        setVisibleColumnKeys(
          tableFields.map(
            (field) => field.key,
          ),
        );
      } else {
        const parsedValue: unknown =
          JSON.parse(storedValue);

        const validKeys =
          Array.isArray(parsedValue)
            ? parsedValue.filter(
                (
                  key,
                ): key is string =>
                  typeof key ===
                    "string" &&
                  availableKeys.includes(
                    key,
                  ),
              )
            : [];

        setVisibleColumnKeys(
          validKeys.length > 0
            ? validKeys
            : availableKeys,
        );
      }
    } catch {
      setVisibleColumnKeys(
        tableFields.map(
          (field) => field.key,
        ),
      );
    }

    setColumnPreferencesLoaded(true);
      }, [
        columnStorageKey,
        availableTableFields,
        tableFields,
      ]);

  useEffect(() => {
    if (
      !columnStorageKey ||
      !columnPreferencesLoaded
    ) {
      return;
    }

    window.localStorage.setItem(
      columnStorageKey,
      JSON.stringify(
        visibleColumnKeys,
      ),
    );
  }, [
    columnPreferencesLoaded,
    columnStorageKey,
    visibleColumnKeys,
  ]);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsColumnMenuOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsColumnMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

      const visibleTableFields =
        useMemo(() => {
          const fieldsByKey =
            new Map(
              availableTableFields.map(
                (field) => [
                  field.key,
                  field,
                ],
              ),
            );

          return visibleColumnKeys
            .map((fieldKey) =>
              fieldsByKey.get(
                fieldKey,
              ),
            )
            .filter(
              (
                field,
              ): field is CRMFieldConfig =>
                field !== undefined,
            );
        }, [
          availableTableFields,
          visibleColumnKeys,
        ]);

  function toggleColumn(
    fieldKey: string,
  ) {
    setVisibleColumnKeys(
      (currentKeys) => {
        const isVisible =
          currentKeys.includes(
            fieldKey,
          );

        if (
          isVisible &&
          currentKeys.length === 1
        ) {
          return currentKeys;
        }

        return isVisible
          ? currentKeys.filter(
              (key) =>
                key !== fieldKey,
            )
          : [
              ...currentKeys,
              fieldKey,
            ];
      },
    );
  }

    function moveColumn(
      fieldKey: string,
      direction: "left" | "right",
    ) {
      setVisibleColumnKeys(
        (currentKeys) => {
          const currentIndex =
            currentKeys.indexOf(
              fieldKey,
            );

          if (currentIndex < 0) {
            return currentKeys;
          }

          const targetIndex =
            direction === "left"
              ? currentIndex - 1
              : currentIndex + 1;

          if (
            targetIndex < 0 ||
            targetIndex >=
              currentKeys.length
          ) {
            return currentKeys;
          }

          const nextKeys = [
            ...currentKeys,
          ];

          [
            nextKeys[currentIndex],
            nextKeys[targetIndex],
          ] = [
            nextKeys[targetIndex],
            nextKeys[currentIndex],
          ];

          return nextKeys;
        },
      );
    }

  function resetColumns() {
    setVisibleColumnKeys(
      tableFields.map(
        (field) => field.key,
      ),
    );
  }

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

  function handleExportCsv() {
    if (
      visibleRecords.length === 0 ||
      visibleTableFields.length === 0
    ) {
      return;
    }

    const header = visibleTableFields
      .map((field) =>
        escapeCsvValue(field.label),
      )
      .join(",");

    const rows = visibleRecords.map(
      (record) =>
        visibleTableFields
          .map((field) =>
            escapeCsvValue(
              getExportValue(
                field,
                record[field.key],
              ),
            ),
          )
          .join(","),
    );

    const csvContent = [
      header,
      ...rows,
    ].join("\r\n");

    const blob = new Blob(
      [
        "\uFEFF",
        csvContent,
      ],
      {
        type:
          "text/csv;charset=utf-8",
      },
    );

    const downloadUrl =
      URL.createObjectURL(blob);

    const downloadLink =
      document.createElement("a");

    downloadLink.href =
      downloadUrl;

    downloadLink.download =
      getExportFileName(
        module.pluralLabel,
        "csv",
      );

    document.body.appendChild(
      downloadLink,
    );

    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(
      downloadUrl,
    );
  }

  function handleExportPdf() {
    if (
      visibleRecords.length === 0 ||
      visibleTableFields.length === 0
    ) {
      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank",
      );

    if (!printWindow) {
      window.alert(
        "El navegador bloqueó la ventana del PDF. Permite las ventanas emergentes e inténtalo nuevamente.",
      );
      return;
    }

    printWindow.opener = null;

    const companyName =
      organization?.name ??
      "Datara CRM";

    const companyLogo =
      organization?.imageUrl ??
      `${window.location.origin}/logos/lab.png`;

    const generatedAt =
      new Intl.DateTimeFormat(
        "es-MX",
        {
          dateStyle: "long",
          timeStyle: "short",
        },
      ).format(new Date());

    const tableHeader =
      visibleTableFields
        .map(
          (field) =>
            `<th>${escapeHtml(field.label)}</th>`,
        )
        .join("");

    const tableRows =
      visibleRecords
        .map((record) => {
          const cells =
            visibleTableFields
              .map((field) => {
                const value =
                  getExportValue(
                    field,
                    record[field.key],
                  );

                return `<td>${escapeHtml(value || "—")}</td>`;
              })
              .join("");

          return `<tr>${cells}</tr>`;
        })
        .join("");

    const appliedFilter =
      searchTerm.trim()
        ? `
          <p class="filter">
            Filtro aplicado:
            <strong>${escapeHtml(
              searchTerm.trim(),
            )}</strong>
          </p>
        `
        : "";

    const documentTitle =
      getExportFileName(
        module.pluralLabel,
        "pdf",
      ).replace(/\.pdf$/, "");

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(documentTitle)}</title>

          <style>
            @page {
              size: landscape;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              color: #0f172a;
              background: #ffffff;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              font-size: 11px;
            }

            .report {
              width: 100%;
            }

            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 24px;
              margin-bottom: 20px;
              padding-bottom: 16px;
              border-bottom: 2px solid #10b981;
            }

            .brand {
              display: flex;
              align-items: center;
              gap: 14px;
              min-width: 0;
            }

            .logo {
              width: 64px;
              height: 64px;
              object-fit: contain;
              border-radius: 12px;
            }

            .company {
              margin: 0;
              color: #0f172a;
              font-size: 18px;
              font-weight: 700;
            }

            .module {
              margin: 4px 0 0;
              color: #059669;
              font-size: 26px;
              font-weight: 800;
            }

            .metadata {
              color: #64748b;
              text-align: right;
              line-height: 1.6;
            }

            .summary {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              margin-bottom: 14px;
            }

            .count {
              margin: 0;
              color: #475569;
              font-size: 12px;
            }

            .filter {
              margin: 0;
              color: #475569;
              font-size: 12px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
            }

            thead {
              display: table-header-group;
            }

            tr {
              page-break-inside: avoid;
            }

            th {
              padding: 10px 9px;
              border: 1px solid #cbd5e1;
              color: #ffffff;
              background: #0f766e;
              font-size: 10px;
              font-weight: 700;
              text-align: left;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            td {
              padding: 9px;
              border: 1px solid #e2e8f0;
              color: #1e293b;
              vertical-align: top;
              word-break: break-word;
            }

            tbody tr:nth-child(even) {
              background: #f8fafc;
            }

            .footer {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              margin-top: 18px;
              padding-top: 12px;
              border-top: 1px solid #cbd5e1;
              color: #64748b;
              font-size: 9px;
            }

            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <main class="report">
            <header class="header">
              <div class="brand">
                <img
                  class="logo"
                  src="${escapeHtml(companyLogo)}"
                  alt="${escapeHtml(companyName)}"
                />

                <div>
                  <p class="company">
                    ${escapeHtml(companyName)}
                  </p>

                  <h1 class="module">
                    ${escapeHtml(module.pluralLabel)}
                  </h1>
                </div>
              </div>

              <div class="metadata">
                <div>
                  Generado el
                  ${escapeHtml(generatedAt)}
                </div>

                <div>
                  Datara CRM
                </div>
              </div>
            </header>

            <section class="summary">
              <p class="count">
                ${visibleRecords.length}
                registro${
                  visibleRecords.length === 1
                    ? ""
                    : "s"
                }
              </p>

              ${appliedFilter}
            </section>

            <table>
              <thead>
                <tr>
                  ${tableHeader}
                </tr>
              </thead>

              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <footer class="footer">
              <span>
                ${escapeHtml(companyName)}
              </span>

              <span>
                Generado por Datara CRM
              </span>
            </footer>
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.addEventListener(
      "load",
      () => {
        window.setTimeout(
          () => {
            printWindow.focus();
            printWindow.print();
          },
          250,
        );
      },
    );
  }

  const hasActions = Boolean(
    onView || onEdit,
  );

  const totalColumns =
    visibleTableFields.length +
    (hasActions ? 1 : 0);

  return (
    <section className="overflow-visible rounded-[28px] border border-slate-200 bg-white shadow-sm">
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

            <div
              ref={columnMenuRef}
              className="relative"
            >
              <Button
                variant="secondary"
                onClick={() =>
                  setIsColumnMenuOpen(
                    (current) => !current,
                  )
                }
              >
                Columnas
              </Button>

              {isColumnMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="font-semibold text-slate-900">
                      Columnas visibles
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Selecciona los campos que quieres ver.
                    </p>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2">
                    {[
                      ...visibleTableFields,

                      ...availableTableFields.filter(
                        (field) =>
                          !visibleColumnKeys.includes(
                            field.key,
                          ),
                      ),
                    ].map((field) => {
                      const isVisible =
                        visibleColumnKeys.includes(
                          field.key,
                        );

                      const visibleIndex =
                        visibleColumnKeys.indexOf(
                          field.key,
                        );

                      const isLastVisible =
                        isVisible &&
                        visibleColumnKeys.length === 1;

                      const canMoveLeft =
                        isVisible &&
                        visibleIndex > 0;

                      const canMoveRight =
                        isVisible &&
                        visibleIndex <
                          visibleColumnKeys.length - 1;

                      return (
                        <div
                          key={field.key}
                          className={[
                            "mb-1 flex items-center gap-1 rounded-xl p-1 transition",
                            isVisible
                              ? "bg-emerald-50"
                              : "hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <button
                            type="button"
                            disabled={isLastVisible}
                            className={[
                              "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition",
                              isVisible
                                ? "font-semibold text-emerald-800"
                                : "text-slate-700",
                              isLastVisible
                                ? "cursor-not-allowed opacity-60"
                                : "",
                            ].join(" ")}
                            onClick={() =>
                              toggleColumn(
                                field.key,
                              )
                            }
                          >
                            <span
                              className={[
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs",
                                isVisible
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-300 bg-white",
                              ].join(" ")}
                            >
                              {isVisible ? "✓" : ""}
                            </span>

                            <span className="truncate">
                              {field.label}
                            </span>
                          </button>

                          {isVisible && (
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                disabled={!canMoveLeft}
                                aria-label={`Mover ${field.label} a la izquierda`}
                                title="Mover a la izquierda"
                                className={[
                                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition",
                                  canMoveLeft
                                    ? "text-slate-600 hover:bg-white hover:text-emerald-700"
                                    : "cursor-not-allowed text-slate-300",
                                ].join(" ")}
                                onClick={() =>
                                  moveColumn(
                                    field.key,
                                    "left",
                                  )
                                }
                              >
                                ←
                              </button>

                              <button
                                type="button"
                                disabled={!canMoveRight}
                                aria-label={`Mover ${field.label} a la derecha`}
                                title="Mover a la derecha"
                                className={[
                                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition",
                                  canMoveRight
                                    ? "text-slate-600 hover:bg-white hover:text-emerald-700"
                                    : "cursor-not-allowed text-slate-300",
                                ].join(" ")}
                                onClick={() =>
                                  moveColumn(
                                    field.key,
                                    "right",
                                  )
                                }
                              >
                                →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 p-3">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                      onClick={
                        resetColumns
                      }
                    >
                      Restablecer
                    </button>

                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      onClick={() =>
                        setIsColumnMenuOpen(
                          false,
                        )
                      }
                    >
                      Listo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {module.allowExport !==
              false && (
              <details className="group relative">
                <summary
                  className={[
                    "flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition",
                    visibleRecords.length >
                    0
                      ? "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      : "pointer-events-none cursor-not-allowed opacity-50",
                  ].join(" ")}
                >
                  Exportar

                  <span className="text-xs transition group-open:rotate-180">
                    ▼
                  </span>
                </summary>

                <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={
                      handleExportCsv
                    }
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">
                      CSV
                    </span>

                    Exportar para Excel
                  </button>

                  <button
                    type="button"
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700"
                    onClick={
                      handleExportPdf
                    }
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-xs font-black text-red-700">
                      PDF
                    </span>

                    Exportar PDF
                  </button>
                </div>
              </details>
            )}

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
              {visibleTableFields.map((field) => (
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
                    {visibleTableFields.map(
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