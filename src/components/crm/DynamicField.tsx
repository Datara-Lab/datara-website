"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { CRMFieldConfig } from "@/types/crm-config";

import type { CRMFormValue } from "./DynamicForm";

type DynamicFieldProps = {
  field: CRMFieldConfig;
  value: CRMFormValue;
  error?: string;

  onChange: (
    fieldKey: string,
    value: CRMFormValue,
  ) => void;
};

const priorityOptions = [
  {
    label: "1 - Muy alta",
    value: 1,
    description:
      "Se evalúa primero frente a las demás promociones.",
  },
  {
    label: "2 - Alta",
    value: 2,
    description:
      "Se evalúa después de las promociones con prioridad 1.",
  },
  {
    label: "3 - Media",
    value: 3,
    description:
      "Se evalúa después de las promociones con prioridades 1 y 2.",
  },
  {
    label: "4 - Baja",
    value: 4,
    description:
      "Se evalúa después de las promociones de mayor prioridad.",
  },
  {
    label: "5 - Muy baja",
    value: 5,
    description:
      "Se evalúa al final.",
  },
];

function getInputClassName(
  hasError: boolean,
  readOnly: boolean,
): string {
  return [
    "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
    "placeholder:text-slate-400",
    hasError
      ? "border-red-300 bg-red-50 text-red-950 focus:border-red-500 focus:ring-4 focus:ring-red-100"
      : "border-slate-300 bg-white text-slate-950 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100",
    readOnly
      ? "cursor-not-allowed bg-slate-100 text-slate-500 focus:border-slate-300 focus:ring-0"
      : "",
  ].join(" ");
}

function normalizeStringArray(
  value: CRMFormValue,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) =>
    String(item),
  );
}

function InformationIcon({
  content,
}: {
  content: string;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="Más información"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-400 text-[11px] font-black text-slate-500 transition hover:border-emerald-600 hover:text-emerald-700"
      >
        i
      </button>

      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-80 -translate-x-1/2 whitespace-pre-line rounded-xl bg-slate-950 px-4 py-3 text-xs font-normal leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
        {content}

        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
      </span>
    </span>
  );
}

function FieldHeader({
  field,
}: {
  field: CRMFieldConfig;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <label
        htmlFor={field.key}
        className="text-sm font-bold text-slate-800"
      >
        {field.label}

        {field.required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {field.key === "priority" && (
        <InformationIcon
          content={[
            "1: Se evalúa primero frente a las demás promociones.",
            "2: Se evalúa después de las promociones con prioridad 1.",
            "3: Se evalúa después de las promociones con prioridades 1 y 2.",
            "4: Se evalúa después de las promociones de mayor prioridad.",
            "5: Se evalúa al final.",
          ].join("\n\n")}
        />
      )}
    </div>
  );
}

function FieldMessages({
  field,
  error,
}: {
  field: CRMFieldConfig;
  error?: string;
}) {
  return (
    <>
      {error ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-red-600">
          {error}
        </p>
      ) : field.description ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {field.description}
        </p>
      ) : null}
    </>
  );
}

