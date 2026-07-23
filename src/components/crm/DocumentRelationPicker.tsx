"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  CRMDocumentRelationOption,
} from "@/types/crm-documents";

type DocumentRelationPickerProps = {
  value: string;

  options:
    CRMDocumentRelationOption[];

  onChange: (
    value: string,
  ) => void;
};

export default function DocumentRelationPicker({
  value,
  options,
  onChange,
}: DocumentRelationPickerProps) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const selectedOption =
    useMemo(
      () =>
        options.find(
          (option) =>
            `${option.type}:${option.id}` ===
            value,
        ),
      [options, value],
    );

  useEffect(() => {
    setSearch(
      selectedOption?.label ?? "",
    );
  }, [selectedOption]);

  const filteredOptions =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return options.slice(
          0,
          12,
        );
      }

      return options
        .filter((option) =>
          option.label
            .toLowerCase()
            .includes(
              normalizedSearch,
            ),
        )
        .slice(0, 12);
    }, [options, search]);

  function selectOption(
    option:
      CRMDocumentRelationOption,
  ) {
    onChange(
      `${option.type}:${option.id}`,
    );

    setSearch(
      option.label,
    );

    setIsOpen(false);
  }

  function clearSelection() {
    onChange("");
    setSearch("");
    setIsOpen(true);
  }

  return (
    <div className="relative mt-2">
      <div className="flex rounded-xl border border-slate-300 bg-white focus-within:border-emerald-600">
        <input
          value={search}
          placeholder="Buscar cliente, prospecto, oportunidad o actividad"
          className="min-w-0 flex-1 rounded-l-xl px-4 py-3 font-normal text-slate-950 outline-none"
          onFocus={() =>
            setIsOpen(true)
          }
          onChange={(event) => {
            setSearch(
              event.target.value,
            );

            if (value) {
              onChange("");
            }

            setIsOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(
              () =>
                setIsOpen(false),
              150,
            );
          }}
        />

        {(value || search) && (
          <button
            type="button"
            aria-label="Limpiar relación"
            className="px-4 text-lg text-slate-400 hover:text-slate-700"
            onMouseDown={(event) =>
              event.preventDefault()
            }
            onClick={
              clearSelection
            }
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <button
            type="button"
            className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50"
            onMouseDown={(event) =>
              event.preventDefault()
            }
            onClick={() => {
              onChange("");
              setSearch("");
              setIsOpen(false);
            }}
          >
            Sin relación
          </button>

          {filteredOptions.map(
            (option) => (
              <button
                key={`${option.type}:${option.id}`}
                type="button"
                className="block w-full rounded-xl px-4 py-3 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                onMouseDown={(
                  event,
                ) =>
                  event.preventDefault()
                }
                onClick={() =>
                  selectOption(
                    option,
                  )
                }
              >
                {option.label}
              </button>
            ),
          )}

          {filteredOptions.length ===
            0 && (
            <p className="px-4 py-5 text-center text-sm text-slate-500">
              No se encontraron coincidencias.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
