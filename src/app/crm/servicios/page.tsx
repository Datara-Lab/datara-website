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

type ServiceStatus =
  | "Borrador"
  | "Programada"
  | "En proceso"
  | "Pausada"
  | "Pendiente de autorización"
  | "Pendiente de cierre"
  | "Completada"
  | "Cancelada";

type ServiceOrderItem = {
  id: string;
  serviceOrderId: string;

  productId:
    | string
    | null;

  productCode:
    | string
    | null;

  itemType:
    | "Mano de obra"
    | "Refacción";

  name: string;

  description:
    | string
    | null;

  quantity: number;
  unitPrice: number;
  totalAmount: number;

  authorizationStatus: string;

  authorizedQuantity:
    | number
    | null;

  position: number;
};

type EditableServiceItem = {
  key: string;

  itemType:
    | "Mano de obra"
    | "Refacción";

  productId: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;

  authorizationStatus?:
    string;
};

type ServiceOrder = {
  id: string;
  reference: string;
  status: ServiceStatus;
  priority: string;
  serviceType: string;

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

  salesOrderId:
    | string
    | null;

  unitModel: string;

  unitPlate:
    | string
    | null;

  unitIdentifier:
    | string
    | null;

  reportedProblem: string;

  diagnosis:
    | string
    | null;

  result:
    | string
    | null;

  ownerClerkUserId:
    | string
    | null;

  ownerName:
    | string
    | null;

  ownerEmail:
    | string
    | null;

  scheduledAt:
    | string
    | null;

  commitmentAt:
    | string
    | null;

  startedAt:
    | string
    | null;

  completedAt:
    | string
    | null;

  cancelledAt:
    | string
    | null;

  cancellationReason:
    | string
    | null;

  authorizationRequestedAt:
    | string
    | null;

  authorizationRequestedByName:
    | string
    | null;

  authorizedAt:
    | string
    | null;

  authorizedByName:
    | string
    | null;

  authorizationNotes:
    | string
    | null;

  workCompletedAt:
    | string
    | null;

  workCompletedByName:
    | string
    | null;

  returnedAt:
    | string
    | null;

  returnedByName:
    | string
    | null;

  returnReason:
    | string
    | null;

  metadata: {
    returnHistory?: Array<{
      reason?:
        | string
        | null;

      returnedAt?:
        | string
        | null;

      returnedByName?:
        | string
        | null;
    }>;

    [key: string]:
      unknown;
  };

  notes:
    | string
    | null;

  createdByName:
    | string
    | null;

  updatedByName:
    | string
    | null;

  createdAt: string;
  updatedAt: string;

  items:
    ServiceOrderItem[];
};

type ServicePermissions = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canManage: boolean;
};

type ServicesResponse = {
  success: boolean;
  data?: ServiceOrder[];
  permissions?: ServicePermissions;
  message?: string;
  error?: string;
};

type CustomerOption = {
  id: string;
  displayName: string;
};

type ProductOption = {
  id: string;
  name: string;

  code:
    | string
    | null;

  category:
    | string
    | null;

  unitPrice: number;

  active: boolean;
  label: string;
};


type FieldOption = {
  value: string;
  label: string;
};

type DealOption = {
  id: string;
  name: string;

  customerId:
    | string
    | null;
};

type SalesOrderOption = {
  id: string;
  reference: string;

  customerId:
    | string
    | null;

  status: string;
};

type DataResponse<T> = {
  success: boolean;
  data?: T[];
  primaryBranchId?:
    | string
    | null;
  error?: string;
};

type WriteResponse = {
  success: boolean;
  message?: string;
  error?: string;

  data?: {
    id: string;
    reference?: string;
    status?: ServiceStatus;
  };
};

const emptyPermissions:
  ServicePermissions = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canManage: false,
};

const statusOptions:
  ServiceStatus[] = [
  "Borrador",
  "Programada",
  "En proceso",
  "Pendiente de autorización",
  "Pausada",
  "Pendiente de cierre",
  "Completada",
  "Cancelada",
];

const priorityOptions = [
  "Baja",
  "Normal",
  "Alta",
  "Urgente",
];

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

function formatElapsedTime(
  start:
    | string
    | null,
  end:
    | string
    | null,
) {
  if (!start) {
    return "Sin información";
  }

  const startTime =
    new Date(start).getTime();

  const endTime =
    end
      ? new Date(end).getTime()
      : Date.now();

  const elapsedMinutes =
    Math.max(
      0,
      Math.floor(
        (
          endTime -
          startTime
        ) /
          60000,
      ),
    );

  const days =
    Math.floor(
      elapsedMinutes /
        1440,
    );

  const hours =
    Math.floor(
      (
        elapsedMinutes %
        1440
      ) /
        60,
    );

  const minutes =
    elapsedMinutes %
    60;

  return [
    days > 0
      ? `${days} d`
      : null,

    hours > 0
      ? `${hours} h`
      : null,

    `${minutes} min`,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatMoney(
  value: number,
  currency = "MXN",
) {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    },
  ).format(value);
}


function normalizeText(
  value:
    | string
    | null
    | undefined,
) {
  return (
    value ?? ""
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    );
}

function getStatusClassName(
  status: ServiceStatus,
) {
  if (
    status === "Completada"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }

  if (
    status === "En proceso"
  ) {
    return "bg-blue-50 text-blue-700 ring-blue-600/20";
  }

  if (
    status === "Programada"
  ) {
    return "bg-violet-50 text-violet-700 ring-violet-600/20";
  }

  if (
    status ===
      "Pendiente de autorización"
  ) {
    return "bg-orange-50 text-orange-700 ring-orange-600/20";
  }

  if (
    status ===
      "Pendiente de cierre"
  ) {
    return "bg-cyan-50 text-cyan-700 ring-cyan-600/20";
  }

  if (
    status === "Pausada"
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }

  if (
    status === "Cancelada"
  ) {
    return "bg-red-50 text-red-700 ring-red-600/20";
  }

  return "bg-slate-100 text-slate-700 ring-slate-500/20";
}

