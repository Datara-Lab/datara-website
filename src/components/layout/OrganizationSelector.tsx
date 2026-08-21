"use client";

import {
    useOrganization,
    useOrganizationList,
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

export default function OrganizationSelector() {
    const router = useRouter();

    const {
        organization,
    } = useOrganization();

    const {
        setActive,
    } = useOrganizationList();

    const detailsRef =
        useRef<HTMLDetailsElement>(
            null,
        );

    const [
        organizations,
        setOrganizations,
    ] = useState<
        DataraOrganization[]
    >([]);

    const [
        failedLogoTenantIds,
        setFailedLogoTenantIds,
    ] = useState<string[]>(
        [],
    );

    const [
        activatingOrganizationId,
        setActivatingOrganizationId,
    ] = useState<
        string | null
    >(null);

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

    useEffect(() => {
        let isActive = true;

        async function loadOrganizations() {
            try {
                setIsLoading(
                    true,
                );

                setError(
                    null,
                );

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

                setOrganizations(
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
                    setIsLoading(
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

    const activeOrganization =
        organizations.find(
            (candidate) =>
                candidate.organizationId ===
                organization?.id,
        ) ??
        null;

    if (
        !isLoading &&
        organizations.length <= 1
    ) {
        return null;
    }

    function markLogoAsFailed(
        tenantId: string,
    ) {
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
    }

    function renderLogo(
        dataraOrganization:
            DataraOrganization,
        size:
            | "small"
            | "large",
    ) {
        const hasFailed =
            failedLogoTenantIds.includes(
                dataraOrganization
                    .tenantId,
            );

        const sizeClasses =
            size ===
                "small"
                ? "h-8 w-8 rounded-lg text-sm"
                : "h-10 w-10 rounded-xl text-base";

        if (hasFailed) {
            return (
                <span
                    className={[
                        "flex shrink-0 items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 font-black text-white",
                        sizeClasses,
                    ].join(" ")}
                >
                    {dataraOrganization
                        .name
                        .charAt(0)
                        .toUpperCase()}
                </span>
            );
        }

        return (
            <span
                className={[
                    "flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white p-1 shadow-sm",
                    sizeClasses,
                ].join(" ")}
            >
                <Image
                    src={`/api/settings/company-logo/content?tenant=${encodeURIComponent(
                        dataraOrganization
                            .tenantId,
                    )}`}
                    alt={`Logo de ${dataraOrganization.name}`}
                    width={
                        size ===
                            "small"
                            ? 32
                            : 40
                    }
                    height={
                        size ===
                            "small"
                            ? 32
                            : 40
                    }
                    unoptimized
                    onError={() =>
                        markLogoAsFailed(
                            dataraOrganization
                                .tenantId,
                        )
                    }
                    className="h-full w-full object-contain"
                />
            </span>
        );
    }

    async function selectOrganization(
        organizationId: string,
    ) {
        if (
            !setActive ||
            organizationId ===
                organization?.id
        ) {
            detailsRef.current
                ?.removeAttribute(
                    "open",
                );

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
            });

            detailsRef.current
                ?.removeAttribute(
                    "open",
                );

            router.replace(
                "/portal",
            );

            router.refresh();
        } catch (
            selectionError
        ) {
            setError(
                selectionError instanceof
                    Error
                    ? selectionError.message
                    : "No fue posible seleccionar la empresa.",
            );
        } finally {
            setActivatingOrganizationId(
                null,
            );
        }
    }

    return (
        <details
            ref={detailsRef}
            className="relative hidden sm:block"
        >
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-blue-300">
                {activeOrganization
                    ? renderLogo(
                        activeOrganization,
                        "small",
                    )
                    : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-black text-white">
                            {organization
                                ?.name
                                .charAt(0)
                                .toUpperCase() ??
                                "D"}
                        </span>
                    )}

                <span className="max-w-40 truncate text-sm font-bold text-slate-800">
                    {activeOrganization
                        ?.name ??
                        organization
                            ?.name ??
                        "Empresa"}
                </span>

                <span className="text-xs text-slate-400">
                    ▾
                </span>
            </summary>

            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15">
                <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Cambiar empresa
                    </p>
                </div>

                <div className="max-h-80 space-y-1 overflow-y-auto p-2">
                    {isLoading ? (
                        <p className="px-3 py-4 text-sm font-semibold text-slate-500">
                            Cargando empresas...
                        </p>
                    ) : null}

                    {!isLoading &&
                        organizations.length ===
                        0 ? (
                        <p className="px-3 py-4 text-sm font-semibold text-slate-500">
                            No encontramos empresas disponibles.
                        </p>
                    ) : null}

                    {organizations.map(
                        (
                            dataraOrganization,
                        ) => {
                            const isCurrent =
                                dataraOrganization
                                    .organizationId ===
                                organization?.id;

                            const isActivating =
                                activatingOrganizationId ===
                                dataraOrganization
                                    .organizationId;

                            return (
                                <button
                                    key={
                                        dataraOrganization
                                            .organizationId
                                    }
                                    type="button"
                                    disabled={
                                        activatingOrganizationId !==
                                        null
                                    }
                                    onClick={() =>
                                        void selectOrganization(
                                            dataraOrganization
                                                .organizationId,
                                        )
                                    }
                                    className={[
                                        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                                        isCurrent
                                            ? "bg-blue-50"
                                            : "hover:bg-slate-50",
                                    ].join(" ")}
                                >
                                    {renderLogo(
                                        dataraOrganization,
                                        "large",
                                    )}

                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black text-slate-900">
                                            {
                                                dataraOrganization
                                                    .name
                                            }
                                        </span>

                                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                                            {isActivating
                                                ? "Abriendo..."
                                                : isCurrent
                                                    ? "Empresa activa"
                                                    : "Cambiar a esta empresa"}
                                        </span>
                                    </span>

                                    {isCurrent ? (
                                        <span className="text-sm font-black text-blue-600">
                                            ✓
                                        </span>
                                    ) : null}
                                </button>
                            );
                        },
                    )}
                </div>

                {error ? (
                    <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                        {error}
                    </div>
                ) : null}

                <button
                    type="button"
                    onClick={() => {
                        detailsRef.current
                            ?.removeAttribute(
                                "open",
                            );

                        router.push(
                            "/seleccionar-empresa",
                        );
                    }}
                    className="flex w-full items-center justify-center border-t border-slate-100 px-4 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                >
                    Ver todas las empresas
                </button>
            </div>
        </details>
    );
}