"use client";

import {
    useEffect,
    useState,
} from "react";

type CommercialCatalogItem = {
    id: string;
    productKey: string;
    itemKey: string;

    itemType:
        | "package"
        | "expansion"
        | "addon";

    name: string;
    description: string | null;
    monthlyPrice: string;
    annualPrice: string;
    annualDiscountPercent: number;

    installmentsEnabled: boolean;
    installmentsDiscountPercent: number;
    annualInstallmentsPrice: string;

    currency: string;
    includedUsers: number;
    includedStorageGb: string;
    moduleIds: string[];

    includedModules: Array<{
        id: string;
        label: string;
        description: string | null;
    }>;

    features: string[];
    required: boolean;
    recommended: boolean;
    sortOrder: number;
};

type CommercialIndustry = {
    id: string;
    name: string;
    description: string;
};

type CommercialCatalogResponse = {
    success: boolean;

    data?: {
        industries:
            CommercialIndustry[];

        selectedIndustry?: {
            id: string;
            name: string;
            description: string;
        };

        items:
            CommercialCatalogItem[];
    };

    error?: string;
};

type CheckoutSessionResponse = {
    success: boolean;

    data?: {
        purchaseId: string;
        checkoutSessionId: string;
        checkoutUrl: string;
    };

    error?: string;
};

type SubscriptionConfigurationResponse = {
    success: boolean;

    data?: {
        subscription: {
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
        } | null;
    };

    error?: string;
};

type PlanChangePreviewResponse = {
    success: boolean;

    data?: {
        changeType:
            | "no_change"
            | "immediate"
            | "scheduled"
            | "checkout_required";

        billingPeriod:
            | "monthly"
            | "annual"
            | "annual_installments";

        catalogItemIds:
            string[];

        recurringTotal:
            number;

        amountDueNow:
            number;

        currency:
            string;

        effectiveAt:
            string | null;

        prorationDate?:
            number | null;

        checkoutUrl?:
            string;
    };

    error?: string;
};

type CommercialConfiguratorProps = {
    purchaseType?:
        | "new_customer"
        | "trial_conversion"
        | "subscription_change";

    initialIndustry?:
        string;
};

