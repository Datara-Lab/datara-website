"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaCheckCircle,
  FaFacebookF,
  FaShieldAlt,
} from "react-icons/fa";

import Button from "@/components/ui/Button";

type SocialIntegrationSettings = {
  facebook: {
    enabled: boolean;
    pageId: string;
    pageName: string;
    leadAdsEnabled: boolean;
  };
};

type SettingsResponse = {
  success: boolean;
  error?: string;
  data?: {
    settings: SocialIntegrationSettings;
    canManage: boolean;
  };
};

function getMetaResult() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(
    window.location.search,
  ).get("meta");
}

export default function FacebookIntegrationPage() {
  const [settings, setSettings] =
    useState<SocialIntegrationSettings | null>(null);
  const [canManage, setCanManage] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(true);
  const [metaResult] =
    useState(getMetaResult);
  const [error, setError] =
    useState<string | null>(
      metaResult === "error"
        ? "No fue posible completar la conexión con Facebook. Inténtalo nuevamente."
        : null,
    );
  const [message] =
    useState<string | null>(
      metaResult === "connected"
        ? "Facebook se conectó correctamente."
        : null,
    );

  const loadSettings =
    useCallback(async () => {
      try {
        setIsLoading(true);

        const response = await fetch(
          "/api/crm/settings/social-integrations",
          {
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as
            SettingsResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.error ??
              "No fue posible consultar la conexión con Facebook.",
          );
        }

        setSettings(
          result.data.settings,
        );
        setCanManage(
          result.data.canManage,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible consultar la conexión con Facebook.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    if (metaResult) {
      window.history.replaceState(
        {},
        "",
        window.location.pathname +
          window.location.hash,
      );
    }

    const timeoutId =
      window.setTimeout(
        () => {
          void loadSettings();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [loadSettings, metaResult]);

  const connected = Boolean(
    settings?.facebook.enabled &&
      settings.facebook.pageId,
  );

  function connectFacebook() {
    window.location.assign(
      "/api/integrations/meta/connect",
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl animate-pulse rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="mt-5 h-10 w-72 rounded bg-slate-200" />
          <div className="mt-5 h-20 rounded bg-slate-100" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/crm/configuracion/integraciones"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-700"
        >
          ← Volver a integraciones
        </Link>

        <header className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-7 p-7 sm:flex-row sm:items-center sm:p-10">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[#1877F2] text-4xl text-white shadow-lg shadow-blue-200">
              <FaFacebookF aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Integración oficial
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Facebook
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Recibe automáticamente en Datara los prospectos generados por tus formularios de Facebook Lead Ads.
              </p>
            </div>

            <span
              className={[
                "inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-black",
                connected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  connected
                    ? "bg-emerald-500"
                    : "bg-slate-400",
                ].join(" ")}
              />
              {connected
                ? "Conectado"
                : "Sin conectar"}
            </span>
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {message}
          </p>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          {connected ? (
            <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3 text-emerald-700">
                  <FaCheckCircle className="text-xl" aria-hidden="true" />
                  <h2 className="text-lg font-black">
                    Página conectada
                  </h2>
                </div>

                <p className="mt-4 text-2xl font-black text-slate-950">
                  {settings?.facebook.pageName ||
                    "Página de Facebook"}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Lead Ads está activo y listo para recibir prospectos.
                </p>
              </div>

              {canManage && (
                <Button
                  type="button"
                  onClick={connectFacebook}
                >
                  Reconectar Facebook
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Conecta tu página de Facebook
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Inicia sesión en Facebook, elige la página que administra tu empresa y autoriza la recepción de prospectos. Datara nunca solicita tu contraseña.
                </p>
              </div>

              {canManage && (
                <Button
                  type="button"
                  onClick={connectFacebook}
                >
                  Conectar Facebook
                </Button>
              )}
            </div>
          )}

          {!canManage && (
            <p className="mt-6 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
              Solo un administrador puede modificar esta integración.
            </p>
          )}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Autorización segura",
              description:
                "La conexión se realiza directamente en Facebook mediante OAuth.",
            },
            {
              title: "Prospectos automáticos",
              description:
                "Los registros de Lead Ads llegan al CRM sin capturas manuales.",
            },
            {
              title: "Datos protegidos",
              description:
                "Las credenciales se cifran y permanecen aisladas por empresa.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <FaShieldAlt
                className="text-xl text-blue-600"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-base font-black text-slate-950">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
