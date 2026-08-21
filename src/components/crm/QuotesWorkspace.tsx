"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import QuoteFormDrawer from "@/components/crm/QuoteFormDrawer";

import WorkspaceTableActions from "@/components/crm/WorkspaceTableActions";

import Button from "@/components/ui/Button";

import type {
  CRMQuoteApiResponse,
  CRMQuoteRecord,
} from "@/types/crm-quotes";

type ProductRecord = {
  id: string;
  name: string;

  description?:
    | string
    | null;

  unitPrice: number;
  currency: string;
};

type CustomerRecord = {
  id: string;
  displayName: string;

  customerType?:
    | string
    | null;
};

type LeadApiRecord = {
  id: string;

  firstName?:
    | string
    | null;

  lastName?:
    | string
    | null;

  email?:
    | string
    | null;
};

type LeadRecord = {
  id: string;
  displayName: string;
};

type DealRecord = {
  id: string;
  name: string;

  customerId?:
    | string
    | null;

  sourceLeadId?:
    | string
    | null;

  acquisitionChannel?:
    | string
    | null;

  items: Array<{
    id: string;

    productId?:
      | string
      | null;

    name: string;
    quantity: number;
    unitPrice: number;

    paymentMethod?:
      | string
      | null;

    customerDownPayment:
      number;

    financingMonths?:
      | number
      | null;
  }>;

  promotions: Array<{
    id: string;

    promotionId?:
      | string
      | null;

    dealItemId?:
      | string
      | null;

    scope: string;

    name: string;

    promotionGroup?:
      | string
      | null;

    benefitType?:
      | string
      | null;

    paymentMethod?:
      | string
      | null;

    requiresSelection:
      boolean;

    value?:
      | number
      | null;
  }>;
};

type MemberOption = {
  value: string;
  label: string;
};

type BranchOption = {
  id: string;
  value: string;
  name: string;
  code?: string | null;
  regionId?: string | null;
  label: string;
  isPrimary: boolean;
};

