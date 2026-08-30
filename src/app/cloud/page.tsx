"use client";

import Image from "next/image";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";

type CloudItemType =
    | "server"
    | "service"
    | "addon";

type CloudBillingMode =
    | "monthly"
    | "annual"
    | "one_time";

type CloudCatalogItem = {
    id: string;
    itemKey: string;
    itemType: CloudItemType;
    billingMode: CloudBillingMode;

    name: string;
    description: string | null;

    monthlyPrice: string;
    annualPrice: string;
    oneTimePrice: string;
    currency: string;

    vcpu: number;
    ramGb: string;
    storageGb: string;
    transferTb: string;

    serviceCategory: string | null;

    features: string[];

    recommended: boolean;
    requiresQuote: boolean;
    sortOrder: number;
};

type CloudCatalogResponse = {
    success: boolean;

    data?: {
        items?: CloudCatalogItem[];
    };

    error?: string;
};

const serviceCategoryLabels:
    Record<string, string> = {
    migration: "Migración",
    installation: "Instalación",
    configuration: "Configuración",
    recovery: "Recuperación",
    management: "Administración",
    support: "Soporte",
    implementation: "Implementación",
    security: "Seguridad",
    backup: "Respaldo",
};

function formatMoney(
    value: string,
    currency: string,
) {
    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return value;
    }

    try {
        return new Intl.NumberFormat(
            "es-MX",
            {
                style: "currency",
                currency:
                    currency.toUpperCase(),
                maximumFractionDigits: 0,
            },
        ).format(number);
    } catch {
        return `${currency.toUpperCase()} ${number.toFixed(
            0,
        )}`;
    }
}

function getPrice(
    item: CloudCatalogItem,
) {
    if (item.requiresQuote) {
        return {
            price:
                "Cotización personalizada",
            suffix: null,
        };
    }

    if (
        item.billingMode ===
        "annual"
    ) {
        return {
            price: formatMoney(
                item.annualPrice,
                item.currency,
            ),
            suffix: "/ año",
        };
    }

    if (
        item.billingMode ===
        "one_time"
    ) {
        return {
            price: formatMoney(
                item.oneTimePrice,
                item.currency,
            ),
            suffix: "pago único",
        };
    }

    return {
        price: formatMoney(
            item.monthlyPrice,
            item.currency,
        ),
        suffix: "/ mes",
    };
}

function hasPositiveValue(
    value: string,
) {
    const number =
        Number(value);

    return (
        Number.isFinite(number) &&
        number > 0
    );
}

function normalizeFeature(
    feature: string,
) {
    return feature
        .trim()
        .toLowerCase();
}

function ServerSpec({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon:
        | "cpu"
        | "ram"
        | "storage"
        | "transfer";
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {icon ===
                    "cpu" && (
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                    >
                        <rect
                            x="7"
                            y="7"
                            width="10"
                            height="10"
                            rx="2"
                        />

                        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />

                        <rect
                            x="10"
                            y="10"
                            width="4"
                            height="4"
                            rx="0.5"
                        />
                    </svg>
                )}

                {icon ===
                    "ram" && (
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                    >
                        <rect
                            x="3"
                            y="7"
                            width="18"
                            height="10"
                            rx="2"
                        />

                        <path d="M7 10v4M11 10v4M15 10v4M19 10v4M6 17v3M18 17v3" />
                    </svg>
                )}

                {icon ===
                    "storage" && (
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                    >
                        <ellipse
                            cx="12"
                            cy="5"
                            rx="8"
                            ry="3"
                        />

                        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />

                        <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
                    </svg>
                )}

                {icon ===
                    "transfer" && (
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                    >
                        <path d="M7 7h11M15 4l3 3-3 3" />

                        <path d="M17 17H6M9 14l-3 3 3 3" />
                    </svg>
                )}
            </div>

            <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400">
                    {label}
                </p>

                <p className="mt-0.5 text-sm font-black text-slate-900">
                    {value}
                </p>
            </div>
        </div>
    );
}

