"use client";

import Link from "next/link";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type SocialIntegrationSettings = {
  metaBusinessAccountId: string;

  facebook: {
    enabled: boolean;
    pageId: string;
    pageName: string;
    leadAdsEnabled: boolean;
  };

  instagram: {
    enabled: boolean;
    businessAccountId: string;
    username: string;
    messagesEnabled: boolean;
  };
};

type SettingsResponse = {
  success: boolean;
  message?: string;
  error?: string;

  data?: {
    settings:
      SocialIntegrationSettings;
    canManage: boolean;
  };
};

const defaultSettings:
  SocialIntegrationSettings = {
  metaBusinessAccountId: "",

  facebook: {
    enabled: false,
    pageId: "",
    pageName: "",
    leadAdsEnabled: true,
  },

  instagram: {
    enabled: false,
    businessAccountId: "",
    username: "",
    messagesEnabled: true,
  },
};

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-700">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="h-5 w-5 accent-blue-600"
      />
    </label>
  );
}

function StatusBadge({
  enabled,
  ready,
}: {
  enabled: boolean;
  ready: boolean;
}) {
  const label = !enabled
    ? "Desactivada"
    : ready
      ? "Lista para conectar"
      : "Configuración incompleta";

  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-xs font-black",
        !enabled
          ? "bg-slate-100 text-slate-600"
          : ready
            ? "bg-amber-100 text-amber-800"
            : "bg-red-100 text-red-700",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export default function SocialIntegrationsPage() {
  const [settings, setSettings] =
    useState({
      ...defaultSettings,
    });
  const [canManage, setCanManage] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [message, setMessage] =
    useState<string | null>(null);

  const loadSettings =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

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
              "No fue posible cargar las integraciones.",
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
            : "No fue posible cargar las integraciones.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
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
  }, [loadSettings]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setIsSaving(true);

      const response = await fetch(
        "/api/crm/settings/social-integrations",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            settings,
          ),
        },
      );

      const result =
        (await response.json()) as
          SettingsResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible guardar las integraciones.",
        );
      }

      setMessage(
        result.message ??
          "Configuración guardada.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar las integraciones.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const facebookReady =
    Boolean(
      settings.metaBusinessAccountId &&
        settings.facebook.pageId,
    );

  const instagramReady =
    Boolean(
      settings.metaBusinessAccountId &&
        settings.instagram
          .businessAccountId,
    );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
        <p className="mx-auto max-w-6xl text-sm font-bold text-slate-600">
          Cargando integraciones...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-6xl"
      >
        <Link
          href="/crm/configuracion/integraciones"
          className="mb-5 inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"
        >
          ← Volver a integraciones
        </Link>

        <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-600 p-7 text-white shadow-xl sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
            Datara CRM · Meta
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Facebook e Instagram
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-50">
            Prepara las cuentas que se conectarán con Datara. En esta etapa no solicitamos contraseñas ni tokens; la autorización final se realizará mediante Meta cuando el conector OAuth esté habilitado.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Conexión segura con Meta
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Autoriza Datara desde Meta para seleccionar tu página y recibir prospectos de Lead Ads. Las credenciales se cifran y quedan aisladas por empresa.
              </p>
            </div>

            {canManage && (
              <a
                href="/api/integrations/meta/connect"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#1877F2] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-[#0f65d8]"
              >
                Conectar con Meta
              </a>
            )}
          </div>
        </section>

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

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <label className="block text-sm font-black text-slate-900">
            Identificador de Meta Business
          </label>

          <Input
            value={
              settings.metaBusinessAccountId
            }
            disabled={!canManage}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                metaBusinessAccountId:
                  event.target.value,
              }))
            }
            placeholder="Ej. 123456789012345"
            className="mt-3"
          />

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Se encuentra en Configuración del negocio dentro de Meta Business Suite.
          </p>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section
            id="facebook"
            className="scroll-mt-8 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-600">
                  Facebook
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Página y Lead Ads
                </h2>
              </div>

              <StatusBadge
                enabled={
                  settings.facebook.enabled
                }
                ready={facebookReady}
              />
            </div>

            <div className="mt-6 space-y-4">
              <Toggle
                checked={
                  settings.facebook.enabled
                }
                disabled={!canManage}
                label="Preparar integración"
                onChange={(enabled) =>
                  setSettings((current) => ({
                    ...current,
                    facebook: {
                      ...current.facebook,
                      enabled,
                    },
                  }))
                }
              />

              <label className="block text-sm font-bold text-slate-700">
                ID de la página
                <Input
                  value={
                    settings.facebook.pageId
                  }
                  disabled={!canManage}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      facebook: {
                        ...current.facebook,
                        pageId:
                          event.target.value,
                      },
                    }))
                  }
                  placeholder="Identificador numérico"
                  className="mt-2"
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                Nombre de la página
                <Input
                  value={
                    settings.facebook.pageName
                  }
                  disabled={!canManage}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      facebook: {
                        ...current.facebook,
                        pageName:
                          event.target.value,
                      },
                    }))
                  }
                  placeholder="Nombre visible en Facebook"
                  className="mt-2"
                />
              </label>

              <Toggle
                checked={
                  settings.facebook
                    .leadAdsEnabled
                }
                disabled={!canManage}
                label="Capturar prospectos de Lead Ads"
                onChange={(leadAdsEnabled) =>
                  setSettings((current) => ({
                    ...current,
                    facebook: {
                      ...current.facebook,
                      leadAdsEnabled,
                    },
                  }))
                }
              />
            </div>
          </section>

          <section
            id="instagram"
            className="scroll-mt-8 rounded-3xl border border-fuchsia-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-fuchsia-600">
                  Instagram
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Cuenta profesional
                </h2>
              </div>

              <StatusBadge
                enabled={
                  settings.instagram.enabled
                }
                ready={instagramReady}
              />
            </div>

            <div className="mt-6 space-y-4">
              <Toggle
                checked={
                  settings.instagram.enabled
                }
                disabled={!canManage}
                label="Preparar integración"
                onChange={(enabled) =>
                  setSettings((current) => ({
                    ...current,
                    instagram: {
                      ...current.instagram,
                      enabled,
                    },
                  }))
                }
              />

              <label className="block text-sm font-bold text-slate-700">
                ID de Instagram Business
                <Input
                  value={
                    settings.instagram
                      .businessAccountId
                  }
                  disabled={!canManage}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      instagram: {
                        ...current.instagram,
                        businessAccountId:
                          event.target.value,
                      },
                    }))
                  }
                  placeholder="Identificador numérico"
                  className="mt-2"
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                Usuario de Instagram
                <Input
                  value={
                    settings.instagram.username
                  }
                  disabled={!canManage}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      instagram: {
                        ...current.instagram,
                        username:
                          event.target.value,
                      },
                    }))
                  }
                  placeholder="@tuempresa"
                  className="mt-2"
                />
              </label>

              <Toggle
                checked={
                  settings.instagram
                    .messagesEnabled
                }
                disabled={!canManage}
                label="Preparar captura de mensajes"
                onChange={(messagesEnabled) =>
                  setSettings((current) => ({
                    ...current,
                    instagram: {
                      ...current.instagram,
                      messagesEnabled,
                    },
                  }))
                }
              />
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <h2 className="text-xl font-black text-amber-950">
            Pasos para completar la conexión
          </h2>

          <ol className="mt-4 grid gap-3 text-sm leading-6 text-amber-900 md:grid-cols-2">
            <li>1. Verificar la empresa en Meta Business Suite.</li>
            <li>2. Agregar la página de Facebook al negocio.</li>
            <li>3. Vincular una cuenta profesional de Instagram.</li>
            <li>4. Autorizar Datara cuando habilitemos el botón OAuth.</li>
          </ol>

          <p className="mt-5 text-xs font-bold text-amber-800">
            Nunca pegues aquí contraseñas, tokens de acceso ni secretos de la aplicación de Meta.
          </p>
        </section>

        <div className="mt-8 flex justify-end">
          <Button
            type="submit"
            disabled={
              !canManage ||
              isSaving
            }
          >
            {isSaving
              ? "Guardando..."
              : "Guardar preparación"}
          </Button>
        </div>
      </form>
    </main>
  );
}
