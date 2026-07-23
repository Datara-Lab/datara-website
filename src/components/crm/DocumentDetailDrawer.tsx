"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import DocumentRelationPicker from "@/components/crm/DocumentRelationPicker";

import {
  CRM_DOCUMENT_CATEGORIES,
  type CRMDocumentRecord,
  type CRMDocumentRelationOption,
} from "@/types/crm-documents";

type DocumentDetailDrawerProps = {
  isOpen: boolean;

  initialMode?:
    | "view"
    | "edit";

  document:
    | CRMDocumentRecord
    | null;

  relationOptions:
    CRMDocumentRelationOption[];

  onClose: () => void;

  onSaved: () =>
    void | Promise<void>;
};

type UpdateResponse = {
  success: boolean;
  error?: string;
};

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

function formatDate(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "Sin información";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "es-MX",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function getFileIcon(
  mimeType: string,
): string {
  if (
    mimeType ===
    "application/pdf"
  ) {
    return "PDF";
  }

  if (
    mimeType.startsWith(
      "image/",
    )
  ) {
    return "IMG";
  }

  if (
    mimeType.includes(
      "word",
    ) ||
    mimeType ===
      "application/msword"
  ) {
    return "DOC";
  }

  if (
    mimeType.includes(
      "sheet",
    ) ||
    mimeType.includes(
      "excel",
    )
  ) {
    return "XLS";
  }

  if (
    mimeType.includes(
      "presentation",
    ) ||
    mimeType.includes(
      "powerpoint",
    )
  ) {
    return "PPT";
  }

  return "FILE";
}

export default function DocumentDetailDrawer({
  isOpen,
  initialMode = "view",
  document,
  relationOptions,
  onClose,
  onSaved,
}: DocumentDetailDrawerProps) {
  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    name,
    setName,
  ] = useState("");

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
    if (
      !isOpen ||
      !document
    ) {
      return;
    }

    setIsEditing(
      initialMode === "edit",
    );

    setName(
      document.name,
    );

    setCategory(
      document.category,
    );

    setDescription(
      document.description ?? "",
    );

    const relation =
      document.relations[0];

    setRelatedValue(
      relation
        ? `${relation.entityType}:${relation.entityId}`
        : "",
    );

    setFormError(null);
  }, [
    document,
    initialMode,
    isOpen,
  ]);

  if (
    !isOpen ||
    !document
  ) {
    return null;
  }

  const selectedDocument =
    document;

  const contentUrl =
    `/api/crm/documents/${document.id}/content`;

  async function updateDocument(
    payload:
      Record<string, unknown>,
  ) {
    const response =
      await fetch(
        `/api/crm/documents/${selectedDocument.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    const result =
      (await response.json()) as
        UpdateResponse;

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.error ??
          "No fue posible actualizar el documento.",
      );
    }
  }

  async function handleSave(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError(
        "El nombre del documento es obligatorio.",
      );
      return;
    }

    const relation =
      relatedValue
        ? relationOptions.find(
            (option) =>
              `${option.type}:${option.id}` ===
              relatedValue,
          )
        : undefined;

    const separatorIndex =
      relatedValue.indexOf(
        ":",
      );

    setIsSubmitting(true);

    try {
      await updateDocument({
        name:
          name.trim(),

        category,

        description:
          description.trim(),

        entityType:
          relatedValue
            ? relatedValue.slice(
                0,
                separatorIndex,
              )
            : "",

        entityId:
          relatedValue
            ? relatedValue.slice(
                separatorIndex + 1,
              )
            : "",

        entityName:
          relation?.label ?? "",
      });

      await onSaved();
      onClose();
      setIsEditing(false);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el documento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleArchive() {
    setFormError(null);
    setIsSubmitting(true);

    try {
      await updateDocument({
        status:
          selectedDocument.status ===
          "archived"
            ? "active"
            : "archived",
      });

      await onSaved();
      onClose();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible cambiar el estado del documento.",
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

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                {isEditing
                  ? "Editar documento"
                  : "Detalle de documento"}
              </p>

              <h2 className="mt-2 truncate text-2xl font-black text-slate-950">
                {document.name}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Archivo protegido y administrado por Datara.
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

        {isEditing ? (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSave}
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
                    Información general
                  </h3>
                </header>

                <div className="grid gap-5 p-5 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Nombre del documento *

                    <input
                      value={name}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950"
                      onChange={(event) =>
                        setName(
                          event.target
                            .value,
                        )
                      }
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
                      rows={6}
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
                  onClick={() => {
                    setIsEditing(false);
                    setFormError(null);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>
              </div>
            </footer>
          </form>
        ) : (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
              {formError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                  {formError}
                </div>
              )}

              <section className="rounded-[28px] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-black text-emerald-400">
                      {getFileIcon(
                        document.mimeType,
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold">
                        {
                          document.originalFileName
                        }
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {formatFileSize(
                          document.sizeBytes,
                        )}
                        {" · "}
                        Versión{" "}
                        {document.version}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <a
                      href={contentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Vista previa
                    </a>

                    <a
                      href={`${contentUrl}?download=1`}
                      className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950"
                    >
                      Descargar
                    </a>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h3 className="font-bold text-slate-950">
                    Información general
                  </h3>
                </header>

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Categoría
                    </p>

                    <p className="mt-3 font-semibold text-slate-900">
                      {document.category}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Estado
                    </p>

                    <span
                      className={[
                        "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        document.status ===
                        "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      ].join(" ")}
                    >
                      {document.status ===
                      "active"
                        ? "Activo"
                        : "Archivado"}
                    </span>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Relacionado con
                    </p>

                    <p className="mt-3 font-semibold text-slate-900">
                      {document
                        .relations[0]
                        ?.entityName ??
                        "Sin relación"}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Cargado por
                    </p>

                    <p className="mt-3 font-semibold text-slate-900">
                      {document
                        .uploadedByName ??
                        document
                          .uploadedByEmail ??
                        "Usuario"}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Fecha de carga
                    </p>

                    <p className="mt-3 font-semibold text-slate-900">
                      {formatDate(
                        document.createdTime,
                      )}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Última actualización
                    </p>

                    <p className="mt-3 font-semibold text-slate-900">
                      {formatDate(
                        document.modifiedTime,
                      )}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Descripción
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {document.description ??
                        "Sin información"}
                    </p>
                  </article>
                </div>
              </section>
            </div>

            <footer className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  className={[
                    "rounded-xl border px-5 py-3 font-semibold",
                    document.status ===
                    "archived"
                      ? "border-emerald-300 text-emerald-700"
                      : "border-amber-300 text-amber-700",
                  ].join(" ")}
                  onClick={
                    toggleArchive
                  }
                >
                  {document.status ===
                  "archived"
                    ? "Restaurar"
                    : "Archivar"}
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                    onClick={onClose}
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg"
                    onClick={() =>
                      setIsEditing(true)
                    }
                  >
                    Editar
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
