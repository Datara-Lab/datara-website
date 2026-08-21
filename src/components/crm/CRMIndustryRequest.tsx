"use client";

import {
    type ChangeEvent,
    type FormEvent,
    useState,
} from "react";

import Button from "@/components/ui/Button";

type FormData = {
    name: string;
    company: string;
    email: string;
    phone: string;
    industry: string;
    message: string;
};

type FormStatus = {
    type:
    | "idle"
    | "success"
    | "error";
    message: string;
};

const initialFormData: FormData = {
    name: "",
    company: "",
    email: "",
    phone: "",
    industry: "",
    message: "",
};

export default function CRMIndustryRequest() {
    const [
        formData,
        setFormData,
    ] = useState<FormData>(
        initialFormData,
    );

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        status,
        setStatus,
    ] = useState<FormStatus>({
        type: "idle",
        message: "",
    });

    function handleChange(
        event: ChangeEvent<
            HTMLInputElement |
            HTMLTextAreaElement
        >,
    ) {
        const {
            name,
            value,
        } = event.target;

        setFormData(
            (currentData) => ({
                ...currentData,
                [name]: value,
            }),
        );

        if (
            status.type !==
            "idle"
        ) {
            setStatus({
                type: "idle",
                message: "",
            });
        }
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        setStatus({
            type: "idle",
            message: "",
        });

        try {
            const response =
                await fetch(
                    "/api/contact",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            name:
                                formData.name,

                            company:
                                formData.company,

                            email:
                                formData.email,

                            phone:
                                formData.phone,

                            product:
                                "CRM para industria no disponible",

                            message: [
                                `Industria solicitada: ${formData.industry}`,
                                formData.message
                                    ? `Necesidad: ${formData.message}`
                                    : null,
                            ]
                                .filter(Boolean)
                                .join("\n\n"),
                        }),
                    },
                );

            const data =
                (await response.json()) as {
                    success?: boolean;
                    message?: string;
                };

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ??
                    "No fue posible enviar tu solicitud.",
                );
            }

            setFormData(
                initialFormData,
            );

            setStatus({
                type: "success",
                message:
                    data.message ??
                    "Recibimos tu solicitud.",
            });
        } catch (error) {
            setStatus({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Ocurrió un error al enviar tu solicitud.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-950/5">
                <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8 text-white sm:p-10">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">
                            ¿No encuentras tu industria?
                        </p>

                        <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                            Cuéntanos cómo trabaja tu empresa.
                        </h2>

                        <p className="mt-5 max-w-xl leading-7 text-slate-300">
                            Estamos desarrollando nuevas configuraciones de Datara CRM.
                            Si tu industria todavía no aparece en nuestro catálogo,
                            queremos conocerla.
                        </p>

                        <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
                            Tu solicitud nos ayuda a priorizar las próximas industrias
                            que incorporaremos a la plataforma.
                        </p>
                    </div>

                    <form
                        onSubmit={
                            handleSubmit
                        }
                        className="grid gap-5 p-8 sm:grid-cols-2 sm:p-10"
                    >
                        <div>
                            <label
                                htmlFor="industry-name"
                                className="mb-2 block text-sm font-semibold text-slate-800"
                            >
                                Industria *
                            </label>

                            <input
                                id="industry-name"
                                name="industry"
                                type="text"
                                value={
                                    formData.industry
                                }
                                onChange={
                                    handleChange
                                }
                                required
                                disabled={
                                    isSubmitting
                                }
                                placeholder="Ej. Restaurantes"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="industry-company"
                                className="mb-2 block text-sm font-semibold text-slate-800"
                            >
                                Empresa
                            </label>

                            <input
                                id="industry-company"
                                name="company"
                                type="text"
                                value={
                                    formData.company
                                }
                                onChange={
                                    handleChange
                                }
                                disabled={
                                    isSubmitting
                                }
                                placeholder="Nombre de tu empresa"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="industry-name-contact"
                                className="mb-2 block text-sm font-semibold text-slate-800"
                            >
                                Nombre *
                            </label>

                            <input
                                id="industry-name-contact"
                                name="name"
                                type="text"
                                value={
                                    formData.name
                                }
                                onChange={
                                    handleChange
                                }
                                required
                                disabled={
                                    isSubmitting
                                }
                                placeholder="Tu nombre"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="industry-email"
                                className="mb-2 block text-sm font-semibold text-slate-800"
                            >
                                Correo *
                            </label>

                            <input
                                id="industry-email"
                                name="email"
                                type="email"
                                value={
                                    formData.email
                                }
                                onChange={
                                    handleChange
                                }
                                required
                                disabled={
                                    isSubmitting
                                }
                                placeholder="tu@empresa.com"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label
                                htmlFor="industry-phone"
                                className="mb-2 block text-sm font-semibold text-slate-800"
                            >
                                Teléfono
                            </label>

                            <input
                                id="industry-phone"
                                name="phone"
                                type="tel"
                                value={
                                    formData.phone
                                }
                                onChange={
                                    handleChange
                                }
                                disabled={
                                    isSubmitting
                                }
                                placeholder="Teléfono de contacto"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label
                                htmlFor="industry-message"
                                className="mb-2 block text-sm font-semibold text-slate-800"
                            >
                                ¿Qué necesitas gestionar?
                            </label>

                            <textarea
                                id="industry-message"
                                name="message"
                                value={
                                    formData.message
                                }
                                onChange={
                                    handleChange
                                }
                                rows={4}
                                disabled={
                                    isSubmitting
                                }
                                placeholder="Cuéntanos brevemente qué procesos o necesidades tiene tu empresa."
                                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full"
                                disabled={
                                    isSubmitting
                                }
                            >
                                {isSubmitting
                                    ? "Enviando solicitud..."
                                    : "Enviar mi industria"}
                            </Button>
                        </div>

                        {status.type !==
                            "idle" && (
                                <div
                                    className={[
                                        "sm:col-span-2 rounded-xl border px-4 py-3 text-sm font-semibold",
                                        status.type ===
                                            "success"
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-red-200 bg-red-50 text-red-700",
                                    ].join(
                                        " ",
                                    )}
                                >
                                    {
                                        status.message
                                    }
                                </div>
                            )}
                    </form>
                </div>
            </div>
        </section>
    );
}
