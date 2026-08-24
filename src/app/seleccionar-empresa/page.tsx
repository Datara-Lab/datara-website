"use client";

import {
    useOrganizationList,
    useUser,
} from "@clerk/nextjs";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
    useEffect,
    useRef,
    useState,
} from "react";

type DataraOrganization = {
    organizationId: string;
    tenantId: string;
    name: string;
    industry: string | null;
    status: string;
};

type OrganizationsResponse = {
    success: boolean;

    data?: {
        organizations:
            DataraOrganization[];
    };

    error?: string;
};

export default function SeleccionarEmpresaPage() {
    const router =
        useRouter();

    const {
        isLoaded: isUserLoaded,
        isSignedIn,
    } = useUser();

    const {
        isLoaded:
        isOrganizationListLoaded,

        setActive,

        userMemberships,
    } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });

    const [
        activatingOrganizationId,
        setActivatingOrganizationId,
    ] = useState<
        string | null
    >(
        null,
    );

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(
        null,
    );

    const [
        dataraOrganizations,
        setDataraOrganizations,
    ] = useState<
        DataraOrganization[]
    >([]);

    const [
        isLoadingOrganizations,
        setIsLoadingOrganizations,
    ] = useState(true);

    const [
        failedLogoTenantIds,
        setFailedLogoTenantIds,
    ] = useState<
        string[]
    >([]);

    const autoActivationStarted =
        useRef(false);

    useEffect(() => {
        let isActive = true;

        async function loadOrganizations() {
            try {
                const response =
                    await fetch(
                        "/api/organizations",
                        {
                            cache:
                                "no-store",
                        },
                    );

                const result =
                    (await response.json()) as
                        OrganizationsResponse;

                if (
                    !response.ok ||
                    !result.success ||
                    !result.data
                ) {
                    throw new Error(
                        result.error ??
                            "No fue posible cargar tus empresas.",
                    );
                }

                if (!isActive) {
                    return;
                }

                setDataraOrganizations(
                    result.data
                        .organizations,
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
                        : "No fue posible cargar tus empresas.",
                );
            } finally {
                if (isActive) {
                    setIsLoadingOrganizations(
                        false,
                    );
                }
            }
        }

        void loadOrganizations();

        return () => {
            isActive = false;
        };
    }, []);

    const memberships =
        userMemberships.data ??
        [];

    const onlyOrganizationId =
        memberships.length === 1
            ? memberships[0]
                .organization.id
            : null;

    useEffect(() => {
        if (
            !isUserLoaded ||
            !isSignedIn ||
            !isOrganizationListLoaded ||
            !setActive ||
            !onlyOrganizationId ||
            autoActivationStarted.current
        ) {
            return;
        }

        autoActivationStarted.current =
            true;

        const activateOrganization =
            setActive;

        let isCancelled =
            false;

        async function openOnlyOrganization() {
            try {
                setActivatingOrganizationId(
                    onlyOrganizationId,
                );

                setError(
                    null,
                );

                await activateOrganization({
                    organization:
                        onlyOrganizationId,

                    navigate: async ({
                        decorateUrl,
                    }) => {
                        if (isCancelled) {
                            return;
                        }

                        const destination =
                            decorateUrl(
                                "/portal",
                            );

                        if (
                            destination.startsWith(
                                "http",
                            )
                        ) {
                            window.location.href =
                                destination;

                            return;
                        }

                        window.location.assign(
                            destination,
                        );
                    },
                });
            } catch (
                activationError
            ) {
                if (isCancelled) {
                    return;
                }

                setError(
                    activationError instanceof
                        Error
                        ? activationError.message
                        : "No fue posible abrir la empresa.",
                );

                setActivatingOrganizationId(
                    null,
                );
            }
        }

        void openOnlyOrganization();

        return () => {
            isCancelled =
                true;
        };
    }, [
        isUserLoaded,
        isSignedIn,
        isOrganizationListLoaded,
        setActive,
        onlyOrganizationId,
    ]);

    async function selectOrganization(
        organizationId: string,
    ) {
        if (!setActive) {
            return;
        }

        try {
            setActivatingOrganizationId(
                organizationId,
            );

            setError(
                null,
            );

            await setActive({
                organization:
                    organizationId,

                navigate: async ({
                    decorateUrl,
                }) => {
                    const destination =
                        decorateUrl(
                            "/portal",
                        );

                    if (
                        destination.startsWith(
                            "http",
                        )
                    ) {
                        window.location.href =
                            destination;
                        return;
                    }

                    window.location.assign(
                            destination,
                        );
                },
            });
        } catch (
        selectionError
        ) {
            setError(
                selectionError instanceof
                    Error
                    ? selectionError.message
                    : "No fue posible seleccionar la empresa.",
            );

            setActivatingOrganizationId(
                null,
            );
        }
    }

    if (
        activatingOrganizationId ||
        (
            isSignedIn &&
            onlyOrganizationId
        )
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                    <p className="mt-5 text-sm font-semibold text-slate-500">
                        Preparando tu Workspace...
                    </p>
                </div>
            </main>
        );
    }

    if (
        !isUserLoaded ||
        !isOrganizationListLoaded ||
        isLoadingOrganizations
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
                <p className="text-sm font-semibold text-slate-500">
                    Preparando tus empresas...
                </p>
            </main>
        );
    }

    if (!isSignedIn) {
        router.replace(
            "/login",
        );

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
                <p className="text-sm font-semibold text-slate-500">
                    Abriendo inicio de sesión...
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-50 px-5 py-12 sm:px-8">
            <section className="mx-auto max-w-4xl">
                <div className="text-center">
                    <Image
                        src="/logos/lab.png"
                        alt="Datara Lab"
                        width={460}
                        height={150}
                        priority
                        className="mx-auto h-auto w-full max-w-[320px] object-contain"
                    />

                    <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                        Datara Workspace
                    </p>

                    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        Selecciona la empresa
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
                        Elige el espacio de trabajo que quieres administrar durante esta sesión.
                    </p>
                </div>

                {error && (
                    <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}

                {memberships.length ===
                    0 ? (
                    <div className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-amber-200 bg-white p-8 text-center shadow-sm">
                        <h2 className="text-xl font-black text-slate-950">
                            No encontramos empresas
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Tu cuenta todavía no pertenece a una organización de Datara.
                        </p>
                    </div>
                ) : (
                    <div className="mt-10 grid gap-5 md:grid-cols-2">
                        {memberships.map(
                            (
                                membership,
                            ) => {
                                const organization =
                                    membership.organization;

                                const dataraOrganization =
                                    dataraOrganizations
                                        .find(
                                            (
                                                candidate,
                                            ) =>
                                                candidate.organizationId ===
                                                organization.id,
                                        );

                                const organizationName =
                                    dataraOrganization
                                        ?.name ??
                                    organization.name;

                                const isActivating =
                                    activatingOrganizationId ===
                                    organization.id;

                                return (
                                    <button
                                        key={
                                            organization.id
                                        }
                                        type="button"
                                        disabled={
                                            activatingOrganizationId !==
                                            null
                                        }
                                        onClick={() =>
                                            void selectOrganization(
                                                organization.id,
                                            )
                                        }
                                        className="group rounded-[28px] border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <div className="flex items-center gap-4">
                                            {dataraOrganization &&
                                            !failedLogoTenantIds.includes(
                                                dataraOrganization
                                                    .tenantId,
                                            ) ? (
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                                                    <Image
                                                        src={`/api/settings/company-logo/content?tenant=${encodeURIComponent(
                                                            dataraOrganization
                                                                .tenantId,
                                                        )}`}
                                                        alt={`Logo de ${organizationName}`}
                                                        width={56}
                                                        height={56}
                                                        unoptimized
                                                        onError={() => {
                                                            const tenantId =
                                                                dataraOrganization
                                                                    .tenantId;

                                                            setFailedLogoTenantIds(
                                                                (
                                                                    currentTenantIds,
                                                                ) =>
                                                                    currentTenantIds.includes(
                                                                        tenantId,
                                                                    )
                                                                        ? currentTenantIds
                                                                        : [
                                                                              ...currentTenantIds,
                                                                              tenantId,
                                                                          ],
                                                            );
                                                        }}
                                                        className="h-full w-full object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-xl font-black text-white">
                                                    {organizationName
                                                        .charAt(
                                                            0,
                                                        )
                                                        .toUpperCase()}
                                                </span>
                                            )}

                                            <div className="min-w-0">
                                                <h2 className="truncate text-xl font-black text-slate-950">
                                                    {
                                                        organizationName
                                                    }
                                                </h2>

                                                <p className="mt-1 text-sm capitalize text-slate-500">
                                                    {membership.role.replace(
                                                        "org:",
                                                        "",
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="mt-6 text-sm font-bold text-blue-700">
                                            {isActivating
                                                ? "Abriendo empresa..."
                                                : "Entrar al Workspace →"}
                                        </p>
                                    </button>
                                );
                            },
                          )}

                          <button
                              type="button"
                              onClick={() =>
                                  router.push(
                                      "/contratar",
                                  )
                              }
                              className="group rounded-[28px] border border-dashed border-blue-300 bg-blue-50/40 p-7 text-left transition hover:-translate-y-1 hover:border-blue-500 hover:bg-blue-50 hover:shadow-xl"
                          >
                              <div className="flex items-center gap-4">
                                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl font-black text-white">
                                      +
                                  </span>

                                  <div className="min-w-0">
                                      <h2 className="text-xl font-black text-slate-950">
                                          Agregar empresa
                                      </h2>

                                      <p className="mt-1 text-sm text-slate-500">
                                          Contrata productos Datara para una nueva empresa.
                                      </p>
                                  </div>
                              </div>

                              <p className="mt-6 text-sm font-bold text-blue-700">
                                  Crear nuevo Workspace →
                              </p>
                          </button>
                      </div>
                )}
            </section>
        </main>
    );
}