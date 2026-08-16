"use client";

import Link from "next/link";
import {
    useEffect,
    useState,
} from "react";

import UserAccessDrawer from "@/components/administracion/UserAccessDrawer";

import InviteUserDrawer from "@/components/administracion/InviteUserDrawer";

type Product =
    | "crm"
    | "analytics"
    | "cloud";

type ProductAccess = {
    product: Product;
    enabled: boolean;
    allBranches: boolean;
    regionIds: string[];
    branches: Array<{
        branchId: string;
        isPrimary: boolean;
    }>;
    role: {
        id: string;
        key: string;
        name: string;
        product: Product | null;
    };
};

type OrganizationUser = {
    id: string;
    name: string;
    email: string;
    status:
    | "invited"
    | "active"
    | "suspended"
    | "removed";
    isCurrentUser: boolean;
    globalRole: {
        id: string;
        key: string;
        name: string;
        description: string | null;
        isSystem: boolean;
    } | null;
    productAccess: ProductAccess[];
};

type UsersResponse = {
    success: boolean;
    error?: string;
    data?: {
        organization: {
            id: string;
            name: string;
        };
        enabledProducts: Product[];

        regions: Array<{
            id: string;
            name: string;
            code: string;
            active: boolean;
        }>;

        branches: Array<{
            id: string;
            regionId: string | null;
            name: string;
            code: string;
            active: boolean;
        }>;

        users: OrganizationUser[];
    };
};

const productLabels: Record<Product, string> = {
    crm: "CRM",
    analytics: "Analytics",
    cloud: "Cloud",
};

export default function UsuariosPage() {
    const [data, setData] =
        useState<UsersResponse["data"]>(undefined);

    const [isLoading, setIsLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const [selectedUser, setSelectedUser] =
        useState<OrganizationUser | null>(null);

    const [isDrawerOpen, setIsDrawerOpen] =
        useState(false);

    const [
        isInviteDrawerOpen,
        setIsInviteDrawerOpen,
        ] = useState(false);

    const [
        successMessage,
        setSuccessMessage,
    ] = useState<string | null>(null);

    async function loadUsers() {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
            "/api/administracion/usuarios",
            {
                cache: "no-store",
            },
            );

            const result =
            (await response.json()) as UsersResponse;

            if (!response.ok || !result.success) {
            throw new Error(
                result.error ??
                "No fue posible cargar los usuarios.",
            );
            }

            setData(result.data);
        } catch (loadError) {
            setError(
            loadError instanceof Error
                ? loadError.message
                : "No fue posible cargar los usuarios.",
            );
        } finally {
            setIsLoading(false);
        }
        }

    useEffect(() => {
        void loadUsers();
    }, []);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeoutId = window.setTimeout(
            () => {
                setSuccessMessage(null);
            },
            4000,
        );

        return () => {
            window.clearTimeout(
                timeoutId,
            );
        };
    }, [successMessage]);

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
                {successMessage ? (
            <div className="fixed right-6 top-6 z-[200] max-w-sm rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-2xl">
                <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
                        ✓
                    </div>

                    <div>
                        <p className="text-sm font-black text-slate-950">
                            Operación completada
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            {successMessage}
                        </p>
                    </div>
                </div>
            </div>
        ) : null}
            <div className="mx-auto max-w-6xl">
                <Link
                    href="/administracion"
                    className="text-sm font-bold text-blue-700 hover:text-blue-800"
                >
                    ← Administración
                </Link>

                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                            Datara Workspace
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                            Usuarios
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            Administra los miembros de tu organización y
                            sus accesos a cada producto contratado.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setIsInviteDrawerOpen(true);
                        }}
                        className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                        >
                        Invitar usuario
                    </button>
                </div>

                {isLoading ? (
                    <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
                        Cargando usuarios...
                    </div>
                ) : null}

                {error ? (
                    <div className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                ) : null}

                {data ? (
                    <>
                        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                Organización
                            </p>

                            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-xl font-black text-slate-950">
                                    {data.organization.name}
                                </h2>

                                <p className="text-sm font-semibold text-slate-600">
                                    {data.users.length} usuario
                                    {data.users.length === 1 ? "" : "s"}
                                </p>
                            </div>
                        </section>

                        <div className="mt-6 grid gap-5">
                            {data.users.map((user) => (
                                <article
                                    key={user.id}
                                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                                >
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h2 className="text-lg font-black text-slate-950">
                                                    {user.name}
                                                </h2>

                                                {user.isCurrentUser ? (
                                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                                        Tú
                                                    </span>
                                                ) : null}

                                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700">
                                                    {user.status}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-sm text-slate-500">
                                                {user.email}
                                            </p>

                                            <p className="mt-3 text-sm font-semibold text-slate-700">
                                                Rol global:{" "}
                                                {user.globalRole?.name ??
                                                    "Sin rol asignado"}
                                            </p>
                                        </div>

                                        <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setIsDrawerOpen(true);
                                        }}
                                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                        >
                                        Administrar accesos
                                        </button>
                                    </div>

                                    <div className="mt-6 border-t border-slate-200 pt-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                            Productos y roles
                                        </p>

                                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                                            {data.enabledProducts.map(
                                                (product) => {
                                                    const access =
                                                        user.productAccess.find(
                                                            (item) =>
                                                                item.product ===
                                                                product,
                                                        );

                                                    return (
                                                        <div
                                                            key={product}
                                                            className={[
                                                                "rounded-2xl border p-4",
                                                                access?.enabled
                                                                    ? "border-emerald-200 bg-emerald-50/60"
                                                                    : "border-slate-200 bg-slate-50",
                                                            ].join(" ")}
                                                        >
                                                            <p className="text-sm font-black text-slate-950">
                                                                {
                                                                    productLabels[
                                                                    product
                                                                    ]
                                                                }
                                                            </p>

                                                            <p className="mt-2 text-xs font-semibold text-slate-600">
                                                                {access?.enabled
                                                                    ? access.role.name
                                                                    : "Sin acceso"}
                                                            </p>
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                ) : null}
            </div>
            <UserAccessDrawer
                isOpen={isDrawerOpen}
                memberId={selectedUser?.id ?? ""}
                userName={selectedUser?.name ?? ""}
                userEmail={selectedUser?.email ?? ""}
                globalRoleId={selectedUser?.globalRole?.id ?? null}
                globalRoleKey={selectedUser?.globalRole?.key ?? null}
                enabledProducts={data?.enabledProducts ?? []}
                productAccess={selectedUser?.productAccess ?? []}
                regions={data?.regions ?? []}
                branches={data?.branches ?? []}
                onSaved={async () => {
                    await loadUsers();
                }}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setSelectedUser(null);
                }}
            />
            <InviteUserDrawer
                isOpen={isInviteDrawerOpen}
                onSuccess={async (message) => {
                    await loadUsers();
                    setSuccessMessage(message);
                }}
                onClose={() =>
                    setIsInviteDrawerOpen(false)
                }
            />
        </main>
    );
}