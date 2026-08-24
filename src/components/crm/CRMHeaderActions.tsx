"use client";

import {
    useRouter,
} from "next/navigation";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

type Notification = {
    id: string;
    title: string;
    message: string;

    entityType:
    | "lead"
    | "customer"
    | "deal"
    | "activity"
    | "sales_order"
    | null;

    entityId:
    string | null;

    readAt:
    string | null;

    createdAt: string;
};

type NotificationsResponse = {
    success: boolean;

    data?: {
        notifications:
        Notification[];

        unreadCount: number;
    };

    error?: string;
};

type CRMSettingsAccessResponse = {
    success: boolean;

    data?: {
        canManage?: boolean;
    };

    error?: string;
};

function formatDate(
    value: string,
) {
    return new Intl
        .DateTimeFormat(
            "es-MX",
            {
                dateStyle:
                    "medium",

                timeStyle:
                    "short",
            },
        )
        .format(
            new Date(value),
        );
}

function getEntityRoute(
    entityType:
        Notification[
        "entityType"
        ],
) {
    switch (entityType) {
        case "lead":
            return "/crm/prospectos";

        case "customer":
            return "/crm/clientes";

        case "deal":
            return "/crm/oportunidades";

        case "activity":
            return "/crm/actividades";

        case "sales_order":
            return "/crm/ordenes-de-venta";

        default:
            return null;
    }
}

