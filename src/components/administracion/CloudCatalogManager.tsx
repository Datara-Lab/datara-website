"use client";

import {
    type FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";

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

    providerName: string | null;
    providerCost: string;
    providerCostCurrency: string;

    vcpu: number;
    ramGb: string;
    storageGb: string;
    transferTb: string;

    serviceCategory: string | null;

    features: string[];

    recommended: boolean;
    requiresQuote: boolean;
    active: boolean;
    sortOrder: number;

    createdAt: string;
    updatedAt: string;
};

type CloudCatalogResponse = {
    success: boolean;

    data?: {
        items?: CloudCatalogItem[];
        item?: CloudCatalogItem;
    };

    message?: string;
    error?: string;
};

type CloudCatalogDraft = {
    id: string | null;
    itemKey: string;
    itemType: CloudItemType;
    billingMode: CloudBillingMode;

    name: string;
    description: string;

    monthlyPrice: string;
    annualPrice: string;
    oneTimePrice: string;
    currency: string;

    providerName: string;
    providerCost: string;
    providerCostCurrency: string;

    vcpu: string;
    ramGb: string;
    storageGb: string;
    transferTb: string;

    serviceCategory: string;

    features: string;

    recommended: boolean;
    requiresQuote: boolean;
    active: boolean;
    sortOrder: string;
};

const EMPTY_DRAFT:
    CloudCatalogDraft = {
    id: null,
    itemKey: "",
    itemType: "server",
    billingMode: "monthly",

    name: "",
    description: "",

    monthlyPrice: "0.00",
    annualPrice: "0.00",
    oneTimePrice: "0.00",
    currency: "mxn",

    providerName: "",
    providerCost: "0.00",
    providerCostCurrency: "usd",

    vcpu: "0",
    ramGb: "0.00",
    storageGb: "0.00",
    transferTb: "0.00",

    serviceCategory: "",

    features: "",

    recommended: false,
    requiresQuote: false,
    active: true,
    sortOrder: "0",
};

const serviceCategories = [
    {
        value: "migration",
        label: "Migración",
    },
    {
        value: "installation",
        label: "Instalación",
    },
    {
        value: "configuration",
        label: "Configuración",
    },
    {
        value: "recovery",
        label: "Recuperación",
    },
    {
        value: "management",
        label: "Administración",
    },
    {
        value: "support",
        label: "Soporte",
    },
    {
        value: "implementation",
        label: "Implementación",
    },
    {
        value: "security",
        label: "Seguridad",
    },
    {
        value: "backup",
        label: "Respaldo",
    },
] as const;

function textToList(
    value: string,
): string[] {
    return value
        .split(/\r?\n|,/)
        .map(
            (item) =>
                item.trim(),
        )
        .filter(Boolean);
}

function listToText(
    values: string[],
): string {
    return values.join("\n");
}

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
                maximumFractionDigits: 2,
            },
        ).format(number);
    } catch {
        return `${currency.toUpperCase()} ${number.toFixed(
            2,
        )}`;
    }
}

