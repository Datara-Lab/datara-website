"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import DocumentRelationPicker from "@/components/crm/DocumentRelationPicker";

import {
  CRM_DOCUMENT_CATEGORIES,
  type CRMDocumentRelationOption,
  type CRMDocumentUploadResponse,
} from "@/types/crm-documents";

type DocumentUploadDrawerProps = {
  isOpen: boolean;

  relationOptions:
    CRMDocumentRelationOption[];

  onClose: () => void;

  onSaved: () =>
    void | Promise<void>;
};

function getNameWithoutExtension(
  fileName: string,
): string {
  const lastDot =
    fileName.lastIndexOf(".");

  if (lastDot <= 0) {
    return fileName;
  }

  return (
    fileName.slice(
      0,
      lastDot,
    ) || fileName
  );
}

function formatFileSize(
  sizeBytes: number,
): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (
    sizeBytes <
    1024 * 1024
  ) {
    return `${(
      sizeBytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    sizeBytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export default function DocumentUploadDrawer({
  isOpen,
  relationOptions,
  onClose,
  onSaved,
}: DocumentUploadDrawerProps) {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    file,
    setFile,
  ] = useState<File | null>(
    null,
  );

  const [
    name,
    setName,
  ] = useState("");

  const [
    isNameManuallyEdited,
    setIsNameManuallyEdited,
  ] = useState(false);

  const [
    category,
    setCategory,
  ] = useState("Otro");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    relatedValue,
    setRelatedValue,
  ] = useState("");

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFile(null);
    setName("");
    setIsNameManuallyEdited(
      false,
    );
    setCategory("Otro");
    setDescription("");
    setRelatedValue("");
    setIsDragging(false);
    setFormError(null);

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function selectFile(
    nextFile: File | null,
  ) {
    setFile(nextFile);
    setFormError(null);

    if (
      nextFile &&
      !isNameManuallyEdited
    ) {
      setName(
        getNameWithoutExtension(
          nextFile.name,
        ),
      );
    }
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError(null);

    if (!file) {
      setFormError(
        "Selecciona un archivo.",
      );
      return;
    }

    if (!name.trim()) {
      setFormError(
        "Escribe el nombre del documento.",
      );
      return;
    }

    if (
      file.size >
      20 * 1024 * 1024
    ) {
      setFormError(
        "El archivo no puede superar los 20 MB.",
      );
      return;
    }

    const formData =
      new FormData();

    formData.set("file", file);

    formData.set(
      "name",
      name.trim(),
    );

    formData.set(
      "category",
      category,
    );

    if (
      description.trim()
    ) {
      formData.set(
        "description",
        description.trim(),
      );
    }

    if (relatedValue) {
      const separatorIndex =
        relatedValue.indexOf(
          ":",
        );

      const entityType =
        relatedValue.slice(
          0,
          separatorIndex,
        );

      const entityId =
        relatedValue.slice(
          separatorIndex + 1,
        );

      const relation =
        relationOptions.find(
          (option) =>
            option.type ===
              entityType &&
            option.id ===
              entityId,
        );

      formData.set(
        "entityType",
        entityType,
      );

      formData.set(
        "entityId",
        entityId,
      );

      if (relation) {
        formData.set(
          "entityName",
          relation.label,
        );
      }
    }

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/crm/documents",
          {
            method: "POST",
            body: formData,
          },
        );

      const result =
        (await response.json()) as
          CRMDocumentUploadResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible cargar el documento.",
        );
      }

      await onSaved();
      onClose();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible cargar el documento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Cerrar panel"
        disabled={isSubmitting}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Nuevo documento
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Cargar archivo
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Guarda y relaciona documentos comerciales de forma segura.
              </p>
            </div>

            <button
              type="button"
              aria-label="Cerrar"
              disabled={isSubmitting}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
            {formError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                {formError}
              </div>
            )}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                  Archivo
                </h3>
              </header>

              <div className="p-5">
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  onChange={(event) =>
                    selectFile(
                      event.target
                        .files?.[0] ??
                        null,
                    )
                  }
                />

                <button
                  type="button"
                  className={[
                    "flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                    isDragging
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50",
                  ].join(" ")}
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  onDragEnter={(
                    event,
                  ) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(
                    event,
                  ) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(
                    event,
                  ) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);

                    selectFile(
                      event.dataTransfer
                        .files?.[0] ??
                        null,
                    );
                  }}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-700">
                    ↑
                  </span>

                  {file ? (
                    <>
                      <span className="mt-4 font-bold text-slate-950">
                        {file.name}
                      </span>

                      <span className="mt-1 text-sm text-slate-500">
                        {formatFileSize(
                          file.size,
                        )}
                      </span>

                      <span className="mt-3 text-sm font-semibold text-emerald-700">
                        Elegir otro archivo
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="mt-4 font-bold text-slate-950">
                        Arrastra el archivo aquí
                      </span>

                      <span className="mt-1 text-sm text-slate-500">
                        o haz clic para seleccionarlo
                      </span>

                      <span className="mt-3 text-xs text-slate-400">
                        PDF, imágenes, Word, Excel, PowerPoint, TXT o CSV · máximo 20 MB
                      </span>
                    </>
                  )}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                  Información general
                </h3>
              </header>

              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  Nombre del documento *

                  <input
                    value={name}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-emerald-600"
                    onChange={(event) => {
                      setName(
                        event.target
                          .value,
                      );

                      setIsNameManuallyEdited(
                        true,
                      );
                    }}
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Categoría *

                  <select
                    value={category}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setCategory(
                        event.target
                          .value,
                      )
                    }
                  >
                    {CRM_DOCUMENT_CATEGORIES.map(
                      (
                        categoryOption,
                      ) => (
                        <option
                          key={
                            categoryOption
                          }
                          value={
                            categoryOption
                          }
                        >
                          {
                            categoryOption
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Relacionado con

                  <DocumentRelationPicker
                    value={
                      relatedValue
                    }
                    options={
                      relationOptions
                    }
                    onChange={
                      setRelatedValue
                    }
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  Descripción

                  <textarea
                    rows={5}
                    value={description}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950"
                    onChange={(event) =>
                      setDescription(
                        event.target
                          .value,
                      )
                    }
                  />
                </label>
              </div>
            </section>
          </div>

          <footer className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                onClick={onClose}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg disabled:opacity-60"
              >
                {isSubmitting
                  ? "Cargando..."
                  : "Cargar documento"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
