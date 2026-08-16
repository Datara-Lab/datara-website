"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DataraTableScroll from "@/components/shared/DataraTableScroll";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";

type SalesOrderStatus =
  | "Borrador"
  | "Confirmada"
  | "Entregada"
  | "Cancelada";

type SalesOrderItem = {
  id: string;
  salesOrderId: string;

  productId:
  | string
  | null;

  productCode:
  | string
  | null;

  name: string;

  description:
  | string
  | null;

  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalAmount: number;
  position: number;
};

type SalesOrder = {
  id: string;
  reference: string;
  status: SalesOrderStatus;

  branchId:
  | string
  | null;

  branchLabel: string;

  customerId:
  | string
  | null;

  customerName: string;

  customerEmail:
  | string
  | null;

  customerPhone:
  | string
  | null;

  dealId:
  | string
  | null;

  quoteId:
  | string
  | null;

  ownerName:
  | string
  | null;

  currency: string;
  baseAmount: number;
  discountAmount: number;
  totalAmount: number;

  paymentMethod:
  | string
  | null;

  notes:
  | string
  | null;

  deliveryReason:
  | string
  | null;

  createdByName:
  | string
  | null;

  confirmedByName:
  | string
  | null;

  confirmedAt:
  | string
  | null;

  deliveredByName:
  | string
  | null;

  deliveredAt:
  | string
  | null;

  cancelledByName:
  | string
  | null;

  cancelledAt:
  | string
  | null;

  cancellationReason:
  | string
  | null;

  createdAt: string;
  updatedAt: string;

  items:
  SalesOrderItem[];
};

type SalesOrderPermissions = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canManage: boolean;
};

type SalesOrdersResponse = {
  success: boolean;

  data?:
  SalesOrder[];

  permissions?:
  SalesOrderPermissions;

  message?: string;
  error?: string;
};

type SourceOption = {
  id: string;
  type:
    | "Oportunidad"
    | "Cotización";

  reference: string;
  customerName: string;
  totalAmount: number;
  currency: string;
};

type DealSourceRecord = {
  id: string;
  name: string;
  status: string;

  customerName:
  | string
  | null;

  totalAmount: number;
  currency: string;
};

type QuoteSourceRecord = {
  id: string;
  quoteNumber: string;
  subject: string;
  status: string;

  dealId:
  | string
  | null;

  customerName:
  | string
  | null;

  totalAmount: number;
  currency: string;

  acceptedAt?:
  | string
  | null;
};

type ReservationSourceRecord = {
  sourceType: string;

  sourceId:
  | string
  | null;

  status: string;
};

type SourcesResponse<T> = {
  success: boolean;
  data?: T[];
  error?: string;
};

type WriteResponse = {
  success: boolean;
  message?: string;
  error?: string;

  data?: {
    id: string;
    reference?: string;
    status?: SalesOrderStatus;
  };
};

function formatMoney(
  value: number,
  currency = "mxn",
) {
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
    | null,
) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    );
}

function getStatusClassName(
  status: SalesOrderStatus,
) {
  if (
    status === "Entregada"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }

  if (
    status === "Confirmada"
  ) {
    return "bg-blue-50 text-blue-700 ring-blue-600/20";
  }

  if (
    status === "Cancelada"
  ) {
    return "bg-red-50 text-red-700 ring-red-600/20";
  }

  return "bg-amber-50 text-amber-700 ring-amber-600/20";
}