export default function CRMHeaderActions() {
    const router =
        useRouter();

    const detailsRef =
        useRef<HTMLDetailsElement>(
            null,
        );

    const [
        notifications,
        setNotifications,
    ] = useState<
        Notification[]
    >([]);

    const [
        unreadCount,
        setUnreadCount,
    ] = useState(0);

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
        canManageSettings,
        setCanManageSettings,
    ] = useState(false);

    const loadNotifications =
        useCallback(
            async () => {
                try {
                    const response =
                        await fetch(
                            "/api/crm/notifications",
                            {
                                cache:
                                    "no-store",
                            },
                        );

                    const result =
                        (await response.json()) as
                        NotificationsResponse;

                    if (
                        !response.ok ||
                        !result.success ||
                        !result.data
                    ) {
                        throw new Error(
                            result.error ??
                            "No fue posible cargar las notificaciones.",
                        );
                    }

                    setNotifications(
                        result.data
                            .notifications,
                    );

                    setUnreadCount(
                        result.data
                            .unreadCount,
                    );

                    setError(null);
                } catch (
                loadError
                ) {
                    setError(
                        loadError instanceof
                            Error
                            ? loadError.message
                            : "No fue posible cargar las notificaciones.",
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
        const initialLoadId =
            window.setTimeout(
                () => {
                    void loadNotifications();
                },
                0,
            );

        const intervalId =
            window.setInterval(
                () => {
                    void loadNotifications();
                },
                60_000,
            );

        return () => {
            window.clearTimeout(
                initialLoadId,
            );

            window.clearInterval(
                intervalId,
            );
        };
    }, [
        loadNotifications,
    ]);

    useEffect(() => {
        let isCancelled =
            false;

        async function loadSettingsAccess() {
            try {
                const response =
                    await fetch(
                        "/api/crm/settings/navigation",
                        {
                            cache:
                                "no-store",
                        },
                    );

                const result =
                    (await response.json()) as
                    CRMSettingsAccessResponse;

                if (!isCancelled) {
                    setCanManageSettings(
                        Boolean(
                            response.ok &&
                            result.success &&
                            result.data
                                ?.canManage,
                        ),
                    );
                }
            } catch {
                if (!isCancelled) {
                    setCanManageSettings(
                        false,
                    );
                }
            }
        }

        void loadSettingsAccess();

        return () => {
            isCancelled =
                true;
        };
    }, []);

    async function markAsRead(
        notificationId?:
            string,
    ) {
        const response =
            await fetch(
                "/api/crm/notifications",
                {
                    method:
                        "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body:
                        JSON.stringify({
                            ...(notificationId
                                ? {
                                    id:
                                        notificationId,
                                }
                                : {}),
                        }),
                },
            );

        const result =
            (await response.json()) as
            NotificationsResponse;

        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.error ??
                "No fue posible actualizar las notificaciones.",
            );
        }

        await loadNotifications();
    }

    async function openNotification(
        notification:
            Notification,
    ) {
        try {
            if (
                !notification.readAt
            ) {
                await markAsRead(
                    notification.id,
                );
            }

            detailsRef.current
                ?.removeAttribute(
                    "open",
                );

            const route =
                getEntityRoute(
                    notification.entityType,
                );

            if (route) {
                router.push(
                    route,
                );
            }
        } catch (
        notificationError
        ) {
            setError(
                notificationError instanceof
                    Error
                    ? notificationError.message
                    : "No fue posible abrir la notificación.",
            );
        }
    }

    return (
        <div className="flex items-center gap-2">
            <details
                ref={
                    detailsRef
                }
                className="relative"
            >
                <summary
                    className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    aria-label="Notificaciones"
                    title="Notificaciones"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-5 w-5"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0"
                        />
                    </svg>

                    {unreadCount >
                        0 ? (
                        <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                            {unreadCount >
                                99
                                ? "99+"
                                : unreadCount}
                        </span>
                    ) : null}
                </summary>

                <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-black text-slate-950">
                            Notificaciones
                        </p>

                        {unreadCount >
                            0 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    void markAsRead();
                                }}
                                className="text-xs font-bold text-blue-700 hover:text-blue-800"
                            >
                                Marcar todas como leídas
                            </button>
                        ) : null}
                    </div>

                    <div className="max-h-96 overflow-y-auto p-2">
                        {isLoading ? (
                            <p className="px-3 py-6 text-center text-sm text-slate-500">
                                Cargando...
                            </p>
                        ) : notifications.length ===
                            0 ? (
                            <p className="px-3 py-8 text-center text-sm text-slate-500">
                                No tienes notificaciones.
                            </p>
                        ) : (
                            notifications.map(
                                (
                                    notification,
                                ) => (
                                    <button
                                        key={
                                            notification.id
                                        }
                                        type="button"
                                        onClick={() =>
                                            void openNotification(
                                                notification,
                                            )
                                        }
                                        className={[
                                            "mb-1 w-full rounded-xl px-3 py-3 text-left transition",
                                            notification.readAt
                                                ? "hover:bg-slate-50"
                                                : "bg-blue-50 hover:bg-blue-100",
                                        ].join(" ")}
                                    >
                                        <span className="flex items-start gap-3">
                                            <span
                                                className={[
                                                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                                    notification.readAt
                                                        ? "bg-slate-300"
                                                        : "bg-blue-600",
                                                ].join(" ")}
                                            />

                                            <span className="min-w-0">
                                                <span className="block text-sm font-black text-slate-900">
                                                    {
                                                        notification.title
                                                    }
                                                </span>

                                                <span className="mt-1 block text-sm leading-5 text-slate-600">
                                                    {
                                                        notification.message
                                                    }
                                                </span>

                                                <span className="mt-2 block text-xs font-semibold text-slate-400">
                                                    {formatDate(
                                                        notification.createdAt,
                                                    )}
                                                </span>
                                            </span>
                                        </span>
                                    </button>
                                ),
                            )
                        )}
                    </div>

                    {error ? (
                        <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                            {error}
                        </div>
                    ) : null}
                </div>
            </details>

            {canManageSettings ? (
            <button
                type="button"
                onClick={() =>
                    router.push(
                        "/crm/configuracion",
                    )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                aria-label="Configuración del CRM"
                title="Configuración del CRM"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"
                    />

                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4a1.7 1.7 0 0 0 1-1.6V2h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 6l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"
                    />
                </svg>
            </button>
            ) : null}
        </div>
    );
}