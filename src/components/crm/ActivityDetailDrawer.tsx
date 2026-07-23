"use client";

import type {
    CRMActivityRecord,
} from "@/types/crm-activities";

type ActivityDetailDrawerProps = {
    isOpen: boolean;

    record:
    | CRMActivityRecord
    | null
    | undefined;

    onClose: () => void;
    onEdit: () => void;
};

function formatDateTime(
    value?: string | null,
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
            dateStyle: "medium",
            timeStyle: "short",
        },
    );
}

function formatDuration(
    seconds?: number | null,
): string {
    if (
        seconds === null ||
        seconds === undefined
    ) {
        return "Sin información";
    }

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;

    return `${minutes} min ${remainingSeconds} s`;
}

function getTypeLabel(
    type:
        CRMActivityRecord["type"],
): string {
    if (type === "task") {
        return "tarea";
    }

    if (type === "call") {
        return "llamada";
    }

    return "reunión";
}

function DetailCard({
    label,
    value,
    accent = false,
}: {
    label: string;
    value:
    | string
    | number
    | null
    | undefined;
    accent?: boolean;
}) {
    const displayValue =
        value === null ||
            value === undefined ||
            value === ""
            ? "Sin información"
            : String(value);

    return (
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {label}
            </p>

            <p
                className={[
                    "mt-3 text-sm font-semibold",
                    accent
                        ? "text-emerald-700"
                        : displayValue ===
                            "Sin información"
                            ? "text-slate-400"
                            : "text-slate-900",
                ].join(" ")}
            >
                {displayValue}
            </p>
        </article>
    );
}

