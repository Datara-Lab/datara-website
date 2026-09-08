"use client";

import {
    use,
    useEffect,
    useState,
} from "react";

type PublicCredentialResponse = {
    success: boolean;
    available?: boolean;
    status?: string;
    error?: string;

    credential?: {
        type: string;
        issuedAt: string;
        expiresAt: string | null;
    };

    organization?: {
        name: string;
        slug?: string;
        tagline: string | null;
        logoObjectKey?: string | null;
        primaryColor: string;
        secondaryColor: string;
    };

    person?: {
        firstName: string;
        lastName: string | null;
        photoObjectKey: string | null;
        employeeNumber: string | null;
        jobTitle: string | null;
        department: string | null;
        email: string | null;
        phone: string | null;
        location: string | null;
        linkedInUrl: string | null;
        professionalBio: string | null;
        hiredAt: string | null;
    };
};

type PageProps = {
    params: Promise<{
        token: string;
    }>;
};

export default function PublicCredentialPage({
    params,
}: PageProps) {
    const {
        token,
    } =
        use(params);

    const [
        data,
        setData,
    ] =
        useState<PublicCredentialResponse | null>(
            null,
        );

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(true);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    useEffect(() => {
        let isCancelled =
            false;

        async function loadCredential() {
            setIsLoading(
                true,
            );

            setError(
                null,
            );

            try {
                const response =
                    await fetch(
                        `/api/public/id/${encodeURIComponent(
                            token,
                        )}`,
                        {
                            cache:
                                "no-store",
                        },
                    );

                const responseData =
                    (await response.json()) as PublicCredentialResponse;

                if (
                    !response.ok ||
                    !responseData.success
                ) {
                    throw new Error(
                        responseData.error ??
                        "No fue posible cargar la credencial.",
                    );
                }

                if (
                    !isCancelled
                ) {
                    setData(
                        responseData,
                    );
                }
            } catch (
            requestError
            ) {
                if (
                    !isCancelled
                ) {
                    setError(
                        requestError instanceof
                            Error
                            ? requestError.message
                            : "No fue posible cargar la credencial.",
                    );
                }
            } finally {
                if (
                    !isCancelled
                ) {
                    setIsLoading(
                        false,
                    );
                }
            }
        }

        void loadCredential();

        return () => {
            isCancelled =
                true;
        };
    }, [
        token,
    ]);

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                    <p className="mt-4 text-sm font-semibold text-slate-500">
                        Verificando credencial...
                    </p>
                </div>
            </main>
        );
    }

    if (
        error ||
        !data
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
                        ×
                    </div>

                    <h1 className="mt-5 text-xl font-black text-slate-950">
                        Credencial no disponible
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        {error ??
                            "No fue posible verificar esta credencial."}
                    </p>
                </div>
            </main>
        );
    }

    if (
        data.available ===
        false
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-xl font-black text-amber-700">
                        !
                    </div>

                    <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        {
                            data.organization
                                ?.name
                        }
                    </p>

                    <h1 className="mt-2 text-xl font-black text-slate-950">
                        Credencial no activa
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Esta credencial ya no se encuentra disponible para verificación.
                    </p>
                </div>
            </main>
        );
    }

    const person =
        data.person;

    const organization =
        data.organization;

    if (
        !person ||
        !organization
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <p className="text-sm font-semibold text-slate-500">
                    La información de esta credencial no está disponible.
                </p>
            </main>
        );
    }

    const fullName =
        [
            person.firstName,
            person.lastName,
        ]
            .filter(Boolean)
            .join(" ");

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
            <div className="mx-auto w-full max-w-lg">
                <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                    <div
                        className="h-2"
                        style={{
                            background:
                                `linear-gradient(90deg, ${organization.primaryColor}, ${organization.secondaryColor})`,
                        }}
                    />

                    <div className="p-6 sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                    Credencial verificada
                                </p>

                                <p className="mt-2 text-sm font-black text-slate-950">
                                    {
                                        organization.name
                                    }
                                </p>

                                {organization.tagline ? (
                                    <p className="mt-1 text-xs text-slate-500">
                                        {
                                            organization.tagline
                                        }
                                    </p>
                                ) : null}
                            </div>

                            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                Activa
                            </span>
                        </div>

                        <div className="mt-8 text-center">
                            <div
                                className="relative mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full text-4xl font-black text-white shadow-md"
                                style={{
                                    background:
                                        `linear-gradient(135deg, ${organization.primaryColor}, ${organization.secondaryColor})`,
                                }}
                            >
                                <span>
                                    {person.firstName
                                        .slice(
                                            0,
                                            1,
                                        )
                                        .toUpperCase()}

                                    {person.lastName
                                        ? person.lastName
                                            .slice(
                                                0,
                                                1,
                                            )
                                            .toUpperCase()
                                        : ""}
                                </span>

                                {person.photoObjectKey ? (
                                    <img
                                        src={`/api/public/id/${encodeURIComponent(
                                            token,
                                        )}/photo`}
                                        alt={
                                            fullName
                                        }
                                        className="absolute inset-0 h-full w-full object-cover"
                                        onError={(event) => {
                                            event.currentTarget.style.display =
                                                "none";
                                        }}
                                    />
                                ) : null}
                            </div>

                            <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
                                {
                                    fullName
                                }
                            </h1>

                            {person.jobTitle ? (
                                <p className="mt-2 text-sm font-bold text-slate-600">
                                    {
                                        person.jobTitle
                                    }
                                </p>
                            ) : null}

                            {person.department ? (
                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                    {
                                        person.department
                                    }
                                </p>
                            ) : null}
                        </div>

                        <div className="mt-8 space-y-3">
                            {person.employeeNumber ? (
                                <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                        ID de empleado
                                    </span>

                                    <span className="text-sm font-black text-slate-900">
                                        {
                                            person.employeeNumber
                                        }
                                    </span>
                                </div>
                            ) : null}

                            {person.location ? (
                                <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                        Ubicación
                                    </span>

                                    <span className="text-right text-sm font-bold text-slate-900">
                                        {
                                            person.location
                                        }
                                    </span>
                                </div>
                            ) : null}

                            {person.email ? (
                                <a
                                    href={`mailto:${person.email}`}
                                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50"
                                >
                                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                        Correo
                                    </span>

                                    <span className="break-all text-right text-sm font-bold text-blue-700">
                                        {
                                            person.email
                                        }
                                    </span>
                                </a>
                            ) : null}

                            {person.phone ? (
                                <a
                                    href={`tel:${person.phone}`}
                                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50"
                                >
                                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                        Teléfono
                                    </span>

                                    <span className="text-sm font-bold text-blue-700">
                                        {
                                            person.phone
                                        }
                                    </span>
                                </a>
                            ) : null}

                            {person.linkedInUrl ? (
                                <a
                                    href={
                                        person.linkedInUrl
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50"
                                >
                                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                        LinkedIn
                                    </span>

                                    <span className="text-sm font-bold text-blue-700">
                                        Ver perfil
                                    </span>
                                </a>
                            ) : null}
                        </div>

                        {person.professionalBio ? (
                            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                    Perfil
                                </p>

                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                    {
                                        person.professionalBio
                                    }
                                </p>
                            </div>
                        ) : null}

                        <div className="mt-8 border-t border-slate-100 pt-5 text-center">
                            <p className="text-xs font-semibold text-slate-400">
                                Identidad digital verificada por Datara
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}