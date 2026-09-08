"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
  useRef,
} from "react";

import Button from "@/components/ui/Button";
import { getWebsiteAnalyticsContext, trackWebsiteEvent } from "@/lib/website/analytics-client";

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
  product: "Necesito orientación",
  message: "",
};

type CTAProps = {
  selection?: { product: string; message: string } | null;
};

export default function CTA({ selection = null }: CTAProps) {
  const formStarted = useRef(false);
  const [formData, setFormData] =
    useState<FormData>(() => ({ ...initialFormData, ...(selection ?? {}) }));

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [status, setStatus] =
    useState<FormStatus>({
      type: "idle",
      message: "",
    });

  const [previousSelection, setPreviousSelection] = useState(selection);
  if (selection !== previousSelection) {
    setPreviousSelection(selection);
    if (selection) {
      // Preserve the visitor's contact details when selecting another service.
      setFormData((current) => ({ ...current, product: selection.product, message: selection.message }));
      setStatus({ type: "idle", message: "" });
    }
  }

  function handleChange(
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >,
  ) {
    if (!formStarted.current && getWebsiteAnalyticsContext()) {
      trackWebsiteEvent("form_start");
      formStarted.current = true;
    }
    const { name, value } =
      event.target;

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
      const response = await fetch(
        "/api/contact",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            { ...formData, analytics: getWebsiteAnalyticsContext() },
          ),
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
    <section
      id="contacto"
      className="scroll-mt-24 bg-slate-50 px-5 py-20 sm:px-8"
    >
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-950/5">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8 text-white sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">
              Tu siguiente mejora empieza aquí
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Cuéntanos qué te frena. Diseñemos cómo resolverlo.
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-slate-300">
              No necesitas saber qué producto elegir. Cuéntanos qué quieres
              mejorar y te ayudaremos a encontrar la mejor alternativa.
            </p>

            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
              Puede ser una configuración de Datara, una integración, una
              personalización o una solución diferente.
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
                ¿Cómo podemos ayudarte? *
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
                <option value="Necesito orientación">
                  No estoy seguro, necesito orientación
                </option>

                <option value="Mejorar un proceso">
                  Quiero mejorar un proceso de mi empresa
                </option>

                <option value="Conectar sistemas">
                  Necesito conectar sistemas o información
                </option>

                <option value="Automatizar operación">
                  Quiero automatizar tareas u operaciones
                </option>

                <option value="Personalización o desarrollo">
                  Necesito una personalización o desarrollo
                </option>

                <option value="Sitios Web">Sitios Web</option>
                {selection && selection.product !== "Sitios Web" && <option value={selection.product}>{selection.product}</option>}

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
                Cuéntanos el reto
              </label>

              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="En pocas palabras, ¿qué quieres mejorar, conectar o automatizar?"
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
                  : "Quiero hablar con un especialista"}
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
