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

function shouldShowDetailField(
  field: CRMFieldConfig,
  record: CRMRecord,
): boolean {
  if (!field.visibleWhen) {
    return true;
  }

  const relatedValue =
    record[
      field.visibleWhen.fieldKey
    ];

  if (
    "hasValue" in
    field.visibleWhen
  ) {
    return (
      relatedValue !== null &&
      relatedValue !== undefined &&
      relatedValue !== ""
    );
  }

  return (
    relatedValue ===
    field.visibleWhen.equals
  );
}

function getDetailFieldClassName(
  field: CRMFieldConfig,
): string {
  if (
    field.formSpan === 2 ||
    field.type === "textarea" ||
    field.type === "multiselect" ||
    field.key ===
      "applicableProducts"
  ) {
    return "sm:col-span-2";
  }

  return "";
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

      function getItemLabel(
        item: unknown,
      ): string {
        if (typeof item === "string") {
          return item;
        }

        if (
          typeof item === "object" &&
          item !== null
        ) {
          const option = item as {
            id?: string;
            name?: string;
            label?: string;
            value?: string;
          };

          return (
            option.name ??
            option.label ??
            option.value ??
            option.id ??
            "Registro relacionado"
          );
        }

        return String(item);
      }

      const sortedValues =
        field.key ===
        "availableMonths"
          ? [...values].sort(
              (a, b) =>
                Number(
                  getItemLabel(a),
                ) -
                Number(
                  getItemLabel(b),
                ),
            )
          : values;

      return (
        <div className="flex flex-wrap gap-2">
          {sortedValues.map((item, index) => {
            const label =
              getItemLabel(item);

            return (
              <span
                key={`${label}-${index}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {label}
              </span>
            );
          })}
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

function DealSummaryDetail({
  record,
}: {
  record: CRMRecord;
}) {
  const items = Array.isArray(
    record.items,
  )
    ? (record.items as Array<
        Record<string, unknown>
      >)
    : [];

  const promotions = Array.isArray(
    record.promotions,
  )
    ? (record.promotions as Array<
        Record<string, unknown>
      >)
    : [];

  function getNumber(
    value: unknown,
  ): number {
    const numericValue =
      typeof value === "number"
        ? value
        : Number(value);

    return Number.isFinite(
      numericValue,
    )
      ? numericValue
      : 0;
  }

  return (
    <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-sm">
      <h3 className="text-lg font-bold">
        Resumen de la oportunidad
      </h3>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-slate-400">
            Subtotal
          </p>

          <p className="mt-1 text-xl font-black">
            {formatCurrency(
              record.baseAmount,
            )}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-400">
            Descuentos
          </p>

          <p className="mt-1 text-xl font-black text-emerald-400">
            -
            {formatCurrency(
              record.discountAmount,
            )}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-400">
            Total
          </p>

          <p className="mt-1 text-2xl font-black">
            {formatCurrency(
              record.totalAmount,
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-700 pt-5">
        <p className="text-sm font-semibold text-slate-300">
          Condiciones de pago
        </p>

        <div className="mt-3 space-y-4">
          {items.map(
            (item, index) => {
              const itemId =
                typeof item.id ===
                "string"
                  ? item.id
                  : String(index);

              const itemName =
                typeof item.name ===
                "string"
                  ? item.name
                  : "Partida";

              const financingMonths =
                getNumber(
                  item.financingMonths,
                );

              const itemPromotions =
                promotions.filter(
                  (promotion) =>
                    promotion.dealItemId ===
                    item.id,
                );

              return (
                <div
                  key={itemId}
                  className="rounded-2xl bg-slate-900 p-4"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold">
                      {itemName}
                    </p>

                    <span className="text-sm font-semibold text-emerald-400">
                      {typeof item.paymentMethod ===
                      "string"
                        ? item.paymentMethod
                        : "Por definir"}
                    </span>
                  </div>

                  {financingMonths >
                  0 ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <p className="text-xs text-slate-400">
                          Plazo
                        </p>

                        <p className="mt-1 font-bold">
                          {financingMonths}{" "}
                          meses
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Enganche mínimo
                        </p>

                        <p className="mt-1 font-bold">
                          {formatCurrency(
                            item.minimumDownPayment,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Enganche del cliente
                        </p>

                        <p className="mt-1 font-bold">
                          {formatCurrency(
                            item.customerDownPayment,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Saldo a financiar
                        </p>

                        <p className="mt-1 font-bold">
                          {formatCurrency(
                            item.financedAmount,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Mensualidad estimada
                        </p>

                        <p className="mt-1 text-lg font-black text-emerald-400">
                          {formatCurrency(
                            item.estimatedPayment,
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-xs text-slate-400">
                        Importe de la partida
                      </p>

                      <p className="mt-1 font-bold">
                        {formatCurrency(
                          item.totalAmount,
                        )}
                      </p>
                    </div>
                  )}

                  {itemPromotions.length >
                    0 && (
                    <div className="mt-4 border-t border-slate-700 pt-3">
                      <p className="text-xs font-semibold text-slate-400">
                        Promociones aplicadas
                      </p>

                      <div className="mt-2 space-y-1">
                        {itemPromotions.map(
                          (
                            promotion,
                            promotionIndex,
                          ) => (
                            <div
                              key={`${itemId}-${promotionIndex}`}
                              className="flex justify-between gap-3 text-sm"
                            >
                              <span>
                                {typeof promotion.name ===
                                "string"
                                  ? promotion.name
                                  : "Promoción"}
                              </span>

                              <span className="font-semibold text-emerald-400">
                                {getNumber(
                                  promotion.calculatedBenefit,
                                ) > 0
                                  ? `-${formatCurrency(
                                      promotion.calculatedBenefit,
                                    )}`
                                  : typeof promotion.benefitType ===
                                      "string"
                                    ? promotion.benefitType
                                    : "Beneficio"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
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

  const visibleDetailFields =
    record
      ? detailFields.filter(
          (field) =>
            shouldShowDetailField(
              field,
              record,
            ),
        )
      : detailFields;

  const detailSections = [
    ...(module.formSections ?? []),
  ]
    .filter(
      (section) =>
        section.visible !== false,
    )
    .sort(
      (a, b) =>
        a.order - b.order,
    )
    .map((section) => ({
      section,

      fields:
        visibleDetailFields
          .filter(
            (field) =>
              field.formSectionId ===
              section.id,
          )
          .sort((a, b) => {
            const rowDifference =
              (a.formRow ??
                Number.MAX_SAFE_INTEGER) -
              (b.formRow ??
                Number.MAX_SAFE_INTEGER);

            if (rowDifference !== 0) {
              return rowDifference;
            }

            return (
              (a.formColumn ??
                Number.MAX_SAFE_INTEGER) -
              (b.formColumn ??
                Number.MAX_SAFE_INTEGER)
            );
          }),
    }))
    .filter(
      (group) =>
        group.fields.length > 0,
    );

  const unsectionedDetailFields =
    visibleDetailFields.filter(
      (field) =>
        !field.formSectionId,
    );

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
        ? "Formulario validado. El registro está listo para guardarse en Datara."
        : "Cambios validados. Los cambios están listos para guardarse en Datara.",
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

      <aside
        className={[
          "absolute right-0 top-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl",
          module.id === "deals"
            ? "max-w-5xl"
            : "max-w-2xl",
        ].join(" ")}
      >
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
            <div className="space-y-6">
              {detailSections.map(
                ({
                  section,
                  fields,
                }) => (
                  <section
                    key={section.id}
                    className={
                      module.id === "deals" &&
                      section.id === "deal-summary"
                        ? "overflow-visible"
                        : "overflow-visible rounded-[28px] border border-slate-200 bg-white shadow-sm"
                    }
                  >
                    <header
                      className={[
                        "border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6",
                        module.id === "deals" &&
                        section.id === "deal-summary"
                          ? "hidden"
                          : "",
                      ].join(" ")}
                    >
                      <h3 className="text-base font-bold text-slate-950">
                        {section.title}
                      </h3>

                      {section.description && (
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {
                            section.description
                          }
                        </p>
                      )}
                    </header>

                    {module.id ===
                      "deals" &&
                    section.id ===
                      "deal-summary" ? (
                      <div>
                        <DealSummaryDetail
                          record={record}
                        />
                      </div>
                    ) : (
                      <div
                        className={[
                          "grid gap-x-6 gap-y-5 p-5 sm:p-6",
                          section.columns ===
                          1
                            ? "grid-cols-1"
                            : "sm:grid-cols-2",
                        ].join(" ")}
                      >
                        {fields.map(
                          (field) => (
                            <article
                              key={
                                field.key
                              }
                              className={[
                                "rounded-2xl border border-slate-200 bg-slate-50 p-5",
                                getDetailFieldClassName(
                                  field,
                                ),
                              ].join(
                                " ",
                              )}
                              style={{
                                gridRow:
                                  field.formRow ??
                                  undefined,

                                gridColumn:
                                  field.formSpan ===
                                  2
                                    ? "1 / -1"
                                    : field.formColumn ??
                                      undefined,
                              }}
                            >
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                {
                                  field.label
                                }
                              </p>

                              <div className="mt-3 text-sm font-medium text-slate-900">
                                {formatFieldValue(
                                  field,
                                  record[
                                    field
                                      .key
                                  ],
                                )}
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                    )}
                  </section>
                ),
              )}

              {unsectionedDetailFields.length >
                0 && (
                <section className="overflow-visible rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                    <h3 className="text-base font-bold text-slate-950">
                      Información adicional
                    </h3>
                  </header>

                  <div className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
                    {unsectionedDetailFields.map(
                      (field) => (
                        <article
                          key={
                            field.key
                          }
                          className={[
                            "rounded-2xl border border-slate-200 bg-slate-50 p-5",
                            getDetailFieldClassName(
                              field,
                            ),
                          ].join(
                            " ",
                          )}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {
                              field.label
                            }
                          </p>

                          <div className="mt-3 text-sm font-medium text-slate-900">
                            {formatFieldValue(
                              field,
                              record[
                                field.key
                              ],
                            )}
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </section>
              )}
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