export default function ServiciosPage() {
  const [
    services,
    setServices,
  ] = useState<ServiceOrder[]>(
    [],
  );

  const [
    customers,
    setCustomers,
  ] = useState<CustomerOption[]>(
    [],
  );

    const [
    products,
    setProducts,
  ] = useState<ProductOption[]>(
    [],
  );

  const [
    isManualModel,
    setIsManualModel,
  ] = useState(false);


  const [
    branches,
    setBranches,
  ] = useState<FieldOption[]>(
    [],
  );

  const [
    members,
    setMembers,
  ] = useState<FieldOption[]>(
    [],
  );

  const [
    deals,
    setDeals,
  ] = useState<DealOption[]>(
    [],
  );

  const [
    salesOrders,
    setSalesOrders,
  ] = useState<
    SalesOrderOption[]
  >([]);

  const [
    permissions,
    setPermissions,
  ] = useState<ServicePermissions>(
    emptyPermissions,
  );

  const [
    primaryBranchId,
    setPrimaryBranchId,
  ] = useState<string | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    isCreateOpen,
    setIsCreateOpen,
  ] = useState(false);

  const [
    selectedService,
    setSelectedService,
  ] = useState<ServiceOrder | null>(
    null,
  );

  const [
    branchId,
    setBranchId,
  ] = useState("");

  const [
    customerId,
    setCustomerId,
  ] = useState("");

  const [
    dealId,
    setDealId,
  ] = useState("");

  const [
    salesOrderId,
    setSalesOrderId,
  ] = useState("");

  const [
    serviceType,
    setServiceType,
  ] = useState("");

  const [
    priority,
    setPriority,
  ] = useState("Normal");

  const [
    unitModel,
    setUnitModel,
  ] = useState("");

  const [
    unitPlate,
    setUnitPlate,
  ] = useState("");

  const [
    unitIdentifier,
    setUnitIdentifier,
  ] = useState("");

  const [
    reportedProblem,
    setReportedProblem,
  ] = useState("");

  const [
    ownerClerkUserId,
    setOwnerClerkUserId,
  ] = useState("");

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState("");

  const [
    commitmentAt,
    setCommitmentAt,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    diagnosis,
    setDiagnosis,
  ] = useState("");

  const [
    serviceResult,
    setServiceResult,
  ] = useState("");

  const [
    serviceItems,
    setServiceItems,
  ] = useState<
    EditableServiceItem[]
  >([]);

  const [
    pendingReasonAction,
    setPendingReasonAction,
  ] = useState<
    | "Pausar"
    | "Devolver"
    | "Cancelar"
    | null
  >(null);

  const [
    actionReason,
    setActionReason,
  ] = useState("");

    const [
    transferOwnerId,
    setTransferOwnerId,
  ] = useState("");

  const [
    transferReason,
    setTransferReason,
  ] = useState("");

    const [
    isTransferOpen,
    setIsTransferOpen,
  ] = useState(false);

  const loadWorkspace =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [
          servicesResponse,
          customersResponse,
          productsResponse,
          branchesResponse,
          membersResponse,
          dealsResponse,
          salesOrdersResponse,
        ] = await Promise.all([
          fetch(
            "/api/crm/services",
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
            "/api/crm/products",
            {
              cache: "no-store",
            },
          ),
          fetch(
            "/api/crm/branches/options",
            {
              cache: "no-store",
            },
          ),
          fetch(
            "/api/crm/members/options?roleKey=mechanic",
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
            "/api/crm/sales-orders",
            {
              cache: "no-store",
            },
          ),
        ]);

        const servicesPayload =
          (await servicesResponse.json()) as
            ServicesResponse;

        const customersPayload =
          (await customersResponse.json()) as
            DataResponse<CustomerOption>;

        const productsPayload =
          (await productsResponse.json()) as
            DataResponse<ProductOption>;

        const branchesPayload =
          (await branchesResponse.json()) as
            DataResponse<FieldOption>;

        const membersPayload =
          (await membersResponse.json()) as
            DataResponse<FieldOption>;

        const dealsPayload =
          (await dealsResponse.json()) as
            DataResponse<DealOption>;

        const salesOrdersPayload =
          (await salesOrdersResponse.json()) as
            DataResponse<SalesOrderOption>;

        if (
          !servicesResponse.ok ||
          !servicesPayload.success
        ) {
          throw new Error(
            servicesPayload.error ??
              "No fue posible cargar los servicios.",
          );
        }

        if (
          !customersResponse.ok ||
          !customersPayload.success
        ) {
          throw new Error(
            customersPayload.error ??
              "No fue posible cargar los clientes.",
          );
        }

                if (
          !productsResponse.ok ||
          !productsPayload.success
        ) {
          throw new Error(
            productsPayload.error ??
              "No fue posible cargar los modelos.",
          );
        }

        if (
          !branchesResponse.ok ||
          !branchesPayload.success
        ) {
          throw new Error(
            branchesPayload.error ??
              "No fue posible cargar las sucursales.",
          );
        }

        if (
          !membersResponse.ok ||
          !membersPayload.success
        ) {
          throw new Error(
            membersPayload.error ??
              "No fue posible cargar los responsables.",
          );
        }

        setServices(
          servicesPayload.data ??
            [],
        );

        setPermissions(
          servicesPayload.permissions ??
            emptyPermissions,
        );

        setCustomers(
          customersPayload.data ??
            [],
        );

        setProducts(
          (
            productsPayload.data ??
            []
          ).filter(
            (product) =>
              product.active,
          ),
        );

        setBranches(
          branchesPayload.data ??
            [],
        );

        setMembers(
          membersPayload.data ??
            [],
        );

        setDeals(
          dealsPayload.data ??
            [],
        );

        setSalesOrders(
          salesOrdersPayload.data ??
            [],
        );

        setPrimaryBranchId(
          branchesPayload
            .primaryBranchId ??
            null,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar Servicios.",
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

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout =
      window.setTimeout(
        () =>
          setMessage(null),
        5000,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    message,
  ]);

  const visibleServices =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(search);

      return services.filter(
        (service) => {
          if (
            statusFilter &&
            service.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          return [
            service.reference,
            service.customerName,
            service.unitModel,
            service.unitPlate,
            service.unitIdentifier,
            service.serviceType,
            service.ownerName,
            service.branchLabel,
          ].some((value) =>
            normalizeText(value)
              .includes(
                normalizedSearch,
              ),
          );
        },
      );
    }, [
      search,
      services,
      statusFilter,
    ]);

  const availableDeals =
    useMemo(
      () =>
        deals.filter(
          (deal) =>
            !customerId ||
            !deal.customerId ||
            deal.customerId ===
              customerId,
        ),
      [
        customerId,
        deals,
      ],
    );

  const availableSalesOrders =
    useMemo(
      () =>
        salesOrders.filter(
          (order) =>
            (
              !customerId ||
              !order.customerId ||
              order.customerId ===
                customerId
            ) &&
            order.status !==
              "Cancelada",
        ),
      [
        customerId,
        salesOrders,
      ],
    );

  function openCreateDrawer() {
    setBranchId(
      primaryBranchId ??
        branches[0]?.value ??
        "",
    );

    setCustomerId("");
    setDealId("");
    setSalesOrderId("");
    setServiceType("");
    setPriority("Normal");
    setIsManualModel(
      false,
    );
    setUnitModel(
      products[0]?.name ??
        "",
    );
    setUnitPlate("");
    setUnitIdentifier("");
    setReportedProblem("");
    setOwnerClerkUserId(
      members[0]?.value ??
        "",
    );
    setScheduledAt("");
    setCommitmentAt("");
    setNotes("");
    setError(null);
    setIsCreateOpen(true);
  }

  async function handleCreate(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          "/api/crm/services",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              branchId,
              customerId,

              dealId:
                dealId ||
                undefined,

              salesOrderId:
                salesOrderId ||
                undefined,

              serviceType,
              priority,
              unitModel,

              unitPlate:
                unitPlate ||
                undefined,

              unitIdentifier:
                unitIdentifier ||
                undefined,

              reportedProblem,

              ownerClerkUserId:
                ownerClerkUserId ||
                undefined,

              scheduledAt:
                scheduledAt ||
                undefined,

              commitmentAt:
                commitmentAt ||
                undefined,

              notes:
                notes ||
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
            "No fue posible crear la orden de servicio.",
        );
      }

      setMessage(
        payload.message ??
          "La orden de servicio fue creada correctamente.",
      );

      setIsCreateOpen(false);

      await loadWorkspace();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No fue posible crear la orden de servicio.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateService(
    action: string,

    options?: {
      ownerClerkUserId?: string;
      reason?: string;
    },
  ) {
    if (!selectedService) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          `/api/crm/services/${selectedService.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              action,

              ownerClerkUserId:
                options
                  ?.ownerClerkUserId,

              diagnosis:
                action ===
                  "Solicitar autorización" ||
                (
                  action ===
                    "Actualizar" &&
                  !selectedService
                    .authorizedAt
                )
                  ? diagnosis
                  : undefined,

              result:
                action ===
                  "Actualizar" ||
                action ===
                  "Servicio realizado"
                  ? serviceResult
                  : undefined,

              items:
                action ===
                  "Solicitar autorización" ||
                (
                  action ===
                    "Actualizar" &&
                  !selectedService
                    .authorizedAt
                )
                  ? serviceItems
                  : undefined,

              reason:
                options?.reason ??
                (
                  action ===
                    "Pausar" ||
                  action ===
                    "Devolver" ||
                  action ===
                    "Cancelar"
                    ? actionReason
                    : undefined
                ),
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
            "No fue posible actualizar el servicio.",
        );
      }

      setMessage(
        payload.message ??
          "El servicio fue actualizado correctamente.",
      );

      if (
        action !== "Actualizar"
      ) {
        setSelectedService(
          null,
        );
      }

      setPendingReasonAction(null);
      setIsTransferOpen(false);
      setActionReason("");
      setTransferReason("");

      await loadWorkspace();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No fue posible actualizar el servicio.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <main className="space-y-6">
        <PageHeader
          eyebrow="Operación comercial"
          title="Servicios"
          description="Administra las órdenes de taller y el seguimiento de las motocicletas atendidas."
          action={
            permissions.canCreate ? (
              <Button
                type="button"
                onClick={
                  openCreateDrawer
                }
              >
                Nueva orden de servicio
              </Button>
            ) : undefined
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {[
            {
              label: "Total",
              value:
                services.length,
              tone:
                "text-slate-950",
            },
            {
              label: "Programadas",
              value:
                services.filter(
                  (service) =>
                    service.status ===
                    "Programada",
                ).length,
              tone:
                "text-violet-700",
            },
            {
              label: "En proceso",
              value:
                services.filter(
                  (service) =>
                    service.status ===
                    "En proceso",
                ).length,
              tone:
                "text-blue-700",
            },
            {
              label:
                "Por autorizar",
              value:
                services.filter(
                  (service) =>
                    service.status ===
                    "Pendiente de autorización",
                ).length,
              tone:
                "text-orange-700",
            },
            {
              label:
                "Por cerrar",
              value:
                services.filter(
                  (service) =>
                    service.status ===
                    "Pendiente de cierre",
                ).length,
              tone:
                "text-cyan-700",
            },
            {
              label: "Completadas",
              value:
                services.filter(
                  (service) =>
                    service.status ===
                    "Completada",
                ).length,
              tone:
                "text-emerald-700",
            },
          ].map(
            (metric) => (
              <article
                key={
                  metric.label
                }
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {
                    metric.label
                  }
                </p>

                <p
                  className={[
                    "mt-2 text-3xl font-black",
                    metric.tone,
                  ].join(" ")}
                >
                  {
                    metric.value
                  }
                </p>
              </article>
            ),
          )}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Órdenes de servicio
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Consulta el trabajo programado y su avance en taller.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  value={search}
                  placeholder="Buscar orden, cliente o motocicleta..."
                  className="min-w-72 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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

                  {statusOptions.map(
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
              </div>
            </div>
          </header>

          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-4 text-sm font-semibold text-slate-600">
                  Cargando servicios...
                </p>
              </div>
            </div>
          ) : (
            <>
              <DataraTableScroll>
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-white">
                    <tr>
                      {[
                        "Orden",
                        "Cliente",
                        "Motocicleta",
                        "Servicio",
                        "Programación",
                        "Responsable",
                        "Estado",
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
                    {visibleServices.map(
                      (service) => (
                        <tr
                          key={
                            service.id
                          }
                          className="cursor-pointer transition hover:bg-blue-50/40"
                          onClick={() => {
                            setSelectedService(
                              service,
                            );

                            setDiagnosis(
                              service.diagnosis ??
                                "",
                            );

                            setServiceResult(
                              service.result ??
                                "",
                            );

                            setServiceItems(
                              (
                                service.items ??
                                []
                              ).map(
                                (item) => ({
                                  key:
                                    item.id,

                                  itemType:
                                    item.itemType,

                                  productId:
                                    item.productId ??
                                    "",

                                  name:
                                    item.name,

                                  description:
                                    item.description ??
                                    "",

                                  quantity:
                                    item.quantity,

                                  unitPrice:
                                    item.unitPrice,

                                  authorizationStatus:
                                    item.authorizationStatus,
                                }),
                              ),
                            );

                            setTransferOwnerId(
                              service.ownerClerkUserId ??
                                "",
                            );

                            setTransferReason(
                              "",
                            );

                            setPendingReasonAction(
                              null,
                            );

                            setActionReason(
                              "",
                            );

                            setError(
                              null,
                            );
                          }}
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <p className="font-black text-blue-700">
                              {
                                service.reference
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                service.branchLabel
                              }
                            </p>
                          </td>

                          <td className="min-w-52 px-5 py-4">
                            <p className="font-bold text-slate-950">
                              {
                                service.customerName
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {service.customerPhone ??
                                service.customerEmail ??
                                "Sin contacto"}
                            </p>
                          </td>

                          <td className="min-w-48 px-5 py-4">
                            <p className="font-bold text-slate-900">
                              {
                                service.unitModel
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {service.unitPlate ??
                                service.unitIdentifier ??
                                "Sin identificador"}
                            </p>
                          </td>

                          <td className="min-w-48 px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {
                                service.serviceType
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Prioridad{" "}
                              {
                                service.priority
                              }
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                            {formatDate(
                              service.scheduledAt,
                            )}
                          </td>

                          <td className="min-w-44 px-5 py-4 text-sm font-semibold text-slate-700">
                            {service.ownerName ??
                              "Sin responsable"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={[
                                "inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset",
                                getStatusClassName(
                                  service.status,
                                ),
                              ].join(
                                " ",
                              )}
                            >
                              {
                                service.status
                              }
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </DataraTableScroll>

              {visibleServices.length ===
                0 && (
                <div className="px-6 py-20 text-center">
                  <p className="text-lg font-bold text-slate-800">
                    No hay órdenes de servicio
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Crea la primera orden o ajusta los filtros de búsqueda.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {(message || error) && (
        <div className="fixed right-5 top-5 z-[80] w-[min(420px,calc(100vw-2.5rem))]">
          <div
            className={[
              "rounded-2xl border px-5 py-4 text-sm font-semibold shadow-2xl",
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {error ??
              message}
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar formulario"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() =>
              setIsCreateOpen(
                false,
              )
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5">
              <h2 className="text-2xl font-black text-slate-950">
                Nueva orden de servicio
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Registra la motocicleta, el trabajo solicitado y su programación.
              </p>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={
                handleCreate
              }
            >
              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-950">
                    Cliente y sucursal
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Sucursal *

                      <select
                        required
                        value={
                          branchId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setBranchId(
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Selecciona una sucursal
                        </option>

                        {branches.map(
                          (branch) => (
                            <option
                              key={
                                branch.value
                              }
                              value={
                                branch.value
                              }
                            >
                              {
                                branch.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Cliente *

                      <select
                        required
                        value={
                          customerId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) => {
                          setCustomerId(
                            event
                              .target
                              .value,
                          );

                          setDealId(
                            "",
                          );

                          setSalesOrderId(
                            "",
                          );
                        }}
                      >
                        <option value="">
                          Selecciona un cliente
                        </option>

                        {customers.map(
                          (customer) => (
                            <option
                              key={
                                customer.id
                              }
                              value={
                                customer.id
                              }
                            >
                              {
                                customer.displayName
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Oportunidad relacionada

                      <select
                        value={
                          dealId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setDealId(
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Sin oportunidad
                        </option>

                        {availableDeals.map(
                          (deal) => (
                            <option
                              key={
                                deal.id
                              }
                              value={
                                deal.id
                              }
                            >
                              {
                                deal.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Orden de venta relacionada

                      <select
                        value={
                          salesOrderId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setSalesOrderId(
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Sin orden de venta
                        </option>

                        {availableSalesOrders.map(
                          (order) => (
                            <option
                              key={
                                order.id
                              }
                              value={
                                order.id
                              }
                            >
                              {
                                order.reference
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-950">
                    Motocicleta y servicio
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Tipo de servicio *

                      <select
                        required
                        value={
                          serviceType
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setServiceType(
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Selecciona un tipo
                        </option>

                        {[
                          "Mantenimiento preventivo",
                          "Mantenimiento correctivo",
                          "Diagnóstico",
                          "Garantía",
                          "Instalación de accesorios",
                          "Otro",
                        ].map(
                          (type) => (
                            <option
                              key={
                                type
                              }
                              value={
                                type
                              }
                            >
                              {type}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Prioridad *

                      <select
                        required
                        value={
                          priority
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setPriority(
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        {priorityOptions.map(
                          (option) => (
                            <option
                              key={
                                option
                              }
                              value={
                                option
                              }
                            >
                              {
                                option
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Modelo *

                      <select
                        required
                        value={
                          isManualModel
                            ? "__manual__"
                            : unitModel
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) => {
                          const value =
                            event.target
                              .value;

                          if (
                            value ===
                            "__manual__"
                          ) {
                            setIsManualModel(
                              true,
                            );

                            setUnitModel(
                              "",
                            );

                            return;
                          }

                          setIsManualModel(
                            false,
                          );

                          setUnitModel(
                            value,
                          );
                        }}
                      >
                        {products.map(
                          (product) => (
                            <option
                              key={
                                product.id
                              }
                              value={
                                product.name
                              }
                            >
                              {
                                product.label
                              }
                            </option>
                          ),
                        )}

                        <option value="__manual__">
                          Capturar otro modelo manualmente
                        </option>
                      </select>

                      {isManualModel && (
                        <input
                          required
                          value={
                            unitModel
                          }
                          placeholder="Escribe el modelo de la motocicleta"
                          className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          onChange={(
                            event,
                          ) =>
                            setUnitModel(
                              event
                                .target
                                .value,
                            )
                          }
                        />
                      )}
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Placa

                      <input
                        value={
                          unitPlate
                        }
                        placeholder="Ej. ABC-12-34"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setUnitPlate(
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      NIV o número de serie

                      <input
                        value={
                          unitIdentifier
                        }
                        placeholder="Captura el NIV completo de la motocicleta"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setUnitIdentifier(
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Problema reportado *

                      <textarea
                        required
                        rows={4}
                        value={
                          reportedProblem
                        }
                        placeholder="Describe la solicitud o falla reportada por el cliente."
                        className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setReportedProblem(
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-950">
                    Programación
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Responsable *

                      <select
                        required
                        value={
                          ownerClerkUserId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setOwnerClerkUserId(
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Selecciona un responsable
                        </option>

                        {members.map(
                          (member) => (
                            <option
                              key={
                                member.value
                              }
                              value={
                                member.value
                              }
                            >
                              {
                                member.label
                              }
                            {members.length ===
                            0 && (
                            <option
                                value=""
                                disabled
                            >
                                No hay mecánicos asignados
                            </option>
                            )}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Fecha programada

                      <input
                        required
                        type="datetime-local"
                        value={
                          scheduledAt
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setScheduledAt(
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Fecha compromiso

                      <input
                        type="datetime-local"
                        value={
                          commitmentAt
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setCommitmentAt(
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Notas

                      <textarea
                        rows={3}
                        value={
                          notes
                        }
                        placeholder="Indicaciones internas o información adicional."
                        className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setNotes(
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>
              </div>

              <footer className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
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
                    isSubmitting
                  }
                >
                  {isSubmitting
                    ? "Guardando..."
                    : "Crear orden"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {selectedService && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar detalle"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() =>
              setSelectedService(
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
                      selectedService.reference
                    }
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {
                      selectedService.customerName
                    }
                    {" · "}
                    {
                      selectedService.branchLabel
                    }
                  </p>
                </div>

                <span
                  className={[
                    "inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset",
                    getStatusClassName(
                      selectedService.status,
                    ),
                  ].join(" ")}
                >
                  {
                    selectedService.status
                  }
                </span>
              </div>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {[
                  {
                    label:
                      "Tipo de servicio",

                    value:
                      selectedService.serviceType,
                  },
                  {
                    label:
                      "Prioridad",

                    value:
                      selectedService.priority,
                  },
                  {
                    label:
                      "Programada",

                    value:
                      formatDate(
                        selectedService.scheduledAt,
                      ),
                  },
                  {
                    label:
                      "Compromiso",

                    value:
                      formatDate(
                        selectedService.commitmentAt,
                      ),
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

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-950">
                  Motocicleta
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Modelo
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {
                        selectedService.unitModel
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Placa
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedService.unitPlate ??
                        "Sin placa"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      NIV o número de serie
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedService.unitIdentifier ??
                        "Sin identificador"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-950">
                  Atención de taller
                </h3>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Problema reportado
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                      {
                        selectedService.reportedProblem
                      }
                    </p>
                  </div>

                  {selectedService.diagnosis && (
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Diagnóstico
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                        {
                          selectedService.diagnosis
                        }
                      </p>
                    </div>
                  )}

                  {selectedService.result && (
                    <div>
                      <p className="text-xs font-bold uppercase text-emerald-600">
                        Resultado
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                        {
                          selectedService.result
                        }
                      </p>
                    </div>
                  )}

                  {selectedService.notes && (
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Notas
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                        {
                          selectedService.notes
                        }
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-950">
                  Cliente y responsable
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Cliente
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {
                        selectedService.customerName
                      }
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedService.customerPhone ??
                        selectedService.customerEmail ??
                        "Sin contacto"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Responsable
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedService.ownerName ??
                        "Sin responsable"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedService.ownerEmail ??
                        "Sin correo"}
                    </p>
                  </div>
                </div>
              </section>

              {(selectedService.dealId ||
                selectedService.salesOrderId) && (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-950">
                    Origen comercial
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {selectedService.dealId && (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Oportunidad
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {deals.find(
                            (deal) =>
                              deal.id ===
                              selectedService.dealId,
                          )?.name ??
                            selectedService.dealId}
                        </p>
                      </div>
                    )}

                    {selectedService.salesOrderId && (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Orden de venta
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {salesOrders.find(
                            (order) =>
                              order.id ===
                              selectedService.salesOrderId,
                          )?.reference ??
                            selectedService.salesOrderId}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {permissions.canEdit &&
                (
                  selectedService.status ===
                    "En proceso" ||
                  selectedService.status ===
                    "Pausada"
                ) && (
                <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="block text-sm font-semibold text-slate-700">
                    Diagnóstico

                    <textarea
                      disabled={
                        Boolean(
                          selectedService
                            .authorizedAt,
                        )
                      }
                      rows={4}
                      value={
                        diagnosis
                      }
                      placeholder="Describe el diagnóstico técnico de la motocicleta."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                      onChange={(
                        event,
                      ) =>
                        setDiagnosis(
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Resultado del servicio

                    <textarea
                      rows={4}
                      value={
                        serviceResult
                      }
                      placeholder="Describe el trabajo realizado y el resultado obtenido."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      onChange={(
                        event,
                      ) =>
                        setServiceResult(
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  {!selectedService
                    .authorizedAt && (
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-950">
                          Acciones y refacciones
                        </h4>

                        <p className="mt-1 text-sm text-slate-500">
                          Registra los trabajos y materiales que requieren autorización.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setServiceItems(
                              (
                                current,
                              ) => [
                                ...current,
                                {
                                  key:
                                    crypto.randomUUID(),

                                  itemType:
                                    "Mano de obra",

                                  productId:
                                    "",

                                  name:
                                    "",

                                  description:
                                    "",

                                  quantity:
                                    1,

                                  unitPrice:
                                    0,
                                },
                              ],
                            )
                          }
                        >
                          Agregar acción
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setServiceItems(
                              (
                                current,
                              ) => [
                                ...current,
                                {
                                  key:
                                    crypto.randomUUID(),

                                  itemType:
                                    "Refacción",

                                  productId:
                                    "",

                                  name:
                                    "",

                                  description:
                                    "",

                                  quantity:
                                    1,

                                  unitPrice:
                                    0,
                                },
                              ],
                            )
                          }
                        >
                          Agregar refacción
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {serviceItems.map(
                        (
                          item,
                          index,
                        ) => (
                          <article
                            key={
                              item.key
                            }
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                              <label className="text-sm font-semibold text-slate-700">
                                Tipo

                                <select
                                  value={
                                    item.itemType
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950"
                                  onChange={(
                                    event,
                                  ) => {
                                    const itemType =
                                      event.target.value as
                                        | "Mano de obra"
                                        | "Refacción";

                                    setServiceItems(
                                      (
                                        current,
                                      ) =>
                                        current.map(
                                          (
                                            currentItem,
                                            currentIndex,
                                          ) =>
                                            currentIndex ===
                                            index
                                              ? {
                                                  ...currentItem,
                                                  itemType,
                                                  productId:
                                                    "",
                                                  name:
                                                    "",
                                                }
                                              : currentItem,
                                        ),
                                    );
                                  }}
                                >
                                  <option value="Mano de obra">
                                    Mano de obra
                                  </option>

                                  <option value="Refacción">
                                    Refacción
                                  </option>
                                </select>
                              </label>

                              {item.itemType ===
                              "Refacción" ? (
                                <label className="text-sm font-semibold text-slate-700">
                                  Refacción *

                                  <input
                                    type="text"
                                    value={
                                      item.name
                                    }
                                    placeholder="Ej. Filtro de aceite"
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal text-slate-950"
                                    onChange={(
                                      event,
                                    ) =>
                                      setServiceItems(
                                        (
                                          current,
                                        ) =>
                                          current.map(
                                            (
                                              currentItem,
                                              currentIndex,
                                            ) =>
                                              currentIndex ===
                                              index
                                                ? {
                                                    ...currentItem,

                                                    productId:
                                                      "",

                                                    name:
                                                      event
                                                        .target
                                                        .value,
                                                  }
                                                : currentItem,
                                          ),
                                      )
                                    }
                                  />
                                </label>
                              ) : (
                                <label className="text-sm font-semibold text-slate-700">
                                  Acción *

                                  <input
                                    type="text"
                                    value={
                                      item.name
                                    }
                                    placeholder="Ej. Cambio de aceite"
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal text-slate-950"
                                    onChange={(
                                      event,
                                    ) =>
                                      setServiceItems(
                                        (
                                          current,
                                        ) =>
                                          current.map(
                                            (
                                              currentItem,
                                              currentIndex,
                                            ) =>
                                              currentIndex ===
                                              index
                                                ? {
                                                    ...currentItem,
                                                    name:
                                                      event
                                                        .target
                                                        .value,
                                                  }
                                                : currentItem,
                                          ),
                                      )
                                    }
                                  />
                                </label>
                              )}

                              <label className="text-sm font-semibold text-slate-700">
                                Cantidad *

                                <input
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={
                                    item.quantity
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal text-slate-950"
                                  onFocus={(
                                    event,
                                  ) =>
                                    event.currentTarget.select()
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setServiceItems(
                                      (
                                        current,
                                      ) =>
                                        current.map(
                                          (
                                            currentItem,
                                            currentIndex,
                                          ) =>
                                            currentIndex ===
                                            index
                                              ? {
                                                  ...currentItem,

                                                  quantity:
                                                    Number(
                                                      event
                                                        .target
                                                        .value,
                                                    ),
                                                }
                                              : currentItem,
                                        ),
                                    )
                                  }
                                />
                              </label>

                              <label className="text-sm font-semibold text-slate-700">
                                Precio unitario *

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.unitPrice
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal text-slate-950"
                                  onChange={(
                                    event,
                                  ) =>
                                    setServiceItems(
                                      (
                                        current,
                                      ) =>
                                        current.map(
                                          (
                                            currentItem,
                                            currentIndex,
                                          ) =>
                                            currentIndex ===
                                            index
                                              ? {
                                                  ...currentItem,

                                                  unitPrice:
                                                    Number(
                                                      event
                                                        .target
                                                        .value,
                                                    ),
                                                }
                                              : currentItem,
                                        ),
                                    )
                                  }
                                />
                              </label>
                            </div>

                            <div className="mt-4 flex items-end gap-3">
                              <label className="flex-1 text-sm font-semibold text-slate-700">
                                Descripción

                                <input
                                  type="text"
                                  value={
                                    item.description
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal text-slate-950"
                                  onChange={(
                                    event,
                                  ) =>
                                    setServiceItems(
                                      (
                                        current,
                                      ) =>
                                        current.map(
                                          (
                                            currentItem,
                                            currentIndex,
                                          ) =>
                                            currentIndex ===
                                            index
                                              ? {
                                                  ...currentItem,

                                                  description:
                                                    event
                                                      .target
                                                      .value,
                                                }
                                              : currentItem,
                                        ),
                                    )
                                  }
                                />
                              </label>

                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                  setServiceItems(
                                    (
                                      current,
                                    ) =>
                                      current.filter(
                                        (
                                          _,
                                          currentIndex,
                                        ) =>
                                          currentIndex !==
                                          index,
                                      ),
                                  )
                                }
                              >
                                Quitar
                              </Button>
                            </div>

                            <p className="mt-3 text-right text-sm font-bold text-slate-900">
                              Total:{" "}
                              {formatMoney(
                                item.quantity *
                                  item.unitPrice,
                              )}
                            </p>
                          </article>
                        ),
                      )}

                      {serviceItems.length ===
                        0 && (
                        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                          Aún no hay acciones ni refacciones registradas.
                        </p>
                      )}
                    </div>
                  </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={
                        isSubmitting
                      }
                      onClick={() =>
                        void updateService(
                          "Actualizar",
                        )
                      }
                    >
                      {selectedService
                        .authorizedAt
                        ? "Guardar resultado"
                        : "Guardar diagnóstico"}
                    </Button>
                  </div>
                </section>
              )}

              {serviceItems.length > 0 &&
                (
                  Boolean(
                    selectedService
                      .authorizedAt,
                  ) ||
                  ![
                    "En proceso",
                    "Pausada",
                  ].includes(
                    selectedService.status,
                  )
                ) && (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-950">
                      Acciones y refacciones
                    </h3>

                    <p className="text-sm font-bold text-slate-900">
                      Total:{" "}
                      {formatMoney(
                        serviceItems.reduce(
                          (
                            total,
                            item,
                          ) =>
                            total +
                            item.quantity *
                              item.unitPrice,
                          0,
                        ),
                      )}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {serviceItems.map(
                      (item) => (
                        <article
                          key={item.key}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-950">
                                {item.name ||
                                  "Partida sin nombre"}
                              </p>

                              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                                {item.itemType}
                              </p>
                            </div>

                            <span
                              className={[
                                "inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset",
                                item.authorizationStatus ===
                                "Autorizada"
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                                  : "bg-amber-50 text-amber-700 ring-amber-600/20",
                              ].join(" ")}
                            >
                              {
                                item.authorizationStatus ??
                                  "Pendiente"
                              }
                            </span>
                          </div>

                          {item.description && (
                            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                              {
                                item.description
                              }
                            </p>
                          )}

                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">
                                Cantidad
                              </p>

                              <p className="mt-1 font-semibold text-slate-900">
                                {item.quantity}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">
                                Precio unitario
                              </p>

                              <p className="mt-1 font-semibold text-slate-900">
                                {formatMoney(
                                  item.unitPrice,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">
                                Total
                              </p>

                              <p className="mt-1 font-black text-slate-950">
                                {formatMoney(
                                  item.quantity *
                                    item.unitPrice,
                                )}
                              </p>
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
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
                      {selectedService.createdByName ??
                        "Usuario"}
                      {" · "}
                      {formatDate(
                        selectedService.createdAt,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Última actualización
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedService.updatedByName ??
                        selectedService.createdByName ??
                        "Usuario"}
                      {" · "}
                      {formatDate(
                        selectedService.updatedAt,
                      )}
                    </p>
                  </div>

                  {selectedService.startedAt && (
                    <div>
                      <p className="text-xs font-bold uppercase text-blue-600">
                        Inicio
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDate(
                          selectedService.startedAt,
                        )}
                      </p>
                    </div>
                  )}

                  {selectedService
                    .authorizationRequestedAt && (
                    <div>
                      <p className="text-xs font-bold uppercase text-orange-600">
                        Autorización solicitada
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedService
                          .authorizationRequestedByName ??
                          "Usuario"}
                        {" · "}
                        {formatDate(
                          selectedService
                            .authorizationRequestedAt,
                        )}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-orange-700">
                        Tiempo de espera:{" "}
                        {formatElapsedTime(
                          selectedService
                            .authorizationRequestedAt,
                          selectedService
                            .authorizedAt,
                        )}
                      </p>
                    </div>
                  )}

                  {selectedService
                    .authorizedAt && (
                    <div>
                      <p className="text-xs font-bold uppercase text-emerald-600">
                        Trabajo autorizado
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedService
                          .authorizedByName ??
                          "Usuario"}
                        {" · "}
                        {formatDate(
                          selectedService
                            .authorizedAt,
                        )}
                      </p>
                    </div>
                  )}

                                    {selectedService
                    .workCompletedAt && (
                    <div>
                      <p className="text-xs font-bold uppercase text-cyan-600">
                        Servicio enviado a cierre
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedService
                          .workCompletedByName ??
                          "Usuario"}
                        {" · "}
                        {formatDate(
                          selectedService
                            .workCompletedAt,
                        )}
                      </p>
                    </div>
                  )}

                  {(
                    selectedService
                      .metadata
                      .returnHistory
                      ?.length
                      ? selectedService
                          .metadata
                          .returnHistory
                      : selectedService
                          .returnedAt
                        ? [
                            {
                              returnedAt:
                                selectedService
                                  .returnedAt,

                              returnedByName:
                                selectedService
                                  .returnedByName,

                              reason:
                                selectedService
                                  .returnReason,
                            },
                          ]
                        : []
                  ).map(
                    (
                      returnRecord,
                      index,
                    ) => (
                      <div
                        key={[
                          returnRecord
                            .returnedAt,
                          index,
                        ].join("-")}
                        className="sm:col-span-2"
                      >
                        <p className="text-xs font-bold uppercase text-amber-600">
                          Devolución al taller{" "}
                          {index + 1}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-amber-800">
                          {returnRecord
                            .returnedByName ??
                            "Usuario"}
                          {" · "}
                          {formatDate(
                            returnRecord
                              .returnedAt ??
                              null,
                          )}
                          {" · "}
                          {returnRecord
                            .reason ??
                            "Sin motivo"}
                        </p>
                      </div>
                    ),
                  )}

                  {selectedService.completedAt && (
                    <div>
                      <p className="text-xs font-bold uppercase text-emerald-600">
                        Finalización
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDate(
                          selectedService.completedAt,
                        )}
                      </p>
                    </div>
                  )}

                  {selectedService.cancelledAt && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold uppercase text-red-600">
                        Cancelación
                      </p>

                      <p className="mt-1 text-sm font-semibold text-red-800">
                        {formatDate(
                          selectedService.cancelledAt,
                        )}
                        {" · "}
                        {selectedService.cancellationReason ??
                          "Sin motivo"}
                      </p>
                    </div>
                  )}
                </div>
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
                  setSelectedService(
                    null,
                  )
                }
              >
                Cerrar
              </Button>

                            {permissions.canManage &&
                ![
                  "Completada",
                  "Cancelada",
                ].includes(
                  selectedService.status,
                ) && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isSubmitting
                  }
                  onClick={() => {
                    setTransferOwnerId(
                      selectedService
                        .ownerClerkUserId ??
                        "",
                    );

                    setTransferReason(
                      "",
                    );

                    setIsTransferOpen(
                      true,
                    );
                  }}
                >
                  Transferir orden
                </Button>
              )}

              {permissions.canManage &&
                ![
                  "Completada",
                  "Cancelada",
                ].includes(
                  selectedService.status,
                ) && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isSubmitting
                  }
                  onClick={() => {
                    setActionReason(
                      "",
                    );

                    setPendingReasonAction(
                      "Cancelar",
                    );
                  }}
                >
                  Cancelar orden
                </Button>
              )}

              {permissions.canEdit &&
                selectedService.status ===
                  "Borrador" && (
                <Button
                  type="button"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    void updateService(
                      "Programar",
                    )
                  }
                >
                  Programar servicio
                </Button>
              )}

              {permissions.canEdit &&
                (
                  selectedService.status ===
                    "Programada" ||
                  selectedService.status ===
                    "Pausada"
                ) && (
                <Button
                  type="button"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    void updateService(
                      "Iniciar",
                    )
                  }
                >
                  {selectedService.status ===
                    "Pausada"
                    ? "Reanudar servicio"
                    : "Iniciar servicio"}
                </Button>
              )}

              {permissions.canEdit &&
                selectedService.status ===
                  "En proceso" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isSubmitting
                  }
                  onClick={() => {
                    setActionReason(
                      "",
                    );

                    setPendingReasonAction(
                      "Pausar",
                    );
                  }}
                >
                  Pausar servicio
                </Button>
              )}

              {permissions.canEdit &&
                selectedService.status ===
                  "En proceso" &&
                !selectedService.authorizedAt && (
                <Button
                  type="button"
                  disabled={
                    isSubmitting ||
                    !diagnosis.trim() ||
                    serviceItems.length ===
                      0
                  }
                  onClick={() =>
                    void updateService(
                      "Solicitar autorización",
                    )
                  }
                >
                  Solicitar autorización
                </Button>
              )}

              {permissions.canManage &&
                selectedService.status ===
                  "Pendiente de autorización" && (
                <Button
                  type="button"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    void updateService(
                      "Autorizar",
                    )
                  }
                >
                  Autorizar trabajo
                </Button>
              )}

              {permissions.canEdit &&
                selectedService.status ===
                  "En proceso" &&
                Boolean(
                  selectedService.authorizedAt,
                ) && (
                <Button
                  type="button"
                  disabled={
                    isSubmitting ||
                    !serviceResult.trim()
                  }
                  onClick={() =>
                    void updateService(
                      "Servicio realizado",
                    )
                  }
                >
                  Servicio realizado
                </Button>
              )}

              {permissions.canManage &&
                selectedService.status ===
                  "Pendiente de cierre" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isSubmitting
                  }
                  onClick={() => {
                    setActionReason(
                      "",
                    );

                    setPendingReasonAction(
                      "Devolver",
                    );
                  }}
                >
                  Devolver al taller
                </Button>
              )}

              {permissions.canManage &&
                selectedService.status ===
                  "Pendiente de cierre" && (
                <Button
                  type="button"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    void updateService(
                      "Completar",
                    )
                  }
                >
                  Autorizar cierre
                </Button>
              )}
            </footer>
          </aside>
        </div>
      )}

            {isTransferOpen &&
        selectedService && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar transferencia"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => {
              setIsTransferOpen(
                false,
              );

              setTransferReason(
                "",
              );
            }}
          />

          <section className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-950">
              Transferir orden
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Selecciona al nuevo mecánico y registra el motivo de la transferencia.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Nuevo responsable *

                <select
                  autoFocus
                  value={
                    transferOwnerId
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  onChange={(
                    event,
                  ) =>
                    setTransferOwnerId(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Selecciona un mecánico
                  </option>

                  {members.map(
                    (member) => (
                      <option
                        key={
                          member.value
                        }
                        value={
                          member.value
                        }
                      >
                        {
                          member.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Motivo *

                <textarea
                  rows={4}
                  value={
                    transferReason
                  }
                  placeholder="Indica el motivo de la transferencia."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  onChange={(
                    event,
                  ) =>
                    setTransferReason(
                      event.target
                        .value,
                    )
                  }
                />
              </label>
            </div>

            <footer className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isSubmitting
                }
                onClick={() => {
                  setIsTransferOpen(
                    false,
                  );

                  setTransferReason(
                    "",
                  );
                }}
              >
                Volver
              </Button>

              <Button
                type="button"
                disabled={
                  isSubmitting ||
                  !transferOwnerId ||
                  transferOwnerId ===
                    selectedService
                      .ownerClerkUserId ||
                  !transferReason.trim()
                }
                onClick={() =>
                  void updateService(
                    "Actualizar",
                    {
                      ownerClerkUserId:
                        transferOwnerId,

                      reason:
                        transferReason,
                    },
                  )
                }
              >
                {isSubmitting
                  ? "Transfiriendo..."
                  : "Confirmar transferencia"}
              </Button>
            </footer>
          </section>
        </div>
      )}

      {pendingReasonAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar captura de motivo"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => {
              setPendingReasonAction(
                null,
              );

              setActionReason(
                "",
              );
            }}
          />

          <section className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-950">
              {pendingReasonAction ===
              "Pausar"
                ? "Pausar servicio"
                : pendingReasonAction ===
                    "Devolver"
                  ? "Devolver al taller"
                  : "Cancelar orden"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Captura el motivo para conservar la trazabilidad de la orden.
            </p>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Motivo *

              <textarea
                autoFocus
                rows={4}
                value={
                  actionReason
                }
                placeholder={
                  pendingReasonAction ===
                  "Pausar"
                    ? "Indica por qué se pausa el servicio."
                    : pendingReasonAction ===
                        "Devolver"
                      ? "Indica qué debe corregir o completar el taller."
                      : "Indica por qué se cancela la orden."
                }
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                onChange={(
                  event,
                ) =>
                  setActionReason(
                    event.target.value,
                  )
                }
              />
            </label>

            <footer className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isSubmitting
                }
                onClick={() => {
                  setPendingReasonAction(
                    null,
                  );

                  setActionReason(
                    "",
                  );
                }}
              >
                Volver
              </Button>

              <Button
                type="button"
                disabled={
                  isSubmitting ||
                  !actionReason.trim()
                }
                onClick={() =>
                  void updateService(
                    pendingReasonAction,
                  )
                }
              >
                {isSubmitting
                  ? "Procesando..."
                  : pendingReasonAction ===
                      "Pausar"
                    ? "Confirmar pausa"
                    : pendingReasonAction ===
                        "Devolver"
                      ? "Devolver al taller"
                      : "Confirmar cancelación"}
              </Button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}