export default function CommercialConfigurator({
    purchaseType =
        "new_customer",

    initialIndustry =
        "",
}: CommercialConfiguratorProps) {
    const [
        industries,
        setIndustries,
    ] = useState<
        CommercialIndustry[]
    >([]);

    const [
        selectedIndustry,
        setSelectedIndustry,
    ] = useState(
        initialIndustry,
    );

    const [
        items,
        setItems,
    ] = useState<
        CommercialCatalogItem[]
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
    >(
        null,
    );

    const [
        billingPeriod,
        setBillingPeriod,
    ] = useState<
        | "monthly"
        | "annual"
    >(
        "monthly",
    );

    const [
        annualPaymentMode,
        setAnnualPaymentMode,
    ] = useState<
        | "cash"
        | "installments"
    >(
        "cash",
    );

    const [
        selectedItemIds,
        setSelectedItemIds,
    ] = useState<
        string[]
    >([]);

    const [
        isCreatingCheckout,
        setIsCreatingCheckout,
    ] = useState(false);

    const [
        checkoutError,
        setCheckoutError,
    ] = useState<
        string | null
    >(
        null,
    );

    const [
        planChangePreview,
        setPlanChangePreview,
    ] = useState<
        PlanChangePreviewResponse["data"]
    >();

    const [
        isApplyingPlanChange,
        setIsApplyingPlanChange,
    ] = useState(false);

    const [
        planChangeApplied,
        setPlanChangeApplied,
    ] = useState(false);

    useEffect(() => {
        let isActive = true;

        async function loadCatalog() {
            try {
                setIsLoading(true);
                setError(null);

                const catalogUrl =
                    selectedIndustry
                        ? `/api/commercial-catalog?industry=${encodeURIComponent(
                              selectedIndustry,
                          )}`
                        : "/api/commercial-catalog";

                const response =
                    await fetch(
                        catalogUrl,
                        {
                            cache:
                                "no-store",
                        },
                    );

                const result =
                    (await response.json()) as
                        CommercialCatalogResponse;

                if (
                    !response.ok ||
                    !result.success ||
                    !result.data
                ) {
                    throw new Error(
                        result.error ??
                            "No fue posible cargar el catálogo.",
                    );
                }

                if (!isActive) {
                    return;
                }

                setIndustries(
                    result.data
                        .industries,
                );

                setItems(
                    result.data.items,
                );

                if (
                    purchaseType ===
                    "subscription_change"
                ) {
                    const subscriptionResponse =
                        await fetch(
                            "/api/administracion/suscripcion",
                            {
                                cache:
                                    "no-store",
                            },
                        );

                    const subscriptionResult =
                        (await subscriptionResponse.json()) as
                            SubscriptionConfigurationResponse;

                    if (
                        !subscriptionResponse.ok ||
                        !subscriptionResult.success ||
                        !subscriptionResult.data
                            ?.subscription
                    ) {
                        throw new Error(
                            subscriptionResult.error ??
                                "No fue posible cargar la suscripción actual.",
                        );
                    }

                    if (!isActive) {
                        return;
                    }

                    setBillingPeriod(
                        subscriptionResult.data
                            .subscription
                            .pendingBillingPeriod ??
                        subscriptionResult.data
                            .subscription
                            .billingPeriod,
                    );

                    setSelectedItemIds(
                        subscriptionResult.data
                            .subscription
                            .pendingCatalogItemIds ??
                        subscriptionResult.data
                            .subscription
                            .catalogItemIds,
                    );
                } else {
                    setSelectedItemIds(
                        result.data.items
                            .filter(
                                (item) =>
                                    item.required ||
                                    (
                                        purchaseType ===
                                            "trial_conversion" &&
                                        item.recommended
                                    ),
                            )
                            .map(
                                (item) =>
                                    item.id,
                            ),
                    );
                }
            } catch (loadError) {
                if (!isActive) {
                    return;
                }

                setError(
                    loadError instanceof
                        Error
                        ? loadError.message
                        : "No fue posible cargar el catálogo.",
                );
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        }

        void loadCatalog();

        return () => {
            isActive = false;
        };
    }, [
        selectedIndustry,
        purchaseType,
    ]);

    const selectedItems =
        items.filter(
            (item) =>
                selectedItemIds.includes(
                    item.id,
                ),
        );

    const selectedTotal =
        selectedItems.reduce(
            (
                total,
                item,
            ) =>
                total +
                Number(
                    billingPeriod ===
                    "monthly"
                        ? item.monthlyPrice
                        : annualPaymentMode ===
                            "installments"
                            ? item
                                  .annualInstallmentsPrice
                            : item.annualPrice,
                ),
            0,
        );

            async function handleCheckout() {
        if (
            !selectedIndustry
        ) {
            setCheckoutError(
                "Selecciona una industria antes de continuar.",
            );

            return;
        }

        if (
            selectedItemIds.length ===
            0
        ) {
            setCheckoutError(
                "Selecciona al menos una opción comercial.",
            );

            return;
        }

                if (
            billingPeriod ===
                "annual" &&
            annualPaymentMode ===
                "installments"
        ) {
            const itemWithoutInstallments =
                selectedItems.find(
                    (item) =>
                        !item
                            .installmentsEnabled,
                );

            if (
                itemWithoutInstallments
            ) {
                setCheckoutError(
                    `${itemWithoutInstallments.name} no está disponible con meses sin intereses.`,
                );

                return;
            }
        }

        try {
            setIsCreatingCheckout(
                true,
            );

            setCheckoutError(
                null,
            );

            setPlanChangePreview(
                undefined,
            );

            const isSubscriptionChange =
                purchaseType ===
                "subscription_change";

            const response =
                await fetch(
                    isSubscriptionChange
                        ? "/api/administracion/suscripcion/cambio/preview"
                        : "/api/checkout/session",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                purchaseType,

                                industry:
                                    selectedIndustry,

                                billingPeriod:
                                    billingPeriod ===
                                        "annual" &&
                                    annualPaymentMode ===
                                        "installments"
                                        ? "annual_installments"
                                        : billingPeriod,

                                catalogItemIds:
                                    selectedItemIds,
                            }),
                    },
                );

            if (isSubscriptionChange) {
                const result =
                    (await response.json()) as
                        PlanChangePreviewResponse;

                if (
                    !response.ok ||
                    !result.success ||
                    !result.data
                ) {
                    throw new Error(
                        result.error ??
                            "No fue posible calcular el cambio de plan.",
                    );
                }

                setPlanChangePreview(
                    result.data,
                );

                setIsCreatingCheckout(
                    false,
                );

                return;
            }

            const result =
                (await response.json()) as
                    CheckoutSessionResponse;

            if (
                !response.ok ||
                !result.success ||
                !result.data
                    ?.checkoutUrl
            ) {
                throw new Error(
                    result.error ??
                        "No fue posible iniciar el pago.",
                );
            }

            window.location.assign(
                result.data
                    .checkoutUrl,
            );
        } catch (
            checkoutRequestError
        ) {
            setCheckoutError(
                checkoutRequestError instanceof
                    Error
                    ? checkoutRequestError
                          .message
                    : purchaseType ===
                        "subscription_change"
                      ? "No fue posible calcular el cambio de plan."
                      : "No fue posible iniciar el pago.",
            );

            setIsCreatingCheckout(
                false,
            );
        }
    }

    async function applyPlanChange() {
        if (
            !planChangePreview ||
            planChangePreview.changeType ===
                "no_change"
        ) {
            return;
        }

        try {
            setIsApplyingPlanChange(
                true,
            );

            setCheckoutError(
                null,
            );

            const response =
                await fetch(
                    "/api/administracion/suscripcion/cambio",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                billingPeriod:
                                    planChangePreview
                                        .billingPeriod,

                                catalogItemIds:
                                    planChangePreview
                                        .catalogItemIds,
                            }),
                    },
                );

            const result =
                (await response.json()) as
                    PlanChangePreviewResponse;

            if (
                !response.ok ||
                !result.success ||
                !result.data
            ) {
                throw new Error(
                    result.error ??
                        "No fue posible aplicar el cambio de plan.",
                );
            }

            if (
                result.data.changeType ===
                    "checkout_required" &&
                result.data.checkoutUrl
            ) {
                window.location.assign(
                    result.data
                        .checkoutUrl,
                );

                return;
            }

            setPlanChangePreview(
                result.data,
            );

            setPlanChangeApplied(
                true,
            );
        } catch (
            planChangeError
        ) {
            setCheckoutError(
                planChangeError instanceof
                    Error
                    ? planChangeError
                        .message
                    : "No fue posible aplicar el cambio de plan.",
            );
        } finally {
            setIsApplyingPlanChange(
                false,
            );
        }
    }

    function toggleItem(
        item:
            CommercialCatalogItem,
    ) {
        if (item.required) {
            return;
        }

        setPlanChangePreview(
            undefined,
        );

        setPlanChangeApplied(
            false,
        );

        setCheckoutError(
            null,
        );

        setSelectedItemIds(
            (currentItemIds) =>
                currentItemIds.includes(
                    item.id,
                )
                    ? currentItemIds.filter(
                          (itemId) =>
                              itemId !==
                              item.id,
                      )
                    : [
                          ...currentItemIds,
                          item.id,
                      ],
        );
    }

    if (isLoading) {
        return (
            <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                    Cargando catálogo comercial...
                </p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="rounded-[32px] border border-red-200 bg-red-50 p-8">
                <p className="font-semibold text-red-700">
                    {error}
                </p>
            </section>
        );
    }

    if (!selectedIndustry) {
        return (
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="max-w-2xl">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">
                        Paso 1
                    </p>

                    <h2 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl">
                        Selecciona tu industria
                    </h2>

                    <p className="mt-3 leading-7 text-slate-600">
                        Mostraremos únicamente los módulos y expansiones compatibles con la operación de tu empresa.
                    </p>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {industries.map(
                        (industry) => (
                            <button
                                key={
                                    industry.id
                                }
                                type="button"
                                onClick={() =>
                                    setSelectedIndustry(
                                        industry.id,
                                    )
                                }
                                className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-950/5"
                            >
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
                                    {industry.name
                                        .charAt(0)
                                        .toUpperCase()}
                                </span>

                                <h3 className="mt-5 text-xl font-black text-slate-950">
                                    {
                                        industry.name
                                    }
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {
                                        industry.description
                                    }
                                </p>

                                <p className="mt-5 text-sm font-bold text-blue-700">
                                    Configurar solución →
                                </p>
                            </button>
                        ),
                    )}
                </div>
            </section>
        );
    }

    return (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
                <div className="mb-5 flex flex-col gap-4 rounded-[24px] border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                            Industria seleccionada
                        </p>

                        <p className="mt-1 text-lg font-black text-slate-950">
                            {industries.find(
                                (industry) =>
                                    industry.id ===
                                    selectedIndustry,
                            )?.name ??
                                selectedIndustry}
                        </p>
                    </div>

                    {purchaseType ===
                    "trial_conversion" ? (
                        <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
                            Industria vinculada al demo
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedIndustry(
                                    "",
                                );

                                setItems([]);
                                setSelectedItemIds([]);
                            }}
                            className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-500 hover:bg-blue-100"
                        >
                            Cambiar industria
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-bold text-slate-950">
                            Elige cómo pagar
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            El pago anual ya incluye el descuento configurado.
                        </p>
                    </div>

                    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => {
                                setBillingPeriod(
                                    "monthly",
                                );

                                setPlanChangePreview(
                                    undefined,
                                );

                                setPlanChangeApplied(
                                    false,
                                );

                                setCheckoutError(
                                    null,
                                );
                            }}
                            className={[
                                "rounded-xl px-5 py-2.5 text-sm font-bold transition",
                                billingPeriod ===
                                "monthly"
                                    ? "bg-white text-slate-950 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800",
                            ].join(" ")}
                        >
                            Mensual
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setBillingPeriod(
                                    "annual",
                                );

                                setPlanChangePreview(
                                    undefined,
                                );

                                setPlanChangeApplied(
                                    false,
                                );

                                setCheckoutError(
                                    null,
                                );
                            }}
                            className={[
                                "rounded-xl px-5 py-2.5 text-sm font-bold transition",
                                billingPeriod ===
                                "annual"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-800",
                            ].join(" ")}
                        >
                            Anual
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                    {items.map(
                        (item) => {
                            const isSelected =
                                selectedItemIds.includes(
                                    item.id,
                                );

                            return (
                                <article
                                    key={
                                        item.id
                                    }
                                    className={[
                                        "relative flex h-full flex-col rounded-[28px] border p-6 transition",
                                        isSelected
                                            ? "border-blue-500 bg-blue-50/40 shadow-lg shadow-blue-950/5"
                                            : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">
                                                    {item.itemType ===
                                                    "package"
                                                        ? "Paquete"
                                                        : item.itemType ===
                                                            "expansion"
                                                          ? "Expansión"
                                                          : "Complemento"}
                                                </span>

                                                {item.required && (
                                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                                        Incluido
                                                    </span>
                                                )}

                                                {item.recommended && (
                                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                                        Recomendado
                                                    </span>
                                                )}
                                            </div>

                                            <h2 className="mt-4 text-xl font-black text-slate-950">
                                                {
                                                    item.name
                                                }
                                            </h2>
                                        </div>

                                        <input
                                            type="checkbox"
                                            aria-label={`Seleccionar ${item.name}`}
                                            checked={
                                                isSelected
                                            }
                                            disabled={
                                                item.required
                                            }
                                            onChange={() =>
                                                toggleItem(
                                                    item,
                                                )
                                            }
                                            className="h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <p className="mt-3 text-sm leading-6 text-slate-600">
                                        {
                                            item.description
                                        }
                                    </p>

                                    <div className="mt-6">
                                        <p className="text-3xl font-black text-slate-950">
                                            {new Intl.NumberFormat(
                                                "es-MX",
                                                {
                                                    style:
                                                        "currency",

                                                    currency:
                                                        item.currency.toUpperCase(),

                                                    maximumFractionDigits:
                                                        2,
                                                },
                                            ).format(
                                                billingPeriod ===
                                                "monthly"
                                                    ? Number(
                                                          item.monthlyPrice,
                                                      )
                                                    : annualPaymentMode ===
                                                        "installments" &&
                                                      item.installmentsEnabled
                                                      ? Number(
                                                            item.annualInstallmentsPrice,
                                                        )
                                                      : Number(
                                                            item.annualPrice,
                                                        ),
                                            )}{" "}
                                            <span className="text-sm font-bold text-slate-500">
                                                {item.currency.toUpperCase()}
                                            </span>
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {billingPeriod ===
                                            "monthly"
                                                ? "al mes"
                                                : annualPaymentMode ===
                                                      "installments" &&
                                                  item.installmentsEnabled
                                                  ? "al año · pago con MSI"
                                                  : "al año · pago de contado"}
                                            {" · IVA incluido"}
                                        </p>

                                        {billingPeriod ===
                                            "annual" &&
                                            item.installmentsEnabled && (
                                                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAnnualPaymentMode(
                                                                "cash",
                                                            );

                                                            setCheckoutError(
                                                                null,
                                                            );
                                                        }}
                                                        className={[
                                                            "rounded-xl px-3 py-2 text-xs font-bold transition",
                                                            annualPaymentMode ===
                                                            "cash"
                                                                ? "bg-white text-slate-950 shadow-sm"
                                                                : "text-slate-500 hover:text-slate-800",
                                                        ].join(
                                                            " ",
                                                        )}
                                                    >
                                                        Contado
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAnnualPaymentMode(
                                                                "installments",
                                                            );

                                                            setCheckoutError(
                                                                null,
                                                            );
                                                        }}
                                                        className={[
                                                            "rounded-xl px-3 py-2 text-xs font-bold transition",
                                                            annualPaymentMode ===
                                                            "installments"
                                                                ? "bg-blue-600 text-white shadow-sm"
                                                                : "text-slate-500 hover:text-slate-800",
                                                        ].join(
                                                            " ",
                                                        )}
                                                    >
                                                        3 o 6 MSI
                                                    </button>
                                                </div>
                                            )}

                                        {billingPeriod ===
                                            "annual" &&
                                            annualPaymentMode ===
                                                "cash" &&
                                            item.annualDiscountPercent >
                                                0 && (
                                                <p className="mt-2 text-sm font-bold text-emerald-700">
                                                    {
                                                        item.annualDiscountPercent
                                                    }
                                                    % de descuento anual
                                                </p>
                                            )}

                                        {billingPeriod ===
                                            "annual" &&
                                            annualPaymentMode ===
                                                "installments" &&
                                            item.installmentsEnabled &&
                                            item.installmentsDiscountPercent >
                                                0 && (
                                                <p className="mt-2 text-sm font-bold text-blue-700">
                                                    {
                                                        item.installmentsDiscountPercent
                                                    }
                                                    % de descuento con MSI
                                                </p>
                                            )}
                                    </div>

                                    {item.includedModules
                                        .length >
                                        0 && (
                                        <div className="mt-6 border-t border-slate-200 pt-5">
                                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                                Módulos incluidos
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {item.includedModules.map(
                                                    (
                                                        module,
                                                    ) => (
                                                        <span
                                                            key={
                                                                module.id
                                                            }
                                                            title={
                                                                module.description ??
                                                                undefined
                                                            }
                                                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                                                        >
                                                            {
                                                                module.label
                                                            }
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {item.features.length >
                                        0 && (
                                        <ul className="mt-6 space-y-2 border-t border-slate-200 pt-5">
                                            {item.features.map(
                                                (
                                                    feature,
                                                ) => (
                                                    <li
                                                        key={
                                                            feature
                                                        }
                                                        className="flex gap-2 text-sm text-slate-600"
                                                    >
                                                        <span className="font-bold text-emerald-600">
                                                            ✓
                                                        </span>

                                                        <span>
                                                            {
                                                                feature
                                                            }
                                                        </span>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}

                                    {!item.required && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleItem(
                                                    item,
                                                )
                                            }
                                            className={[
                                                "mt-auto w-full rounded-xl border px-4 py-3 pt-3 text-sm font-bold transition",
                                                isSelected
                                                    ? "border-blue-600 bg-gradient-to-r from-blue-600 to-cyan-500 !text-white hover:from-blue-700 hover:to-cyan-600 hover:!text-white"
                                                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700",
                                            ].join(" ")}
                                        >
                                            {isSelected
                                                ? "Quitar"
                                                : "Agregar"}
                                        </button>
                                    )}
                                </article>
                            );
                        },
                    )}
                </div>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
                <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/15">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">
                        Tu configuración
                    </p>

                    <h2 className="mt-3 text-2xl font-black">
                        Resumen
                    </h2>

                    <div className="mt-6 space-y-3">
                        {selectedItems.map(
                            (item) => (
                                <div
                                    key={
                                        item.id
                                    }
                                    className="flex items-start justify-between gap-4 text-sm"
                                >
                                    <span className="text-slate-300">
                                        {
                                            item.name
                                        }
                                    </span>

                                    <span className="shrink-0 font-bold">
                                        {new Intl.NumberFormat(
                                            "es-MX",
                                            {
                                                style:
                                                    "currency",

                                                currency:
                                                    item.currency.toUpperCase(),

                                                maximumFractionDigits:
                                                    2,
                                            },
                                        ).format(
                                            Number(
                                                billingPeriod ===
                                                "monthly"
                                                    ? item.monthlyPrice
                                                    : annualPaymentMode ===
                                                        "installments"
                                                        ? item
                                                              .annualInstallmentsPrice
                                                        : item.annualPrice,
                                            ),
                                        )}{" "}
                                        <span className="text-xs text-slate-400">
                                            {item.currency.toUpperCase()}
                                        </span>
                                    </span>
                                </div>
                            ),
                        )}
                    </div>

                    <div className="mt-6 border-t border-white/15 pt-6">
                        <div className="flex items-end justify-between gap-4">
                            <span className="text-sm text-slate-300">
                                Total
                            </span>

                            <span className="text-3xl font-black">
                                {new Intl.NumberFormat(
                                    "es-MX",
                                    {
                                        style:
                                            "currency",

                                        currency:
                                            selectedItems[
                                                0
                                            ]?.currency.toUpperCase() ??
                                            "MXN",

                                        maximumFractionDigits:
                                            2,
                                    },
                                ).format(
                                    selectedTotal,
                                )}{" "}
                                <span className="text-sm font-bold text-slate-400">
                                    {selectedItems[
                                        0
                                    ]?.currency.toUpperCase() ??
                                        "MXN"}
                                </span>
                            </span>
                        </div>

                        <p className="mt-2 text-right text-xs text-slate-400">
                            {billingPeriod ===
                            "monthly"
                                ? "Facturación mensual"
                                : annualPaymentMode ===
                                    "installments"
                                    ? "Pago anual · 3 o 6 MSI"
                                    : "Facturación anual · pago de contado"}
                            {" · IVA incluido"}
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={
                            isCreatingCheckout ||
                            planChangeApplied
                        }
                        onClick={() =>
                            void handleCheckout()
                        }
                        className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white transition hover:from-blue-700 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isCreatingCheckout
                            ? purchaseType ===
                                "subscription_change"
                                ? "Calculando cambio..."
                                : "Preparando pago..."
                            : purchaseType ===
                                "subscription_change"
                              ? "Revisar cambio"
                              : "Continuar al pago"}
                    </button>

                    {planChangePreview && (
                        <div className="mt-5 rounded-2xl border border-blue-300 bg-white p-5 text-slate-900">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                                Resultado del cambio
                            </p>

                            {planChangePreview
                                .changeType ===
                            "no_change" ? (
                                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                                    La selección coincide con tu plan actual. No hay cambios por aplicar.
                                </p>
                            ) : (
                                <>
                                    <div className="mt-4 flex items-start justify-between gap-4">
                                        <span className="text-sm text-slate-500">
                                            {planChangePreview
                                                .billingPeriod ===
                                            "annual_installments"
                                                ? "Pago anual a MSI"
                                                : "Nuevo total"}
                                        </span>

                                        <span className="text-right text-lg font-black">
                                            {new Intl.NumberFormat(
                                                "es-MX",
                                                {
                                                    style:
                                                        "currency",

                                                    currency:
                                                        planChangePreview.currency.toUpperCase(),
                                                },
                                            ).format(
                                                planChangePreview.recurringTotal,
                                            )}{" "}
                                            <span className="text-xs text-slate-500">
                                                {planChangePreview.currency.toUpperCase()}
                                            </span>
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-start justify-between gap-4 border-t border-slate-200 pt-4">
                                        <span className="text-sm text-slate-500">
                                            Aplicación
                                        </span>

                                        <span className="text-right text-sm font-bold">
                                            {planChangePreview
                                                .billingPeriod ===
                                            "annual_installments"
                                                ? "Después de confirmar el pago"
                                                : planChangePreview
                                                      .changeType ===
                                                  "immediate"
                                                  ? "Inmediata"
                                                  : planChangePreview.effectiveAt
                                                    ? new Intl.DateTimeFormat(
                                                        "es-MX",
                                                        {
                                                            day:
                                                                "numeric",

                                                            month:
                                                                "long",

                                                            year:
                                                                "numeric",
                                                        },
                                                    ).format(
                                                        new Date(
                                                            planChangePreview.effectiveAt,
                                                        ),
                                                    )
                                                  : "Próxima renovación"}
                                        </span>
                                    </div>

                                    {planChangePreview
                                        .changeType ===
                                    "immediate" ? (
                                        <div className="mt-4 flex items-start justify-between gap-4 border-t border-slate-200 pt-4">
                                            <span className="text-sm text-slate-500">
                                                {planChangePreview
                                                    .billingPeriod ===
                                                "annual_installments"
                                                    ? "Cobro al continuar"
                                                    : "Cobro estimado ahora"}
                                            </span>

                                            <span className="text-right text-lg font-black text-blue-700">
                                                {new Intl.NumberFormat(
                                                    "es-MX",
                                                    {
                                                        style:
                                                            "currency",

                                                        currency:
                                                            planChangePreview.currency.toUpperCase(),
                                                    },
                                                ).format(
                                                    planChangePreview.amountDueNow,
                                                )}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="mt-4 border-t border-slate-200 pt-4 text-xs font-semibold leading-5 text-slate-500">
                                            No se realizará ningún cobro ahora. El cambio se aplicará al terminar el periodo actual.
                                        </p>
                                    )}

                                    {planChangeApplied ? (
                                        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold leading-6 text-emerald-800">
                                            {planChangePreview
                                                .changeType ===
                                            "immediate"
                                                ? "El cambio de plan se aplicó correctamente."
                                                : "El cambio quedó programado para la próxima renovación."}

                                            <a
                                                href="/administracion/suscripcion"
                                                className="mt-3 flex w-full items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-3 font-bold text-emerald-700 transition hover:bg-emerald-100"
                                            >
                                                Volver a la suscripción
                                            </a>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={
                                                isApplyingPlanChange
                                            }
                                            onClick={() =>
                                                void applyPlanChange()
                                            }
                                            className="mt-5 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white transition hover:from-blue-700 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isApplyingPlanChange
                                                ? planChangePreview
                                                      .billingPeriod ===
                                                  "annual_installments"
                                                    ? "Preparando pago..."
                                                    : "Aplicando cambio..."
                                                : planChangePreview
                                                      .billingPeriod ===
                                                  "annual_installments"
                                                  ? "Continuar al pago"
                                                  : planChangePreview
                                                        .changeType ===
                                                    "immediate"
                                                    ? "Confirmar y aplicar ahora"
                                                    : "Programar cambio"}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {checkoutError && (
                        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700">
                            {checkoutError}
                        </p>
                    )}

                    {selectedItems.some(
                        (item) =>
                            item.itemKey ===
                            "campaigns",
                    ) && (
                        <p className="mt-5 text-xs leading-5 text-slate-400">
                            Las tarifas de proveedores externos, como Meta, WhatsApp y servicios de correo, no están incluidas.
                        </p>
                    )}
                </div>
            </aside>
        </section>
    );
}