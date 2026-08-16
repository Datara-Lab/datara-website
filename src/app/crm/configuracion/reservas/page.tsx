"use client";

import {
    type FormEvent,
    useCallback,
    useEffect,
    useState,
} from "react";

import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";

type ReservationSettings = {
    manualHours: number;
    qualifiedHours: number;
    proposalHours: number;
    negotiationHours: number;
    depositHours: number;
    maximumHours: number;
    allowExtensions: boolean;
    autoReleaseExpired: boolean;
};

type SettingsResponse = {
    success: boolean;

    data?: {
        settings:
        ReservationSettings;

        canManage: boolean;
    };

    message?: string;
    error?: string;
};

const defaultSettings:
    ReservationSettings = {
    manualHours: 24,
    qualifiedHours: 24,
    proposalHours: 48,
    negotiationHours: 72,
    depositHours: 168,
    maximumHours: 360,
    allowExtensions: true,
    autoReleaseExpired: true,
};

function formatDuration(
    hours: number,
): string {
    if (
        hours % 24 === 0
    ) {
        const days =
            hours / 24;

        return days === 1
            ? "1 día"
            : `${days} días`;
    }

    return hours === 1
        ? "1 hora"
        : `${hours} horas`;
}

export default function ReservationSettingsPage() {
    const [
        settings,
        setSettings,
    ] = useState<
        ReservationSettings
    >({
        ...defaultSettings,
    });

    const [
        canManage,
        setCanManage,
    ] = useState(false);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSaving,
        setIsSaving,
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

    const loadSettings =
        useCallback(async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response =
                    await fetch(
                        "/api/crm/settings/inventory-reservations",
                        {
                            cache: "no-store",
                        },
                    );

                const result =
                    (await response.json()) as
                    SettingsResponse;

                if (
                    !response.ok ||
                    !result.success ||
                    !result.data
                ) {
                    throw new Error(
                        result.error ??
                        "No fue posible cargar la política de reservas.",
                    );
                }

                setSettings(
                    result.data.settings,
                );

                setCanManage(
                    result.data.canManage,
                );
            } catch (loadError) {
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "No fue posible cargar la política de reservas.",
                );
            } finally {
                setIsLoading(false);
            }
        }, []);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    function updateHours(
        key:
            | "manualHours"
            | "qualifiedHours"
            | "proposalHours"
            | "negotiationHours"
            | "depositHours"
            | "maximumHours",

        value: string,
    ) {
        setSettings(
            (current) => ({
                ...current,

                [key]:
                    Number(value),
            }),
        );
    }

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setError(null);
        setMessage(null);

        const hourValues = [
            settings.manualHours,
            settings.qualifiedHours,
            settings.proposalHours,
            settings.negotiationHours,
            settings.depositHours,
            settings.maximumHours,
        ];

        if (
            hourValues.some(
                (hours) =>
                    !Number.isInteger(
                        hours,
                    ) ||
                    hours <= 0,
            )
        ) {
            setError(
                "Todos los plazos deben ser números enteros mayores que cero.",
            );
            return;
        }

        if (
            settings.maximumHours >
            2160
        ) {
            setError(
                "El plazo máximo no puede superar 90 días.",
            );
            return;
        }

        if (
            hourValues
                .slice(0, 5)
                .some(
                    (hours) =>
                        hours >
                        settings.maximumHours,
                )
        ) {
            setError(
                "Ningún plazo puede superar el plazo máximo permitido.",
            );
            return;
        }

        try {
            setIsSaving(true);

            const response =
                await fetch(
                    "/api/crm/settings/inventory-reservations",
                    {
                        method: "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify(
                            settings,
                        ),
                    },
                );

            const result =
                (await response.json()) as
                SettingsResponse;

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.error ??
                    "No fue posible guardar la política de reservas.",
                );
            }

            if (
                result.data?.settings
            ) {
                setSettings(
                    result.data.settings,
                );
            }

            setMessage(
                result.message ??
                "La política de reservas fue actualizada correctamente.",
            );
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "No fue posible guardar la política de reservas.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    const periodFields = [
        {
            key:
                "manualHours" as const,

            label:
                "Reserva manual",

            description:
                "Reservas creadas directamente desde Inventarios.",
        },
        {
            key:
                "qualifiedHours" as const,

            label:
                "Oportunidad calificada",

            description:
                "Cliente validado con intención de compra.",
        },
        {
            key:
                "proposalHours" as const,

            label:
                "Propuesta o cotización",

            description:
                "La propuesta comercial ya fue presentada.",
        },
        {
            key:
                "negotiationHours" as const,

            label:
                "Negociación",

            description:
                "La operación se encuentra en negociación activa.",
        },
        {
            key:
                "depositHours" as const,

            label:
                "Anticipo confirmado",

            description:
                "Existe un pago o compromiso económico del cliente.",
        },
    ];

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Configuración del CRM"
                title="Política de reservas"
                description="Define cuánto tiempo puede permanecer apartado el inventario antes de volver a estar disponible."
                action={
                    <Button
                        href="/crm/configuracion"
                        variant="secondary"
                    >
                        Volver a configuración
                    </Button>
                }
            />

            {message && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 shadow-sm">
                    {message}
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-sm">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="flex min-h-80 items-center justify-center rounded-[28px] border border-slate-200 bg-white">
                    <div className="text-center">
                        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                        <p className="mt-4 text-sm font-semibold text-slate-600">
                            Cargando política de reservas...
                        </p>
                    </div>
                </div>
            ) : (
                <form
                    className="space-y-6"
                    onSubmit={
                        handleSubmit
                    }
                >
                    {!canManage && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
                            Puedes consultar esta política, pero solamente el dueño o un administrador pueden modificarla.
                        </div>
                    )}

                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                            <h2 className="text-lg font-black text-slate-950">
                                Duración por etapa
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Captura los plazos en horas. Datara te mostrará también su equivalente en días.
                            </p>
                        </header>

                        <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
                            {periodFields.map(
                                (field) => (
                                    <label
                                        key={field.key}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                                    >
                                        <span className="font-bold text-slate-900">
                                            {field.label}
                                        </span>

                                        <span className="mt-1 block min-h-10 text-sm leading-5 text-slate-500">
                                            {
                                                field.description
                                            }
                                        </span>

                                        <input
                                            type="number"
                                            min="1"
                                            max={
                                                settings.maximumHours
                                            }
                                            step="1"
                                            disabled={
                                                !canManage
                                            }
                                            value={
                                                settings[
                                                field.key
                                                ]
                                            }
                                            className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                                            onChange={(
                                                event,
                                            ) =>
                                                updateHours(
                                                    field.key,
                                                    event.target
                                                        .value,
                                                )
                                            }
                                        />

                                        <span className="mt-2 block text-xs font-semibold text-blue-700">
                                            {formatDuration(
                                                settings[
                                                field.key
                                                ],
                                            )}
                                        </span>
                                    </label>
                                ),
                            )}
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                            <h2 className="text-lg font-black text-slate-950">
                                Reglas generales
                            </h2>
                        </header>

                        <div className="grid gap-5 p-6 md:grid-cols-2">
                            <label className="rounded-2xl border border-slate-200 p-5">
                                <span className="font-bold text-slate-900">
                                    Plazo máximo permitido
                                </span>

                                <input
                                    type="number"
                                    min="1"
                                    max="2160"
                                    step="1"
                                    disabled={
                                        !canManage
                                    }
                                    value={
                                        settings.maximumHours
                                    }
                                    className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                                    onChange={(
                                        event,
                                    ) =>
                                        updateHours(
                                            "maximumHours",
                                            event.target
                                                .value,
                                        )
                                    }
                                />

                                <span className="mt-2 block text-xs font-semibold text-blue-700">
                                    {formatDuration(
                                        settings.maximumHours,
                                    )}
                                </span>
                            </label>

                            <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        disabled={
                                            !canManage
                                        }
                                        checked={
                                            settings.allowExtensions
                                        }
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                                        onChange={(
                                            event,
                                        ) =>
                                            setSettings(
                                                (current) => ({
                                                    ...current,

                                                    allowExtensions:
                                                        event.target
                                                            .checked,
                                                }),
                                            )
                                        }
                                    />

                                    <span>
                                        <span className="block font-bold text-slate-900">
                                            Permitir extensiones
                                        </span>

                                        <span className="mt-1 block text-sm text-slate-500">
                                            Los usuarios autorizados podrán ampliar una reserva activa sin superar el plazo máximo.
                                        </span>
                                    </span>
                                </label>

                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        disabled={
                                            !canManage
                                        }
                                        checked={
                                            settings.autoReleaseExpired
                                        }
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                                        onChange={(
                                            event,
                                        ) =>
                                            setSettings(
                                                (current) => ({
                                                    ...current,

                                                    autoReleaseExpired:
                                                        event.target
                                                            .checked,
                                                }),
                                            )
                                        }
                                    />

                                    <span>
                                        <span className="block font-bold text-slate-900">
                                            Liberar automáticamente al vencer
                                        </span>

                                        <span className="mt-1 block text-sm text-slate-500">
                                            Las unidades vencidas volverán a estar disponibles sin intervención manual.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </section>

                    {canManage && (
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={isSaving}
                            >
                                {isSaving
                                    ? "Guardando..."
                                    : "Guardar política"}
                            </Button>
                        </div>
                    )}
                </form>
            )}
        </div>
    );
}