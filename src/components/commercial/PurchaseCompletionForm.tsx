"use client";

import {
    useOrganizationList,
} from "@clerk/nextjs";

import Image from "next/image";

import {
    getDataraProduct,
    type DataraProductKey,
} from "@/config/datara-products";

import {
    type FormEvent,
    useState,
} from "react";

type PurchaseCompletionFormProps = {
    productKey: DataraProductKey;
    checkoutSessionId: string;
    ownerEmail: string;
    industry: string;
    billingPeriod: string;
    totalAmount: string;
    currency: string;
};

type CompletionResponse = {
    success: boolean;

    data?: {
        organizationId: string;
        purchaseId: string;
    };

    error?: string;
};

type SynchronizationResponse = {
    success: boolean;
    error?: string;
};

export default function PurchaseCompletionForm({
    productKey,
    checkoutSessionId,
    ownerEmail,
    industry,
    billingPeriod,
    totalAmount,
    currency,
}: PurchaseCompletionFormProps) {

    const product =
        getDataraProduct(
            productKey,
        );

    const {
        setActive,
    } = useOrganizationList();

    const [
        companyName,
        setCompanyName,
    ] = useState("");

    const [
        taxId,
        setTaxId,
    ] = useState("");

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(
        null,
    );

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        try {
            setIsSubmitting(
                true,
            );

            setError(
                null,
            );

            const response =
                await fetch(
                    "/api/onboarding/purchase",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                checkoutSessionId,

                                companyName,

                                taxId,
                            }),
                    },
                );

            const result =
                (await response.json()) as
                CompletionResponse;

            if (
                !response.ok ||
                !result.success ||
                !result.data
            ) {
                throw new Error(
                    result.error ??
                    "No fue posible completar la contratación.",
                );
            }

            if (!setActive) {
                throw new Error(
                    "No fue posible activar la organización.",
                );
            }

            await setActive({
                organization:
                    result.data
                        .organizationId,
            });

            const synchronizationResponse =
                await fetch(
                    "/api/onboarding/sync",
                    {
                        method:
                            "POST",
                    },
                );

            const synchronizationResult =
                (await synchronizationResponse.json()) as
                SynchronizationResponse;

            if (
                !synchronizationResponse.ok ||
                !synchronizationResult.success
            ) {
                throw new Error(
                    synchronizationResult.error ??
                    "La empresa fue creada, pero no fue posible sincronizarla.",
                );
            }

            window.location.assign(
                product.applicationPath,
            );
        } catch (
        submissionError
        ) {
            setError(
                submissionError instanceof
                    Error
                    ? submissionError
                        .message
                    : "No fue posible completar la contratación.",
            );

            setIsSubmitting(
                false,
            );
        }
    }

    return (
        <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <form
                onSubmit={
                    handleSubmit
                }
                className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-10"
            >
                <div className="flex flex-wrap items-center justify-between gap-5">
                    <Image
                        src={
                            product.logoPath
                        }
                        alt={
                            product.name
                        }
                        width={
                            220
                        }
                        height={
                            72
                        }
                        priority
                        className="h-14 w-auto object-contain"
                    />

                    <span
                        className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white"
                        style={{
                            backgroundColor:
                                product.accentColor,
                        }}
                    >
                        Último paso
                    </span>
                </div>

                <h1 className="mt-8 text-3xl font-black tracking-tight text-slate-950">
                    Configura tu empresa para {product.name}
                </h1>

                <p className="mt-4 max-w-2xl leading-7 text-slate-600">
                    Utilizaremos estos datos para crear la organización, activar la suscripción y preparar las funciones contratadas.
                </p>

                <div className="mt-8 space-y-6">
                    <label className="block text-sm font-bold text-slate-800">
                        Correo del propietario

                        <input
                            type="email"
                            value={
                                ownerEmail
                            }
                            readOnly
                            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 font-normal text-slate-500 outline-none"
                        />

                        <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
                            Este correo ya fue verificado mediante tu cuenta y el pago.
                        </span>
                    </label>

                    <label className="block text-sm font-bold text-slate-800">
                        Nombre de la empresa

                        <input
                            type="text"
                            required
                            minLength={
                                2
                            }
                            maxLength={
                                100
                            }
                            autoComplete="organization"
                            value={
                                companyName
                            }
                            disabled={
                                isSubmitting
                            }
                            onChange={(
                                event,
                            ) =>
                                setCompanyName(
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Ej. Motores del Centro"
                            className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                    </label>

                    <label className="block text-sm font-bold text-slate-800">
                        RFC

                        <input
                            type="text"
                            required
                            minLength={
                                12
                            }
                            maxLength={
                                13
                            }
                            autoComplete="off"
                            value={
                                taxId
                            }
                            disabled={
                                isSubmitting
                            }
                            onChange={(
                                event,
                            ) =>
                                setTaxId(
                                    event.target
                                        .value
                                        .toUpperCase(),
                                )
                            }
                            placeholder="RFC de la empresa"
                            className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-mono font-normal uppercase text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                    </label>
                </div>

                {error && (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold leading-6 text-red-700">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={
                        isSubmitting
                    }
                    className="mt-8 flex w-full items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                        backgroundColor:
                            product.accentColor,
                    }}
                >
                    {isSubmitting
                        ? `Preparando ${product.name}...`
                        : `Crear empresa y abrir ${product.shortName}`}
                </button>
            </form>

            <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
                <Image
                    src={
                        product.iconPath
                    }
                    alt={
                        product.name
                    }
                    width={
                        64
                    }
                    height={
                        64
                    }
                    className="h-14 w-14 object-contain"
                />

                <p
                    className="mt-5 text-sm font-bold uppercase tracking-[0.14em]"
                    style={{
                        color:
                            product.accentColor,
                    }}
                >
                    {product.name}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                    Contratación pagada
                </p>

                <div className="mt-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <span className="text-sm text-slate-500">
                            Industria
                        </span>

                        <span className="text-right text-sm font-bold text-slate-900">
                            {industry}
                        </span>
                    </div>

                    <div className="flex items-start justify-between gap-4 border-t border-slate-200 pt-4">
                        <span className="text-sm text-slate-500">
                            Periodicidad
                        </span>

                        <span className="text-sm font-bold text-slate-900">
                            {billingPeriod ===
                                "annual"
                                ? "Anual"
                                : "Mensual"}
                        </span>
                    </div>

                    <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-4">
                        <span className="text-sm text-slate-500">
                            Total
                        </span>

                        <span className="text-2xl font-black text-slate-950">
                            {new Intl.NumberFormat(
                                "es-MX",
                                {
                                    style:
                                        "currency",

                                    currency:
                                        currency.toUpperCase(),
                                },
                            ).format(
                                Number(
                                    totalAmount,
                                ),
                            )}{" "}
                            <span className="text-sm font-bold text-slate-500">
                                {currency.toUpperCase()}
                            </span>
                        </span>
                    </div>
                </div>

                <p className="mt-5 text-xs leading-5 text-slate-500">
                    El cobro recurrente será administrado por Stripe conforme a la periodicidad seleccionada.
                </p>
            </aside>
        </section>
    );
}