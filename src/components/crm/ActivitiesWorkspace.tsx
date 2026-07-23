"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import ActivityFormDrawer from "@/components/crm/ActivityFormDrawer";
import ActivityDetailDrawer from "@/components/crm/ActivityDetailDrawer";
import type {
  CRMActivityOption,
  CRMActivityRecord,
  CRMActivityType,
  CRMActivityView,
  CRMCallMode,
  CRMRelatedOption,
} from "@/types/crm-activities";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type DrawerState = {
  isOpen: boolean;

  mode:
    | "create"
    | "edit"
    | "view";

  type: CRMActivityType;

  callMode?: CRMCallMode;

  record?:
    | CRMActivityRecord
    | null;
};

const typeLabels:
  Record<
    CRMActivityType,
    string
  > = {
  task: "Tareas",
  call: "Llamadas",
  meeting: "Reuniones",
};

const typeIcons:
  Record<
    CRMActivityType,
    string
  > = {
  task: "✓",
  call: "☎",
  meeting: "▣",
};

const statusesByType:
  Record<
    CRMActivityType,
    string[]
  > = {
  task: [
    "No iniciada",
    "En curso",
    "Aplazada",
    "Completada",
    "Cancelada",
  ],

  call: [
    "Programada",
    "Completada",
    "No contestó",
    "Cancelada",
  ],

  meeting: [
    "Programada",
    "Realizada",
    "Cancelada",
    "No asistió",
  ],
};

const weekDays = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

