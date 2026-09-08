"use client";

import Link from "next/link";
import {
    useEffect,
    useState,
} from "react";

import PersonDrawer from "@/components/administracion/PersonDrawer";

type Person = {
    id: string;
    memberId: string | null;
    personCode: string;
    employeeNumber: string | null;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    jobTitle: string | null;
    department: string | null;
    location: string | null;
    photoObjectKey: string | null;
    personType: string;
    status: string;
    hiredAt: string | null;
    createdAt: string;
    hasSystemAccess: boolean;
};

type PeopleResponse = {
    success: boolean;
    people?: Person[];
    error?: string;
};

export default function PersonasPage() {
    const [
        people,
        setPeople,
    ] = useState<Person[]>([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    const [
        isPersonDrawerOpen,
        setIsPersonDrawerOpen,
    ] = useState(false);

    const [
        successMessage,
        setSuccessMessage,
    ] = useState<string | null>(
        null,
    );

    useEffect(() => {
        let active = true;

        async function loadPeople() {
            try {
                setLoading(true);
                setError(null);

                const response =
                    await fetch(
                        "/api/administracion/personas",
                        {
                            cache:
                                "no-store",
                        },
                    );

                const data =
                    (await response.json()) as PeopleResponse;

                if (!response.ok) {
                    throw new Error(
                        data.error ??
                            "No fue posible cargar las personas.",
                    );
                }

                if (!active) {
                    return;
                }

                setPeople(
                    data.people ?? [],
                );
            } catch (loadError) {
                if (!active) {
                    return;
                }

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "No fue posible cargar las personas.",
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadPeople();

        return () => {
            active = false;
        };
    }, []);

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
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
                            Organización
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                            Personas
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            Administra la información de las personas de tu
                            organización, sus datos laborales y sus
                            credenciales digitales.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setSuccessMessage(
                                null,
                            );

                            setIsPersonDrawerOpen(
                                true,
                            );
                        }}
                        className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                        Agregar persona
                    </button>
                </div>

                <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">
                                    Personas de la organización
                                </h2>

                                <p className="mt-1 text-sm text-slate-600">
                                    Usuarios con acceso y personas registradas
                                    sin acceso al sistema.
                                </p>
                            </div>

                            {!loading &&
                                !error && (
                                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                        {
                                            people.length
                                        }{" "}
                                        {people.length ===
                                        1
                                            ? "persona"
                                            : "personas"}
                                    </div>
                                )}
                        </div>
                    </div>

                    {loading && (
                        <div className="px-8 py-16 text-center">
                            <p className="text-sm font-semibold text-slate-500">
                                Cargando personas...
                            </p>
                        </div>
                    )}

                    {!loading &&
                        error && (
                            <div className="px-8 py-16 text-center">
                                <p className="font-bold text-red-600">
                                    {error}
                                </p>
                            </div>
                        )}

                    {!loading &&
                        !error &&
                        people.length ===
                            0 && (
                            <div className="px-8 py-16 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                                    👤
                                </div>

                                <h3 className="mt-5 text-lg font-black text-slate-950">
                                    Todavía no hay personas
                                </h3>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                                    Cuando agregues personas o usuarios a la
                                    organización, aparecerán aquí.
                                </p>
                            </div>
                        )}

                    {!loading &&
                        !error &&
                        people.length >
                            0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[850px]">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                                            <th className="px-6 py-4 sm:px-8">
                                                Persona
                                            </th>

                                            <th className="px-6 py-4">
                                                Puesto
                                            </th>

                                            <th className="px-6 py-4">
                                                Área
                                            </th>

                                            <th className="px-6 py-4">
                                                ID
                                            </th>

                                            <th className="px-6 py-4">
                                                Acceso
                                            </th>

                                            <th className="px-6 py-4">
                                                Estado
                                            </th>

                                            <th className="px-6 py-4 text-right">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {people.map(
                                            (
                                                person,
                                            ) => (
                                                <tr
                                                    key={
                                                        person.id
                                                    }
                                                    className="transition hover:bg-slate-50/70"
                                                >
                                                    <td className="px-6 py-5 sm:px-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-black text-white">
                                                                {
                                                                    person.firstName
                                                                        .charAt(
                                                                            0,
                                                                        )
                                                                        .toUpperCase()
                                                                }
                                                                {
                                                                    person.lastName
                                                                        ?.charAt(
                                                                            0,
                                                                        )
                                                                        .toUpperCase() ??
                                                                    ""
                                                                }
                                                            </div>

                                                            <div>
                                                                <p className="font-bold text-slate-950">
                                                                    {
                                                                        person.firstName
                                                                    }{" "}
                                                                    {
                                                                        person.lastName ??
                                                                        ""
                                                                    }
                                                                </p>

                                                                <p className="mt-0.5 text-xs text-slate-500">
                                                                    {
                                                                        person.email ??
                                                                        "Sin correo electrónico"
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-5 text-sm text-slate-700">
                                                        {
                                                            person.jobTitle ??
                                                            "—"
                                                        }
                                                    </td>

                                                    <td className="px-6 py-5 text-sm text-slate-700">
                                                        {
                                                            person.department ??
                                                            "—"
                                                        }
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        <span className="font-mono text-xs font-bold text-blue-700">
                                                            {
                                                                person.personType ===
                                                                "employee"
                                                                    ? person.employeeNumber ??
                                                                      "—"
                                                                    : "—"
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        {person.hasSystemAccess ? (
                                                            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                                                Con acceso
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                                                Sin acceso
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        {person.status ===
                                                        "active" ? (
                                                            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                                                Activa
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                                                Inactiva
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-5 text-right">
                                                        <Link
                                                            href={`/administracion/personas/${person.id}`}
                                                            className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                        >
                                                            Ver persona
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </section>

                {successMessage ? (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
                        {
                            successMessage
                        }
                    </div>
                ) : null}
            </div>

            <PersonDrawer
                isOpen={
                    isPersonDrawerOpen
                }
                onClose={() => {
                    setIsPersonDrawerOpen(
                        false,
                    );
                }}
                onSuccess={async (
                    message,
                ) => {
                    setSuccessMessage(
                        message,
                    );

                    const response =
                        await fetch(
                            "/api/administracion/personas",
                            {
                                cache:
                                    "no-store",
                            },
                        );

                    const data =
                        (await response.json()) as PeopleResponse;

                    if (
                        response.ok &&
                        data.success
                    ) {
                        setPeople(
                            data.people ??
                                [],
                        );
                    }
                }}
            />
        </main>
    );
}