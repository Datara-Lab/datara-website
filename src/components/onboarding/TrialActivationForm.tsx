"use client";

import {
    useClerk,
    useOrganizationList,
    useUser,
} from "@clerk/nextjs";

import {
    useRouter,
} from "next/navigation";

import {
    type FormEvent,
    useState,
} from "react";

import Button from "@/components/ui/Button";

type TrialResponse = {
    success: boolean;

    data?: {
        organizationId: string;
        companyName: string;
        industry: string;
        trialStartsAt: string;
        trialEndsAt: string;
    };

    error?: string;
};

type SynchronizationResponse = {
    success: boolean;
    error?: string;
};

export default function TrialActivationForm() {
    const router =
        useRouter();

    const {
        signOut,
    } = useClerk();

    const {
        user,
    } = useUser();

    const {
        setActive,
    } = useOrganizationList();

    const [
        companyName,
        setCompanyName,
    ] = useState("");

    const [
        ownerEmail,
        setOwnerEmail,
    ] = useState("");

    const [
        taxId,
        setTaxId,
    ] = useState("");

    const [
        industry,
        setIndustry,
    ] = useState("");

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        try {
            setIsSubmitting(true);
            setError(null);

            const trialResponse =
                await fetch(
                    "/api/onboarding/trial",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            companyName,

                            ownerEmail:
                                ownerEmail
                                    .trim()
                                    .toLowerCase(),

                            taxId,
                            industry,
                        }),
                    },
                );

            const trialResult =
                (await trialResponse.json()) as
                TrialResponse;

            if (
                !trialResponse.ok ||
                !trialResult.success ||
                !trialResult.data
            ) {
                throw new Error(
                    trialResult.error ??
                    "No fue posible activar el demo.",
                );
            }

            if (!setActive) {
                throw new Error(
                    "No fue posible activar la empresa en tu sesión.",
                );
            }

            await setActive({
                organization:
                    trialResult.data
                        .organizationId,
            });

            const synchronizationResponse =
                await fetch(
                    "/api/onboarding/sync",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            organizationId:
                                trialResult.data
                                    .organizationId,
                        }),
                    },
                );

            const synchronizationResult =
                (await synchronizationResponse
                    .json()) as
                SynchronizationResponse;

            if (
                !synchronizationResponse.ok ||
                !synchronizationResult.success
            ) {
                throw new Error(
                    synchronizationResult.error ??
                    "La empresa fue creada, pero no fue posible preparar el CRM.",
                );
            }

            router.replace(
                "/crm",
            );

            router.refresh();
        } catch (
        submissionError
        ) {
            setError(
                submissionError instanceof
                    Error
                    ? submissionError.message
                    : "No fue posible activar el demo.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form
            className="space-y-6"
            onSubmit={
                handleSubmit
            }
        >
            <div>
                <label
                    htmlFor="ownerEmail"
                    className="text-sm font-bold text-slate-800"
                >
                    Correo del propietario
                </label>

                <input
                    id="ownerEmail"
                    name="ownerEmail"
                    type="email"
                    required
                    autoComplete="email"
                    value={
                        ownerEmail
                    }
                    disabled={
                        isSubmitting
                    }
                    onChange={(
                        event,
                    ) =>
                        setOwnerEmail(
                            event.target.value,
                        )
                    }
                    placeholder="nombre@empresa.com"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                    Este correo será el propietario de la empresa y deberá verificarse antes de crearla.
                </p>

                {user
                    ?.primaryEmailAddress
                    ?.emailAddress && (
                    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold text-slate-600">
                            Sesión actual:{" "}
                            <span className="text-slate-950">
                                {
                                    user
                                        .primaryEmailAddress
                                        .emailAddress
                                }
                            </span>
                        </p>

                        <button
                            type="button"
                            disabled={
                                isSubmitting
                            }
                            onClick={() =>
                                void signOut({
                                    redirectUrl:
                                        "/login?redirect_url=%2Fdemo",
                                })
                            }
                            className="text-left text-xs font-bold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-right"
                        >
                            Usar otra cuenta
                        </button>
                    </div>
                )}
            </div>

            <div>
                <label
                    htmlFor="companyName"
                    className="text-sm font-bold text-slate-800"
                >
                    Nombre de la empresa
                </label>

                <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
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
                            event.target.value,
                        )
                    }
                    placeholder="Ej. Motores del Centro"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
            </div>

            <div>
                <label
                    htmlFor="taxId"
                    className="text-sm font-bold text-slate-800"
                >
                    RFC
                </label>

                <input
                    id="taxId"
                    name="taxId"
                    type="text"
                    required
                    minLength={12}
                    maxLength={13}
                    autoCapitalize="characters"
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
                            event.target.value
                                .toUpperCase(),
                        )
                    }
                    placeholder="Ej. MOC010203AB4"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 uppercase text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                    Se utiliza para limitar el demo gratuito a una activación por contribuyente.
                </p>
            </div>

            <div>
                <label
                    htmlFor="industry"
                    className="text-sm font-bold text-slate-800"
                >
                    Industria
                </label>

                <select
                    id="industry"
                    name="industry"
                    required
                    value={
                        industry
                    }
                    disabled={
                        isSubmitting
                    }
                    onChange={(
                        event,
                    ) =>
                        setIndustry(
                            event.target.value,
                        )
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                    <option
                        value=""
                        disabled
                    >
                        Selecciona una industria
                    </option>

                    <option value="motorcycle_dealership">
                        Agencia de motocicletas
                    </option>

                    <option value="professional_services">
                        Servicios profesionales
                    </option>
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                    Activaremos los módulos, catálogos y roles correspondientes a la industria seleccionada.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            <Button
                type="submit"
                size="lg"
                className="w-full justify-center"
                disabled={
                    isSubmitting
                }
            >
                {isSubmitting
                    ? "Preparando tu CRM..."
                    : "Activar demo de 14 días"}
            </Button>

            <p className="text-center text-xs leading-5 text-slate-500">
                No necesitas tarjeta. El demo incluye el template completo de tu industria.
            </p>
        </form>
    );
}