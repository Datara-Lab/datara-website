"use client";

import Image from "next/image";
import Link from "next/link";

import {
    useEffect,
    useState,
} from "react";

import {
    getCRMIndustryTemplates,
} from "@/config/crm/industries";

import {
    getDataraProduct,
    isDataraProductKey,
} from "@/config/datara-products";

type SubscriptionStatus =
    | "incomplete"
    | "trialing"
    | "active"
    | "past_due"
    | "paused"
    | "canceled"
    | "unpaid";

type SubscriptionData = {
    id: string;
    provider: string;

    providerSubscriptionId:
        string | null;

    providerScheduleId:
        string | null;

    productKey: string;
    planKey: string;

    billingPeriod:
        | "monthly"
        | "annual";

    catalogItemIds:
        string[];

    pendingBillingPeriod:
        | "monthly"
        | "annual"
        | null;

    pendingCatalogItemIds:
        string[] | null;

    pendingChangeAt:
        string | null;

    status:
        SubscriptionStatus;

    seats: number;
    currency: string;

    currentPeriodStart:
        string | null;

    currentPeriodEnd:
        string | null;

    cancelAtPeriodEnd:
        boolean;

    createdAt: string;
    updatedAt: string;
};

type PurchaseLineItem = {
    catalogItemId: string;
    itemKey: string;
    name: string;
    quantity: number;
    unitAmount: number;
};

type PurchaseData = {
    id: string;
    productKey: string;
    industry: string;
    billingPeriod: string;
    lineItems:
    PurchaseLineItem[];
    currency: string;
    totalAmount: string;
    paidAt:
    string | null;
};

type SubscriptionResponse = {
    success: boolean;

    data?: {
        subscription:
        SubscriptionData | null;

        purchase:
        PurchaseData | null;
    };

    error?: string;
};

type PortalResponse = {
    success: boolean;

    data?: {
        portalUrl: string;
    };

    error?: string;
};

const statusLabels:
    Record<
        SubscriptionStatus,
        string
    > = {
    incomplete:
        "Pago incompleto",

    trialing:
        "Demo activo",

    active:
        "Activa",

    past_due:
        "Pago pendiente",

    paused:
        "Pausada",

    canceled:
        "Cancelada",

    unpaid:
        "Suspendida por pago",
};

const statusClasses:
    Record<
        SubscriptionStatus,
        string
    > = {
    incomplete:
        "border-amber-200 bg-amber-50 text-amber-800",

    trialing:
        "border-blue-200 bg-blue-50 text-blue-700",

    active:
        "border-emerald-200 bg-emerald-50 text-emerald-700",

    past_due:
        "border-amber-200 bg-amber-50 text-amber-800",

    paused:
        "border-slate-200 bg-slate-100 text-slate-700",

    canceled:
        "border-red-200 bg-red-50 text-red-700",

    unpaid:
        "border-red-200 bg-red-50 text-red-700",
};

function formatCurrency(
    amount: string,
    currency: string,
) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency:
                currency.toUpperCase(),
            maximumFractionDigits: 2,
        },
    ).format(
        Number(amount),
    );
}

function formatDate(
    value:
        string | null,
) {
    if (!value) {
        return "No disponible";
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
        },
    ).format(
        new Date(value),
    );
}