function ServerCard({
    item,
    commonFeatures,
    onSelect,
}: {
    item: CloudCatalogItem;
    commonFeatures: string[];
    onSelect: () => void;
}) {
    const {
        price,
        suffix,
    } = getPrice(item);

    const commonFeatureSet =
        new Set(
            commonFeatures.map(
                normalizeFeature,
            ),
        );

    const uniqueFeatures =
        item.features.filter(
            (feature) =>
                !commonFeatureSet.has(
                    normalizeFeature(
                        feature,
                    ),
                ),
        );

    return (
        <article
            className={[
                "group relative flex h-full flex-col overflow-hidden rounded-[28px] border bg-white transition-all duration-300",
                item.recommended
                    ? "border-cyan-300 shadow-[0_24px_60px_-38px_rgba(6,182,212,0.45)]"
                    : "border-slate-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_55px_-38px_rgba(37,99,235,0.20)]",
            ].join(
                " ",
            )}
        >
            {item.recommended && (
                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white">
                    Recomendado
                </div>
            )}

            <div className="flex flex-1 flex-col p-7">
                <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                            Datara Cloud
                        </p>

                        <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
                            {item.name}
                        </h3>
                    </div>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="h-5 w-5"
                        >
                            <rect
                                x="4"
                                y="3"
                                width="16"
                                height="7"
                                rx="2"
                            />

                            <rect
                                x="4"
                                y="14"
                                width="16"
                                height="7"
                                rx="2"
                            />

                            <path d="M8 6.5h.01M8 17.5h.01M12 6.5h5M12 17.5h5" />
                        </svg>
                    </div>
                </div>

                {item.description && (
                    <p className="mt-5 min-h-[72px] text-sm leading-6 text-slate-500">
                        {item.description}
                    </p>
                )}

                <div className="mt-7">
                    {item.requiresQuote ? (
                        <>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Precio
                            </p>

                            <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                                {price}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Desde
                            </p>

                            <div className="mt-2 flex items-end gap-2">
                                <span className="text-[42px] font-black leading-none tracking-[-0.055em] text-slate-950">
                                    {price}
                                </span>

                                {suffix && (
                                    <span className="pb-1 text-sm font-semibold text-slate-400">
                                        {suffix}
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="my-7 h-px bg-slate-100" />

                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                    {item.vcpu >
                        0 && (
                        <ServerSpec
                            label="Procesador"
                            value={`${item.vcpu} vCPU`}
                            icon="cpu"
                        />
                    )}

                    {hasPositiveValue(
                        item.ramGb,
                    ) && (
                        <ServerSpec
                            label="Memoria"
                            value={`${item.ramGb} GB RAM`}
                            icon="ram"
                        />
                    )}

                    {hasPositiveValue(
                        item.storageGb,
                    ) && (
                        <ServerSpec
                            label="Almacenamiento"
                            value={`${item.storageGb} GB`}
                            icon="storage"
                        />
                    )}

                    {hasPositiveValue(
                        item.transferTb,
                    ) && (
                        <ServerSpec
                            label="Transferencia"
                            value={`${item.transferTb} TB`}
                            icon="transfer"
                        />
                    )}
                </div>

                {uniqueFeatures.length >
                    0 && (
                    <>
                        <div className="my-7 h-px bg-slate-100" />

                        <div>
                            <p className="mb-4 text-xs font-bold text-slate-400">
                                Incluye además
                            </p>

                            <div className="space-y-3">
                                {uniqueFeatures.map(
                                    (
                                        feature,
                                    ) => (
                                        <div
                                            key={
                                                feature
                                            }
                                            className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600"
                                        >
                                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    className="h-3 w-3"
                                                >
                                                    <path d="m5 10 3 3 7-7" />
                                                </svg>
                                            </div>

                                            <span>
                                                {
                                                    feature
                                                }
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className="mt-auto pt-8">
                    <button
                        type="button"
                        onClick={
                            onSelect
                        }
                        className={[
                            "inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition-all duration-200",
                            item.recommended
                                ? "bg-gradient-to-r from-blue-600 to-cyan-500 !text-white shadow-[0_12px_28px_-16px_rgba(6,182,212,0.65)] hover:-translate-y-0.5 hover:!text-white"
                                : "border border-slate-200 bg-white text-slate-900 hover:border-blue-500 hover:text-blue-600",
                        ].join(
                            " ",
                        )}
                    >
                        {item.requiresQuote
                            ? "Solicitar cotización"
                            : "Seleccionar servidor"}

                        <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="ml-2 h-4 w-4"
                        >
                            <path d="M4 10h12M12 6l4 4-4 4" />
                        </svg>
                    </button>
                </div>
            </div>
        </article>
    );
}

function ServiceCard({
    item,
    onSelect,
}: {
    item: CloudCatalogItem;
    onSelect: () => void;
}) {
    const {
        price,
        suffix,
    } = getPrice(item);

    return (
        <article className="group flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_24px_60px_-38px_rgba(6,182,212,0.28)]">
            <div>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        {item.serviceCategory && (
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-600">
                                {serviceCategoryLabels[
                                    item.serviceCategory
                                ] ??
                                    item.serviceCategory}
                            </p>
                        )}

                        <h3 className="mt-2 h-[48px] overflow-hidden text-xl font-black leading-6 tracking-[-0.025em] text-slate-950">
                            {item.name}
                        </h3>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 text-cyan-600 transition duration-300 group-hover:scale-105">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-5 w-5"
                        >
                            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />

                            <circle
                                cx="12"
                                cy="12"
                                r="5"
                            />

                            <path d="m5.6 5.6 2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                        </svg>
                    </div>
                </div>

                {item.description && (
                    <p className="mt-4 h-[96px] overflow-hidden text-sm leading-6 text-slate-500">
                        {item.description}
                    </p>
                )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold text-slate-400">
                    {item.requiresQuote
                        ? "Precio"
                        : "Desde"}
                </p>

                <div className="mt-1 flex h-[58px] items-start">
                    {item.requiresQuote ? (
                        <p className="text-2xl font-black leading-7 tracking-[-0.035em] text-slate-950">
                            {price}
                        </p>
                    ) : (
                        <div className="flex flex-wrap items-end gap-2">
                            <span className="text-3xl font-black leading-9 tracking-[-0.045em] text-slate-950">
                                {price}
                            </span>

                            {suffix && (
                                <span className="pb-1 text-sm font-semibold text-slate-400">
                                    {suffix}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {item.features.length >
                0 && (
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                    {item.features.map(
                        (
                            feature,
                        ) => (
                            <div
                                key={
                                    feature
                                }
                                className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600"
                            >
                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="h-3 w-3"
                                    >
                                        <path d="m5 10 3 3 7-7" />
                                    </svg>
                                </div>

                                <span>
                                    {
                                        feature
                                    }
                                </span>
                            </div>
                        ),
                    )}
                </div>
            )}

            <div className="mt-auto pt-7">
                <button
                    type="button"
                    onClick={
                        onSelect
                    }
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-50/40 hover:text-cyan-700"
                >
                    {item.requiresQuote
                        ? "Solicitar cotización"
                        : "Me interesa"}

                    <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="ml-2 h-4 w-4"
                    >
                        <path d="M4 10h12M12 6l4 4-4 4" />
                    </svg>
                </button>
            </div>
        </article>
    );
}

function AddonCard({
    item,
}: {
    item: CloudCatalogItem;
}) {
    const {
        price,
        suffix,
    } = getPrice(item);

    return (
        <article className="group flex h-full flex-col rounded-[20px] border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_50px_-34px_rgba(37,99,235,0.20)]">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                        Complemento
                    </p>

                    <h3 className="mt-2 text-lg font-black tracking-[-0.02em] text-slate-950">
                        {item.name}
                    </h3>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                    >
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </div>
            </div>

            {item.description && (
                <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-500">
                    {item.description}
                </p>
            )}

            <div className="mt-5 border-t border-slate-100 pt-5">
                {item.requiresQuote ? (
                    <p className="text-xl font-black tracking-tight text-slate-950">
                        {price}
                    </p>
                ) : (
                    <div className="flex flex-wrap items-end gap-2">
                        <span className="text-2xl font-black tracking-[-0.035em] text-slate-950">
                            {price}
                        </span>

                        {suffix && (
                            <span className="pb-0.5 text-sm font-semibold text-slate-400">
                                {suffix}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {item.features.length >
                0 && (
                <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
                    {item.features.map(
                        (
                            feature,
                        ) => (
                            <div
                                key={
                                    feature
                                }
                                className="flex items-start gap-2.5 text-sm leading-5 text-slate-600"
                            >
                                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />

                                <span>
                                    {
                                        feature
                                    }
                                </span>
                            </div>
                        ),
                    )}
                </div>
            )}

            <div className="mt-auto pt-6">
                <Link
                    href="/#contacto"
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-800 transition hover:border-blue-500 hover:text-blue-600"
                >
                    {item.requiresQuote
                        ? "Solicitar cotización"
                        : "Agregar"}
                </Link>
            </div>
        </article>
    );
}

export default function CloudPage() {
    const [
        items,
        setItems,
    ] = useState<
        CloudCatalogItem[]
    >([]);

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
        selectedItem,
        setSelectedItem,
    ] = useState<
        CloudCatalogItem | null
    >(null);

    const [
        checkoutForm,
        setCheckoutForm,
    ] = useState({
        firstName:
            "",
        lastName:
            "",
        email:
            "",
        phone:
            "",
        company:
            "",
    });

    const [
        isSubmittingCheckout,
        setIsSubmittingCheckout,
    ] = useState(false);

    const [
        checkoutError,
        setCheckoutError,
    ] = useState<
        string | null
    >(null);

    const [
        quoteSubmitted,
        setQuoteSubmitted,
    ] = useState(false);

    async function handleCheckoutSubmit(
        event:
            React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!selectedItem) {
            return;
        }

        setIsSubmittingCheckout(
            true,
        );

        setCheckoutError(
            null,
        );

        try {
            const response =
                await fetch(
                    "/api/cloud/checkout/session",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                catalogItemId:
                                    selectedItem.id,

                                firstName:
                                    checkoutForm.firstName,

                                lastName:
                                    checkoutForm.lastName,

                                email:
                                    checkoutForm.email,

                                phone:
                                    checkoutForm.phone,

                                company:
                                    checkoutForm.company,
                            }),
                    },
                );

            const result =
                (await response.json()) as {
                    success:
                        boolean;

                    error?:
                        string;

                    data?: {
                        action?:
                            "checkout" |
                            "quote";

                        checkoutUrl?:
                            string | null;
                    };
                };

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.error ??
                        "No fue posible procesar tu solicitud.",
                );
            }

            if (
                result.data?.action ===
                    "checkout" &&
                result.data.checkoutUrl
            ) {
                window.location.href =
                    result.data.checkoutUrl;

                return;
            }

            if (
                result.data?.action ===
                "quote"
            ) {
                setSelectedItem(
                    null,
                );

                setQuoteSubmitted(
                    true,
                );

                return;
            }

            throw new Error(
                "La respuesta del servidor no es válida.",
            );
        } catch (error) {
            setCheckoutError(
                error instanceof Error
                    ? error.message
                    : "No fue posible procesar tu solicitud.",
            );
        } finally {
            setIsSubmittingCheckout(
                false,
            );
        }
    }

    useEffect(() => {
        let cancelled =
            false;

        async function loadCatalog() {
            try {
                setIsLoading(true);
                setError(null);

                const response =
                    await fetch(
                        "/api/public/cloud/catalog",
                        {
                            cache:
                                "no-store",
                        },
                    );

                const result =
                    (await response.json()) as
                        CloudCatalogResponse;

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.error ??
                            "No fue posible cargar el catálogo.",
                    );
                }

                if (!cancelled) {
                    setItems(
                        result.data
                            ?.items ??
                            [],
                    );
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof
                            Error
                            ? loadError.message
                            : "No fue posible cargar el catálogo.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(
                        false,
                    );
                }
            }
        }

        void loadCatalog();

        return () => {
            cancelled =
                true;
        };
    }, []);

    const servers =
        useMemo(
            () =>
                items.filter(
                    (item) =>
                        item.itemType ===
                        "server",
                ),
            [items],
        );

    const services =
        useMemo(
            () =>
                items.filter(
                    (item) =>
                        item.itemType ===
                        "service",
                ),
            [items],
        );

    const addons =
        useMemo(
            () =>
                items.filter(
                    (item) =>
                        item.itemType ===
                        "addon",
                ),
            [items],
        );

    const commonServerFeatures =
        useMemo(() => {
            if (
                servers.length ===
                0
            ) {
                return [];
            }

            const firstServerFeatures =
                servers[0].features;

            return firstServerFeatures.filter(
                (feature) => {
                    const normalized =
                        normalizeFeature(
                            feature,
                        );

                    return servers.every(
                        (server) =>
                            server.features.some(
                                (
                                    serverFeature,
                                ) =>
                                    normalizeFeature(
                                        serverFeature,
                                    ) ===
                                    normalized,
                            ),
                    );
                },
            );
        }, [servers]);

    return (
        <main className="min-h-screen bg-white text-slate-950">
            <section className="border-b border-slate-100 bg-white">
                <div className="mx-auto max-w-7xl px-6 pb-10 pt-10 lg:px-8 lg:pb-12 lg:pt-12">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                        <Link
                            href="/"
                            className="transition hover:text-blue-600"
                        >
                            Inicio
                        </Link>

                        <span>/</span>

                        <span className="text-slate-600">
                            Datara Cloud
                        </span>
                    </div>

                    <div className="relative mt-8 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
                        <div className="max-w-3xl">
                            <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-600">
                                Datara Cloud
                            </p>

                            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
                                Infraestructura
                                simple. Potencia
                                cuando la necesitas.
                            </h1>

                            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
                                Servidores y
                                servicios Cloud
                                administrados por
                                Datara para que tú te
                                concentres en tu
                                negocio.
                            </p>
                        </div>

                        <div className="absolute -top-10 right-0 z-20 lg:relative lg:right-auto lg:top-auto lg:flex lg:min-h-[300px] lg:items-center lg:justify-end">
                            <div className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/20 via-cyan-400/15 to-transparent blur-2xl lg:h-72 lg:w-72 lg:blur-3xl" />

                            <Image
                                src="/logos/cloud-icon-transparent.png"
                                alt="Datara Cloud"
                                width={520}
                                height={520}
                                priority
                                className="datara-cloud-float relative z-10 h-auto w-20 object-contain drop-shadow-[0_14px_24px_rgba(37,99,235,0.2)] sm:w-24 lg:w-[430px] lg:drop-shadow-[0_28px_38px_rgba(37,99,235,0.22)]"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section
                id="catalogo"
                className="bg-slate-50/60"
            >
                <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
                    {isLoading && (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({
                                length: 6,
                            }).map(
                                (
                                    _,
                                    index,
                                ) => (
                                    <div
                                        key={
                                            index
                                        }
                                        className="h-[420px] animate-pulse rounded-3xl border border-slate-200 bg-white"
                                    />
                                ),
                            )}
                        </div>
                    )}

                    {!isLoading &&
                        error && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-700">
                                {error}
                            </div>
                        )}

                    {!isLoading &&
                        !error &&
                        items.length ===
                            0 && (
                            <div className="rounded-3xl border border-slate-200 bg-white px-8 py-14 text-center">
                                <h2 className="text-xl font-black text-slate-950">
                                    No hay
                                    productos
                                    disponibles.
                                </h2>
                            </div>
                        )}

                    {!isLoading &&
                        !error &&
                        servers.length >
                            0 && (
                            <section>
                                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">
                                            Infraestructura
                                        </p>

                                        <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-slate-950">
                                            Servidores
                                            Cloud
                                        </h2>
                                    </div>

                                    <p className="max-w-md text-sm leading-6 text-slate-500">
                                        Elige la
                                        capacidad
                                        adecuada
                                        para tu
                                        aplicación,
                                        plataforma
                                        o sistema.
                                    </p>
                                </div>

                                <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {servers.map(
                                        (
                                            item,
                                        ) => (
                                            <ServerCard
                                                key={
                                                    item.id
                                                }
                                                item={
                                                    item
                                                }
                                                commonFeatures={
                                                    commonServerFeatures
                                                }
                                                onSelect={() =>
                                                    setSelectedItem(
                                                        item,
                                                    )
                                                }
                                            />
                                        ),
                                    )}
                                </div>

                                {commonServerFeatures.length >
                                    0 && (
                                    <div className="relative mt-8 overflow-hidden rounded-[24px] border border-blue-100 bg-white px-7 py-7 shadow-[0_18px_50px_-40px_rgba(37,99,235,0.25)] lg:px-8">
                                        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

                                        <div className="relative grid gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600">
                                                    Administrado
                                                    por Datara
                                                </p>

                                                <h3 className="mt-2 min-h-[48px] text-xl font-black leading-6 tracking-[-0.025em] text-slate-950">
                                                    Mucho más
                                                    que un
                                                    servidor.
                                                </h3>

                                                <p className="mt-3 text-sm leading-6 text-slate-500">
                                                    Todos los
                                                    servidores
                                                    Datara Cloud
                                                    incluyen la
                                                    infraestructura
                                                    y operación
                                                    necesaria para
                                                    mantener tu
                                                    servicio
                                                    funcionando.
                                                </p>
                                            </div>

                                            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                                                {commonServerFeatures.map(
                                                    (
                                                        feature,
                                                    ) => (
                                                        <div
                                                            key={
                                                                feature
                                                            }
                                                            className="flex items-center gap-3"
                                                        >
                                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 text-cyan-600">
                                                                <svg
                                                                    viewBox="0 0 20 20"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    className="h-4 w-4"
                                                                >
                                                                    <path d="m5 10 3 3 7-7" />
                                                                </svg>
                                                            </span>

                                                            <span className="text-sm font-semibold leading-5 text-slate-700">
                                                                {
                                                                    feature
                                                                }
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                    {!isLoading &&
                        !error &&
                        services.length >
                            0 && (
                            <section className="mt-20">
                                <div className="mb-8 max-w-2xl">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">
                                        Servicios
                                    </p>

                                    <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-slate-950">
                                        Servicios
                                        Cloud
                                    </h2>
                                </div>

                                <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
                                    {services.map(
                                        (
                                            item,
                                        ) => (
                                            <ServiceCard
                                                key={
                                                    item.id
                                                }
                                                item={
                                                    item
                                                }
                                                onSelect={() =>
                                                    setSelectedItem(
                                                        item,
                                                    )
                                                }
                                            />
                                        ),
                                    )}
                                </div>
                            </section>
                        )}

                    {!isLoading &&
                        !error &&
                        addons.length >
                            0 && (
                            <section className="mt-20">
                                <div className="mb-8 max-w-2xl">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">
                                        Complementos
                                    </p>

                                    <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-slate-950">
                                        Amplía tu
                                        infraestructura
                                    </h2>
                                </div>

                                <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {addons.map(
                                        (
                                            item,
                                        ) => (
                                            <AddonCard
                                                key={
                                                    item.id
                                                }
                                                item={
                                                    item
                                                }
                                            />
                                        ),
                                    )}
                                </div>
                            </section>
                        )}
                </div>
            </section>

            {!isLoading &&
                !error &&
                items.length >
                    0 && (
                    <section className="border-t border-slate-100 bg-white">
                        <div className="mx-auto max-w-7xl px-6 pb-16 pt-8 lg:px-8 lg:pb-16 lg:pt-6">
                            <div className="relative overflow-hidden rounded-[30px] bg-slate-950 px-8 py-10 sm:px-10 lg:px-12 lg:py-12">
                                <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

                                <div className="pointer-events-none absolute -bottom-24 left-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

                                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="max-w-2xl">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-400">
                                            Infraestructura
                                            a tu medida
                                        </p>

                                        <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl lg:text-[34px]">
                                            Si tu operación
                                            necesita algo
                                            diferente,
                                            lo diseñamos contigo.
                                        </h2>

                                        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                                            Podemos preparar
                                            una configuración
                                            personalizada de
                                            capacidad, servicios,
                                            respaldos,
                                            seguridad y soporte
                                            según las necesidades
                                            de tu operación.
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                                        <Link
                                            href="/#contacto"
                                            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-black !text-white shadow-[0_14px_32px_-18px_rgba(6,182,212,0.75)] transition hover:-translate-y-0.5 hover:!text-white"
                                        >
                                            Diseñar mi solución

                                            <svg
                                                viewBox="0 0 20 20"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="ml-2 h-4 w-4"
                                            >
                                                <path d="M4 10h12M12 6l4 4-4 4" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

            {quoteSubmitted && (
                <div className="fixed bottom-6 right-6 z-50 w-[calc(100%-3rem)] max-w-md">
                    <div className="rounded-[24px] border border-emerald-200 bg-white p-5 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)]">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-5 w-5"
                                >
                                    <path d="m5 10 3 3 7-7" />
                                </svg>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="font-black text-slate-950">
                                    Solicitud enviada
                                </p>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Recibimos tu solicitud de
                                    cotización. Nuestro equipo
                                    dará seguimiento con los
                                    datos que registraste.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setQuoteSubmitted(
                                        false,
                                    )
                                }
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Cerrar confirmación"
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-4 w-4"
                                >
                                    <path d="M5 5l10 10M15 5 5 15" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
                    <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_30px_100px_-30px_rgba(15,23,42,0.45)]">
                        <button
                            type="button"
                            onClick={() => {
                                if (
                                    isSubmittingCheckout
                                ) {
                                    return;
                                }

                                setSelectedItem(
                                    null,
                                );

                                setCheckoutError(
                                    null,
                                );
                            }}
                            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                            aria-label="Cerrar"
                        >
                            <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-4 w-4"
                            >
                                <path d="M5 5l10 10M15 5 5 15" />
                            </svg>
                        </button>

                        <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-7 pb-6 pt-7 sm:px-8">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-600">
                                Datara Cloud
                            </p>

                            <h2 className="mt-2 pr-12 text-2xl font-black tracking-[-0.03em] text-slate-950">
                                {selectedItem.requiresQuote
                                    ? "Solicitar cotización"
                                    : "Continuar con la contratación"}
                            </h2>

                            <div className="mt-5 rounded-2xl border border-blue-100 bg-white/80 px-5 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-black text-slate-950">
                                            {
                                                selectedItem.name
                                            }
                                        </p>

                                        {selectedItem.description && (
                                            <p className="mt-1 text-sm leading-5 text-slate-500">
                                                {
                                                    selectedItem.description
                                                }
                                            </p>
                                        )}
                                    </div>

                                    {!selectedItem.requiresQuote && (
                                        <div className="shrink-0 text-right">
                                            <p className="text-lg font-black text-slate-950">
                                                {
                                                    getPrice(
                                                        selectedItem,
                                                    ).price
                                                }
                                            </p>

                                            <p className="text-xs font-semibold text-slate-400">
                                                {
                                                    getPrice(
                                                        selectedItem,
                                                    ).suffix
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <form
                            onSubmit={
                                handleCheckoutSubmit
                            }
                            className="px-7 py-7 sm:px-8"
                        >
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="cloud-first-name"
                                        className="mb-2 block text-sm font-bold text-slate-700"
                                    >
                                        Nombre
                                    </label>

                                    <input
                                        id="cloud-first-name"
                                        type="text"
                                        required
                                        value={
                                            checkoutForm.firstName
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setCheckoutForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    firstName:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="Tu nombre"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="cloud-last-name"
                                        className="mb-2 block text-sm font-bold text-slate-700"
                                    >
                                        Apellido
                                    </label>

                                    <input
                                        id="cloud-last-name"
                                        type="text"
                                        value={
                                            checkoutForm.lastName
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setCheckoutForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    lastName:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="Tu apellido"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="cloud-email"
                                        className="mb-2 block text-sm font-bold text-slate-700"
                                    >
                                        Correo
                                    </label>

                                    <input
                                        id="cloud-email"
                                        type="email"
                                        required
                                        value={
                                            checkoutForm.email
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setCheckoutForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    email:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="nombre@empresa.com"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="cloud-phone"
                                        className="mb-2 block text-sm font-bold text-slate-700"
                                    >
                                        Teléfono
                                    </label>

                                    <input
                                        id="cloud-phone"
                                        type="tel"
                                        value={
                                            checkoutForm.phone
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setCheckoutForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    phone:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="55 0000 0000"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="cloud-company"
                                        className="mb-2 block text-sm font-bold text-slate-700"
                                    >
                                        Empresa
                                    </label>

                                    <input
                                        id="cloud-company"
                                        type="text"
                                        value={
                                            checkoutForm.company
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setCheckoutForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    company:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="Nombre de tu empresa"
                                    />
                                </div>
                            </div>

                            {checkoutError && (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {
                                        checkoutError
                                    }
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={
                                    isSubmittingCheckout
                                }
                                className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-black !text-white shadow-[0_14px_30px_-18px_rgba(6,182,212,0.75)] transition hover:-translate-y-0.5 hover:!text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            >
                                {isSubmittingCheckout
                                    ? "Procesando..."
                                    : selectedItem.requiresQuote
                                        ? "Enviar solicitud"
                                        : "Continuar al pago"}
                            </button>

                            {!selectedItem.requiresQuote && (
                                <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                                    El pago se procesará de
                                    forma segura mediante
                                    Stripe.
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            )}

        </main>
    );
}