export default function ActivityDetailDrawer({
    isOpen,
    record,
    onClose,
    onEdit,
}: ActivityDetailDrawerProps) {
    if (!isOpen || !record) {
        return null;
    }

    const typeLabel =
        getTypeLabel(record.type);

    const ownerName =
        record.owner.name ??
        record.owner.email ??
        "Sin información";

    const reminder =
        record.reminderEnabled
            ? `${record.reminderMinutesBefore ?? 0} minutos antes`
            : "Sin recordatorio";

    const recurrence =
        record.recurrence
            ?.frequency
            ? record.recurrence.frequency
            : "No se repite";

    return (
        <div className="fixed inset-0 z-[110]">
            <button
                type="button"
                aria-label="Cerrar panel"
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
                onClick={onClose}
            />

            <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-2xl">
                <header className="border-b border-slate-200 px-6 py-5 sm:px-8">
                    <div className="flex items-start justify-between gap-5">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                Detalle de {typeLabel}
                            </p>

                            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                {record.subject}
                            </h2>
                        </div>

                        <button
                            type="button"
                            aria-label="Cerrar"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500"
                            onClick={onClose}
                        >
                            ×
                        </button>
                    </div>
                </header>

                <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                            <h3 className="font-bold text-slate-950">
                                Información general
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Datos principales de la actividad.
                            </p>
                        </header>

                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            <DetailCard
                                label="Estado"
                                value={record.status}
                                accent
                            />

                            <DetailCard
                                label="Prioridad"
                                value={record.priority}
                            />

                            <DetailCard
                                label="Responsable"
                                value={ownerName}
                            />

                            <DetailCard
                                label="Relacionado con"
                                value={
                                    record.relatedName
                                }
                            />
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                            <h3 className="font-bold text-slate-950">
                                Fecha y seguimiento
                            </h3>
                        </header>

                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                            {record.type ===
                                "task" ? (
                                <DetailCard
                                    label="Fecha de vencimiento"
                                    value={formatDateTime(
                                        record.dueAt,
                                    )}
                                />
                            ) : (
                                <>
                                    <DetailCard
                                        label="Inicio"
                                        value={formatDateTime(
                                            record.startAt,
                                        )}
                                    />

                                    <DetailCard
                                        label="Fin"
                                        value={formatDateTime(
                                            record.endAt,
                                        )}
                                    />
                                </>
                            )}

                            <DetailCard
                                label="Todo el día"
                                value={
                                    record.allDay
                                        ? "Sí"
                                        : "No"
                                }
                            />

                            <DetailCard
                                label="Zona horaria"
                                value={record.timezone}
                            />

                            <DetailCard
                                label="Recordatorio"
                                value={reminder}
                            />

                            <DetailCard
                                label="Repetición"
                                value={recurrence}
                            />
                        </div>
                    </section>

                    {record.type === "call" && (
                        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                            <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                                <h3 className="font-bold text-slate-950">
                                    Información de la llamada
                                </h3>
                            </header>

                            <div className="grid gap-4 p-5 sm:grid-cols-2">
                                <DetailCard
                                    label="Modalidad"
                                    value={
                                        record.callMode ===
                                            "logged"
                                            ? "Registrada"
                                            : "Programada"
                                    }
                                />

                                <DetailCard
                                    label="Dirección"
                                    value={
                                        record.callDirection
                                    }
                                />

                                <DetailCard
                                    label="Propósito"
                                    value={
                                        record.callPurpose
                                    }
                                />

                                <DetailCard
                                    label="Resultado"
                                    value={
                                        record.callResult
                                    }
                                />

                                <DetailCard
                                    label="Duración"
                                    value={formatDuration(
                                        record.callDurationSeconds,
                                    )}
                                />

                                <DetailCard
                                    label="Grabación"
                                    value={
                                        record.recordingUrl
                                    }
                                />
                            </div>
                        </section>
                    )}

                    {record.type ===
                        "meeting" && (
                            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                                <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                                    <h3 className="font-bold text-slate-950">
                                        Lugar y participantes
                                    </h3>
                                </header>

                                <div className="grid gap-4 p-5 sm:grid-cols-2">
                                    <DetailCard
                                        label="Tipo de ubicación"
                                        value={
                                            record.meetingLocationType
                                        }
                                    />

                                    <DetailCard
                                        label="Ubicación"
                                        value={record.location}
                                    />

                                    <div className="sm:col-span-2">
                                        <DetailCard
                                            label="Enlace de videollamada"
                                            value={
                                                record.meetingUrl
                                            }
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                            Participantes
                                        </p>

                                        {record.participants.length >
                                            0 ? (
                                            <div className="space-y-2">
                                                {record.participants.map(
                                                    (
                                                        participant,
                                                        index,
                                                    ) => (
                                                        <article
                                                            key={
                                                                participant.id ??
                                                                `${participant.email ?? participant.name}-${index}`
                                                            }
                                                            className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
                                                        >
                                                            <p className="font-semibold text-slate-900">
                                                                {
                                                                    participant.name
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {participant.email ??
                                                                    participant.phone ??
                                                                    "Sin datos de contacto"}
                                                            </p>

                                                            <p className="mt-2 text-xs font-semibold text-emerald-700">
                                                                {
                                                                    participant.responseStatus
                                                                }
                                                            </p>
                                                        </article>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-400">
                                                Sin participantes
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                            <h3 className="font-bold text-slate-950">
                                Descripción
                            </h3>
                        </header>

                        <div className="p-5">
                            <p
                                className={[
                                    "whitespace-pre-wrap text-sm leading-6",
                                    record.description
                                        ? "text-slate-700"
                                        : "text-slate-400",
                                ].join(" ")}
                            >
                                {record.description ??
                                    "Sin información"}
                            </p>
                        </div>
                    </section>
                </div>

                <footer className="border-t border-slate-200 bg-white px-6 py-4">
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                            onClick={onClose}
                        >
                            Cerrar
                        </button>

                        <button
                            type="button"
                            className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg"
                            onClick={onEdit}
                        >
                            Editar
                        </button>
                    </div>
                </footer>
            </aside>
        </div>
    );
}