"use client";

import {
    useEffect,
    useState,
} from "react";

type ScheduleDay = {
    open: string | null;
    close: string | null;
    closed: boolean;
};

type ScheduleException = {
    date: string;
    open: string | null;
    close: string | null;
    closed: boolean;
    reason?: string;
};

type PetStayPolicyResponse = {
    success: boolean;
    error?: string;
    data?: {
        closingTime: string | null;
        weeklySchedule: Record<
            string,
            ScheduleDay
        >;
        scheduleExceptions: ScheduleException[];
        toleranceMinutes: number;
        lowUsagePercent: number;
        boardingIncludesDaycare: boolean;
        timezone: string | null;
    };
};

const dayLabels: Record<
    string,
    string
> = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
};

const dayKeys = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
];

function emptySchedule() {
    return Object.fromEntries(
        dayKeys.map(
            (
                day,
            ) => [
                day,
                {
                    open: "",
                    close: "",
                    closed: false,
                },
            ],
        ),
    ) as Record<
        string,
        {
            open: string;
            close: string;
            closed: boolean;
        }
    >;
}

export default function PetStayPolicyPanel({
    branchId,
    onSaved,
}: {
    branchId: string;
    onSaved: () => Promise<void>;
}) {
    const [
        schedule,
        setSchedule,
    ] =
        useState(
            emptySchedule,
        );

    const [
        exceptions,
        setExceptions,
    ] =
        useState<
            Array<{
                date: string;
                open: string;
                close: string;
                closed: boolean;
                reason: string;
            }>
        >([]);

    const [
        toleranceMinutes,
        setToleranceMinutes,
    ] =
        useState(
            15,
        );

    const [
        percent,
        setPercent,
    ] =
        useState(
            50,
        );

    const [
        includes,
        setIncludes,
    ] =
        useState(
            true,
        );

    const [
        message,
        setMessage,
    ] =
        useState(
            "",
        );

    const [
        ready,
        setReady,
    ] =
        useState(
            false,
        );

    const [
        busy,
        setBusy,
    ] =
        useState(
            false,
        );

    useEffect(
        () => {
            let cancelled =
                false;

            setReady(
                false,
            );

            void fetch(
                `/api/crm/pet-stays/policy?branchId=${encodeURIComponent(branchId)}`,
                {
                    cache:
                        "no-store",
                },
            )
                .then(
                    async (
                        response,
                    ) => {
                        const result =
                            (await response.json()) as PetStayPolicyResponse;

                        if (
                            !response.ok ||
                            !result.success ||
                            !result.data
                        ) {
                            throw new Error(
                                result.error ??
                                    "No fue posible consultar las reglas.",
                            );
                        }

                        if (
                            cancelled
                        ) {
                            return;
                        }

                        const nextSchedule =
                            emptySchedule();

                        for (
                            const day of
                            dayKeys
                        ) {
                            const source =
                                result
                                    .data
                                    .weeklySchedule[
                                    day
                                ];

                            nextSchedule[
                                day
                            ] = {
                                open:
                                    source?.open ??
                                    "",

                                close:
                                    source?.close ??
                                    result
                                        .data
                                        .closingTime ??
                                    "",

                                closed:
                                    source?.closed ??
                                    false,
                            };
                        }

                        setSchedule(
                            nextSchedule,
                        );

                        setExceptions(
                            result.data.scheduleExceptions.map(
                                (
                                    item,
                                ) => ({
                                    date:
                                        item.date,

                                    open:
                                        item.open ??
                                        "",

                                    close:
                                        item.close ??
                                        "",

                                    closed:
                                        item.closed,

                                    reason:
                                        item.reason ??
                                        "",
                                }),
                            ),
                        );

                        setToleranceMinutes(
                            result.data.toleranceMinutes,
                        );

                        setPercent(
                            result.data.lowUsagePercent,
                        );

                        setIncludes(
                            result.data.boardingIncludesDaycare,
                        );

                        setMessage(
                            `Horario de ${result.data.timezone ?? "la sucursal"}.`,
                        );

                        setReady(
                            true,
                        );
                    },
                )
                .catch(
                    (
                        error: unknown,
                    ) => {
                        if (
                            !cancelled
                        ) {
                            setMessage(
                                error instanceof
                                    Error
                                    ? error.message
                                    : "No fue posible consultar las reglas.",
                            );
                        }
                    },
                );

            return () => {
                cancelled =
                    true;
            };
        },
        [
            branchId,
        ],
    );

    function updateDay(
        day: string,
        changes: Partial<{
            open: string;
            close: string;
            closed: boolean;
        }>,
    ) {
        setSchedule(
            (
                current,
            ) => ({
                ...current,

                [day]: {
                    ...current[
                        day
                    ],

                    ...changes,
                },
            }),
        );
    }

    return (
        <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                Reglas de estancia de esta sucursal
            </summary>

            <form
                className="mt-5 space-y-6 text-sm"
                onSubmit={async (
                    event,
                ) => {
                    event.preventDefault();

                    setBusy(
                        true,
                    );

                    try {
                        const response =
                            await fetch(
                                "/api/crm/pet-stays/policy",
                                {
                                    method:
                                        "PATCH",

                                    headers: {
                                        "Content-Type":
                                            "application/json",
                                    },

                                    body:
                                        JSON.stringify(
                                            {
                                                branchId,

                                                weeklySchedule:
                                                    schedule,

                                                scheduleExceptions:
                                                    exceptions,

                                                toleranceMinutes,

                                                lowUsagePercent:
                                                    percent,

                                                boardingIncludesDaycare:
                                                    includes,
                                            },
                                        ),
                                },
                            );

                        const result =
                            (await response.json()) as {
                                success: boolean;
                                error?: string;
                            };

                        if (
                            !response.ok ||
                            !result.success
                        ) {
                            throw new Error(
                                result.error ??
                                    "No se guardaron las reglas.",
                            );
                        }

                        setMessage(
                            "Reglas guardadas. Se aplican también a estancias abiertas.",
                        );

                        await onSaved();
                    } catch (
                        error
                    ) {
                        setMessage(
                            error instanceof
                                Error
                                ? error.message
                                : "No se guardaron las reglas.",
                        );
                    } finally {
                        setBusy(
                            false,
                        );
                    }
                }}
            >
                <section>
                    <div className="mb-3">
                        <h3 className="font-semibold text-slate-800">
                            Horario semanal
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                            Define el horario operativo de esta sucursal para cada día.
                        </p>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[640px] text-left">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">
                                        Día
                                    </th>

                                    <th className="px-4 py-3">
                                        Apertura
                                    </th>

                                    <th className="px-4 py-3">
                                        Cierre
                                    </th>

                                    <th className="px-4 py-3">
                                        Cerrado
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {dayKeys.map(
                                    (
                                        day,
                                    ) => {
                                        const value =
                                            schedule[
                                                day
                                            ];

                                        return (
                                            <tr
                                                key={
                                                    day
                                                }
                                            >
                                                <td className="px-4 py-3 font-medium text-slate-700">
                                                    {
                                                        dayLabels[
                                                            day
                                                        ]
                                                    }
                                                </td>

                                                <td className="px-4 py-3">
                                                    <input
                                                        type="time"
                                                        disabled={
                                                            value.closed
                                                        }
                                                        value={
                                                            value.open
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateDay(
                                                                day,
                                                                {
                                                                    open:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        className="w-full rounded-lg border border-slate-200 p-2 disabled:bg-slate-100"
                                                    />
                                                </td>

                                                <td className="px-4 py-3">
                                                    <input
                                                        type="time"
                                                        disabled={
                                                            value.closed
                                                        }
                                                        value={
                                                            value.close
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateDay(
                                                                day,
                                                                {
                                                                    close:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        className="w-full rounded-lg border border-slate-200 p-2 disabled:bg-slate-100"
                                                    />
                                                </td>

                                                <td className="px-4 py-3">
                                                    <label className="inline-flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                value.closed
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateDay(
                                                                    day,
                                                                    {
                                                                        closed:
                                                                            event
                                                                                .target
                                                                                .checked,
                                                                    },
                                                                )
                                                            }
                                                        />

                                                        <span className="text-xs text-slate-600">
                                                            No abre
                                                        </span>
                                                    </label>
                                                </td>
                                            </tr>
                                        );
                                    },
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-3">
                    <label>
                        Tolerancia después del cierre
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                required
                                type="number"
                                min="0"
                                max="1440"
                                value={
                                    toleranceMinutes
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setToleranceMinutes(
                                        Number(
                                            event
                                                .target
                                                .value,
                                        ),
                                    )
                                }
                                className="block w-full rounded-lg border border-slate-200 p-2"
                            />

                            <span className="text-xs text-slate-500">
                                min
                            </span>
                        </div>
                    </label>

                    <label>
                        Avisar por uso menor o igual a (%)
                        <input
                            required
                            type="number"
                            min="0"
                            max="100"
                            value={
                                percent
                            }
                            onChange={(
                                event,
                            ) =>
                                setPercent(
                                    Number(
                                        event
                                            .target
                                            .value,
                                    ),
                                )
                            }
                            className="mt-1 block w-full rounded-lg border border-slate-200 p-2"
                        />
                    </label>

                    <label>
                        Guardería previa a la primera noche
                        <select
                            value={
                                includes
                                    ? "included"
                                    : "separate"
                            }
                            onChange={(
                                event,
                            ) =>
                                setIncludes(
                                    event
                                        .target
                                        .value ===
                                        "included",
                                )
                            }
                            className="mt-1 block w-full rounded-lg border border-slate-200 p-2"
                        >
                            <option value="included">
                                Incluida en pensión
                            </option>

                            <option value="separate">
                                Cobrar por separado
                            </option>
                        </select>
                    </label>
                </section>

                <section>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-slate-800">
                                Horarios especiales y días festivos
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                                Estas excepciones tienen prioridad sobre el horario semanal.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setExceptions(
                                    (
                                        current,
                                    ) => [
                                        ...current,
                                        {
                                            date: "",
                                            open: "",
                                            close: "",
                                            closed: true,
                                            reason: "",
                                        },
                                    ],
                                )
                            }
                            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Agregar excepción
                        </button>
                    </div>

                    {exceptions.length ===
                    0 ? (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                            No hay horarios especiales configurados.
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {exceptions.map(
                                (
                                    item,
                                    index,
                                ) => (
                                    <div
                                        key={`${index}-${item.date}`}
                                        className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr_1.5fr_auto_auto]"
                                    >
                                        <label>
                                            Fecha
                                            <input
                                                required
                                                type="date"
                                                value={
                                                    item.date
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setExceptions(
                                                        (
                                                            current,
                                                        ) =>
                                                            current.map(
                                                                (
                                                                    value,
                                                                    currentIndex,
                                                                ) =>
                                                                    currentIndex ===
                                                                    index
                                                                        ? {
                                                                              ...value,
                                                                              date:
                                                                                  event
                                                                                      .target
                                                                                      .value,
                                                                          }
                                                                        : value,
                                                            ),
                                                    )
                                                }
                                                className="mt-1 block w-full rounded-lg border border-slate-200 p-2"
                                            />
                                        </label>

                                        <label>
                                            Apertura
                                            <input
                                                type="time"
                                                disabled={
                                                    item.closed
                                                }
                                                value={
                                                    item.open
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setExceptions(
                                                        (
                                                            current,
                                                        ) =>
                                                            current.map(
                                                                (
                                                                    value,
                                                                    currentIndex,
                                                                ) =>
                                                                    currentIndex ===
                                                                    index
                                                                        ? {
                                                                              ...value,
                                                                              open:
                                                                                  event
                                                                                      .target
                                                                                      .value,
                                                                          }
                                                                        : value,
                                                            ),
                                                    )
                                                }
                                                className="mt-1 block w-full rounded-lg border border-slate-200 p-2 disabled:bg-slate-100"
                                            />
                                        </label>

                                        <label>
                                            Cierre
                                            <input
                                                type="time"
                                                disabled={
                                                    item.closed
                                                }
                                                value={
                                                    item.close
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setExceptions(
                                                        (
                                                            current,
                                                        ) =>
                                                            current.map(
                                                                (
                                                                    value,
                                                                    currentIndex,
                                                                ) =>
                                                                    currentIndex ===
                                                                    index
                                                                        ? {
                                                                              ...value,
                                                                              close:
                                                                                  event
                                                                                      .target
                                                                                      .value,
                                                                          }
                                                                        : value,
                                                            ),
                                                    )
                                                }
                                                className="mt-1 block w-full rounded-lg border border-slate-200 p-2 disabled:bg-slate-100"
                                            />
                                        </label>

                                        <label>
                                            Motivo
                                            <input
                                                type="text"
                                                value={
                                                    item.reason
                                                }
                                                placeholder="Ej. Día festivo"
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setExceptions(
                                                        (
                                                            current,
                                                        ) =>
                                                            current.map(
                                                                (
                                                                    value,
                                                                    currentIndex,
                                                                ) =>
                                                                    currentIndex ===
                                                                    index
                                                                        ? {
                                                                              ...value,
                                                                              reason:
                                                                                  event
                                                                                      .target
                                                                                      .value,
                                                                          }
                                                                        : value,
                                                            ),
                                                    )
                                                }
                                                className="mt-1 block w-full rounded-lg border border-slate-200 p-2"
                                            />
                                        </label>

                                        <label className="flex items-center gap-2 self-end pb-2">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    item.closed
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setExceptions(
                                                        (
                                                            current,
                                                        ) =>
                                                            current.map(
                                                                (
                                                                    value,
                                                                    currentIndex,
                                                                ) =>
                                                                    currentIndex ===
                                                                    index
                                                                        ? {
                                                                              ...value,
                                                                              closed:
                                                                                  event
                                                                                      .target
                                                                                      .checked,
                                                                          }
                                                                        : value,
                                                            ),
                                                    )
                                                }
                                            />

                                            <span className="text-xs text-slate-600">
                                                Cerrado
                                            </span>
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExceptions(
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
                                            className="self-end rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </section>

                <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    Una estancia de guardería pasa automáticamente a pensión cuando se supera el cierre efectivo del día más la tolerancia configurada. Los horarios especiales tienen prioridad sobre el horario semanal.
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p
                        role="status"
                        className="text-xs text-slate-600"
                    >
                        {message}
                    </p>

                    <button
                        disabled={
                            !ready ||
                            busy
                        }
                        className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
                    >
                        {busy
                            ? "Guardando…"
                            : "Guardar reglas"}
                    </button>
                </div>
            </form>
        </details>
    );
}