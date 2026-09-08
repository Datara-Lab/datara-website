"use client";

import {
    useEffect,
    useState,
} from "react";

type PersonDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (
        message: string,
    ) => void | Promise<void>;
};

type PersonType =
    | "employee"
    | "contractor"
    | "provider"
    | "visitor"
    | "other";

const personTypeOptions: {
    value: PersonType;
    label: string;
}[] = [
        {
            value: "employee",
            label: "Empleado",
        },
        {
            value: "contractor",
            label: "Contratista",
        },
        {
            value: "provider",
            label: "Proveedor",
        },
        {
            value: "visitor",
            label: "Visitante",
        },
        {
            value: "other",
            label: "Otro",
        },
    ];

export default function PersonDrawer({
    isOpen,
    onClose,
    onSuccess,
}: PersonDrawerProps) {
    const [firstName, setFirstName] =
        useState("");

    const [lastName, setLastName] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [phone, setPhone] =
        useState("");

    const [personType, setPersonType] =
        useState<PersonType>(
            "employee",
        );

    const [jobTitle, setJobTitle] =
        useState("");

    const [department, setDepartment] =
        useState("");

    const [location, setLocation] =
        useState("");

    const [hiredAt, setHiredAt] =
        useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [submitError, setSubmitError] =
        useState<string | null>(null);

    const [submitMessage, setSubmitMessage] =
        useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            return;
        }

        setSubmitError(null);
        setSubmitMessage(null);
    }, [isOpen]);

    async function handleCreatePerson() {
        setSubmitError(null);
        setSubmitMessage(null);

        if (!firstName.trim()) {
            setSubmitError(
                "El nombre es obligatorio.",
            );

            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(
                "/api/administracion/personas",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        email,
                        phone,
                        personType,
                        jobTitle,
                        department,
                        location,
                        hiredAt,
                    }),
                },
            );

            const result =
                (await response.json()) as {
                    success: boolean;
                    message?: string;
                    error?: string;
                };

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.error ??
                    "No fue posible crear la persona.",
                );
            }

            const successMessage =
                result.message ??
                "La persona fue creada correctamente.";

            setFirstName("");
            setLastName("");
            setEmail("");
            setPhone("");
            setPersonType(
                "employee",
            );
            setJobTitle("");
            setDepartment("");
            setLocation("");
            setHiredAt("");

            await onSuccess(
                successMessage,
            );

            onClose();
        } catch (error) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "No fue posible crear la persona.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[120]">
            <button
                type="button"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            />

            <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
                <header className="border-b border-slate-200 px-6 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                        Organización
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                        Agregar persona
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        Registra una persona de la organización sin crear acceso al sistema.
                    </p>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-base font-black text-slate-950">
                            Información personal
                        </h3>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    Nombre *
                                </label>

                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(event) =>
                                        setFirstName(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    Apellidos
                                </label>

                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(event) =>
                                        setLastName(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    Correo electrónico
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    Teléfono
                                </label>

                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(event) =>
                                        setPhone(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    Tipo de persona
                                </label>

                                <select
                                    value={personType}
                                    onChange={(event) =>
                                        setPersonType(
                                            event.target
                                                .value as PersonType,
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                                >
                                    {personTypeOptions.map(
                                        (option) => (
                                            <option
                                                key={
                                                    option.value
                                                }
                                                value={
                                                    option.value
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-base font-black text-slate-950">
                            Organización
                        </h3>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    Puesto
                                </label>

                                <input
                                    type="text"
                                    value={jobTitle}
                                    onChange={(event) =>
                                        setJobTitle(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    Área
                                </label>

                                <input
                                    type="text"
                                    value={department}
                                    onChange={(event) =>
                                        setDepartment(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    Ubicación
                                </label>

                                <input
                                    type="text"
                                    value={location}
                                    onChange={(event) =>
                                        setLocation(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                    Fecha de ingreso
                                </label>

                                <input
                                    type="date"
                                    value={hiredAt}
                                    onChange={(event) =>
                                        setHiredAt(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                                🔒
                            </div>

                            <div>
                                <p className="text-sm font-black text-slate-950">
                                    Sin acceso a Datara
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                    Registrar esta persona no crea un usuario, no envía una
                                    invitación y no consume una licencia de acceso al sistema.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <>
                    {submitError ? (
                        <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700">
                            {submitError}
                        </div>
                    ) : null}

                    {submitMessage ? (
                        <div className="border-t border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700">
                            {submitMessage}
                        </div>
                    ) : null}

                    <footer className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onClick={handleCreatePerson}
                            disabled={isSubmitting}
                            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting
                                ? "Guardando..."
                                : "Agregar persona"}
                        </button>
                    </footer>
                </>
            </aside>
        </div>
    );
}