export default function SubscriptionPage() {
    const [
        data,
        setData,
    ] = useState<
        SubscriptionResponse["data"]
    >();

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
        isOpeningPortal,
        setIsOpeningPortal,
    ] = useState(false);

    const [
        portalError,
        setPortalError,
    ] = useState<
        string | null
    >(null);

    const [
        isCancelingPlanChange,
        setIsCancelingPlanChange,
    ] = useState(false);

    useEffect(() => {
        let isActive = true;

        async function loadSubscription() {
            try {
                setIsLoading(true);
                setError(null);

                const response =
                    await fetch(
                        "/api/administracion/suscripcion",
                        {
                            cache:
                                "no-store",
                        },
                    );

                const result =
                    (await response.json()) as
                    SubscriptionResponse;

                if (
                    !response.ok ||
                    !result.success ||
                    !result.data
                ) {
                    throw new Error(
                        result.error ??
                        "No fue posible cargar la suscripción.",
                    );
                }

                if (!isActive) {
                    return;
                }

                setData(
                    result.data,
                );
            } catch (
            loadError
            ) {
                if (!isActive) {
                    return;
                }

                setError(
                    loadError instanceof
                        Error
                        ? loadError.message
                        : "No fue posible cargar la suscripción.",
                );
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        }

        void loadSubscription();

        return () => {
            isActive = false;
        };
    }, []);

    async function openBillingPortal() {
        try {
            setIsOpeningPortal(
                true,
            );

            setPortalError(
                null,
            );

            const response =
                await fetch(
                    "/api/administracion/suscripcion/portal",
                    {
                        method:
                            "POST",
                    },
                );

            const result =
                (await response.json()) as
                    PortalResponse;

            if (
                !response.ok ||
                !result.success ||
                !result.data
                    ?.portalUrl
            ) {
                throw new Error(
                    result.error ??
                        "No fue posible abrir el portal de pagos.",
                );
            }

            window.location.assign(
                result.data
                    .portalUrl,
            );
        } catch (
            portalRequestError
        ) {
            setPortalError(
                portalRequestError instanceof
                    Error
                    ? portalRequestError.message
                    : "No fue posible abrir el portal de pagos.",
            );

            setIsOpeningPortal(
                false,
            );
        }
    }

    async function cancelScheduledPlanChange() {
        const confirmed =
            window.confirm(
                "¿Cancelar el cambio programado y conservar el plan actual?",
            );

        if (!confirmed) {
            return;
        }

        try {
            setIsCancelingPlanChange(
                true,
            );

            setPortalError(
                null,
            );

            const response =
                await fetch(
                    "/api/administracion/suscripcion/cambio",
                    {
                        method:
                            "DELETE",
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
                        "No fue posible cancelar el cambio programado.",
                );
            }

            setData(
                (currentData) => {
                    if (
                        !currentData
                            ?.subscription
                    ) {
                        return currentData;
                    }

                    return {
                        ...currentData,

                        subscription: {
                            ...currentData
                                .subscription,

                            providerScheduleId:
                                null,

                            pendingBillingPeriod:
                                null,

                            pendingCatalogItemIds:
                                null,

                            pendingChangeAt:
                                null,
                        },
                    };
                },
            );
        } catch (
            cancellationError
        ) {
            setPortalError(
                cancellationError instanceof
                    Error
                    ? cancellationError
                        .message
                    : "No fue posible cancelar el cambio programado.",
            );
        } finally {
            setIsCancelingPlanChange(
                false,
            );
        }
    }

    const subscription =
        data?.subscription ??
        null;

    const purchase =
        data?.purchase ??
        null;

    const product =
        purchase &&
            isDataraProductKey(
                purchase.productKey,
            )
            ? getDataraProduct(
                purchase.productKey,
            )
            : null;

    const industryName =
        purchase
            ? getCRMIndustryTemplates()
                .find(
                    (template) =>
                        template.id ===
                        purchase.industry,
                )
                ?.name ??
            purchase.industry
            : null;

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
            <div className="mx-auto max-w-6xl">
                <Link
                    href="/administracion"
                    className="text-sm font-bold text-blue-700 hover:text-blue-800"
                >
                    ← Administración
                </Link>

                <div className="mt-6">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                        Datara Workspace
                    </p>

                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        Suscripción y pagos
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Consulta el estado de la contratación, la próxima renovación y los productos activos de tu empresa.
                    </p>
                </div>

                {isLoading ? (
                    <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
                        Cargando suscripción...
                    </div>
                ) : null}

                {error ? (
                    <div className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-8 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                ) : null}

                {!isLoading &&
                    !error &&
                    !subscription ? (
                    <div className="mt-10 rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
                        <h2 className="text-xl font-black text-slate-950">
                            No encontramos una suscripción
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Esta empresa todavía no tiene una contratación o demo registrado.
                        </p>

                        <Link
                            href="/contratar"
                            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                            Contratar Datara
                        </Link>
                    </div>
                ) : null}

                {subscription ? (
                    <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                        <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                        Suscripción actual
                                    </p>

                                    {product ? (
                                        <Image
                                            src={
                                                product.logoPath
                                            }
                                            alt={
                                                product.name
                                            }
                                            width={340}
                                            height={110}
                                            priority
                                            className="mt-3 h-20 max-w-full w-auto object-contain object-left"
                                            />
                                    ) : (
                                        <h2 className="mt-2 text-2xl font-black text-slate-950">
                                        {
                                            subscription.planKey
                                        }
                                        </h2>
                                    )}

                                    {industryName ? (
                                        <p className="mt-2 text-sm font-semibold text-slate-500">
                                            Configuración para{" "}
                                            {industryName}
                                        </p>
                                    ) : null}
                                </div>

                                <span
                                    className={[
                                        "w-fit rounded-full border px-4 py-2 text-xs font-bold",
                                        statusClasses[
                                        subscription.status
                                        ],
                                    ].join(" ")}
                                >
                                    {
                                        statusLabels[
                                        subscription.status
                                        ]
                                    }
                                </span>
                            </div>

                            {subscription.status ===
                                "past_due" ? (
                                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                                    <p className="font-bold text-amber-900">
                                        No fue posible procesar la renovación
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-amber-800">
                                        Stripe volverá a intentar el cobro. Tu empresa conserva temporalmente el acceso durante el periodo de recuperación.
                                    </p>
                                </div>
                            ) : null}

                            {subscription.status ===
                                "unpaid" ||
                                subscription.status ===
                                "canceled" ? (
                                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                                    <p className="font-bold text-red-900">
                                        El acceso al producto está suspendido
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-red-800">
                                        La información de la empresa está conservada. Actualiza el método de pago para recuperar el acceso.
                                    </p>
                                </div>
                            ) : null}

                            <div className="mt-8">
                                <h3 className="text-sm font-black text-slate-950">
                                    Productos y capacidades
                                </h3>

                                <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200">
                                    {purchase?.lineItems
                                        .length ? (
                                        purchase.lineItems.map(
                                            (lineItem) => (
                                                <div
                                                    key={
                                                        lineItem.catalogItemId
                                                    }
                                                    className="flex items-center justify-between gap-4 px-5 py-4"
                                                >
                                                    <span className="text-sm font-semibold text-slate-700">
                                                        {
                                                            lineItem.name
                                                        }
                                                    </span>

                                                    <span className="text-xs font-bold text-slate-500">
                                                        Cantidad{" "}
                                                        {
                                                            lineItem.quantity
                                                        }
                                                    </span>
                                                </div>
                                            ),
                                        )
                                    ) : (
                                        <div className="px-5 py-4 text-sm text-slate-500">
                                            {
                                                subscription.planKey
                                            }
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                Resumen de pago
                            </p>

                            <div className="mt-5 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-sm text-slate-500">
                                        Periodicidad
                                    </span>

                                    <span className="text-sm font-bold text-slate-900">
                                        {purchase
                                            ?.billingPeriod ===
                                            "annual"
                                            ? "Anual"
                                            : purchase
                                                ?.billingPeriod ===
                                                "monthly"
                                                ? "Mensual"
                                                : subscription
                                                    .provider ===
                                                    "datara"
                                                    ? "Demo"
                                                    : "No disponible"}
                                    </span>
                                </div>

                                <div className="flex items-start justify-between gap-4 border-t border-slate-200 pt-4">
                                    <span className="text-sm text-slate-500">
                                        Usuarios
                                    </span>

                                    <span className="text-sm font-bold text-slate-900">
                                        {
                                            subscription.seats
                                        }
                                    </span>
                                </div>

                                <div className="flex items-start justify-between gap-4 border-t border-slate-200 pt-4">
                                    <span className="text-sm text-slate-500">
                                        Próxima renovación
                                    </span>

                                    <span className="text-right text-sm font-bold text-slate-900">
                                        {formatDate(
                                            subscription
                                                .currentPeriodEnd,
                                        )}
                                    </span>
                                </div>

                                {purchase ? (
                                    <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-4">
                                        <span className="text-sm text-slate-500">
                                            Total
                                        </span>

                                        <div className="text-right">
                                            <p className="text-xl font-black text-slate-950">
                                                {formatCurrency(
                                                    purchase.totalAmount,
                                                    purchase.currency,
                                                )}
                                            </p>

                                            <p className="mt-1 text-xs font-bold text-slate-500">
                                                {purchase.currency.toUpperCase()} · IVA incluido
                                            </p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            {subscription
                                .pendingBillingPeriod &&
                            subscription
                                .pendingCatalogItemIds &&
                            subscription
                                .pendingChangeAt ? (
                                <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-900">
                                    <p className="font-black">
                                        Cambio de plan programado
                                    </p>

                                    <p className="mt-1">
                                        Se aplicará el{" "}
                                        {new Intl.DateTimeFormat(
                                            "es-MX",
                                            {
                                                day:
                                                    "numeric",

                                                month:
                                                    "long",

                                                year:
                                                    "numeric",

                                                hour:
                                                    "numeric",

                                                minute:
                                                    "2-digit",
                                            },
                                        ).format(
                                            new Date(
                                                subscription
                                                    .pendingChangeAt,
                                            ),
                                        )}
                                        .
                                    </p>

                                    <p className="mt-1 text-xs font-semibold text-blue-700">
                                        Nueva facturación:{" "}
                                        {subscription
                                            .pendingBillingPeriod ===
                                        "annual"
                                            ? "anual"
                                            : "mensual"}
                                        {" · "}
                                        {
                                            subscription
                                                .pendingCatalogItemIds
                                                .length
                                        }{" "}
                                        opciones comerciales
                                    </p>

                                    <button
                                        type="button"
                                        disabled={
                                            isCancelingPlanChange
                                        }
                                        onClick={() =>
                                            void cancelScheduledPlanChange()
                                        }
                                        className="mt-4 flex w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isCancelingPlanChange
                                            ? "Cancelando cambio..."
                                            : "Cancelar cambio programado"}
                                    </button>
                                </div>
                            ) : null}

                            {subscription
                                .cancelAtPeriodEnd ? (
                                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
                                    La suscripción se cancelará al terminar el periodo actual.
                                </div>
                            ) : null}

                            {portalError ? (
                                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
                                    {
                                        portalError
                                    }
                                </div>
                            ) : null}

                                                        {subscription.provider ===
                                "stripe" &&
                            purchase ? (
                                <Link
                                    href={`/contratar?purchase=subscription_change&industry=${encodeURIComponent(
                                        purchase.industry,
                                    )}`}
className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-bold !text-white shadow-sm transition hover:from-blue-700 hover:to-cyan-600 hover:!text-white"
                                >
                                    {subscription
                                        .pendingChangeAt
                                        ? "Modificar cambio programado"
                                        : "Cambiar plan"}
                                </Link>
                            ) : null}


                            {subscription.provider ===
                                "stripe" ? (
                                <button
                                    type="button"
                                    disabled={
                                        isOpeningPortal
                                    }
                                    onClick={() =>
                                        void openBillingPortal()
                                    }
                                    className="mt-6 flex w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isOpeningPortal
                                        ? "Abriendo Stripe..."
                                        : "Administrar pago y suscripción"}
                                </button>
                            ) : null}

                            <p className="mt-4 text-xs leading-5 text-slate-500">
                                Los pagos recurrentes son procesados de forma segura por Stripe.
                            </p>
                        </aside>
                    </div>
                ) : null}
            </div>
        </main>
    );
}