export default function SalesOrdersPage() {
  const [
    orders,
    setOrders,
  ] = useState<SalesOrder[]>(
    [],
  );

  const [
    deals,
    setDeals,
  ] = useState<
    DealSourceRecord[]
  >([]);

  const [
    quotes,
    setQuotes,
  ] = useState<
    QuoteSourceRecord[]
  >([]);

  const [
    reservations,
    setReservations,
  ] = useState<
    ReservationSourceRecord[]
  >([]);

  const [
    permissions,
    setPermissions,
  ] = useState<
    SalesOrderPermissions
  >({
    canView: false,
    canCreate: false,
    canEdit: false,
    canManage: false,
  });

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState<
    SalesOrder | null
  >(null);

  const [
    isCreateOpen,
    setIsCreateOpen,
  ] = useState(false);

  const [
    selectedSourceKey,
    setSelectedSourceKey,
  ] = useState("");

  const [
    createNotes,
    setCreateNotes,
  ] = useState("");

  const [
    actionReason,
    setActionReason,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadWorkspace =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [
          ordersResponse,
          dealsResponse,
          quotesResponse,
          reservationsResponse,
        ] = await Promise.all([
          fetch(
            "/api/crm/sales-orders",
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
            "/api/crm/quotes",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/inventory/reservations",
            {
              cache: "no-store",
            },
          ),
        ]);

        const ordersPayload =
          (await ordersResponse.json()) as
            SalesOrdersResponse;

        const dealsPayload =
          (await dealsResponse.json()) as
            SourcesResponse<
              DealSourceRecord
            >;

        const quotesPayload =
          (await quotesResponse.json()) as
            SourcesResponse<
              QuoteSourceRecord
            >;

        const reservationsPayload =
          (await reservationsResponse.json()) as
            SourcesResponse<
              ReservationSourceRecord
            >;

        if (
          !ordersResponse.ok ||
          !ordersPayload.success
        ) {
          throw new Error(
            ordersPayload.error ??
            "No fue posible cargar las órdenes de venta.",
          );
        }

        if (
          !dealsResponse.ok ||
          !dealsPayload.success
        ) {
          throw new Error(
            dealsPayload.error ??
            "No fue posible cargar las oportunidades.",
          );
        }

        if (
          !quotesResponse.ok ||
          !quotesPayload.success
        ) {
          throw new Error(
            quotesPayload.error ??
            "No fue posible cargar las cotizaciones.",
          );
        }

        if (
          !reservationsResponse.ok ||
          !reservationsPayload.success
        ) {
          throw new Error(
            reservationsPayload.error ??
            "No fue posible verificar el estado del inventario reservado.",
          );
        }

        setOrders(
          ordersPayload.data ??
          [],
        );

        setPermissions(
          ordersPayload.permissions ??
          {
            canView: false,
            canCreate: false,
            canEdit: false,
            canManage: false,
          },
        );

        setDeals(
          dealsPayload.data ??
          [],
        );

        setQuotes(
          quotesPayload.data ??
          [],
        );

        setReservations(
          reservationsPayload.data ??
          [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar Ventas.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [
    loadWorkspace,
  ]);

  const sourceOptions =
    useMemo<
      SourceOption[]
    >(() => {
      const orderedDealIds =
        new Set(
          orders
            .map(
              (order) =>
                order.dealId,
            )
            .filter(Boolean),
        );

      const orderedQuoteIds =
        new Set(
          orders
            .map(
              (order) =>
                order.quoteId,
            )
            .filter(Boolean),
        );

      const processedDealIds =
        new Set(
          reservations
            .filter(
              (reservation) =>
                reservation.sourceType ===
                  "Oportunidad" &&
                reservation.status !==
                  "Activa",
            )
            .map(
              (reservation) =>
                reservation.sourceId,
            )
            .filter(
              (
                sourceId,
              ): sourceId is string =>
                Boolean(sourceId),
            ),
        );

      const activeReservedDealIds =
        new Set(
          reservations
            .filter(
              (reservation) =>
                reservation.sourceType ===
                  "Oportunidad" &&
                reservation.status ===
                  "Activa",
            )
            .map(
              (reservation) =>
                reservation.sourceId,
            )
            .filter(
              (
                sourceId,
              ): sourceId is string =>
                Boolean(sourceId),
            ),
        );

            const acceptedQuotedDealIds =
        new Set(
          quotes
            .filter(
              (quote) =>
                Boolean(
                  quote.dealId,
                ) &&
                (
                  normalizeText(
                    quote.status,
                  ) === "aceptada" ||
                  Boolean(
                    quote.acceptedAt,
                  )
                ) &&
                !orderedQuoteIds.has(
                  quote.id,
                ),
            )
            .map(
              (quote) =>
                quote.dealId,
            )
            .filter(
              (
                dealId,
              ): dealId is string =>
                Boolean(dealId),
            ),
        );

      const dealOptions =
        deals
          .filter(
            (deal) =>
              normalizeText(
                deal.status,
              ) === "ganada" &&
              activeReservedDealIds.has(
                deal.id,
              ) &&
              !acceptedQuotedDealIds.has(
                deal.id,
              ) &&
              !orderedDealIds.has(
                deal.id,
              ) &&
              !processedDealIds.has(
                deal.id,
              ),
          )
          .map(
            (
              deal,
            ): SourceOption => ({
              id:
                deal.id,

              type:
                "Oportunidad",

              reference:
                deal.name,

              customerName:
                deal.customerName ??
                "Cliente sin nombre",

              totalAmount:
                Number(
                  deal.totalAmount,
                ),

              currency:
                deal.currency,
            }),
          );

      const quoteOptions =
        quotes
          .filter(
            (quote) =>
              (
                normalizeText(
                  quote.status,
                ) === "aceptada" ||
                Boolean(
                  quote.acceptedAt,
                )
              ) &&
              !orderedQuoteIds.has(
                quote.id,
              ) &&
              (
                !quote.dealId ||
                (
                  activeReservedDealIds.has(
                    quote.dealId,
                  ) &&
                  !processedDealIds.has(
                    quote.dealId,
                  )
                )
              ),
          )
          .map(
            (
              quote,
            ): SourceOption => ({
              id:
                quote.id,

              type:
                "Cotización",

              reference:
                `${quote.quoteNumber} · ${quote.subject}`,

              customerName:
                quote.customerName ??
                "Cliente sin nombre",

              totalAmount:
                Number(
                  quote.totalAmount,
                ),

              currency:
                quote.currency,
            }),
          );

      return [
        ...dealOptions,
        ...quoteOptions,
      ];
    }, [
      deals,
      orders,
      quotes,
      reservations,
    ]);

      const visibleOrders =
    useMemo(
      () => {
        const normalizedSearch =
          normalizeText(
            search,
          );

        return orders.filter(
          (order) => {
            if (
              statusFilter &&
              order.status !==
                statusFilter
            ) {
              return false;
            }

            if (!normalizedSearch) {
              return true;
            }

            return [
              order.reference,
              order.customerName,
              order.branchLabel,
              order.ownerName,
              order.paymentMethod,
            ]
              .filter(Boolean)
              .some(
                (value) =>
                  normalizeText(
                    String(value),
                  ).includes(
                    normalizedSearch,
                  ),
              );
          },
        );
      },
      [
        orders,
        search,
        statusFilter,
      ],
    );

  const summary =
    useMemo(
      () => ({
        total:
          orders.length,

        drafts:
          orders.filter(
            (order) =>
              order.status ===
              "Borrador",
          ).length,

        confirmed:
          orders.filter(
            (order) =>
              order.status ===
              "Confirmada",
          ).length,

        delivered:
          orders.filter(
            (order) =>
              order.status ===
              "Entregada",
          ).length,

        deliveredAmount:
          orders
            .filter(
              (order) =>
                order.status ===
                "Entregada",
            )
            .reduce(
              (
                total,
                order,
              ) =>
                total +
                order.totalAmount,
              0,
            ),
      }),
      [
        orders,
      ],
    );

  async function handleCreate(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const [
      sourceType,
      sourceId,
    ] =
      selectedSourceKey.split(
        ":",
      );

    if (
      !sourceId ||
      (
        sourceType !==
          "Oportunidad" &&
        sourceType !==
          "Cotización"
      )
    ) {
      setError(
        "Selecciona una oportunidad ganada o una cotización aceptada.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          "/api/crm/sales-orders",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              dealId:
                sourceType ===
                "Oportunidad"
                  ? sourceId
                  : undefined,

              quoteId:
                sourceType ===
                "Cotización"
                  ? sourceId
                  : undefined,

              notes:
                createNotes.trim() ||
                undefined,
            }),
          },
        );

      const payload =
        (await response.json()) as
          WriteResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
          "No fue posible crear la orden.",
        );
      }

      setMessage(
        payload.message ??
        "La orden fue creada correctamente.",
      );

      setIsCreateOpen(false);
      setSelectedSourceKey("");
      setCreateNotes("");

      await loadWorkspace();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No fue posible crear la orden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateOrder(
    action:
      | "Confirmar"
      | "Entregar"
      | "Cancelar",

    reason?: string,
  ) {
    if (!selectedOrder) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          `/api/crm/sales-orders/${selectedOrder.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              action,
              reason:
                reason?.trim() ||
                undefined,
            }),
          },
        );

      const payload =
        (await response.json()) as
          WriteResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
          "No fue posible actualizar la orden.",
        );
      }

      setMessage(
        payload.message ??
        "La orden fue actualizada correctamente.",
      );

      setSelectedOrder(null);

      await loadWorkspace();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No fue posible actualizar la orden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

    return (
    <>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Operación comercial"
          title="Órdenes de venta"
          description="Convierte oportunidades ganadas y cotizaciones aceptadas en órdenes controladas hasta su entrega."
          action={
            permissions.canCreate ? (
              <Button
                type="button"
                onClick={() => {
                  setSelectedSourceKey(
                    "",
                  );

                  setCreateNotes(
                    "",
                  );

                  setError(null);
                  setMessage(null);

                  setIsCreateOpen(
                    true,
                  );
                }}
              >
                Nueva orden
              </Button>
            ) : null
          }
        />

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label:
                "Órdenes totales",

              value:
                summary.total,

              className:
                "from-slate-950 to-slate-700",
            },
            {
              label:
                "Borradores",

              value:
                summary.drafts,

              className:
                "from-amber-600 to-orange-500",
            },
            {
              label:
                "Confirmadas",

              value:
                summary.confirmed,

              className:
                "from-blue-700 to-indigo-500",
            },
            {
              label:
                "Entregadas",

              value:
                summary.delivered,

              className:
                "from-emerald-700 to-teal-500",
            },
            {
              label:
                "Venta entregada",

              value:
                formatMoney(
                  summary.deliveredAmount,
                ),

              className:
                "from-violet-700 to-fuchsia-500",
            },
          ].map(
            (card) => (
              <article
                key={
                  card.label
                }
                className={`rounded-[28px] bg-gradient-to-br ${card.className} p-5 text-white shadow-sm`}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                  {
                    card.label
                  }
                </p>

                <p className="mt-3 text-2xl font-black">
                  {
                    card.value
                  }
                </p>
              </article>
            ),
          )}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Historial de órdenes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Consulta el origen, cliente, responsable y estado operativo de cada venta.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="search"
                  value={
                    search
                  }
                  placeholder="Buscar referencia, cliente..."
                  className="min-w-64 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                />

                <select
                  value={
                    statusFilter
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                  onChange={(
                    event,
                  ) =>
                    setStatusFilter(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Todos los estados
                  </option>

                  {[
                    "Borrador",
                    "Confirmada",
                    "Entregada",
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
                        {
                          status
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </header>

          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-4 text-sm font-semibold text-slate-600">
                  Cargando órdenes de venta...
                </p>
              </div>
            </div>
          ) : (
            <DataraTableScroll>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Orden",
                      "Cliente",
                      "Sucursal",
                      "Partidas",
                      "Total",
                      "Responsable",
                      "Estado",
                      "Acciones",
                    ].map(
                      (header) => (
                        <th
                          key={
                            header
                          }
                          className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                          {
                            header
                          }
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleOrders.map(
                    (order) => (
                      <tr
                        key={
                          order.id
                        }
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="font-bold text-slate-950">
                            {
                              order.reference
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              order.createdAt,
                            )}
                          </p>
                        </td>

                        <td className="min-w-56 px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {
                              order.customerName
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {order.customerEmail ??
                              order.customerPhone ??
                              "Sin contacto"}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                          {
                            order.branchLabel
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">
                          {
                            order.items.length
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">
                          {formatMoney(
                            order.totalAmount,
                            order.currency,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                          {order.ownerName ??
                            "Sin asignar"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset",
                              getStatusClassName(
                                order.status,
                              ),
                            ].join(
                              " ",
                            )}
                          >
                            {
                              order.status
                            }
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setActionReason(
                                "",
                              );

                              setSelectedOrder(
                                order,
                              );

                              setError(
                                null,
                              );
                            }}
                          >
                            Ver
                          </Button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>

              {visibleOrders.length ===
                0 && (
                <div className="px-6 py-20 text-center">
                  <p className="text-lg font-bold text-slate-800">
                    No hay órdenes para mostrar
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Crea una orden desde una oportunidad ganada o una cotización aceptada.
                  </p>
                </div>
              )}
            </DataraTableScroll>
          )}
        </section>
      </div>

            {isCreateOpen && (
        <div className="fixed inset-0 z-[160]">
          <button
            type="button"
            aria-label="Cerrar nueva orden"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() =>
              !isSubmitting &&
              setIsCreateOpen(
                false,
              )
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <form
              className="flex h-full flex-col"
              onSubmit={
                handleCreate
              }
            >
              <header className="border-b border-slate-200 bg-white px-6 py-5">
                <h2 className="text-2xl font-black text-slate-950">
                  Nueva orden de venta
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  La orden conservará una fotografía de los importes y partidas del origen seleccionado.
                </p>
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="text-sm font-semibold text-slate-700">
                    Operación de origen *

                    <select
                      required
                      value={
                        selectedSourceKey
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      onChange={(
                        event,
                      ) =>
                        setSelectedSourceKey(
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="">
                        Selecciona una operación
                      </option>

                      {sourceOptions.map(
                        (source) => (
                          <option
                            key={`${source.type}:${source.id}`}
                            value={`${source.type}:${source.id}`}
                          >
                            {source.type}
                            {" · "}
                            {source.reference}
                            {" · "}
                            {source.customerName}
                            {" · "}
                            {formatMoney(
                              source.totalAmount,
                              source.currency,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  {sourceOptions.length ===
                    0 && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800">
                      No hay oportunidades ganadas ni cotizaciones aceptadas disponibles para generar una orden.
                    </div>
                  )}
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="text-sm font-semibold text-slate-700">
                    Notas internas

                    <textarea
                      rows={5}
                      value={
                        createNotes
                      }
                      placeholder="Indicaciones comerciales, condiciones de entrega o referencias internas."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      onChange={(
                        event,
                      ) =>
                        setCreateNotes(
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>
                </section>
              </div>

              <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    setIsCreateOpen(
                      false,
                    )
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    sourceOptions.length ===
                      0
                  }
                >
                  {isSubmitting
                    ? "Generando..."
                    : "Generar orden"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}

            {selectedOrder && (
        <div className="fixed inset-0 z-[170]">
          <button
            type="button"
            aria-label="Cerrar detalle"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() =>
              !isSubmitting &&
              setSelectedOrder(
                null,
              )
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {
                      selectedOrder.reference
                    }
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {selectedOrder.customerName}
                    {" · "}
                    {selectedOrder.branchLabel}
                  </p>
                </div>

                <span
                  className={[
                    "inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset",
                    getStatusClassName(
                      selectedOrder.status,
                    ),
                  ].join(
                    " ",
                  )}
                >
                  {
                    selectedOrder.status
                  }
                </span>
              </div>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label:
                      "Subtotal",

                    value:
                      formatMoney(
                        selectedOrder.baseAmount,
                        selectedOrder.currency,
                      ),
                  },
                  {
                    label:
                      "Descuento",

                    value:
                      formatMoney(
                        selectedOrder.discountAmount,
                        selectedOrder.currency,
                      ),
                  },
                  {
                    label:
                      "Total",

                    value:
                      formatMoney(
                        selectedOrder.totalAmount,
                        selectedOrder.currency,
                      ),
                  },
                  {
                    label:
                      "Forma de pago",

                    value:
                      selectedOrder.paymentMethod ??
                      "Sin definir",
                  },
                ].map(
                  (item) => (
                    <article
                      key={
                        item.label
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-2 font-black text-slate-950">
                        {
                          item.value
                        }
                      </p>
                    </article>
                  ),
                )}
              </section>

              <section className="grid gap-4 rounded-[28px] border border-blue-200 bg-blue-50/60 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    Oportunidad de origen
                  </p>

                  <p className="mt-2 font-bold text-slate-950">
                    {selectedOrder.dealId
                      ? deals.find(
                          (deal) =>
                            deal.id ===
                            selectedOrder.dealId,
                        )?.name ??
                        selectedOrder.dealId
                      : "Sin oportunidad vinculada"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    Cotización de origen
                  </p>

                  <p className="mt-2 font-bold text-slate-950">
                    {selectedOrder.quoteId
                      ? (() => {
                          const quote =
                            quotes.find(
                              (item) =>
                                item.id ===
                                selectedOrder.quoteId,
                            );

                          return quote
                            ? `${quote.quoteNumber} · ${quote.subject}`
                            : selectedOrder.quoteId;
                        })()
                      : "Sin cotización vinculada"}
                  </p>
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h3 className="font-bold text-slate-950">
                    Partidas de la orden
                  </h3>
                </header>

                <DataraTableScroll>
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-white">
                      <tr>
                        {[
                          "Producto",
                          "Cantidad",
                          "Precio",
                          "Descuento",
                          "Total",
                        ].map(
                          (header) => (
                            <th
                              key={
                                header
                              }
                              className="whitespace-nowrap px-5 py-3 text-left text-xs font-bold uppercase text-slate-500"
                            >
                              {
                                header
                              }
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items.map(
                        (item) => (
                          <tr
                            key={
                              item.id
                            }
                          >
                            <td className="min-w-60 px-5 py-4">
                              <p className="font-semibold text-slate-950">
                                {
                                  item.name
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {item.productCode ??
                                  "Sin código"}
                              </p>
                            </td>

                            <td className="px-5 py-4 font-bold text-slate-700">
                              {
                                item.quantity
                              }
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                              {formatMoney(
                                item.unitPrice,
                                selectedOrder.currency,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                              {formatMoney(
                                item.discountAmount,
                                selectedOrder.currency,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">
                              {formatMoney(
                                item.totalAmount,
                                selectedOrder.currency,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </DataraTableScroll>
              </section>

              {selectedOrder.notes && (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-950">
                    Notas de la orden
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {selectedOrder.notes}
                  </p>
                </section>
              )}

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-950">
                  Trazabilidad
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Creada por
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedOrder.createdByName ??
                        "Usuario"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Fecha de creación
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(
                        selectedOrder.createdAt,
                      )}
                    </p>
                  </div>

                  {selectedOrder.confirmedAt && (
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Confirmada
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedOrder.confirmedByName ??
                          "Usuario"}
                        {" · "}
                        {formatDate(
                          selectedOrder.confirmedAt,
                        )}
                      </p>
                    </div>
                  )}

                  {selectedOrder.deliveredAt && (
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Entregada
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedOrder.deliveredByName ??
                          "Usuario"}
                        {" · "}
                        {formatDate(
                          selectedOrder.deliveredAt,
                        )}
                      </p>
                      {selectedOrder.deliveryReason && (
                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-bold">
                            Motivo:
                          </span>{" "}
                          {
                            selectedOrder.deliveryReason
                          }
                        </p>
                      )}
                    </div>
                  )}

                  {selectedOrder.cancelledAt && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold uppercase text-red-600">
                        Cancelación
                      </p>

                      <p className="mt-1 text-sm font-semibold text-red-800">
                        {selectedOrder.cancelledByName ??
                          "Usuario"}
                        {" · "}
                        {formatDate(
                          selectedOrder.cancelledAt,
                        )}
                        {" · "}
                        {selectedOrder.cancellationReason ??
                          "Sin motivo"}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {permissions.canEdit &&
                (
                  selectedOrder.status ===
                    "Borrador" ||
                  selectedOrder.status ===
                    "Confirmada"
                ) && (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="text-sm font-semibold text-slate-700">
                    Motivo o referencia de la acción

                    <textarea
                      rows={3}
                      value={
                        actionReason
                      }
                      placeholder="Obligatorio para cancelar; opcional para confirmar la entrega."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      onChange={(
                        event,
                      ) =>
                        setActionReason(
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>
                </section>
              )}
            </div>

            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  setSelectedOrder(
                    null,
                  )
                }
              >
                Cerrar
              </Button>

              {permissions.canEdit &&
                selectedOrder.status ===
                  "Borrador" && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      isSubmitting ||
                      !actionReason.trim()
                    }
                    onClick={() =>
                      void updateOrder(
                        "Cancelar",
                        actionReason,
                      )
                    }
                  >
                    Cancelar orden
                  </Button>

                  <Button
                    type="button"
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      void updateOrder(
                        "Confirmar",
                      )
                    }
                  >
                    {isSubmitting
                      ? "Procesando..."
                      : "Confirmar orden"}
                  </Button>
                </>
              )}

              {permissions.canManage &&
                selectedOrder.status ===
                  "Confirmada" && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      isSubmitting ||
                      !actionReason.trim()
                    }
                    onClick={() =>
                      void updateOrder(
                        "Cancelar",
                        actionReason,
                      )
                    }
                  >
                    Cancelar orden
                  </Button>

                  <Button
                    type="button"
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      void updateOrder(
                        "Entregar",
                        actionReason,
                      )
                    }
                  >
                    {isSubmitting
                      ? "Procesando..."
                      : "Confirmar entrega"}
                  </Button>
                </>
              )}
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}