"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Button from "@/components/ui/Button";

type ExportValue =
  | string
  | number
  | null
  | undefined;

type WorkspaceTableActionsProps = {
  title: string;
  columns: string[];
  rows: ExportValue[][];

  isRefreshing?: boolean;

  onRefresh:
    () => void | Promise<void>;
};

function escapeCsvValue(
  value: ExportValue,
): string {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  return `"${text.replace(
    /"/g,
    '""',
  )}"`;
}

function escapeHtml(
  value: ExportValue,
): string {
  return (
    value === null ||
    value === undefined
      ? ""
      : String(value)
  )
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#039;",
    );
}

function getFileName(
  title: string,
  extension: string,
): string {
  const normalized =
    title
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

  const date =
    new Date()
      .toISOString()
      .slice(0, 10);

  return `${normalized || "registros"}-${date}.${extension}`;
}

export default function WorkspaceTableActions({
  title,
  columns,
  rows,
  isRefreshing = false,
  onRefresh,
}: WorkspaceTableActionsProps) {
  const containerRef =
    useRef<HTMLDivElement>(
      null,
    );

  const [
    isExportOpen,
    setIsExportOpen,
  ] = useState(false);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsExportOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  function exportCsv() {
    const csv = [
      columns
        .map(escapeCsvValue)
        .join(","),

      ...rows.map(
        (row) =>
          row
            .map(escapeCsvValue)
            .join(","),
      ),
    ].join("\r\n");

    const blob =
      new Blob(
        [
          "\uFEFF",
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    link.href = url;
    link.download =
      getFileName(
        title,
        "csv",
      );

    document.body.appendChild(
      link,
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
      url,
    );

    setIsExportOpen(false);
  }

  function exportPdf() {
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

    printWindow.opener =
      null;

    const tableHeader =
      columns
        .map(
          (column) =>
            `<th>${escapeHtml(
              column,
            )}</th>`,
        )
        .join("");

    const tableRows =
      rows
        .map(
          (row) =>
            `<tr>${row
              .map(
                (value) =>
                  `<td>${escapeHtml(
                    value,
                  ) || "—"}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(
            title,
          )}</title>

          <style>
            @page {
              size: landscape;
              margin: 12mm;
            }

            body {
              color: #0f172a;
              font-family:
                Arial,
                sans-serif;
              margin: 0;
            }

            h1 {
              font-size: 22px;
              margin: 0;
            }

            p {
              color: #64748b;
              font-size: 12px;
              margin: 6px 0 20px;
            }

            table {
              border-collapse:
                collapse;
              width: 100%;
            }

            th,
            td {
              border: 1px solid
                #cbd5e1;
              font-size: 10px;
              padding: 7px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f1f5f9;
              font-weight: 700;
            }

            tr {
              break-inside: avoid;
            }
          </style>
        </head>

        <body>
          <h1>${escapeHtml(
            title,
          )}</h1>

          <p>
            ${rows.length}
            registro(s) exportado(s)
          </p>

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

    setIsExportOpen(false);
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative"
      >
        <Button
          type="button"
          variant="secondary"
          disabled={
            rows.length === 0
          }
          onClick={() =>
            setIsExportOpen(
              (current) =>
                !current,
            )
          }
        >
          Exportar
          <span className="ml-2 text-xs">
            ▼
          </span>
        </Button>

        {isExportOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
              onClick={exportCsv}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">
                CSV
              </span>

              Exportar para Excel
            </button>

            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700"
              onClick={exportPdf}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-xs font-black text-red-700">
                PDF
              </span>

              Exportar PDF
            </button>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={isRefreshing}
        onClick={() =>
          void onRefresh()
        }
      >
        {isRefreshing
          ? "Actualizando..."
          : "Actualizar"}
      </Button>
    </>
  );
}