function MultiSelectDropdown({
  field,
  value,
  error,
  onChange,
}: DynamicFieldProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const selectedValues =
    normalizeStringArray(value);

  const options = field.options ?? [];

  const visibleOptions = useMemo(() => {
    const normalizedSearchTerm =
      searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return options;
    }

    return options.filter((option) =>
      option.label
        .toLowerCase()
        .includes(normalizedSearchTerm),
    );
  }, [options, searchTerm]);

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
        setIsOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
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

  function toggleOption(
    optionValue: string,
  ) {
    const isSelected =
      selectedValues.includes(optionValue);

    const nextValues = isSelected
      ? selectedValues.filter(
          (item) => item !== optionValue,
        )
      : [...selectedValues, optionValue];

    /*
     * Si seleccionan "Todos", dejamos solamente
     * esa opción. Si eligen otra, retiramos "Todos".
     */
    const normalizedValues =
      optionValue === "Todos" && !isSelected
        ? ["Todos"]
        : nextValues.filter(
            (item) => item !== "Todos",
          );

    onChange(
      field.key,
      normalizedValues,
    );
  }

  function removeValue(
    optionValue: string,
  ) {
    onChange(
      field.key,
      selectedValues.filter(
        (item) => item !== optionValue,
      ),
    );
  }

  return (
    <div ref={containerRef}>
      <FieldHeader field={field} />

      <div className="relative">
        <button
          id={field.key}
          type="button"
          disabled={field.readOnly}
          aria-expanded={isOpen}
          className={[
            getInputClassName(
              Boolean(error),
              Boolean(field.readOnly),
            ),
            "flex min-h-[50px] items-center justify-between gap-3 text-left",
          ].join(" ")}
          onClick={() =>
            setIsOpen((current) => !current)
          }
        >
          <span
            className={
              selectedValues.length > 0
                ? "text-slate-900"
                : "text-slate-400"
            }
          >
            {selectedValues.length > 0
              ? `${selectedValues.length} seleccionada${
                  selectedValues.length === 1
                    ? ""
                    : "s"
                }`
              : field.placeholder ??
                "Selecciona una o más opciones"}
          </span>

          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={[
              "h-5 w-5 shrink-0 text-slate-500 transition",
              isOpen ? "rotate-180" : "",
            ].join(" ")}
          >
            <path
              d="m5 7.5 5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </button>

        {isOpen && !field.readOnly && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {options.length > 6 && (
              <div className="border-b border-slate-100 p-3">
                <input
                  type="search"
                  value={searchTerm}
                  placeholder="Buscar opción..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value,
                    )
                  }
                />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto p-2">
              {visibleOptions.length > 0 ? (
                visibleOptions.map(
                  (option) => {
                    const isSelected =
                      selectedValues.includes(
                        option.value,
                      );

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={option.disabled}
                        className={[
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",

                          option.disabled
                            ? "cursor-not-allowed bg-slate-50 text-slate-400"
                            : isSelected
                              ? "bg-emerald-50 font-semibold text-emerald-800"
                              : "text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                        onClick={() =>
                          toggleOption(
                            option.value,
                          )
                        }
                      >
                        <span
                          className={[
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs",

                            option.disabled
                              ? "border-slate-200 bg-slate-100 text-slate-400"
                              : isSelected
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-300 bg-white",
                          ].join(" ")}
                        >
                          {isSelected ? "✓" : ""}
                        </span>

                        {option.label}
                      </button>
                    );
                  },
                )
              ) : (
                <p className="px-3 py-5 text-center text-sm text-slate-500">
                  No encontramos opciones.
                </p>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 p-3">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                onClick={() =>
                  setIsOpen(false)
                }
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedValues.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedValues.map(
            (selectedValue) => {
              const option = options.find(
                (item) =>
                  item.value === selectedValue,
              );

              const isDisabled =
                option?.disabled === true;

              return (
                <span
                  key={selectedValue}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",

                    isDisabled
                      ? "bg-slate-100 text-slate-500"
                      : "bg-emerald-50 text-emerald-800",
                  ].join(" ")}
                >
                  {option?.label ??
                    selectedValue}

                  {!field.readOnly && (
                    <button
                      type="button"
                      aria-label={`Quitar ${
                        option?.label ??
                        selectedValue
                      }`}
                      className={[
                        "text-base leading-none transition hover:text-red-600",

                        isDisabled
                          ? "text-slate-400"
                          : "text-emerald-600",
                      ].join(" ")}
                      onClick={() =>
                        removeValue(
                          selectedValue,
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            },
          )}
        </div>
      )}

      <FieldMessages
        field={field}
        error={error}
      />
    </div>
  );
}

function SearchableLookup({
  field,
  value,
  error,
  onChange,
}: DynamicFieldProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const options = field.options ?? [];

  const selectedValue =
    typeof value === "string"
      ? value
      : "";

  const selectedOption = options.find(
    (option) =>
      option.value === selectedValue,
  );

  const visibleOptions = options.filter(
    (option) =>
      option.label
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase(),
        ),
  );

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
        setIsOpen(false);
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

  return (
    <div ref={containerRef}>
      <FieldHeader field={field} />

      <div className="relative">
        <button
          id={field.key}
          type="button"
          disabled={field.readOnly}
          className={[
            getInputClassName(
              Boolean(error),
              Boolean(field.readOnly),
            ),
            "flex min-h-[50px] items-center justify-between gap-3 text-left",
          ].join(" ")}
          onClick={() =>
            setIsOpen((current) => !current)
          }
        >
          <span
            className={
              selectedOption
                ? "text-slate-950"
                : "text-slate-400"
            }
          >
            {selectedOption?.label ??
              field.placeholder ??
              "Buscar y seleccionar"}
          </span>

          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="h-5 w-5 text-slate-500"
          >
            <circle
              cx="8.5"
              cy="8.5"
              r="4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />

            <path
              d="m12 12 4 4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
          </svg>
        </button>

        {isOpen && !field.readOnly && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-3">
              <input
                type="search"
                autoFocus
                value={searchTerm}
                placeholder="Buscar..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {visibleOptions.length > 0 ? (
                visibleOptions.map(
                  (option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                      onClick={() => {
                        onChange(
                          field.key,
                          option.value,
                        );

                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                    >
                      {option.label}
                    </button>
                  ),
                )
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Sin opciones disponibles
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Este campo se alimentará con
                    los registros relacionados de
                    Datara CRM.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <FieldMessages
        field={field}
        error={error}
      />
    </div>
  );
}

function PriorityField({
  field,
  value,
  error,
  onChange,
}: DynamicFieldProps) {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value || 1);

  return (
    <div>
      <FieldHeader field={field} />

      <select
        id={field.key}
        value={numberValue}
        disabled={field.readOnly}
        className={getInputClassName(
          Boolean(error),
          Boolean(field.readOnly),
        )}
        onChange={(event) =>
          onChange(
            field.key,
            Number(event.target.value),
          )
        }
      >
        {priorityOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <FieldMessages
        field={field}
        error={error}
      />
    </div>
  );
}

export default function DynamicField({
  field,
  value,
  error,
  onChange,
}: DynamicFieldProps) {
  const readOnly =
    field.readOnly === true ||
    field.formVariant === "readonly";

  const normalizedField: CRMFieldConfig = {
    ...field,
    readOnly,
  };

  if (field.key === "priority") {
    return (
      <PriorityField
        field={normalizedField}
        value={value}
        error={error}
        onChange={onChange}
      />
    );
  }

  if (field.type === "multiselect") {
    return (
      <MultiSelectDropdown
        field={normalizedField}
        value={value}
        error={error}
        onChange={onChange}
      />
    );
  }

  if (
    field.type === "lookup" &&
    field.formVariant === "searchable"
  ) {
    return (
      <SearchableLookup
        field={normalizedField}
        value={value}
        error={error}
        onChange={onChange}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <div>
        <label
          htmlFor={field.key}
          className={[
            "flex min-h-[52px] items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition",
            readOnly
              ? "cursor-not-allowed bg-slate-100 opacity-70"
              : "cursor-pointer bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/50",
          ].join(" ")}
        >
          <input
            id={field.key}
            type="checkbox"
            checked={Boolean(value)}
            disabled={readOnly}
            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            onChange={(event) =>
              onChange(
                field.key,
                event.target.checked,
              )
            }
          />

          <span className="text-sm font-semibold text-slate-700">
            {field.label}
          </span>
        </label>

        <FieldMessages
          field={field}
          error={error}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <FieldHeader field={field} />

        <textarea
          id={field.key}
          value={
            typeof value === "string"
              ? value
              : ""
          }
          placeholder={field.placeholder}
          disabled={readOnly}
          rows={5}
          className={[
            getInputClassName(
              Boolean(error),
              readOnly,
            ),
            "min-h-36 resize-y",
          ].join(" ")}
          onChange={(event) =>
            onChange(
              field.key,
              event.target.value,
            )
          }
        />

        <FieldMessages
          field={field}
          error={error}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <FieldHeader field={field} />

        <select
          id={field.key}
          value={
            typeof value === "string"
              ? value
              : ""
          }
          disabled={readOnly}
          className={getInputClassName(
            Boolean(error),
            readOnly,
          )}
          onChange={(event) =>
            onChange(
              field.key,
              event.target.value,
            )
          }
        >
          <option value="">
            Selecciona una opción
          </option>

          {(field.options ?? []).map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <FieldMessages
          field={field}
          error={error}
        />
      </div>
    );
  }

  if (
    field.type === "lookup" &&
    field.formVariant !== "searchable"
  ) {
    return (
      <div>
        <FieldHeader field={field} />

        <select
          id={field.key}
          value={
            typeof value === "string"
              ? value
              : ""
          }
          disabled={readOnly}
          className={getInputClassName(
            Boolean(error),
            readOnly,
          )}
          onChange={(event) =>
            onChange(
              field.key,
              event.target.value,
            )
          }
        >
          <option value="">
            {readOnly
              ? "Asignado automáticamente"
              : "Selecciona una opción"}
          </option>

          {(field.options ?? []).map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <FieldMessages
          field={field}
          error={error}
        />
      </div>
    );
  }

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "phone"
        ? "tel"
        : field.type === "date"
          ? "date"
          : field.type === "datetime"
            ? "datetime-local"
            : field.type === "number" ||
                field.type === "currency" ||
                field.type === "percentage"
              ? "number"
              : "text";

  const isNumeric =
    field.type === "number" ||
    field.type === "currency" ||
    field.type === "percentage";

  return (
    <div>
      <FieldHeader field={field} />

      <input
        id={field.key}
        type={inputType}
        value={
          typeof value === "string" ||
          typeof value === "number"
            ? value
            : ""
        }
        placeholder={field.placeholder}
        disabled={readOnly}
        min={field.validation?.min}
        max={field.validation?.max}
        step={
          field.type === "currency" ||
          field.type === "percentage"
            ? "0.01"
            : undefined
        }
        className={getInputClassName(
          Boolean(error),
          readOnly,
        )}
        onChange={(event) => {
          if (isNumeric) {
            onChange(
              field.key,
              event.target.value === ""
                ? null
                : Number(
                    event.target.value,
                  ),
            );

            return;
          }

          onChange(
            field.key,
            event.target.value,
          );
        }}
      />

      <FieldMessages
        field={field}
        error={error}
      />
    </div>
  );
}