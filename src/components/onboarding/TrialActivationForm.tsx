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

import {
    professionalServiceProfiles,
    professionalServiceProfileIds,
} from "@/config/crm/industries/professional-service-profiles";

import {
    mobilityProfiles,
    mobilityProfileIds,
} from "@/config/crm/industries/mobility-profiles";

import type {
    CRMIndustryProfileId,
} from "@/config/crm/industries/industry-profiles";

type TrialResponse = {
    success: boolean;

    data?: {
        organizationId: string;
        companyName: string;
        industry: string;
        industryProfile?: string | null;
        trialStartsAt: string;
        trialEndsAt: string;
    };

    error?: string;
};

type SynchronizationResponse = {
    success: boolean;
    error?: string;
};

type TrialActivationFormProps = {
    initialIndustry: string;
    initialProfile: CRMIndustryProfileId | null;
};

export default function TrialActivationForm({
    initialIndustry,
    initialProfile,
}: TrialActivationFormProps) {
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

    const sessionEmail =
        user
            ?.primaryEmailAddress
            ?.emailAddress ??
        user
            ?.emailAddresses[0]
            ?.emailAddress ??
        "";

    const resolvedOwnerEmail =
        ownerEmail ||
        sessionEmail;


    const [
        taxId,
        setTaxId,
    ] = useState("");

    const industry =
        initialIndustry;

    const [
        industryProfile,
        setIndustryProfile,
    ] = useState<CRMIndustryProfileId>(
        initialProfile ??
        (industry === "motorcycle_dealership" ? "motorcycle" : "general"),
    );

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
                                resolvedOwnerEmail
                                    .trim()
                                    .toLowerCase(),

                            taxId,
                            industry,

                            industryProfile:
                                industryProfile,
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
            {(industry === "professional_services" ||
                industry === "motorcycle_dealership") && (
                <div>
                    <label htmlFor="industryProfile" className="text-sm font-bold text-slate-800">
                        {industry === "motorcycle_dealership" ? "Perfil de movilidad" : "Perfil de servicios"}
                    </label>
                    <select id="industryProfile" name="industryProfile" value={industryProfile} disabled={isSubmitting}
                        onChange={(event) => setIndustryProfile(event.target.value as CRMIndustryProfileId)}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100">
                        {(industry === "motorcycle_dealership" ? mobilityProfileIds : professionalServiceProfileIds).map((profileId) => (
                            <option key={profileId} value={profileId}>
                                {industry === "motorcycle_dealership"
                                    ? mobilityProfiles[profileId as keyof typeof mobilityProfiles].name
                                    : professionalServiceProfiles[profileId as keyof typeof professionalServiceProfiles].name}
                            </option>
                        ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        {industry === "motorcycle_dealership"
                            ? mobilityProfiles[industryProfile as keyof typeof mobilityProfiles].shortDescription
                            : professionalServiceProfiles[industryProfile as keyof typeof professionalServiceProfiles].shortDescription}
                    </p>
                </div>
            )}

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
                        resolvedOwnerEmail
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
                    ? "Preparando Datara DBP..."
                    : "Activar demo de 14 días"}
            </Button>

            <p className="text-center text-xs leading-5 text-slate-500">
                No necesitas tarjeta. El demo incluye el template completo de tu industria.
            </p>
        </form>
    );
}