export default function CloudCatalogManager() {
    const [
        items,
        setItems,
    ] = useState<
        CloudCatalogItem[]
    >([]);

    const [
        selectedType,
        setSelectedType,
    ] = useState<
        "server" | "service"
    >("server");

    const [
        draft,
        setDraft,
    ] = useState<
        CloudCatalogDraft
    >({
        ...EMPTY_DRAFT,
    });

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        isEditorOpen,
        setIsEditorOpen,
    ] = useState(false);

    const [
        message,
        setMessage,
    ] = useState<
        string | null
    >(null);

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(null);

    const visibleItems =
        useMemo(
            () =>
                items.filter(
                    (item) =>
                        selectedType ===
                            "server"
                            ? item.itemType ===
                            "server"
                            : item.itemType ===
                            "service" ||
                            item.itemType ===
                            "addon",
                ),
            [
                items,
                selectedType,
            ],
        );

    async function loadCatalog() {
        try {
            setIsLoading(true);
            setError(null);

            const response =
                await fetch(
                    "/api/platform/cloud/catalog",
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
                    "No fue posible cargar el catálogo Cloud.",
                );
            }

            setItems(
                result.data
                    ?.items ??
                [],
            );
        } catch (
        loadError
        ) {
            setError(
                loadError instanceof
                    Error
                    ? loadError.message
                    : "No fue posible cargar el catálogo Cloud.",
            );
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadCatalog();
    }, []);

    function openCreate(
        itemType:
            | "server"
            | "service",
    ) {
        setDraft({
            ...EMPTY_DRAFT,

            itemType,

            billingMode:
                itemType ===
                    "server"
                    ? "monthly"
                    : "one_time",

            providerCostCurrency:
                itemType ===
                    "server"
                    ? "usd"
                    : "mxn",
        });

        setSelectedType(
            itemType,
        );

        setMessage(null);
        setError(null);

        setIsEditorOpen(
            true,
        );
    }

    function openEdit(
        item:
            CloudCatalogItem,
    ) {
        setDraft({
            id:
                item.id,

            itemKey:
                item.itemKey,

            itemType:
                item.itemType,

            billingMode:
                item.billingMode,

            name:
                item.name,

            description:
                item.description ??
                "",

            monthlyPrice:
                item.monthlyPrice,

            annualPrice:
                item.annualPrice,

            oneTimePrice:
                item.oneTimePrice,

            currency:
                item.currency,

            providerName:
                item.providerName ??
                "",

            providerCost:
                item.providerCost,

            providerCostCurrency:
                item.providerCostCurrency,

            vcpu:
                String(
                    item.vcpu,
                ),

            ramGb:
                item.ramGb,

            storageGb:
                item.storageGb,

            transferTb:
                item.transferTb,

            serviceCategory:
                item.serviceCategory ??
                "",

            features:
                listToText(
                    item.features,
                ),

            recommended:
                item.recommended,

            requiresQuote:
                item.requiresQuote,

            active:
                item.active,

            sortOrder:
                String(
                    item.sortOrder,
                ),
        });

        setMessage(null);
        setError(null);

        setIsEditorOpen(
            true,
        );
    }

    async function handleSave(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setIsSaving(true);
        setError(null);
        setMessage(null);

        try {
            const isServer =
                draft.itemType ===
                "server";

            const response =
                await fetch(
                    "/api/platform/cloud/catalog",
                    {
                        method:
                            draft.id
                                ? "PATCH"
                                : "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                id:
                                    draft.id,

                                itemKey:
                                    draft.itemKey,

                                itemType:
                                    draft.itemType,

                                billingMode:
                                    draft.billingMode,

                                name:
                                    draft.name,

                                description:
                                    draft.description,

                                monthlyPrice:
                                    draft.monthlyPrice,

                                annualPrice:
                                    draft.annualPrice,

                                oneTimePrice:
                                    draft.oneTimePrice,

                                currency:
                                    draft.currency,

                                providerName:
                                    draft.providerName,

                                providerCost:
                                    draft.providerCost,

                                providerCostCurrency:
                                    draft
                                        .providerCostCurrency,

                                vcpu:
                                    isServer
                                        ? draft.vcpu
                                        : "0",

                                ramGb:
                                    isServer
                                        ? draft.ramGb
                                        : "0",

                                storageGb:
                                    isServer
                                        ? draft.storageGb
                                        : "0",

                                transferTb:
                                    isServer
                                        ? draft.transferTb
                                        : "0",

                                serviceCategory:
                                    isServer
                                        ? ""
                                        : draft
                                            .serviceCategory,

                                features:
                                    textToList(
                                        draft.features,
                                    ),

                                recommended:
                                    draft.recommended,

                                requiresQuote:
                                    draft.requiresQuote,

                                active:
                                    draft.active,

                                sortOrder:
                                    draft.sortOrder,
                            }),
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
                    "No fue posible guardar el elemento Cloud.",
                );
            }

            setMessage(
                result.message ??
                "El elemento Cloud fue guardado correctamente.",
            );

            setIsEditorOpen(
                false,
            );

            setDraft({
                ...EMPTY_DRAFT,
            });

            await loadCatalog();
        } catch (
        saveError
        ) {
            setError(
                saveError instanceof
                    Error
                    ? saveError.message
                    : "No fue posible guardar el elemento Cloud.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    const serverCount =
        items.filter(
            (item) =>
                item.itemType ===
                "server",
        ).length;

    const serviceCount =
        items.filter(
            (item) =>
                item.itemType ===
                "service" ||
                item.itemType ===
                "addon",
        ).length;

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
            <div className="mx-auto max-w-7xl space-y-8">
                <PageHeader
                    eyebrow="Datara Cloud"
                    title="Catálogo Cloud"
                    description="Administra servidores, servicios, costos de proveedor y precios comerciales."
                    action={
                        <Button
                            type="button"
                            onClick={() =>
                                openCreate(
                                    selectedType,
                                )
                            }
                        >
                            {selectedType ===
                                "server"
                                ? "Nuevo servidor"
                                : "Nuevo servicio"}
                        </Button>
                    }
                />

                {message && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}

                <section className="grid gap-4 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() =>
                            setSelectedType(
                                "server",
                            )
                        }
                        className={[
                            "rounded-3xl border p-6 text-left shadow-sm transition",
                            selectedType ===
                                "server"
                                ? "border-blue-300 bg-blue-50"
                                : "border-slate-200 bg-white hover:border-blue-200",
                        ].join(
                            " ",
                        )}
                    >
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                            Infraestructura
                        </p>

                        <div className="mt-2 flex items-end justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">
                                    Servidores
                                </h2>

                                <p className="mt-2 text-sm text-slate-600">
                                    Configuraciones fijas de infraestructura Cloud.
                                </p>
                            </div>

                            <span className="text-3xl font-black text-slate-950">
                                {serverCount}
                            </span>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedType(
                                "service",
                            )
                        }
                        className={[
                            "rounded-3xl border p-6 text-left shadow-sm transition",
                            selectedType ===
                                "service"
                                ? "border-violet-300 bg-violet-50"
                                : "border-slate-200 bg-white hover:border-violet-200",
                        ].join(
                            " ",
                        )}
                    >
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">
                            Servicios profesionales
                        </p>

                        <div className="mt-2 flex items-end justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">
                                    Servicios
                                </h2>

                                <p className="mt-2 text-sm text-slate-600">
                                    Migraciones, instalaciones, administración y soporte.
                                </p>
                            </div>

                            <span className="text-3xl font-black text-slate-950">
                                {serviceCount}
                            </span>
                        </div>
                    </button>
                </section>

                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">
                                {selectedType ===
                                    "server"
                                    ? "Servidores disponibles"
                                    : "Servicios disponibles"}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Los costos y precios pueden actualizarse desde este catálogo.
                            </p>
                        </div>
                    </header>

                    {isLoading ? (
                        <div className="flex min-h-64 items-center justify-center">
                            <div className="text-center">
                                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                                <p className="mt-4 text-sm font-semibold text-slate-600">
                                    Cargando catálogo Cloud...
                                </p>
                            </div>
                        </div>
                    ) : visibleItems.length ===
                        0 ? (
                        <div className="px-6 py-16 text-center">
                            <h3 className="font-black text-slate-950">
                                {selectedType ===
                                    "server"
                                    ? "Todavía no hay servidores"
                                    : "Todavía no hay servicios"}
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                Agrega el primer elemento al catálogo de Datara Cloud.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 p-6 lg:grid-cols-2">
                            {visibleItems.map(
                                (item) => (
                                    <article
                                        key={
                                            item.id
                                        }
                                        className="rounded-2xl border border-slate-200 p-5"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="flex flex-wrap gap-2">
                                                    <span
                                                        className={[
                                                            "rounded-full px-3 py-1 text-xs font-bold",
                                                            item.active
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : "bg-slate-100 text-slate-500",
                                                        ].join(
                                                            " ",
                                                        )}
                                                    >
                                                        {item.active
                                                            ? "Activo"
                                                            : "Inactivo"}
                                                    </span>

                                                    {item.recommended && (
                                                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                                            Recomendado
                                                        </span>
                                                    )}

                                                    {item.requiresQuote && (
                                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                                            Requiere cotización
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="mt-3 text-xl font-black text-slate-950">
                                                    {
                                                        item.name
                                                    }
                                                </h3>

                                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                                    {
                                                        item.itemKey
                                                    }
                                                </p>
                                            </div>

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    openEdit(
                                                        item,
                                                    )
                                                }
                                            >
                                                Editar
                                            </Button>
                                        </div>

                                        {item.description && (
                                            <p className="mt-4 text-sm leading-6 text-slate-600">
                                                {
                                                    item.description
                                                }
                                            </p>
                                        )}

                                        {item.itemType ===
                                            "server" ? (
                                            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                <div className="rounded-xl bg-slate-50 p-3">
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        vCPU
                                                    </p>

                                                    <p className="mt-1 font-black text-slate-950">
                                                        {
                                                            item.vcpu
                                                        }
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-slate-50 p-3">
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        RAM
                                                    </p>

                                                    <p className="mt-1 font-black text-slate-950">
                                                        {Number(
                                                            item.ramGb,
                                                        )}{" "}
                                                        GB
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-slate-50 p-3">
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        SSD
                                                    </p>

                                                    <p className="mt-1 font-black text-slate-950">
                                                        {Number(
                                                            item.storageGb,
                                                        )}{" "}
                                                        GB
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-slate-50 p-3">
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        Transferencia
                                                    </p>

                                                    <p className="mt-1 font-black text-slate-950">
                                                        {Number(
                                                            item.transferTb,
                                                        )}{" "}
                                                        TB
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-4 text-sm font-semibold text-violet-700">
                                                {serviceCategories.find(
                                                    (
                                                        category,
                                                    ) =>
                                                        category.value ===
                                                        item.serviceCategory,
                                                )?.label ??
                                                    item.serviceCategory ??
                                                    "Servicio Cloud"}
                                            </p>
                                        )}

                                        <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                                    Costo proveedor
                                                </p>

                                                <p className="mt-1 font-bold text-slate-700">
                                                    {formatMoney(
                                                        item.providerCost,
                                                        item.providerCostCurrency,
                                                    )}
                                                </p>

                                                {item.providerName && (
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {
                                                            item.providerName
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                                    Precio Datara
                                                </p>

                                                <p className="mt-1 text-lg font-black text-slate-950">
                                                    {item.billingMode ===
                                                        "monthly"
                                                        ? formatMoney(
                                                            item.monthlyPrice,
                                                            item.currency,
                                                        )
                                                        : item.billingMode ===
                                                            "annual"
                                                            ? formatMoney(
                                                                item.annualPrice,
                                                                item.currency,
                                                            )
                                                            : formatMoney(
                                                                item.oneTimePrice,
                                                                item.currency,
                                                            )}
                                                </p>

                                                <p className="text-xs text-slate-500">
                                                    {item.billingMode ===
                                                        "monthly"
                                                        ? "por mes"
                                                        : item.billingMode ===
                                                            "annual"
                                                            ? "por año"
                                                            : "pago único"}
                                                </p>
                                            </div>
                                        </div>
                                    </article>
                                ),
                            )}
                        </div>
                    )}
                </section>

                {isEditorOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                        <form
                            onSubmit={
                                handleSave
                            }
                            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
                        >
                            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                                        Datara Cloud
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                                        {draft.id
                                            ? "Editar elemento"
                                            : draft.itemType ===
                                                "server"
                                                ? "Nuevo servidor"
                                                : "Nuevo servicio"}
                                    </h2>
                                </div>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={
                                        isSaving
                                    }
                                    onClick={() =>
                                        setIsEditorOpen(
                                            false,
                                        )
                                    }
                                >
                                    Cerrar
                                </Button>
                            </header>

                            <div className="grid gap-5 p-6 sm:grid-cols-2">
                                <label className="text-sm font-bold text-slate-800">
                                    Nombre

                                    <input
                                        type="text"
                                        required
                                        maxLength={
                                            160
                                        }
                                        value={
                                            draft.name
                                        }
                                        disabled={
                                            isSaving
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setDraft(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    name:
                                                        event.target.value,
                                                }),
                                            )
                                        }
                                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-800">
                                    Clave interna

                                    <input
                                        type="text"
                                        required
                                        maxLength={
                                            80
                                        }
                                        placeholder="cloud-16"
                                        value={
                                            draft.itemKey
                                        }
                                        disabled={
                                            isSaving
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setDraft(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    itemKey:
                                                        event.target.value,
                                                }),
                                            )
                                        }
                                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </label>

                                <label className="sm:col-span-2 text-sm font-bold text-slate-800">
                                    Descripción

                                    <textarea
                                        rows={3}
                                        value={
                                            draft.description
                                        }
                                        disabled={
                                            isSaving
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setDraft(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    description:
                                                        event.target.value,
                                                }),
                                            )
                                        }
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </label>

                                {draft.itemType !==
                                    "server" && (
                                        <label className="text-sm font-bold text-slate-800">
                                            Categoría

                                            <select
                                                value={
                                                    draft.serviceCategory
                                                }
                                                disabled={
                                                    isSaving
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setDraft(
                                                        (
                                                            current,
                                                        ) => ({
                                                            ...current,
                                                            serviceCategory:
                                                                event.target.value,
                                                        }),
                                                    )
                                                }
                                                className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none focus:border-blue-500"
                                            >
                                                <option value="">
                                                    Selecciona
                                                </option>

                                                {serviceCategories.map(
                                                    (
                                                        category,
                                                    ) => (
                                                        <option
                                                            key={
                                                                category.value
                                                            }
                                                            value={
                                                                category.value
                                                            }
                                                        >
                                                            {
                                                                category.label
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>
                                    )}

                                <label className="text-sm font-bold text-slate-800">
                                    Modalidad

                                    <select
                                        value={
                                            draft.billingMode
                                        }
                                        disabled={
                                            isSaving
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setDraft(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,

                                                    billingMode:
                                                        event.target
                                                            .value as
                                                        CloudBillingMode,
                                                }),
                                            )
                                        }
                                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none focus:border-blue-500"
                                    >
                                        <option value="monthly">
                                            Mensual
                                        </option>

                                        <option value="annual">
                                            Anual
                                        </option>

                                        <option value="one_time">
                                            Pago único
                                        </option>
                                    </select>
                                </label>

                                {draft.itemType ===
                                    "server" && (
                                        <>
                                            <label className="text-sm font-bold text-slate-800">
                                                vCPU

                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    step="1"
                                                    value={
                                                        draft.vcpu
                                                    }
                                                    disabled={
                                                        isSaving
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setDraft(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,
                                                                vcpu:
                                                                    event.target.value,
                                                            }),
                                                        )
                                                    }
                                                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                                />
                                            </label>

                                            <label className="text-sm font-bold text-slate-800">
                                                RAM (GB)

                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    value={
                                                        draft.ramGb
                                                    }
                                                    disabled={
                                                        isSaving
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setDraft(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,
                                                                ramGb:
                                                                    event.target.value,
                                                            }),
                                                        )
                                                    }
                                                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                                />
                                            </label>

                                            <label className="text-sm font-bold text-slate-800">
                                                SSD (GB)

                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    value={
                                                        draft.storageGb
                                                    }
                                                    disabled={
                                                        isSaving
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setDraft(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,
                                                                storageGb:
                                                                    event.target.value,
                                                            }),
                                                        )
                                                    }
                                                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                                />
                                            </label>

                                            <label className="text-sm font-bold text-slate-800">
                                                Transferencia (TB)

                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    value={
                                                        draft.transferTb
                                                    }
                                                    disabled={
                                                        isSaving
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setDraft(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,
                                                                transferTb:
                                                                    event.target.value,
                                                            }),
                                                        )
                                                    }
                                                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                                />
                                            </label>
                                        </>
                                    )}

                                <div className="sm:col-span-2">
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                        Costos
                                    </p>
                                </div>

                                <label className="text-sm font-bold text-slate-800">
                                    Proveedor

                                    <input
                                        type="text"
                                        value={
                                            draft.providerName
                                        }
                                        disabled={
                                            isSaving
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setDraft(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    providerName:
                                                        event.target.value,
                                                }),
                                            )
                                        }
                                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                    />
                                </label>

                                <div className="grid grid-cols-[1fr_110px] gap-3">
                                    <label className="text-sm font-bold text-slate-800">
                                        Costo proveedor

                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={
                                                draft.providerCost
                                            }
                                            disabled={
                                                isSaving
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDraft(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        providerCost:
                                                            event.target.value,
                                                    }),
                                                )
                                            }
                                            className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                        />
                                    </label>

                                    <label className="text-sm font-bold text-slate-800">
                                        Moneda

                                        <select
                                            value={
                                                draft.providerCostCurrency
                                            }
                                            disabled={
                                                isSaving
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDraft(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        providerCostCurrency:
                                                            event.target.value,
                                                    }),
                                                )
                                            }
                                            className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"
                                        >
                                            <option value="usd">
                                                USD
                                            </option>

                                            <option value="mxn">
                                                MXN
                                            </option>
                                        </select>
                                    </label>
                                </div>

                                <div className="sm:col-span-2">
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                        Precio Datara
                                    </p>
                                </div>

                                {draft.billingMode ===
                                    "monthly" && (
                                        <label className="text-sm font-bold text-slate-800">
                                            Precio mensual

                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={
                                                    draft.monthlyPrice
                                                }
                                                disabled={
                                                    isSaving
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setDraft(
                                                        (
                                                            current,
                                                        ) => ({
                                                            ...current,
                                                            monthlyPrice:
                                                                event.target.value,
                                                        }),
                                                    )
                                                }
                                                className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                            />
                                        </label>
                                    )}

                                {draft.billingMode ===
                                    "annual" && (
                                        <label className="text-sm font-bold text-slate-800">
                                            Precio anual

                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={
                                                    draft.annualPrice
                                                }
                                                disabled={
                                                    isSaving
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setDraft(
                                                        (
                                                            current,
                                                        ) => ({
                                                            ...current,
                                                            annualPrice:
                                                                event.target.value,
                                                        }),
                                                    )
                                                }
                                                className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                            />
                                        </label>
                                    )}

                                {draft.billingMode ===
                                    "one_time" && (
                                        <label className="text-sm font-bold text-slate-800">
                                            Precio único

                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={
                                                    draft.oneTimePrice
                                                }
                                                disabled={
                                                    isSaving
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setDraft(
                                                        (
                                                            current,
                                                        ) => ({
                                                            ...current,
                                                            oneTimePrice:
                                                                event.target.value,
                                                        }),
                                                    )
                                                }
                                                className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                            />
                                        </label>
                                    )}

                                <label className="text-sm font-bold text-slate-800">
                                    Moneda de venta

                                    <select
                                        value={
                                            draft.currency
                                        }
                                        disabled={
                                            isSaving
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setDraft(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    currency:
                                                        event.target.value,
                                                }),
                                            )
                                        }
                                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                                    >
                                        <option value="mxn">
                                            MXN
                                        </option>

                                        <option value="usd">
                                            USD
                                        </option>
                                    </select>
                                </label>

                                <label className="sm:col-span-2 text-sm font-bold text-slate-800">
                                    Características

                                    <span className="mt-1 block text-xs font-normal text-slate-500">
                                        Una característica por línea.
                                    </span>

                                    <textarea
                                        rows={5}
                                        value={
                                            draft.features
                                        }
                                        disabled={
                                            isSaving
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setDraft(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    features:
                                                        event.target.value,
                                                }),
                                            )
                                        }
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-800">
                                    Orden

                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="1"
                                        value={
                                            draft.sortOrder
                                        }
                                        disabled={
                                            isSaving
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setDraft(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    sortOrder:
                                                        event.target.value,
                                                }),
                                            )
                                        }
                                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                                    />
                                </label>

                                <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                                        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                            <input
                                            type="checkbox"
                                            checked={
                                                draft.requiresQuote
                                            }
                                            disabled={
                                                isSaving
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDraft(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    requiresQuote:
                                                    event.target.checked,
                                                }),
                                                )
                                            }
                                            />

                                            Requiere cotización
                                        </label>

                                    <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={
                                                draft.active
                                            }
                                            disabled={
                                                isSaving
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDraft(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        active:
                                                            event.target.checked,
                                                    }),
                                                )
                                            }
                                        />

                                        Activo
                                    </label>

                                    <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={
                                                draft.recommended
                                            }
                                            disabled={
                                                isSaving
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setDraft(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,
                                                        recommended:
                                                            event.target.checked,
                                                    }),
                                                )
                                            }
                                        />

                                        Recomendado
                                    </label>
                                </div>
                            </div>

                            <footer className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={
                                        isSaving
                                    }
                                    onClick={() =>
                                        setIsEditorOpen(
                                            false,
                                        )
                                    }
                                >
                                    Cancelar
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={
                                        isSaving
                                    }
                                >
                                    {isSaving
                                        ? "Guardando..."
                                        : "Guardar"}
                                </Button>
                            </footer>
                        </form>
                    </div>
                )}
            </div>
        </main>
    );
}