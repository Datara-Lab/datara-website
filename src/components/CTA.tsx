"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";

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
  product: "Datara CRM",
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
    <section id="contacto" className="scroll-mt-24 px-8 py-24">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-8 py-16 text-white shadow-2xl shadow-blue-500/20 md:px-16">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">
            Da el siguiente paso
          </p>

          <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
            Descubre cómo Datara puede ayudar a tu empresa a vender mejor y
            tomar decisiones más claras.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-50">
            Agenda una demostración y conoce Datara Analytics, Datara CRM,
            Datara Cloud o una solución integrada para tu empresa.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-12 grid w-full max-w-4xl gap-5 rounded-3xl border border-white/20 bg-white/10 p-6 text-left backdrop-blur-sm md:grid-cols-2 md:p-8"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-white"
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
              className="w-full rounded-xl border border-white/20 bg-white px-5 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <div>
            <label
              htmlFor="company"
              className="mb-2 block text-sm font-medium text-white"
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
              className="w-full rounded-xl border border-white/20 bg-white px-5 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-white"
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
              className="w-full rounded-xl border border-white/20 bg-white px-5 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-white"
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
              className="w-full rounded-xl border border-white/20 bg-white px-5 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="product"
              className="mb-2 block text-sm font-medium text-white"
            >
              Producto de interés *
            </label>

            <select
              id="product"
              name="product"
              value={formData.product}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="w-full rounded-xl border border-white/20 bg-white px-5 py-4 text-slate-900 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="Datara CRM">Datara CRM</option>
              <option value="Datara Analytics">Datara Analytics</option>
              <option value="Datara Cloud">Datara Cloud</option>
              <option value="Solución integrada">Solución integrada</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="message"
              className="mb-2 block text-sm font-medium text-white"
            >
              Cuéntanos qué necesita tu empresa
            </label>

            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Describe brevemente el reto, proceso o solución que te interesa."
              rows={5}
              disabled={isSubmitting}
              className="w-full resize-none rounded-xl border border-white/20 bg-white px-5 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-8 py-4 font-medium text-white transition hover:-translate-y-1 hover:bg-slate-950 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting
                ? "Enviando solicitud..."
                : "Solicitar Demo →"}
            </button>
          </div>

          {status.type !== "idle" && (
            <div
              role="status"
              aria-live="polite"
              className={[
                "md:col-span-2 rounded-xl border px-5 py-4 text-center text-sm font-medium",
                status.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700",
              ].join(" ")}
            >
              {status.message}
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-blue-100">
          ¿Prefieres escribirnos directamente?{" "}
          <a
            href="mailto:ventas@datara-lab.com"
            className="font-semibold text-white underline-offset-4 hover:underline"
          >
            ventas@datara-lab.com
          </a>
        </p>
      </div>
    </section>
  );
}