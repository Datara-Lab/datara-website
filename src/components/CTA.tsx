"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";

import Button from "@/components/ui/Button";

type FormData = {
  name: string;
  company: string;
  email: string;
  phone: string;
  product: string;
  message: string;
};

type FormStatus = {
  type: "idle" | "success" | "error";
  message: string;
};

const initialFormData: FormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  product: "Desarrollo a la medida",
  message: "",
};

export default function CTA() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({
    type: "idle",
    message: "",
  });

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    if (status.type !== "idle") {
      setStatus({
        type: "idle",
        message: "",
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ??
            "No fue posible enviar tu solicitud. Inténtalo nuevamente.",
        );
      }

      setFormData(initialFormData);

      setStatus({
        type: "success",
        message:
          data.message ??
          "¡Gracias! Recibimos tu solicitud y pronto nos pondremos en contacto.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al enviar tu solicitud.";

      setStatus({
        type: "error",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="contacto"
      className="scroll-mt-24 bg-slate-50 px-5 py-20 sm:px-8"
    >
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-950/5">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8 text-white sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">
              Soluciones a la medida
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              ¿Tu empresa necesita una solución diferente?
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-slate-300">
              Además de nuestros productos estándar, en Datara desarrollamos
              soluciones tecnológicas a la medida para empresas que requieren
              procesos, integraciones o desarrollos específicos.
            </p>

            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
              Cuéntanos qué necesitas y nuestro equipo evaluará la mejor forma
              de llevarlo a la plataforma Datara.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 p-8 text-left sm:grid-cols-2 sm:p-10"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Nombre completo *
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Tu nombre"
                autoComplete="name"
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="company"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Empresa
              </label>

              <input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={handleChange}
                placeholder="Nombre de tu empresa"
                autoComplete="organization"
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Correo empresarial *
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nombre@empresa.com"
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Teléfono
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="55 1234 5678"
                autoComplete="tel"
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="product"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Tipo de solución *
              </label>

              <select
                id="product"
                name="product"
                value={formData.product}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="Desarrollo a la medida">
                  Desarrollo a la medida
                </option>

                <option value="Integración personalizada">
                  Integración personalizada
                </option>

                <option value="Automatización personalizada">
                  Automatización personalizada
                </option>

                <option value="Otro">
                  Otro
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Cuéntanos qué necesita tu empresa
              </label>

              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Describe brevemente el reto, proceso o solución que necesitas."
                rows={4}
                disabled={isSubmitting}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Enviando solicitud..."
                  : "Enviar solicitud"}
              </Button>
            </div>

            {status.type !== "idle" && (
              <div
                role="status"
                aria-live="polite"
                className={[
                  "sm:col-span-2 rounded-xl border px-4 py-3 text-sm font-semibold",
                  status.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700",
                ].join(" ")}
              >
                {status.message}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}