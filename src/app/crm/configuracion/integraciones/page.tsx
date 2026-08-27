"use client";

import Link from "next/link";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaFacebookF,
  FaFacebookMessenger,
  FaInstagram,
  FaWhatsapp,
} from "react-icons/fa";

type SettingsResponse = {
  success: boolean;
  data?: {
    settings: {
      facebook: {
        enabled: boolean;
        pageId: string;
        pageName: string;
      };
    };
  };
};

type IntegrationCard = {
  key: string;
  name: string;
  description: string;
  availability:
    | "available"
    | "coming_soon";
  href?: string;
  icon: ReactNode;
  iconClassName: string;
};

const integrations: IntegrationCard[] = [
  {
    key: "facebook",
    name: "Facebook",
    description:
      "Recibe automáticamente prospectos generados por formularios de Lead Ads.",
    availability: "available",
    href:
      "/crm/configuracion/integraciones/configurar",
    icon:
      <FaFacebookF aria-hidden="true" />,
    iconClassName:
      "bg-[#1877F2] text-white",
  },
  {
    key: "instagram",
    name: "Instagram",
    description:
      "Centraliza conversaciones y oportunidades provenientes de tu cuenta profesional.",
    availability: "coming_soon",
    icon:
      <FaInstagram aria-hidden="true" />,
    iconClassName:
      "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FCAF45] text-white",
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    description:
      "Gestiona conversaciones, plantillas y seguimiento comercial desde Datara.",
    availability: "coming_soon",
    icon:
      <FaWhatsapp aria-hidden="true" />,
    iconClassName:
      "bg-[#25D366] text-white",
  },
  {
    key: "messenger",
    name: "Messenger",
    description:
      "Convierte conversaciones de tu página en prospectos y actividades del CRM.",
    availability: "coming_soon",
    icon:
      <FaFacebookMessenger aria-hidden="true" />,
    iconClassName:
      "bg-[#168AFF] text-white",
  },
];

export default function IntegrationsPage() {
  const [facebookConnection, setFacebookConnection] =
    useState<{
      connected: boolean;
      pageName: string;
    }>({
      connected: false,
      pageName: "",
    });
  const [isLoading, setIsLoading] =
    useState(true);

  const loadConnection =
    useCallback(async () => {
      try {
        const response = await fetch(
          "/api/crm/settings/social-integrations",
          {
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as
            SettingsResponse;

        const facebook =
          result.data?.settings.facebook;

        setFacebookConnection({
          connected: Boolean(
            response.ok &&
              result.success &&
              facebook?.enabled &&
              facebook.pageId,
          ),
          pageName:
            facebook?.pageName ?? "",
        });
      } catch {
        setFacebookConnection({
          connected: false,
          pageName: "",
        });
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          void loadConnection();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [loadConnection]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            Configuración
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Integraciones
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Conecta las herramientas que utiliza tu empresa para reunir conversaciones, prospectos y oportunidades en Datara CRM.
          </p>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {integrations.map(
            (integration) => {
              const isFacebook =
                integration.key ===
                "facebook";
              const connected =
                isFacebook &&
                facebookConnection.connected;
              const available =
                integration.availability ===
                "available";

              const content = (
                <>
                  <div className="flex items-start justify-between gap-5">
                    <div
                      className={[
                        "flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm",
                        integration.iconClassName,
                      ].join(" ")}
                    >
                      {integration.icon}
                    </div>

                    <span
                      className={[
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black",
                        connected
                          ? "bg-emerald-50 text-emerald-700"
                          : available
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      {connected && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                      {isLoading &&
                      isFacebook
                        ? "Consultando"
                        : connected
                          ? "Conectado"
                          : available
                            ? "Disponible"
                            : "Próximamente"}
                    </span>
                  </div>

                  <h2 className="mt-6 text-xl font-black text-slate-950">
                    {integration.name}
                  </h2>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                    {integration.description}
                  </p>

                  {connected &&
                    facebookConnection.pageName && (
                      <p className="mt-5 truncate border-t border-slate-100 pt-5 text-sm font-bold text-slate-800">
                        {facebookConnection.pageName}
                      </p>
                    )}

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <span className="text-sm font-black text-slate-900">
                      {available
                        ? connected
                          ? "Administrar conexión"
                          : "Configurar"
                        : "En desarrollo"}
                    </span>

                    {available && (
                      <span className="text-lg text-blue-600 transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    )}
                  </div>
                </>
              );

              return available &&
                integration.href ? (
                <Link
                  key={integration.key}
                  href={integration.href}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  {content}
                </Link>
              ) : (
                <article
                  key={integration.key}
                  className="rounded-3xl border border-slate-200 bg-white p-6 opacity-75 shadow-sm"
                >
                  {content}
                </article>
              );
            },
          )}
        </section>

        <p className="mt-8 text-center text-xs leading-6 text-slate-500">
          Las conexiones son independientes por empresa y solo pueden ser administradas por usuarios autorizados.
        </p>
      </div>
    </main>
  );
}
