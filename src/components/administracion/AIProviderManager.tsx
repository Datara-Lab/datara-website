"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";

type Provider = "gemini" | "openai";

type Configuration = {
    environment: string;
    enabled: boolean;
    provider: Provider;
    geminiModel: string;
    openAIModel: string;
    source: "database" | "environment";
};

type Usage = {
    provider: string;
    model: string;
    requests: number;
    successfulRequests: number;
    totalTokens: number;
    averageDurationMs: number;
    estimatedCostUsd: number;
    actualChargeUsd: number;
    billingMode: "free" | "paid";
};

type Dashboard = {
    configuration: Configuration;
    secrets: Record<Provider, boolean>;
    periodDays: number;
    usage: Usage[];
};

type Response = {
    success: boolean;
    data?: Dashboard;
    message?: string;
    error?: string;
};

const currency = new Intl.NumberFormat(
    "es-MX",
    {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 4,
    },
);

const number = new Intl.NumberFormat(
    "es-MX",
);

export default function AIProviderManager() {
    const [dashboard, setDashboard] =
        useState<Dashboard | null>(null);
    const [draft, setDraft] =
        useState<Configuration | null>(null);
    const [loading, setLoading] =
        useState(true);
    const [saving, setSaving] =
        useState(false);
    const [message, setMessage] =
        useState<string | null>(null);
    const [error, setError] =
        useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                "/api/platform/ai-provider",
                {
                    cache: "no-store",
                },
            );
            const result =
                await response.json() as Response;

            if (!response.ok || !result.data) {
                throw new Error(
                    result.error ??
                    "No fue posible cargar la administración de IA.",
                );
            }

            setDashboard(result.data);
            setDraft(result.data.configuration);
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "No fue posible cargar la administración de IA.",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    void load();
                },
                0,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, []);

    const totals = useMemo(() => {
        return (dashboard?.usage ?? [])
            .reduce(
                (total, item) => ({
                    requests:
                        total.requests + item.requests,
                    successful:
                        total.successful + item.successfulRequests,
                    tokens:
                        total.tokens + item.totalTokens,
                    cost:
                        total.cost + item.estimatedCostUsd,
                    actualCharge:
                        total.actualCharge + item.actualChargeUsd,
                }),
                {
                    requests: 0,
                    successful: 0,
                    tokens: 0,
                    cost: 0,
                    actualCharge: 0,
                },
            );
    }, [dashboard]);

    async function save() {
        if (!draft) return;

        setSaving(true);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch(
                "/api/platform/ai-provider",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(draft),
                },
            );
            const result =
                await response.json() as Response;

            if (!response.ok || !result.data) {
                throw new Error(
                    result.error ??
                    "No fue posible guardar la configuración.",
                );
            }

            setDashboard(result.data);
            setDraft(result.data.configuration);
            setMessage(
                result.message ??
                "Configuración guardada.",
            );
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "No fue posible guardar la configuración.",
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading || !dashboard || !draft) {
        return (
            <main className="min-h-screen bg-slate-50 p-8">
                <p className="text-sm font-semibold text-slate-600">
                    Cargando administración de IA…
                </p>
            </main>
        );
    }

    const activeSecret =
        dashboard.secrets[draft.provider];

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
            <div className="mx-auto max-w-7xl">
                <PageHeader
                    eyebrow="Datara Platform"
                    title="Administración de IA"
                    description="Controla el motor activo de este ambiente y consulta su consumo real. Las llaves permanecen protegidas como secretos de Cloudflare."
                />

                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {[
                        ["Consultas (30 días)", number.format(totals.requests)],
                        ["Tasa de éxito", totals.requests ? `${Math.round((totals.successful / totals.requests) * 100)}%` : "—"],
                        ["Tokens medidos", number.format(totals.tokens)],
                        ["Costo estimado", currency.format(totals.cost)],
                        ["Cargo real conocido", currency.format(totals.actualCharge)],
                    ].map(([label, value]) => (
                        <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                {label}
                            </p>
                            <p className="mt-2 text-2xl font-black text-slate-950">
                                {value}
                            </p>
                        </article>
                    ))}
                </div>

                <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                                Ambiente {draft.environment}
                            </p>
                            <h2 className="mt-2 text-2xl font-black text-slate-950">
                                Motor activo
                            </h2>
                        </div>

                        <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                            <span>{draft.enabled ? "Servicio encendido" : "Servicio pausado"}</span>
                            <input
                                type="checkbox"
                                checked={draft.enabled}
                                onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
                                className="h-5 w-5 accent-blue-600"
                            />
                        </label>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {(["gemini", "openai"] as Provider[]).map((provider) => {
                            const selected = draft.provider === provider;
                            const configured = dashboard.secrets[provider];
                            return (
                                <button
                                    key={provider}
                                    type="button"
                                    onClick={() => setDraft({ ...draft, provider })}
                                    className={[
                                        "rounded-2xl border p-5 text-left transition",
                                        selected
                                            ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                                            : "border-slate-200 bg-white hover:border-blue-300",
                                    ].join(" ")}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-lg font-black text-slate-950">
                                            {provider === "gemini" ? "Google Gemini" : "OpenAI"}
                                        </span>
                                        <span className={[
                                            "rounded-full px-3 py-1 text-xs font-bold",
                                            configured
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-800",
                                        ].join(" ")}
                                        >
                                            {configured ? "Secreto configurado" : "Falta secreto"}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        {provider === "gemini"
                                            ? "Adecuado para mantener Demo y Producción en la cuota gratuita mientras validamos el producto."
                                            : "Preparado para activar producción cuando llegue el primer cliente."}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <label className="text-sm font-bold text-slate-700">
                            Modelo Gemini
                            <input
                                value={draft.geminiModel}
                                onChange={(event) => setDraft({ ...draft, geminiModel: event.target.value })}
                                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500"
                            />
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                            Modelo OpenAI
                            <input
                                value={draft.openAIModel}
                                onChange={(event) => setDraft({ ...draft, openAIModel: event.target.value })}
                                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500"
                            />
                        </label>
                    </div>

                    {!activeSecret && draft.enabled && (
                        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                            No podrás guardar este proveedor encendido hasta configurar su secreto en Cloudflare.
                        </p>
                    )}

                    {message && (
                        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                            {message}
                        </p>
                    )}

                    {error && (
                        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            {error}
                        </p>
                    )}

                    <div className="mt-6 flex justify-end">
                        <Button
                            type="button"
                            onClick={() => void save()}
                            disabled={saving || (draft.enabled && !activeSecret)}
                        >
                            {saving ? "Guardando…" : "Guardar configuración"}
                        </Button>
                    </div>
                </section>

                <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-5">
                        <h2 className="text-xl font-black text-slate-950">
                            Consumo por proveedor y modelo
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Últimos {dashboard.periodDays} días. El costo estimado usa las tarifas públicas; el cargo real considera si el proveedor opera con cuota gratuita.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Proveedor / modelo</th>
                                    <th className="px-6 py-4">Consultas</th>
                                    <th className="px-6 py-4">Éxito</th>
                                    <th className="px-6 py-4">Latencia</th>
                                    <th className="px-6 py-4">Tokens</th>
                                    <th className="px-6 py-4">Costo</th>
                                    <th className="px-6 py-4">Cargo real</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboard.usage.map((item) => (
                                    <tr key={`${item.provider}-${item.model}`} className="border-t border-slate-100">
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            {item.provider} · {item.model}
                                        </td>
                                        <td className="px-6 py-4">{number.format(item.requests)}</td>
                                        <td className="px-6 py-4">
                                            {item.requests ? Math.round((item.successfulRequests / item.requests) * 100) : 0}%
                                        </td>
                                        <td className="px-6 py-4">{number.format(item.averageDurationMs)} ms</td>
                                        <td className="px-6 py-4">{number.format(item.totalTokens)}</td>
                                        <td className="px-6 py-4 font-bold">{currency.format(item.estimatedCostUsd)}</td>
                                        <td className="px-6 py-4 font-bold">
                                            {currency.format(item.actualChargeUsd)}
                                            <span className="ml-2 text-xs font-semibold text-slate-500">
                                                {item.billingMode === "free" ? "Cuota gratuita" : "Facturable"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {dashboard.usage.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                                            Todavía no hay consumo registrado en este ambiente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}