function formatDateTime(
  value?: string | null,
): string {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Sin fecha";
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

function getActivityDate(
  activity:
    CRMActivityRecord,
): Date | null {
  const value =
    activity.type === "task"
      ? activity.dueAt
      : activity.startAt;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function getStatusClassName(
  status: string,
): string {
  const normalized =
    status.toLowerCase();

  if (
    normalized.includes(
      "complet",
    ) ||
    normalized.includes(
      "realizada",
    )
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    normalized.includes(
      "cancel",
    ) ||
    normalized.includes(
      "no asist",
    ) ||
    normalized.includes(
      "no contest",
    )
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    normalized.includes(
      "curso",
    ) ||
    normalized.includes(
      "programada",
    )
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (
    normalized.includes(
      "aplazada",
    )
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function ActivitiesWorkspace() {
  const [
    activities,
    setActivities,
  ] = useState<
    CRMActivityRecord[]
  >([]);

  const [
    members,
    setMembers,
  ] = useState<
    CRMActivityOption[]
  >([]);

  const [
    relatedOptions,
    setRelatedOptions,
  ] = useState<
    CRMRelatedOption[]
  >([]);

  const [
    selectedType,
    setSelectedType,
  ] = useState<
    CRMActivityType
  >("task");

  const [
    view,
    setView,
  ] = useState<
    CRMActivityView
  >("list");

  const [
    calendarFilter,
    setCalendarFilter,
  ] = useState<
    "all" | CRMActivityType
  >("all");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    currentMonth,
    setCurrentMonth,
  ] = useState(
    () => new Date(),
  );

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
    isCreateMenuOpen,
    setIsCreateMenuOpen,
  ] = useState(false);

  const [
    drawer,
    setDrawer,
  ] = useState<DrawerState>({
    isOpen: false,
    mode: "create",
    type: "task",
  });

  const loadData =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [
          activitiesResponse,
          membersResponse,
          leadsResponse,
          customersResponse,
          dealsResponse,
        ] = await Promise.all([
          fetch(
            "/api/crm/activities",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/members/options",
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
        ]);

        const activitiesResult =
          (await activitiesResponse.json()) as
            ApiResponse<
              CRMActivityRecord[]
            >;

        const membersResult =
          (await membersResponse.json()) as
            ApiResponse<
              CRMActivityOption[]
            >;

        const leadsResult =
          (await leadsResponse.json()) as
            ApiResponse<
              Array<{
                id: string;
                firstName?: string;
                lastName?: string;
                email?: string;
              }>
            >;

        const customersResult =
          (await customersResponse.json()) as
            ApiResponse<
              Array<{
                id: string;
                displayName: string;
                email?: string;
                phone?: string;
              }>
            >;

        const dealsResult =
          (await dealsResponse.json()) as
            ApiResponse<
              Array<{
                id: string;
                name: string;
              }>
            >;

        if (
          !activitiesResponse.ok ||
          !activitiesResult.success
        ) {
          throw new Error(
            activitiesResult.error ??
              "No fue posible cargar las actividades.",
          );
        }

        setActivities(
          activitiesResult.data ?? [],
        );

        setMembers(
          membersResult.data ?? [],
        );

        const leadOptions:
          CRMRelatedOption[] =
          (
            leadsResult.data ?? []
          ).map((lead) => {
            const name = [
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
                `Prospecto · ${name || lead.email || "Sin nombre"}`,
              email:
                lead.email,
            };
          });

        const customerOptions:
          CRMRelatedOption[] =
          (
            customersResult.data ??
            []
          ).map(
            (customer) => ({
              id: customer.id,
              type: "customer",
              label:
                `Cliente · ${customer.displayName}`,
              email:
                customer.email,
              phone:
                customer.phone,
            }),
          );

        const dealOptions:
          CRMRelatedOption[] =
          (
            dealsResult.data ?? []
          ).map((deal) => ({
            id: deal.id,
            type: "deal",
            label:
              `Oportunidad · ${deal.name}`,
          }));

        setRelatedOptions([
          ...leadOptions,
          ...customerOptions,
          ...dealOptions,
        ]);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar las actividades.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

    const visibleActivities =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return activities.filter(
        (activity) => {
          if (
            view !== "calendar" &&
            activity.type !==
              selectedType
          ) {
            return false;
          }

          if (
            view === "calendar" &&
            calendarFilter !==
              "all" &&
            activity.type !==
              calendarFilter
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return [
            activity.subject,
            activity.status,
            activity.priority,
            activity.relatedName,
            activity.owner.name,
          ].some((value) =>
            value
              ?.toLowerCase()
              .includes(
                normalizedSearch,
              ),
          );
        },
      );
    }, [
      activities,
      calendarFilter,
      searchTerm,
      selectedType,
      view,
    ]);

  const calendarDays =
    useMemo(() => {
      const year =
        currentMonth.getFullYear();

      const month =
        currentMonth.getMonth();

      const firstDay =
        new Date(
          year,
          month,
          1,
        );

      const lastDay =
        new Date(
          year,
          month + 1,
          0,
        );

      const mondayOffset =
        (firstDay.getDay() + 6) %
        7;

      const days: Date[] = [];

      for (
        let index =
          mondayOffset;
        index > 0;
        index -= 1
      ) {
        days.push(
          new Date(
            year,
            month,
            1 - index,
          ),
        );
      }

      for (
        let day = 1;
        day <= lastDay.getDate();
        day += 1
      ) {
        days.push(
          new Date(
            year,
            month,
            day,
          ),
        );
      }

      while (
        days.length % 7 !== 0 ||
        days.length < 42
      ) {
        const last =
          days[
            days.length - 1
          ];

        days.push(
          new Date(
            last.getFullYear(),
            last.getMonth(),
            last.getDate() + 1,
          ),
        );
      }

      return days;
    }, [currentMonth]);

  function openCreate(
    type: CRMActivityType,
    callMode?: CRMCallMode,
  ) {
    setDrawer({
      isOpen: true,
      mode: "create",
      type,
      callMode,
      record: null,
    });

    setIsCreateMenuOpen(false);
  }

  function openView(
    activity:
      CRMActivityRecord,
  ) {
    setDrawer({
      isOpen: true,
      mode: "view",
      type: activity.type,
      callMode:
        activity.callMode ??
        undefined,
      record: activity,
    });
  }

  function openEdit(
    activity:
      CRMActivityRecord,
  ) {
    setDrawer({
      isOpen: true,
      mode: "edit",
      type: activity.type,
      callMode:
        activity.callMode ??
        undefined,
      record: activity,
    });
  }

  async function updateStatus(
    activity:
      CRMActivityRecord,
    status: string,
  ) {
    if (
      activity.status === status
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/crm/activities",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...activity,
                status,

                ownerClerkUserId:
                  activity
                    .ownerClerkUserId,

                participants:
                  activity.participants,
              }),
          },
        );

      const result =
        (await response.json()) as
          ApiResponse<unknown>;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible cambiar el estado.",
        );
      }

      await loadData();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "No fue posible cambiar el estado.",
      );
    }
  }

  const selectedTypeLabel =
    typeLabels[selectedType];

  return (
    <>
      <section className="overflow-visible rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Actividades
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isLoading
                    ? "Cargando actividades..."
                    : `${visibleActivities.length} registros visibles`}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  value={searchTerm}
                  placeholder="Buscar actividades..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm sm:w-72"
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value,
                    )
                  }
                />

                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                  onClick={() =>
                    void loadData()
                  }
                >
                  Actualizar
                </button>

                <div className="relative">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg"
                    onClick={() => {
                      if (
                        selectedType ===
                        "call"
                      ) {
                        setIsCreateMenuOpen(
                          (current) =>
                            !current,
                        );
                        return;
                      }

                      openCreate(
                        selectedType,
                      );
                    }}
                  >
                    Nueva{" "}
                    {selectedType ===
                    "meeting"
                      ? "reunión"
                      : selectedType ===
                          "call"
                        ? "llamada ▾"
                        : "tarea"}
                  </button>

                  {selectedType ===
                    "call" &&
                    isCreateMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                      <button
                        type="button"
                        className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50"
                        onClick={() =>
                          openCreate(
                            "call",
                            "scheduled",
                          )
                        }
                      >
                        Programar llamada
                      </button>

                      <button
                        type="button"
                        className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50"
                        onClick={() =>
                          openCreate(
                            "call",
                            "logged",
                          )
                        }
                      >
                        Registrar llamada
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "task",
                    "call",
                    "meeting",
                  ] as CRMActivityType[]
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={[
                      "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                      selectedType ===
                      type
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    ].join(" ")}
                    onClick={() => {
                      setSelectedType(
                        type,
                      );

                      if (
                        view ===
                        "calendar"
                      ) {
                        setCalendarFilter(
                          type,
                        );
                      }
                    }}
                  >
                    {typeIcons[type]}{" "}
                    {typeLabels[type]}
                  </button>
                ))}
              </div>

              <div className="flex rounded-xl bg-slate-100 p-1">
                {(
                  [
                    ["list", "Lista"],
                    [
                      "kanban",
                      "Kanban",
                    ],
                    [
                      "calendar",
                      "Calendario",
                    ],
                  ] as Array<
                    [
                      CRMActivityView,
                      string,
                    ]
                  >
                ).map(
                  ([
                    viewValue,
                    label,
                  ]) => (
                    <button
                      key={viewValue}
                      type="button"
                      className={[
                        "rounded-lg px-4 py-2 text-sm font-semibold transition",
                        view ===
                        viewValue
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500",
                      ].join(" ")}
                      onClick={() =>
                        setView(
                          viewValue,
                        )
                      }
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {view === "list" && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {[
                    "Asunto",
                    "Fecha",
                    "Estado",
                    "Prioridad",
                    "Relacionado con",
                    "Responsable",
                    "Acciones",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-4 text-left text-sm font-semibold text-slate-700"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleActivities.map(
                  (activity) => (
                    <tr
                      key={activity.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="min-w-64 px-5 py-4 font-semibold text-slate-950">
                        {
                          activity.subject
                        }
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDateTime(
                          activity.type ===
                            "task"
                            ? activity.dueAt
                            : activity.startAt,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            getStatusClassName(
                              activity.status,
                            ),
                          ].join(" ")}
                        >
                          {
                            activity.status
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {
                          activity.priority
                        }
                      </td>

                      <td className="min-w-52 px-5 py-4 text-sm text-slate-600">
                        {activity.relatedName ??
                          "Sin relación"}
                      </td>

                      <td className="min-w-44 px-5 py-4 text-sm text-slate-600">
                        {activity.owner.name ??
                          activity.owner.email}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                            onClick={() =>
                              openView(
                                activity,
                              )
                            }
                          >
                            Ver
                          </button>

                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                            onClick={() =>
                              openEdit(
                                activity,
                              )
                            }
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            {!isLoading &&
              visibleActivities.length ===
                0 && (
              <div className="px-6 py-20 text-center">
                <p className="text-lg font-bold text-slate-950">
                  No hay{" "}
                  {selectedTypeLabel.toLowerCase()}{" "}
                  registradas
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Crea el primer registro para comenzar.
                </p>
              </div>
            )}
          </div>
        )}

                {view === "kanban" && (
          <div className="overflow-x-auto p-5 sm:p-6">
            <div
              className="grid min-w-[1100px] gap-4"
              style={{
                gridTemplateColumns:
                  `repeat(${statusesByType[selectedType].length}, minmax(240px, 1fr))`,
              }}
            >
              {statusesByType[
                selectedType
              ].map((status) => {
                const statusActivities =
                  visibleActivities.filter(
                    (activity) =>
                      activity.status ===
                      status,
                  );

                return (
                  <section
                    key={status}
                    className="min-h-[520px] rounded-2xl bg-slate-100 p-3"
                    onDragOver={(
                      event,
                    ) =>
                      event.preventDefault()
                    }
                    onDrop={(event) => {
                      const activityId =
                        event.dataTransfer.getData(
                          "text/activity-id",
                        );

                      const activity =
                        activities.find(
                          (candidate) =>
                            candidate.id ===
                            activityId,
                        );

                      if (activity) {
                        void updateStatus(
                          activity,
                          status,
                        );
                      }
                    }}
                  >
                    <header className="mb-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                      <p className="font-bold text-slate-900">
                        {status}
                      </p>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {
                          statusActivities.length
                        }
                      </span>
                    </header>

                    <div className="space-y-3">
                      {statusActivities.map(
                        (activity) => (
                          <article
                            key={
                              activity.id
                            }
                            draggable
                            className="cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:cursor-grabbing"
                            onDragStart={(
                              event,
                            ) =>
                              event.dataTransfer.setData(
                                "text/activity-id",
                                activity.id,
                              )
                            }
                            onDoubleClick={() =>
                              openEdit(
                                activity,
                              )
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-bold text-slate-950">
                                {
                                  activity.subject
                                }
                              </p>

                              <span className="text-lg">
                                {
                                  typeIcons[
                                    activity
                                      .type
                                  ]
                                }
                              </span>
                            </div>

                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              {formatDateTime(
                                activity.type ===
                                  "task"
                                  ? activity.dueAt
                                  : activity.startAt,
                              )}
                            </p>

                            {activity.relatedName && (
                              <p className="mt-3 text-sm text-slate-600">
                                {
                                  activity.relatedName
                                }
                              </p>
                            )}

                            <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                                {
                                  activity.priority
                                }
                              </span>

                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  className="font-semibold text-slate-600"
                                  onClick={() =>
                                    openView(
                                      activity,
                                    )
                                  }
                                >
                                  Ver
                                </button>

                                <button
                                  type="button"
                                  className="font-semibold text-emerald-700"
                                  onClick={() =>
                                    openEdit(
                                      activity,
                                    )
                                  }
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {view === "calendar" && (
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300"
                  onClick={() =>
                    setCurrentMonth(
                      (current) =>
                        new Date(
                          current.getFullYear(),
                          current.getMonth() -
                            1,
                          1,
                        ),
                    )
                  }
                >
                  ←
                </button>

                <h3 className="min-w-52 text-center text-lg font-black capitalize text-slate-950">
                  {currentMonth.toLocaleDateString(
                    "es-MX",
                    {
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </h3>

                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300"
                  onClick={() =>
                    setCurrentMonth(
                      (current) =>
                        new Date(
                          current.getFullYear(),
                          current.getMonth() +
                            1,
                          1,
                        ),
                    )
                  }
                >
                  →
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(),
                    )
                  }
                >
                  Hoy
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "Todas"],
                    [
                      "task",
                      "Tareas",
                    ],
                    [
                      "call",
                      "Llamadas",
                    ],
                    [
                      "meeting",
                      "Reuniones",
                    ],
                  ] as Array<
                    [
                      "all" |
                        CRMActivityType,
                      string,
                    ]
                  >
                ).map(
                  ([
                    filter,
                    label,
                  ]) => (
                    <button
                      key={filter}
                      type="button"
                      className={[
                        "rounded-xl px-3 py-2 text-sm font-semibold",
                        calendarFilter ===
                        filter
                          ? "bg-slate-950 text-white"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                      onClick={() =>
                        setCalendarFilter(
                          filter,
                        )
                      }
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {weekDays.map(
                  (day) => (
                    <div
                      key={day}
                      className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map(
                  (day) => {
                    const dayActivities =
                      visibleActivities.filter(
                        (activity) => {
                          const activityDate =
                            getActivityDate(
                              activity,
                            );

                          return (
                            activityDate &&
                            activityDate.getFullYear() ===
                              day.getFullYear() &&
                            activityDate.getMonth() ===
                              day.getMonth() &&
                            activityDate.getDate() ===
                              day.getDate()
                          );
                        },
                      );

                    const isCurrentMonth =
                      day.getMonth() ===
                      currentMonth.getMonth();

                    const today =
                      new Date();

                    const isToday =
                      day.getFullYear() ===
                        today.getFullYear() &&
                      day.getMonth() ===
                        today.getMonth() &&
                      day.getDate() ===
                        today.getDate();

                    return (
                      <div
                        key={day.toISOString()}
                        className={[
                          "min-h-36 border-b border-r border-slate-200 p-2",
                          isCurrentMonth
                            ? "bg-white"
                            : "bg-slate-50",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                            isToday
                              ? "bg-emerald-600 text-white"
                              : isCurrentMonth
                                ? "text-slate-700"
                                : "text-slate-300",
                          ].join(" ")}
                        >
                          {day.getDate()}
                        </span>

                        <div className="mt-2 space-y-1.5">
                          {dayActivities
                            .slice(0, 4)
                            .map(
                              (
                                activity,
                              ) => (
                                <button
                                  key={
                                    activity.id
                                  }
                                    type="button"
                                    className={[
                                      "block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs font-semibold",
                                      activity.type ===
                                      "task"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : activity.type ===
                                            "call"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-violet-100 text-violet-800",
                                    ].join(
                                      " ",
                                    )}
                                    title={
                                      activity.subject
                                    }
                                    onClick={() =>
                                      openView(
                                        activity,
                                      )
                                    }
                                  >
                                    {
                                      activity.subject
                                    }
                                  </button>
                              ),
                            )}

                          {dayActivities.length >
                            4 && (
                            <p className="px-2 text-xs font-semibold text-slate-500">
                              +
                              {dayActivities.length -
                                4}{" "}
                              más
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {drawer.mode === "view" ? (
        <ActivityDetailDrawer
          isOpen={drawer.isOpen}
          record={drawer.record}
          onClose={() =>
            setDrawer(
              (current) => ({
                ...current,
                isOpen: false,
              }),
            )
          }
          onEdit={() =>
            setDrawer(
              (current) => ({
                ...current,
                mode: "edit",
              }),
            )
          }
        />
      ) : (
        <ActivityFormDrawer
          isOpen={drawer.isOpen}
          mode={drawer.mode}
          type={drawer.type}
          callMode={
            drawer.callMode
          }
          record={drawer.record}
          members={members}
          relatedOptions={
            relatedOptions
          }
          onClose={() =>
            setDrawer(
              (current) => ({
                ...current,
                isOpen: false,
              }),
            )
          }
          onSaved={loadData}
        />
      )}
    </>
  );
}