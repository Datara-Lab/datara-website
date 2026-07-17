"use client";

import { useEffect } from "react";

import DynamicForm, {
  type CRMFormValues,
} from "@/components/crm/DynamicForm";
import Button from "@/components/ui/Button";
import type {
  CRMFieldConfig,
  CRMModuleConfig,
} from "@/types/crm-config";

import type { CRMRecord } from "./CRMDataTable";

export type CRMDrawerMode =
  | "view"
  | "edit"
  | "create";

type CRMRecordDrawerProps = {
  isOpen: boolean;
  mode: CRMDrawerMode;

  module: CRMModuleConfig;
  record?: CRMRecord | null;

  isSubmitting?: boolean;

  onClose: () => void;
  onEdit?: (record: CRMRecord) => void;

  onSubmit?: (
    values: CRMFormValues,
    mode: Exclude<CRMDrawerMode, "view">,
    record?: CRMRecord | null,
  ) => void | Promise<void>;
};

function getDetailFields(
  module: CRMModuleConfig,
): CRMFieldConfig[] {
  return [...module.fields]
    .filter(
      (field) =>
        field.showInDetail === true &&
        field.hidden !== true,
    )
    .sort(
      (a, b) =>
        (a.detailOrder ??
          Number.MAX_SAFE_INTEGER) -
        (b.detailOrder ??
          Number.MAX_SAFE_INTEGER),
    );
}

function formatDate(
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

function formatCurrency(
  value: unknown,
): string {
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

function formatNumber(
  value: unknown,
): string {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "es-MX",
  ).format(numberValue);
}

function getBadgeClassName(
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
      <span className="text-slate-400">
        Sin información
      </span>
    );
  }

  switch (field.type) {
    case "currency":
      return formatCurrency(value);

    case "number":
      return formatNumber(value);

    case "percentage":
      return `${formatNumber(value)}%`;

    case "date":
      return formatDate(value, false);

    case "datetime":
      return formatDate(value, true);

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

    case "select":
      return (
        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            getBadgeClassName(String(value)),
          ].join(" ")}
        >
          {String(value)}
        </span>
      );

    case "multiselect": {
      const values = Array.isArray(value)
        ? value
        : [value];

      if (values.length === 0) {
        return (
          <span className="text-slate-400">
            Sin información
          </span>
        );
      }

      return (
        <div className="flex flex-wrap gap-2">
          {values.map((item, index) => (
            <span
              key={`${String(item)}-${index}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
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
          email?: string;
        };

        return (
          <div>
            <p className="font-semibold text-slate-900">
              {lookupValue.name ??
                lookupValue.label ??
                "Registro relacionado"}
            </p>

            {lookupValue.email && (
              <p className="mt-1 text-xs text-slate-500">
                {lookupValue.email}
              </p>
            )}
          </div>
        );
      }

      return String(value);
    }

    case "textarea":
      return (
        <p className="whitespace-pre-wrap leading-6 text-slate-700">
          {String(value)}
        </p>
      );

    default:
      return String(value);
  }
}

function getRecordTitle(
  module: CRMModuleConfig,
  record?: CRMRecord | null,
): string {
  if (!record) {
    return `Nueva ${module.singularLabel.toLowerCase()}`;
  }

  const possibleTitleKeys = [
    "promotionName",
    "name",
    "firstName",
    "lastName",
    "subject",
    "dealName",
  ];

  for (const key of possibleTitleKeys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  return module.singularLabel;
}

export default function CRMRecordDrawer({
  isOpen,
  mode,
  module,
  record,
  isSubmitting = false,
  onClose,
  onEdit,
  onSubmit,
}: CRMRecordDrawerProps) {
  const detailFields =
    getDetailFields(module);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !isSubmitting
      ) {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow = "";

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    isOpen,
    isSubmitting,
    onClose,
  ]);

  if (!isOpen) {
    return null;
  }

  const title = getRecordTitle(
    module,
    record,
  );

  const modeLabel =
    mode === "create"
      ? `Nueva ${module.singularLabel.toLowerCase()}`
      : mode === "edit"
        ? `Editar ${module.singularLabel.toLowerCase()}`
        : `Detalle de ${module.singularLabel.toLowerCase()}`;

  async function handleFormSubmit(
    values: CRMFormValues,
  ) {
    if (
      mode !== "create" &&
      mode !== "edit"
    ) {
      return;
    }

    if (onSubmit) {
      await onSubmit(
        values,
        mode,
        record,
      );

      return;
    }

    /*
     * Respaldo temporal:
     * permite comprobar que el formulario
     * captura y valida la información.
     *
     * En el siguiente paso conectaremos
     * este submit con POST y PUT.
     */
    console.log(
      "Formulario Datara:",
      {
        mode,
        recordId: record?.id,
        values,
      },
    );

    window.alert(
      mode === "create"
        ? "Formulario validado. El guardado en Zoho se conectará en el siguiente paso."
        : "Cambios validados. La actualización en Zoho se conectará en el siguiente paso.",
    );
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Cerrar panel"
        disabled={isSubmitting}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] disabled:cursor-wait"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                {modeLabel}
              </p>

              <h2 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {module.description}
              </p>
            </div>

            <button
              type="button"
              aria-label="Cerrar"
              disabled={isSubmitting}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {mode === "view" && record ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {detailFields.map((field) => (
                <article
                  key={field.key}
                  className={[
                    "rounded-2xl border border-slate-200 bg-slate-50 p-5",
                    field.type === "textarea" ||
                    field.type === "multiselect" ||
                    field.key ===
                      "applicableProducts"
                      ? "sm:col-span-2"
                      : "",
                  ].join(" ")}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {field.label}
                  </p>

                  <div className="mt-3 text-sm font-medium text-slate-900">
                    {formatFieldValue(
                      field,
                      record[field.key],
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <DynamicForm
              module={module}
              initialRecord={
                mode === "edit"
                  ? record
                  : null
              }
              submitLabel={
                mode === "create"
                  ? `Crear ${module.singularLabel.toLowerCase()}`
                  : "Guardar cambios"
              }
              cancelLabel="Cancelar"
              isSubmitting={isSubmitting}
              onSubmit={handleFormSubmit}
              onCancel={onClose}
            />
          )}
        </div>

        {mode === "view" && (
          <footer className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={onClose}
              >
                Cerrar
              </Button>

              {record &&
                onEdit &&
                module.allowEdit !==
                  false && (
                  <Button
                    onClick={() =>
                      onEdit(record)
                    }
                  >
                    Editar
                  </Button>
                )}
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}