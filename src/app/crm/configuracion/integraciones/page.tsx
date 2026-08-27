import Link from "next/link";

import type {
  ReactNode,
} from "react";

import {
  FaFacebookF,
  FaFacebookMessenger,
  FaInstagram,
  FaWhatsapp,
} from "react-icons/fa";

type IntegrationCard = {
  key: string;
  name: string;
  description: string;
  status: "available" | "coming_soon";
  href?: string;
  accentClass: string;
  iconClass: string;
  icon: ReactNode;
};

const integrations:
  IntegrationCard[] = [
  {
    key: "facebook",
    name: "Facebook",
    description:
      "Prepara tu página y la captura de prospectos provenientes de Lead Ads.",
    status: "available",
    href:
      "/crm/configuracion/integraciones/configurar#facebook",
    accentClass:
      "border-blue-200 hover:border-blue-400 hover:shadow-blue-100",
    iconClass:
      "bg-[#1877F2] text-white",
    icon: <FaFacebookF />,
  },
  {
    key: "instagram",
    name: "Instagram",
    description:
      "Prepara tu cuenta profesional y la futura recepción de conversaciones.",
    status: "available",
    href:
      "/crm/configuracion/integraciones/configurar#instagram",
    accentClass:
      "border-fuchsia-200 hover:border-fuchsia-400 hover:shadow-fuchsia-100",
    iconClass:
      "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FCAF45] text-white",
    icon: <FaInstagram />,
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    description:
      "Conversaciones, plantillas y seguimiento comercial desde WhatsApp Cloud API.",
    status: "coming_soon",
    accentClass:
      "border-emerald-200",
    iconClass:
      "bg-[#25D366] text-white",
    icon: <FaWhatsapp />,
  },
  {
    key: "messenger",
    name: "Messenger",
    description:
      "Atención de mensajes de Facebook y creación de prospectos desde conversaciones.",
    status: "coming_soon",
    accentClass:
      "border-violet-200",
    iconClass:
      "bg-gradient-to-br from-[#00B2FF] to-[#7B2FF7] text-white",
    icon: <FaFacebookMessenger />,
  },
];

function IntegrationContent({
  integration,
}: {
  integration: IntegrationCard;
}) {
  const available =
    integration.status ===
    "available";

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div
          className={[
            "flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg",
            integration.iconClass,
          ].join(" ")}
          aria-hidden="true"
        >
          {integration.icon}
        </div>

        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-black",
            available
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {available
            ? "Disponible para preparar"
            : "Próximamente"}
        </span>
      </div>

      <h2 className="mt-6 text-2xl font-black text-slate-950">
        {integration.name}
      </h2>

      <p className="mt-3 min-h-16 text-sm leading-6 text-slate-600">
        {integration.description}
      </p>

      <p
        className={[
          "mt-6 text-sm font-black",
          available
            ? "text-blue-700"
            : "text-slate-400",
        ].join(" ")}
      >
        {available
          ? "Abrir configuración →"
          : "Se habilitará en una próxima versión"}
      </p>
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-600 p-7 text-white shadow-xl sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
            Datara CRM
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Centro de integraciones
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-50">
            Conecta los canales donde conversas y captas prospectos. Cada integración conserva su propia configuración y estado por empresa.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {integrations.map(
            (integration) =>
              integration.href ? (
                <Link
                  key={integration.key}
                  href={integration.href}
                  className={[
                    "rounded-3xl border bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl",
                    integration.accentClass,
                  ].join(" ")}
                >
                  <IntegrationContent
                    integration={integration}
                  />
                </Link>
              ) : (
                <article
                  key={integration.key}
                  className={[
                    "rounded-3xl border bg-white p-7 opacity-75 shadow-sm",
                    integration.accentClass,
                  ].join(" ")}
                >
                  <IntegrationContent
                    integration={integration}
                  />
                </article>
              ),
          )}
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black text-slate-950">
            Arquitectura preparada para crecer
          </h2>

          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
            Los próximos conectores podrán agregarse aquí sin mezclar configuraciones. Las credenciales sensibles se autorizarán mediante OAuth y nunca se solicitarán dentro de formularios de Datara.
          </p>
        </section>
      </div>
    </main>
  );
}
