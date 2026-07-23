"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DocumentDetailDrawer from "@/components/crm/DocumentDetailDrawer";
import DocumentUploadDrawer from "@/components/crm/DocumentUploadDrawer";

import {
  CRM_DOCUMENT_CATEGORIES,
  type CRMDocumentListResponse,
  type CRMDocumentRecord,
  type CRMDocumentRelationOption,
} from "@/types/crm-documents";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type LeadApiRecord = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type CustomerApiRecord = {
  id: string;
  displayName: string;
};

type DealApiRecord = {
  id: string;
  name: string;
};

type ActivityApiRecord = {
  id: string;
  subject: string;
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
  value: string,
): string {
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

function getDocumentBadge(
  mimeType: string,
): {
  label: string;
  className: string;
} {
  if (
    mimeType ===
    "application/pdf"
  ) {
    return {
      label: "PDF",
      className:
        "bg-red-100 text-red-700",
    };
  }

  if (
    mimeType.startsWith(
      "image/",
    )
  ) {
    return {
      label: "IMG",
      className:
        "bg-violet-100 text-violet-700",
    };
  }

  if (
    mimeType.includes(
      "word",
    ) ||
    mimeType ===
      "application/msword"
  ) {
    return {
      label: "DOC",
      className:
        "bg-blue-100 text-blue-700",
    };
  }

  if (
    mimeType.includes(
      "sheet",
    ) ||
    mimeType.includes(
      "excel",
    )
  ) {
    return {
      label: "XLS",
      className:
        "bg-emerald-100 text-emerald-700",
    };
  }

  if (
    mimeType.includes(
      "presentation",
    ) ||
    mimeType.includes(
      "powerpoint",
    )
  ) {
    return {
      label: "PPT",
      className:
        "bg-orange-100 text-orange-700",
    };
  }

  return {
    label: "FILE",
    className:
      "bg-slate-100 text-slate-700",
  };
}

export default function DocumentsWorkspace() {
  const [
    documents,
    setDocuments,
  ] = useState<
    CRMDocumentRecord[]
  >([]);

  const [
    relationOptions,
    setRelationOptions,
  ] = useState<
    CRMDocumentRelationOption[]
  >([]);

  const [
    selectedDocument,
    setSelectedDocument,
  ] = useState<
    CRMDocumentRecord | null
  >(null);

  const [
    detailMode,
    setDetailMode,
  ] = useState<
    "view" | "edit"
  >("view");

  const [
    isUploadOpen,
    setIsUploadOpen,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "all" | "active" | "archived"
  >("active");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("all");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const loadData =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [
          documentsResponse,
          leadsResponse,
          customersResponse,
          dealsResponse,
          activitiesResponse,
        ] = await Promise.all([
          fetch(
            "/api/crm/documents",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/leads",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/customers",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/deals",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/activities",
            {
              cache: "no-store",
            },
          ),
        ]);

        const documentsResult =
          (await documentsResponse.json()) as
            CRMDocumentListResponse;

        const leadsResult =
          (await leadsResponse.json()) as
            ApiResponse<
              LeadApiRecord[]
            >;

        const customersResult =
          (await customersResponse.json()) as
            ApiResponse<
              CustomerApiRecord[]
            >;

        const dealsResult =
          (await dealsResponse.json()) as
            ApiResponse<
              DealApiRecord[]
            >;

        const activitiesResult =
          (await activitiesResponse.json()) as
            ApiResponse<
              ActivityApiRecord[]
            >;

        if (
          !documentsResponse.ok ||
          !documentsResult.success
        ) {
          throw new Error(
            documentsResult.error ??
              "No fue posible cargar los documentos.",
          );
        }

        const nextDocuments =
          documentsResult.data ?? [];

        setDocuments(
          nextDocuments,
        );

        setSelectedDocument(
          (current) =>
            current
              ? nextDocuments.find(
                  (document) =>
                    document.id ===
                    current.id,
                ) ?? null
              : null,
        );

        const leadOptions:
          CRMDocumentRelationOption[] =
          leadsResult.success
            ? (
                leadsResult.data ??
                []
              ).map((lead) => {
                const fullName = [
                  lead.firstName,
                  lead.lastName,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .trim();

                return {
                  id: lead.id,
                  type: "lead",

                  label:
                    `Prospecto · ${
                      fullName ||
                      lead.email ||
                      "Sin nombre"
                    }`,
                };
              })
            : [];

        const customerOptions:
          CRMDocumentRelationOption[] =
          customersResult.success
            ? (
                customersResult.data ??
                []
              ).map(
                (customer) => ({
                  id: customer.id,
                  type: "customer",

                  label:
                    `Cliente · ${customer.displayName}`,
                }),
              )
            : [];

        const dealOptions:
          CRMDocumentRelationOption[] =
          dealsResult.success
            ? (
                dealsResult.data ??
                []
              ).map((deal) => ({
                id: deal.id,
                type: "deal",

                label:
                  `Oportunidad · ${deal.name}`,
              }))
            : [];

        const activityOptions:
          CRMDocumentRelationOption[] =
          activitiesResult.success
            ? (
                activitiesResult.data ??
                []
              ).map(
                (activity) => ({
                  id: activity.id,
                  type: "activity",

                  label:
                    `Actividad · ${activity.subject}`,
                }),
              )
            : [];

        setRelationOptions([
          ...leadOptions,
          ...customerOptions,
          ...dealOptions,
          ...activityOptions,
        ]);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar los documentos.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleDocuments =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return documents.filter(
        (document) => {
          if (
            statusFilter !==
              "all" &&
            document.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            categoryFilter !==
              "all" &&
            document.category !==
              categoryFilter
          ) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          const relationText =
            document.relations
              .map(
                (relation) =>
                  relation.entityName ??
                  "",
              )
              .join(" ");

          return [
            document.name,
            document
              .originalFileName,
            document.category,
            document
              .uploadedByName,
            document
              .uploadedByEmail,
            relationText,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(
              normalizedSearch,
            );
        },
      );
    }, [
      categoryFilter,
      documents,
      search,
      statusFilter,
    ]);

  const activeCount =
    documents.filter(
      (document) =>
        document.status ===
        "active",
    ).length;

  const archivedCount =
    documents.filter(
      (document) =>
        document.status ===
        "archived",
    ).length;

  const totalSize =
    documents
      .filter(
        (document) =>
          document.status ===
          "active",
      )
      .reduce(
        (
          total,
          document,
        ) =>
          total +
          document.sizeBytes,
        0,
      );
  
  function openDocument(
    document:
      CRMDocumentRecord,
    mode:
      | "view"
      | "edit",
  ) {
    setDetailMode(mode);

    setSelectedDocument(
      document,
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Documentos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {visibleDocuments.length}{" "}
                de {documents.length}{" "}
                registros
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <input
                type="search"
                value={search}
                placeholder="Buscar por nombre, categoría o relación"
                className="min-w-72 rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
              />

              <select
                value={
                  categoryFilter
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value,
                  )
                }
              >
                <option value="all">
                  Todas las categorías
                </option>

                {CRM_DOCUMENT_CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ),
                )}
              </select>

              <button
                type="button"
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
                onClick={() =>
                  void loadData()
                }
              >
                Actualizar
              </button>

              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg"
                onClick={() =>
                  setIsUploadOpen(
                    true,
                  )
                }
              >
                Cargar documento
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(
              [
                {
                  value: "active",
                  label:
                    `Activos (${activeCount})`,
                },
                {
                  value: "archived",
                  label:
                    `Archivados (${archivedCount})`,
                },
                {
                  value: "all",
                  label:
                    `Todos (${documents.length})`,
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  statusFilter ===
                  option.value
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                ].join(" ")}
                onClick={() =>
                  setStatusFilter(
                    option.value,
                  )
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:grid-cols-3 sm:p-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Documentos activos
            </p>

            <p className="mt-2 text-2xl font-black text-slate-950">
              {activeCount}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Espacio utilizado
            </p>

            <p className="mt-2 text-2xl font-black text-slate-950">
              {formatFileSize(
                totalSize,
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Documentos archivados
            </p>

            <p className="mt-2 text-2xl font-black text-slate-950">
              {archivedCount}
            </p>
          </article>
        </div>

        {error && (
          <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 sm:m-6">
            {error}
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-sm text-slate-600">
                <th className="px-5 py-4 font-semibold">
                  Documento
                </th>

                <th className="px-5 py-4 font-semibold">
                  Categoría
                </th>

                <th className="px-5 py-4 font-semibold">
                  Relacionado con
                </th>

                <th className="px-5 py-4 font-semibold">
                  Tamaño
                </th>

                <th className="px-5 py-4 font-semibold">
                  Cargado por
                </th>

                <th className="px-5 py-4 font-semibold">
                  Fecha de carga
                </th>

                <th className="px-5 py-4 font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleDocuments.map(
                (document) => {
                  const badge =
                    getDocumentBadge(
                      document.mimeType,
                    );

                  return (
                    <tr
                      key={document.id}
                      className="border-b border-slate-100 align-middle last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="min-w-72 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={[
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                              badge.className,
                            ].join(" ")}
                          >
                            {
                              badge.label
                            }
                          </span>

                          <div className="min-w-0">
                            <button
                              type="button"
                              className="block max-w-64 truncate text-left font-semibold text-slate-950 hover:text-emerald-700"
                              onClick={() =>
                                openDocument(
                                  document,
                                  "view",
                                )
                              }
                            >
                              {document.name}
                            </button>

                            <p className="mt-1 max-w-64 truncate text-xs text-slate-500">
                              {
                                document.originalFileName
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {
                            document.category
                          }
                        </span>
                      </td>

                      <td className="min-w-52 px-5 py-4 text-sm text-slate-600">
                        {document
                          .relations[0]
                          ?.entityName ??
                          "Sin relación"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatFileSize(
                          document.sizeBytes,
                        )}
                      </td>

                      <td className="min-w-44 px-5 py-4 text-sm text-slate-600">
                        {document
                          .uploadedByName ??
                          document
                            .uploadedByEmail ??
                          "Usuario"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDate(
                          document.createdTime,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                            onClick={() =>
                              openDocument(
                                document,
                                "view",
                              )
                            }
                          >
                            Ver
                          </button>

                          <button
                            type="button"
                            className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700"
                            onClick={() =>
                              openDocument(
                                document,
                                "edit",
                              )
                            }
                          >
                            Editar
                          </button>

                          <a
                            href={`/api/crm/documents/${document.id}/content?download=1`}
                            className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700"
                          >
                            Descargar
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 p-5 lg:hidden">
          {visibleDocuments.map(
            (document) => {
              const badge =
                getDocumentBadge(
                  document.mimeType,
                );

              return (
                <article
                  key={document.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                        badge.className,
                      ].join(" ")}
                    >
                      {badge.label}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-950">
                        {document.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {
                          document.originalFileName
                        }
                      </p>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-400">
                        Categoría
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-700">
                        {
                          document.category
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-400">
                        Relacionado con
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-700">
                        {document
                          .relations[0]
                          ?.entityName ??
                          "Sin relación"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                      onClick={() =>
                        openDocument(
                          document,
                          "view",
                        )
                      }
                    >
                      Ver
                    </button>

                    <button
                      type="button"
                      className="flex-1 rounded-xl border border-blue-300 px-4 py-2.5 text-sm font-semibold text-blue-700"
                      onClick={() =>
                        openDocument(
                          document,
                          "edit",
                        )
                      }
                    >
                      Editar
                    </button>

                    <a
                      href={`/api/crm/documents/${document.id}/content?download=1`}
                      className="flex-1 rounded-xl border border-emerald-300 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700"
                    >
                      Descargar
                    </a>
                  </div>
                </article>
              );
            },
          )}
        </div>

        {!isLoading &&
          visibleDocuments.length ===
            0 && (
          <div className="px-6 py-20 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
              ▤
            </span>

            <p className="mt-5 text-lg font-bold text-slate-950">
              No hay documentos para mostrar
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Carga el primer archivo o cambia los filtros.
            </p>

            <button
              type="button"
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white"
              onClick={() =>
                setIsUploadOpen(
                  true,
                )
              }
            >
              Cargar documento
            </button>
          </div>
        )}

        {isLoading && (
          <div className="px-6 py-20 text-center text-sm font-semibold text-slate-500">
            Cargando documentos...
          </div>
        )}
      </section>

      <DocumentUploadDrawer
        isOpen={isUploadOpen}
        relationOptions={
          relationOptions
        }
    
        onClose={() =>
          setIsUploadOpen(false)
        }
        onSaved={loadData}
      />

      <DocumentDetailDrawer
        isOpen={
          Boolean(
            selectedDocument,
          )
        }
        initialMode={
          detailMode
        }
        document={
          selectedDocument
        }
        relationOptions={
          relationOptions
        }
        onClose={() =>
          setSelectedDocument(
            null,
          )
        }
        onSaved={loadData}
      />
    </>
  );
}
