import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: keyof T;
  header: string;
  align?: "left" | "center" | "right";
  render?: (value: T[keyof T], row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyMessage?: string;
};

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = "No hay información disponible.",
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">

          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={[
                    "px-6 py-4 text-sm font-semibold text-slate-700",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    (!column.align || column.align === "left") && "text-left",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-slate-100 transition hover:bg-slate-50"
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={[
                        "px-6 py-4 text-sm text-slate-700",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        (!column.align || column.align === "left") && "text-left",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}

          </tbody>

        </table>
      </div>
    </div>
  );
}