type BranchesResponse = {
  success: boolean;
  data?: BranchOption[];
  primaryBranchId?: string | null;
  error?: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type DrawerState = {
  isOpen: boolean;

  mode:
    | "create"
    | "edit";

  record?:
    | CRMQuoteRecord
    | null;
};

function formatMoney(
  value: number,
  currency = "mxn",
): string {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",

      currency:
        currency.toUpperCase(),

      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatDate(
  value:
    | string
    | null
    | undefined,
  includeTime = false,
): string {
  if (!value) {
    return "Sin información";
  }

  if (!includeTime) {
    const dateOnly =
      value.slice(0, 10);

    const [
      year,
      month,
      day,
    ] = dateOnly
      .split("-")
      .map(Number);

    if (
      !year ||
      !month ||
      !day
    ) {
      return value;
    }

    const date =
      new Date(
        year,
        month - 1,
        day,
      );

    return date.toLocaleDateString(
      "es-MX",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    );
  }

  const date =
    new Date(value);

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

function getStatusClassName(
  status: string,
): string {
  const normalized =
    status.toLowerCase();

  if (
    normalized.includes(
      "aceptada",
    ) ||
    normalized.includes(
      "convertida",
    )
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized.includes(
      "enviada",
    )
  ) {
    return "bg-blue-50 text-blue-700";
  }

  if (
    normalized.includes(
      "rechazada",
    ) ||
    normalized.includes(
      "cancelada",
    ) ||
    normalized.includes(
      "vencida",
    )
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function QuotesWorkspace() {
  const [
    quotes,
    setQuotes,
  ] = useState<
    CRMQuoteRecord[]
  >([]);

  const [
    products,
    setProducts,
  ] = useState<
    ProductRecord[]
  >([]);

  const [
    customers,
    setCustomers,
  ] = useState<
    CustomerRecord[]
  >([]);

  const [
    leads,
    setLeads,
  ] = useState<
    LeadRecord[]
  >([]);

  const [
    deals,
    setDeals,
  ] = useState<
    DealRecord[]
  >([]);

  const [
    members,
    setMembers,
  ] = useState<
    MemberOption[]
  >([]);

  const [
    branches,
    setBranches,
  ] = useState<
    BranchOption[]
  >([]);

  const [
    primaryBranchId,
    setPrimaryBranchId,
  ] = useState<
    string | null
  >(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

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

  const [
    sendingQuoteId,
    setSendingQuoteId,
  ] = useState<
    string | null
  >(null);

  const [
    selectedQuote,
    setSelectedQuote,
  ] = useState<
    CRMQuoteRecord | null
  >(null);

  const [
    drawer,
    setDrawer,
  ] = useState<
    DrawerState
  >({
    isOpen: false,
    mode: "create",
    record: null,
  });

  const loadData =
    useCallback(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const [
            quotesResponse,
            productsResponse,
            customersResponse,
            leadsResponse,
            dealsResponse,
            membersResponse,
            branchesResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/crm/quotes",
                {
                  cache:
                    "no-store",
                },
              ),

              fetch(
                "/api/crm/products",
                {
                  cache:
                    "no-store",
                },
              ),

              fetch(
                "/api/crm/customers",
                {
                  cache:
                    "no-store",
                },
              ),

              fetch(
                "/api/crm/leads",
                {
                  cache:
                    "no-store",
                },
              ),

              fetch(
                "/api/crm/deals",
                {
                  cache:
                    "no-store",
                },
              ),

              fetch(
                "/api/crm/members/options",
                {
                  cache:
                    "no-store",
                },
              ),
              fetch(
                "/api/crm/branches/options",
                {
                  cache:
                    "no-store",
                },
              ),
            ]);

          const quotesResult =
            (await quotesResponse.json()) as
              CRMQuoteApiResponse<
                CRMQuoteRecord[]
              >;

          const productsResult =
            (await productsResponse.json()) as
              ApiResponse<
                ProductRecord[]
              >;

          const customersResult =
            (await customersResponse.json()) as
              ApiResponse<
                CustomerRecord[]
              >;

          const leadsResult =
            (await leadsResponse.json()) as
              ApiResponse<
                LeadApiRecord[]
              >;

          const dealsResult =
            (await dealsResponse.json()) as
              ApiResponse<
                DealRecord[]
              >;

          const membersResult =
            (await membersResponse.json()) as
              ApiResponse<
                MemberOption[]
              >;

          const branchesResult =
            (await branchesResponse.json()) as
              BranchesResponse;

          if (
            !branchesResponse.ok ||
            !branchesResult.success
          ) {
            throw new Error(
              branchesResult.error ??
                "No fue posible cargar las sucursales.",
            );
          }

          if (
            !quotesResponse.ok ||
            !quotesResult.success
          ) {
            throw new Error(
              quotesResult.error ??
                "No fue posible cargar las cotizaciones.",
            );
          }

          setQuotes(
            quotesResult.data ??
              [],
          );

          setProducts(
            productsResult.data ??
              [],
          );

          setCustomers(
            customersResult.data ??
              [],
          );

          setLeads(
            (
              leadsResult.data ??
              []
            ).map(
              (lead) => {
                const name = [
                  lead.firstName,
                  lead.lastName,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(" ")
                  .trim();

                return {
                  id: lead.id,

                  displayName:
                    name ||
                    lead.email ||
                    "Prospecto sin nombre",
                };
              },
            ),
          );

          setDeals(
            dealsResult.data ??
              [],
          );

          setMembers(
            membersResult.data ??
              [],
          );
                    setBranches(
            branchesResult.data ?? [],
          );

          setPrimaryBranchId(
            branchesResult.primaryBranchId ??
              null,
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "No fue posible cargar las cotizaciones.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          void loadData();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [loadData]);

  async function sendQuote(
    quote: CRMQuoteRecord,
  ) {
    const email =
      window.prompt(
        "Confirma el correo al que se enviará la cotización:",
        quote.relatedEmail ??
          "",
      );

    if (email === null) {
      return;
    }

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      window.alert(
        "Ingresa el correo del destinatario.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `¿Enviar la cotización ${quote.quoteNumber} a ${normalizedEmail}?`,
      );

    if (!confirmed) {
      return;
    }

    setSendingQuoteId(
      quote.id,
    );

    try {
      const response =
        await fetch(
          `/api/crm/quotes/${quote.id}/send`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                normalizedEmail,
            }),
          },
        );

      const result =
        (await response.json()) as
          {
            success: boolean;
            error?: string;
            message?: string;

            data?: {
              status?: string;
              sentAt?: string;
            };
          };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible enviar la cotización.",
        );
      }

      window.alert(
        result.message ??
          "Cotización enviada correctamente.",
      );

      setSelectedQuote(
        (current) =>
          current?.id ===
          quote.id
            ? {
                ...current,

                status:
                  "Enviada",

                sentAt:
                  result.data
                    ?.sentAt ??
                  new Date()
                    .toISOString(),
              }
            : current,
      );

      await loadData();
    } catch (sendError) {
      window.alert(
        sendError instanceof
          Error
          ? sendError.message
          : "No fue posible enviar la cotización.",
      );
    } finally {
      setSendingQuoteId(
        null,
      );
    }
  }

  const visibleQuotes =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return quotes.filter(
        (quote) => {
          const matchesStatus =
            !statusFilter ||
            quote.status ===
              statusFilter;

          const searchableText = [
            quote.quoteNumber,
            quote.subject,
            quote.status,
            quote.relatedName,
            quote.owner.name,
            quote.owner.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            matchesStatus &&
            (
              !normalizedSearch ||
              searchableText.includes(
                normalizedSearch,
              )
            )
          );
        },
      );
    }, [
      quotes,
      search,
      statusFilter,
    ]);

  return (
    <>
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Cotizaciones
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {visibleQuotes.length}{" "}
                {visibleQuotes.length ===
                1
                  ? "registro"
                  : "registros"}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={
                  search
                }
                placeholder="Buscar por folio, asunto o cliente"
                className="min-w-72 rounded-xl border border-slate-300 px-4 py-3 text-sm"
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event
                      .target
                      .value,
                  )
                }
              />

              <select
                value={
                  statusFilter
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                onChange={(
                  event,
                ) =>
                  setStatusFilter(
                    event
                      .target
                      .value,
                  )
                }
              >
                <option value="">
                  Todos los estados
                </option>

                {[
                  "Borrador",
                  "Enviada",
                  "Aceptada",
                  "Rechazada",
                  "Vencida",
                  "Convertida",
                  "Cancelada",
                ].map(
                  (status) => (
                    <option
                      key={
                        status
                      }
                      value={
                        status
                      }
                    >
                      {status}
                    </option>
                  ),
                )}
              </select>

              <WorkspaceTableActions
                title="Cotizaciones"
                columns={[
                  "N.º de cotización",
                  "Asunto",
                  "Sucursal",
                  "Estado",
                  "Relacionado con",
                  "Válida hasta",
                  "Total",
                  "Responsable",
                ]}
                rows={visibleQuotes.map(
                  (quote) => [
                    quote.quoteNumber,
                    quote.subject,
                    quote.branchName ??
                      "Sin sucursal",
                    quote.status,
                    quote.relatedName ??
                      "Sin relación",
                    formatDate(
                      quote.validUntil,
                    ),
                    formatMoney(
                      quote.totalAmount,
                      quote.currency,
                    ),
                    quote.owner.name ??
                      quote.owner.email ??
                      "Sin responsable",
                  ],
                )}
                isRefreshing={
                  isLoading
                }
                onRefresh={
                  loadData
                }
              />

              <Button
                onClick={() =>
                  setDrawer({
                    isOpen:
                      true,

                    mode:
                      "create",

                    record:
                      null,
                  })
                }
              >
                Nueva cotización
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "N.º de cotización",
                  "Asunto",
                  "Sucursal",
                  "Estado",
                  "Relacionado con",
                  "Válida hasta",
                  "Total",
                  "Responsable",
                  "Acciones",
                ].map(
                  (header) => (
                    <th
                      key={
                        header
                      }
                      className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleQuotes.map(
                (quote) => (
                  <tr
                    key={
                      quote.id
                    }
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-950">
                      {
                        quote.quoteNumber
                      }
                    </td>

                    <td className="min-w-64 px-5 py-4">
                      <button
                        type="button"
                        className="text-left font-semibold text-slate-950 hover:text-emerald-700"
                        onClick={() =>
                          setSelectedQuote(
                            quote,
                          )
                        }
                      >
                        {
                          quote.subject
                        }
                      </button>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          quote.items.length
                        }{" "}
                        {quote.items.length ===
                        1
                          ? "partida"
                          : "partidas"}
                      </p>
                    </td>

                    <td className="min-w-48 px-5 py-4 text-sm font-semibold text-slate-700">
                      {quote.branchName ??
                        "Sin sucursal"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          getStatusClassName(
                            quote.status,
                          ),
                        ].join(
                          " ",
                        )}
                      >
                        {
                          quote.status
                        }
                      </span>
                    </td>

                    <td className="min-w-52 px-5 py-4 text-sm text-slate-600">
                      {quote.relatedName ??
                        "Sin relación"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {formatDate(
                        quote.validUntil,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-950">
                      {formatMoney(
                        quote.totalAmount,
                        quote.currency,
                      )}
                    </td>

                    <td className="min-w-44 px-5 py-4 text-sm text-slate-600">
                      {quote.owner.name ??
                        quote.owner.email ??
                        "Sin responsable"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setSelectedQuote(
                              quote,
                            )
                          }
                        >
                          Ver
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setDrawer({
                              isOpen:
                                true,

                              mode:
                                "edit",

                              record:
                                quote,
                            })
                          }
                        >
                          Editar
                        </Button>

                        <Button
                          href={`/api/crm/quotes/${quote.id}/pdf`}
                          size="sm"
                          variant="secondary"
                        >
                          Descargar PDF
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            sendingQuoteId ===
                            quote.id
                          }
                          onClick={() =>
                            void sendQuote(
                              quote,
                            )
                          }
                        >
                          {sendingQuoteId ===
                          quote.id
                            ? "Enviando..."
                            : "Enviar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="px-6 py-20 text-center text-sm font-semibold text-slate-500">
            Cargando cotizaciones...
          </div>
        )}

        {!isLoading &&
          visibleQuotes.length ===
            0 && (
          <div className="px-6 py-20 text-center">
            <p className="text-lg font-bold text-slate-950">
              No hay cotizaciones
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Crea la primera cotización para comenzar.
            </p>
          </div>
        )}
      </section>

      <QuoteFormDrawer
        isOpen={
          drawer.isOpen
        }
        mode={
          drawer.mode
        }
        record={
          drawer.record
        }
        products={
          products
        }
        customers={
          customers
        }
        leads={
          leads
        }
        deals={
          deals
        }
        members={
          members
        }
        branches={
          branches
        }
        primaryBranchId={
          primaryBranchId
        }
        onClose={() =>
          setDrawer(
            (current) => ({
              ...current,

              isOpen:
                false,
            }),
          )
        }
        onSaved={
          loadData
        }
      />

      {selectedQuote && (
        <div className="fixed inset-0 z-[110]">
          <button
            type="button"
            aria-label="Cerrar detalle"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() =>
              setSelectedQuote(
                null,
              )
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                    Detalle de cotización
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {
                      selectedQuote.subject
                    }
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {
                      selectedQuote.quoteNumber
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500"
                  onClick={() =>
                    setSelectedQuote(
                      null,
                    )
                  }
                >
                  ×
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
              <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Estado
                  </p>

                  <span
                    className={[
                      "mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                      getStatusClassName(
                        selectedQuote.status,
                      ),
                    ].join(
                      " ",
                    )}
                  >
                    {
                      selectedQuote.status
                    }
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Sucursal
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedQuote.branchName ??
                      "Sin sucursal"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Relacionado con
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedQuote.relatedName ??
                      "Sin información"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Válida hasta
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {formatDate(
                      selectedQuote.validUntil,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Responsable
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedQuote.owner.name ??
                      selectedQuote.owner.email}
                  </p>
                </div>
              </section>

              <section className="rounded-[28px] bg-slate-950 p-6 text-white shadow-xl">
                <h3 className="text-lg font-black">
                  Resumen de la cotización
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-sm text-slate-400">
                      Subtotal
                    </p>

                    <p className="mt-1 text-xl font-black">
                      {formatMoney(
                        selectedQuote.baseAmount,
                        selectedQuote.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Descuentos
                    </p>

                    <p className="mt-1 text-xl font-black text-emerald-400">
                      -
                      {formatMoney(
                        selectedQuote.discountAmount,
                        selectedQuote.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Impuestos
                    </p>

                    <p className="mt-1 text-xl font-black">
                      {formatMoney(
                        selectedQuote.taxAmount,
                        selectedQuote.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Ajuste
                    </p>

                    <p className="mt-1 text-xl font-black">
                      {formatMoney(
                        selectedQuote.adjustmentAmount,
                        selectedQuote.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Total
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {formatMoney(
                        selectedQuote.totalAmount,
                        selectedQuote.currency,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-700 pt-5">
                  <p className="text-sm font-semibold text-slate-300">
                    Partidas
                  </p>

                  <div className="mt-3 grid gap-3">
                    {selectedQuote.items.map(
                      (item) => (
                        <article
                          key={
                            item.id
                          }
                          className="rounded-xl bg-slate-900 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-bold">
                                {
                                  item.name
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  item.quantity
                                }{" "}
                                ×{" "}
                                {formatMoney(
                                  item.unitPrice,
                                  selectedQuote.currency,
                                )}
                              </p>
                            </div>

                            <p className="font-black">
                              {formatMoney(
                                item.totalAmount,
                                selectedQuote.currency,
                              )}
                            </p>
                          </div>

                          {item.financingMonths && (
                            <div className="mt-4 grid gap-3 border-t border-slate-700 pt-4 sm:grid-cols-4">
                              <div>
                                <p className="text-xs text-slate-400">
                                  Plazo
                                </p>

                                <p className="mt-1 font-bold">
                                  {
                                    item.financingMonths
                                  }{" "}
                                  meses
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">
                                  Enganche
                                </p>

                                <p className="mt-1 font-bold">
                                  {formatMoney(
                                    item.customerDownPayment,
                                    selectedQuote.currency,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">
                                  Saldo
                                </p>

                                <p className="mt-1 font-bold">
                                  {formatMoney(
                                    item.financedAmount ??
                                      0,
                                    selectedQuote.currency,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">
                                  Mensualidad
                                </p>

                                <p className="mt-1 font-bold text-emerald-400">
                                  {formatMoney(
                                    item.estimatedPayment ??
                                      0,
                                    selectedQuote.currency,
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {item.promotions.length >
                            0 && (
                            <div className="mt-4 border-t border-slate-700 pt-4">
                              <p className="text-xs text-slate-400">
                                Promociones aplicadas
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.promotions.map(
                                  (
                                    promotion,
                                  ) => (
                                    <span
                                      key={
                                        promotion.id
                                      }
                                      className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300"
                                    >
                                      {
                                        promotion.promotionName
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </article>
                      ),
                    )}
                  </div>
                </div>
              </section>

              {(selectedQuote.commercialSummary ||
                selectedQuote.termsAndConditions ||
                selectedQuote.description) && (
                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Condiciones comerciales
                    </h3>
                  </header>

                  <div className="grid gap-5 p-5">
                    {selectedQuote.commercialSummary && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Resumen comercial
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {
                            selectedQuote.commercialSummary
                          }
                        </p>
                      </div>
                    )}

                    {selectedQuote.termsAndConditions && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Términos y condiciones
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {
                            selectedQuote.termsAndConditions
                          }
                        </p>
                      </div>
                    )}

                    {selectedQuote.description && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Descripción
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {
                            selectedQuote.description
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            <footer className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                  onClick={() =>
                    setSelectedQuote(
                      null,
                    )
                  }
                >
                  Cerrar
                </button>

                <Button
                  href={`/api/crm/quotes/${selectedQuote.id}/pdf`}
                  variant="secondary"
                >
                  Descargar PDF
                </Button>

                <Button
                  type="button"
                  disabled={
                    sendingQuoteId ===
                    selectedQuote.id
                  }
                  onClick={() =>
                    void sendQuote(
                      selectedQuote,
                    )
                  }
                >
                  {sendingQuoteId ===
                  selectedQuote.id
                    ? "Enviando..."
                    : "Enviar por correo"}
                </Button>

                <Button
                  onClick={() => {
                    const quote =
                      selectedQuote;

                    setSelectedQuote(
                      null,
                    );

                    setDrawer({
                      isOpen:
                        true,

                      mode:
                        "edit",

                      record:
                        quote,
                    });
                  }}
                >
                  Editar
                </Button>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
