"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    type ReactNode,
    useEffect,
    useMemo,
    useState,
} from "react";

import AccessPreparationScreen, {
    clearAccessPreparationProgress,
} from "@/components/auth/AccessPreparationScreen";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import CRMHeaderActions from "@/components/crm/CRMHeaderActions";
import { useAuth } from "@/contexts/AuthContext";
import { useCRMConfig } from "@/hooks/useCRMConfig";
import type { NavigationItem } from "@/lib/navigation";
import CRMAssistant from "@/components/crm/CRMAssistant";

type CRMLayoutProps = {
    children: ReactNode;
};

type NavigationSettingsResponse = {
    success: boolean;

    data?: {
        order: string[];

        labels:
            Record<
                string,
                string
            >;

        hiddenItemIds:
            string[];

        visibleModuleIds:
            string[];

        trial: {
            status: string;
            planKey: string;
            endsAt: string;
            daysRemaining: number;
            expired: boolean;
        } | null;
    };

    error?: string;
};

export default function CRMClientLayout({
    children,
}: CRMLayoutProps) {
    const router = useRouter();

    const {
        user,
        isAuthenticated,
        isLoading,
    } = useAuth();

    const {
        tenantConfig,
        navigation,
        isConfigured,
    } = useCRMConfig();

    const [
        navigationOrder,
        setNavigationOrder,
    ] = useState<string[]>([]);

    const [
        visibleModuleIds,
        setVisibleModuleIds,
    ] = useState<string[] | null>(
        null,
    );

    const [
        navigationLabels,
        setNavigationLabels,
    ] = useState<
        Record<
            string,
            string
        >
    >({});

    const [
        trial,
        setTrial,
    ] = useState<
        NavigationSettingsResponse[
            "data"
        ] extends infer Data
            ? Data extends {
                trial:
                    infer Trial;
            }
                ? Trial
                : null
            : null
    >(null);

    const [
        hiddenNavigationItemIds,
        setHiddenNavigationItemIds,
    ] = useState<string[]>([]);

    useEffect(() => {
        if (
            isLoading ||
            !isAuthenticated ||
            !user
        ) {
            return;
        }

        let isActive = true;

        async function loadNavigationOrder() {
            try {
                const response =
                    await fetch(
                        "/api/crm/settings/navigation",
                        {
                            cache:
                                "no-store",
                        },
                    );

                const result =
                    (await response.json()) as
                        NavigationSettingsResponse;

                if (
                    !response.ok ||
                    !result.success ||
                    !isActive
                ) {
                    return;
                }

                setNavigationOrder(
                    result.data?.order ??
                        [],
                );

                setVisibleModuleIds(
                    result.data
                        ?.visibleModuleIds ??
                        [],
                );

                setTrial(
                    result.data
                        ?.trial ??
                        null,
                );

                setNavigationLabels(
                    result.data?.labels ??
                        {},
                );

                setHiddenNavigationItemIds(
                    result.data
                        ?.hiddenItemIds ??
                        [],
                );
            } catch {
                /*
                 * Conservamos el orden universal
                 * cuando la configuración personalizada
                 * no puede cargarse.
                 */
            }
        }

        void loadNavigationOrder();

        return () => {
            isActive = false;
        };
    }, [
        isAuthenticated,
        isLoading,
        user,
    ]);

    useEffect(() => {
        if (
            isLoading ||
            !isAuthenticated ||
            !user
        ) {
            return;
        }

        const timeoutId =
            window.setTimeout(
                () => {
                    clearAccessPreparationProgress();
                },
                800,
            );

        return () => {
            window.clearTimeout(
                timeoutId,
            );
        };
    }, [
        isAuthenticated,
        isLoading,
        user,
    ]);

    const appNavigation =
        useMemo<NavigationItem[]>(() => {
            const savedPositions =
                new Map(
                    navigationOrder.map(
                        (
                            itemId,
                            index,
                        ) => [
                            itemId,
                            index,
                        ],
                    ),
                );

            return navigation
                .filter(
                    (
                        item,
                    ): item is typeof item & {
                        route: string;
                    } =>
                        typeof item.route ===
                        "string" &&
                        item.route.length > 0,
                )
                .filter(
                    (item) =>
                        item.id !==
                            "settings" &&
                        visibleModuleIds !==
                            null &&
                        !hiddenNavigationItemIds.includes(
                            item.id,
                        ) &&
                        (
                            item.id ===
                                "home" ||
                            (
                                typeof item.moduleId ===
                                    "string" &&
                                visibleModuleIds.includes(
                                    item.moduleId,
                                )
                            )
                        ),
                )
                .map(
                    (
                        item,
                        defaultIndex,
                    ) => ({
                        id: item.id,
                        label:
                            navigationLabels[
                                item.id
                            ] ??
                            item.label,
                        href:
                            item.route,
                        defaultIndex,
                    }),
                )
                .sort(
                    (
                        first,
                        second,
                    ) => {
                        const firstPosition =
                            savedPositions.get(
                                first.id,
                            );

                        const secondPosition =
                            savedPositions.get(
                                second.id,
                            );

                        if (
                            firstPosition !==
                                undefined &&
                            secondPosition !==
                                undefined
                        ) {
                            return (
                                firstPosition -
                                secondPosition
                            );
                        }

                        if (
                            firstPosition !==
                            undefined
                        ) {
                            return -1;
                        }

                        if (
                            secondPosition !==
                            undefined
                        ) {
                            return 1;
                        }

                        return (
                            first.defaultIndex -
                            second.defaultIndex
                        );
                    },
                )
                .map(
                    ({
                        id,
                        label,
                        href,
                    }) => ({
                        id,
                        label,
                        href,
                    }),
                );
        }, [
            hiddenNavigationItemIds,
            navigation,
            navigationLabels,
            navigationOrder,
            visibleModuleIds,
        ]);

    /*
     * Esperamos a que Clerk cargue la sesión,
     * el usuario y la organización.
     */
    if (isLoading) {
        return (
            <AccessPreparationScreen
                stage="workspace"
            />
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
                    <h1 className="text-3xl font-bold text-slate-950">
                        Sesión no disponible
                    </h1>

                    <p className="mt-4 text-slate-500">
                        Inicia sesión para acceder a Datara CRM.
                    </p>

                    <Button
                        className="mt-8 w-full justify-center"
                        size="lg"
                        onClick={() =>
                            router.push("/login")
                        }
                    >
                        Ir al inicio de sesión
                    </Button>
                </div>
            </main>
        );
    }

    const hasCRMAccess =
        user.products.includes("crm");

    if (!hasCRMAccess) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
                    <Image
                        src="/logos/crm.png"
                        alt="Datara CRM"
                        width={240}
                        height={90}
                        priority
                        className="mx-auto h-20 w-auto object-contain"
                    />

                    <h1 className="mt-8 text-3xl font-bold text-slate-950">
                        Aplicación no habilitada
                    </h1>

                    <p className="mt-4 text-slate-500">
                        Tu empresa no tiene acceso a Datara CRM.
                    </p>

                    <Button
                        className="mt-8 w-full justify-center"
                        size="lg"
                        onClick={() =>
                            router.push("/portal")
                        }
                    >
                        Volver al portal
                    </Button>
                </div>
            </main>
        );
    }

    if (!isConfigured || !tenantConfig) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-10 text-center shadow-xl">
                    <Image
                        src="/logos/crm-icon.png"
                        alt="Datara CRM"
                        width={64}
                        height={64}
                        priority
                        className="mx-auto h-16 w-16 object-contain"
                    />

                    <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
                        Configuración pendiente
                    </p>

                    <h1 className="mt-3 text-3xl font-bold text-slate-950">
                        El CRM de esta empresa aún no está configurado
                    </h1>

                    <p className="mt-4 leading-7 text-slate-500">
                        Datara no encontró una configuración de CRM asociada al espacio de
                        trabajo de tu empresa.
                    </p>

                    <Button
                        className="mt-8 w-full justify-center"
                        size="lg"
                        onClick={() =>
                            router.push("/portal")
                        }
                    >
                        Volver al portal
                    </Button>
                </div>
            </main>
        );
    }

    return (
        <AppShell
            product="crm"
            productName="Datara CRM"
            productLogo="/logos/crm-icon.png"
            navigation={appNavigation}
            headerContent={
                <div className="flex items-center gap-2">
                    <CRMHeaderActions />

                    {trial ? (
                        <div className="flex items-center gap-2">
                        <div
                            title={
                                trial.expired
                                    ? "Tu demo ha finalizado."
                                    : `Tu demo termina el ${new Date(
                                          trial.endsAt,
                                      ).toLocaleDateString(
                                          "es-MX",
                                          {
                                              day: "numeric",
                                              month: "long",
                                              year: "numeric",
                                          },
                                      )}.`
                            }
                            className={[
                                "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold sm:px-4",
                                trial.expired
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : trial.daysRemaining <=
                                        2
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-blue-200 bg-blue-50 text-blue-700",
                            ].join(" ")}
                        >
                            <span
                                className={[
                                    "h-2 w-2 shrink-0 rounded-full",
                                    trial.expired
                                        ? "bg-red-500"
                                        : trial.daysRemaining <=
                                            2
                                          ? "bg-amber-500"
                                          : "bg-blue-500",
                                ].join(" ")}
                            />

                            <span className="hidden sm:inline">
                                {trial.expired
                                    ? "El demo ha finalizado"
                                    : trial.daysRemaining ===
                                        1
                                      ? "Queda 1 día de demo"
                                      : `Quedan ${trial.daysRemaining} días de demo`}
                            </span>

                            <span className="sm:hidden">
                                {trial.expired
                                    ? "Demo vencido"
                                    : `${trial.daysRemaining} días`}
                            </span>
                        </div>

                        <Button
                            href={`/contratar?purchase=trial_conversion&industry=${encodeURIComponent(
                                user.industry ??
                                    "",
                            )}`}
                            size="sm"
                            className="whitespace-nowrap"
                        >
                            Contratar
                        </Button>
                        </div>
                    ) : null}
                </div>
            }
        >
            {trial?.expired ? (
                <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-50 px-6 py-12">
                    <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-10 text-center shadow-xl shadow-slate-950/5">
                        <Image
                            src="/logos/crm.png"
                            alt="Datara CRM"
                            width={300}
                            height={120}
                            priority
                            className="mx-auto h-auto w-full max-w-[240px] object-contain"
                        />

                        <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-red-600">
                            Demo finalizado
                        </p>

                        <h1 className="mt-3 text-3xl font-bold text-slate-950">
                            Tu periodo de prueba ha terminado
                        </h1>

                        <p className="mt-4 leading-7 text-slate-600">
                            Contrata Datara CRM para recuperar el acceso a tus módulos y continuar trabajando con la información registrada durante el demo.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button
                                href={`/contratar?purchase=trial_conversion&industry=${encodeURIComponent(
                                    user.industry ??
                                        "",
                                )}`}
                                size="lg"
                            >
                                Contratar Datara CRM
                            </Button>

                            <Button
                                type="button"
                                size="lg"
                                variant="secondary"
                                onClick={() =>
                                    router.push(
                                        "/portal",
                                    )
                                }
                            >
                                Volver al portal
                            </Button>
                        </div>
                    </div>
                </main>
            ) : (
                <>
                    {children}

                    <CRMAssistant
                        companyName={
                            user.tenantName
                        }
                    />
                </>
            )}
        </AppShell>
    );
}