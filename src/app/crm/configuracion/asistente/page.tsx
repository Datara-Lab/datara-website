"use client";

import {
  Bot,
  Globe2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Button from "@/components/ui/Button";

type AISettingsData = {
  product: "crm";

  assistantName: string;

  internalAssistantEnabled:
    boolean;

  publicChatbotEnabled:
    boolean;

  usage: {
    used: number;
    limit: number;
    remaining: number;
  };
};

type AISettingsResponse = {
  success: boolean;
  data?: AISettingsData;
  error?: string;
};

export default function AIAssistantSettingsPage() {
  const [
    settings,
    setSettings,
  ] = useState<
    AISettingsData | null
  >(null);

  const [
    assistantNameDraft,
    setAssistantNameDraft,
  ] = useState("Dara");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    savingSetting,
    setSavingSetting,
  ] = useState<
    | keyof Pick<
        AISettingsData,
        | "assistantName"
        | "internalAssistantEnabled"
        | "publicChatbotEnabled"
      >
    | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const loadSettings =
    useCallback(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/ai/settings/crm",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as
              AISettingsResponse;

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.error ??
                "No fue posible cargar la configuración de IA.",
            );
          }

          setSettings(
            result.data,
          );

          setAssistantNameDraft(
            result.data.assistantName,
          );
        } catch (
          requestError
        ) {
          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "No fue posible cargar la configuración de IA.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [],
    );

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
  }, [
    loadSettings,
  ]);

  async function updateSetting(
    key:
      | "internalAssistantEnabled"
      | "publicChatbotEnabled",

    value: boolean,
  ) {
    if (
      !settings ||
      savingSetting
    ) {
      return;
    }

    setSavingSetting(
      key,
    );

    setError(null);

    try {
      const response =
        await fetch(
          "/api/ai/settings/crm",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                [key]:
                  value,
              }),
          },
        );

      const result =
        (await response.json()) as
          AISettingsResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ??
            "No fue posible actualizar la configuración.",
        );
      }

      setSettings(
        result.data,
      );

      setAssistantNameDraft(
        result.data.assistantName,
      );

      window.dispatchEvent(
        new CustomEvent(
          "datara-ai-settings-updated",
          {
            detail: {
              assistantName:
                result.data
                  .assistantName,

              internalAssistantEnabled:
                result.data
                  .internalAssistantEnabled,
            },
          },
        ),
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "No fue posible actualizar la configuración.",
      );
    } finally {
      setSavingSetting(
        null,
      );
    }
  }

  async function saveAssistantName() {
    if (
      !settings ||
      savingSetting
    ) {
      return;
    }

    const assistantName =
      assistantNameDraft.trim();

    if (
      assistantName.length < 2 ||
      assistantName.length > 40
    ) {
      setError(
        "El nombre debe tener entre 2 y 40 caracteres.",
      );
      return;
    }

    setSavingSetting(
      "assistantName",
    );

    setError(null);

    try {
      const response =
        await fetch(
          "/api/ai/settings/crm",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                assistantName,
              }),
          },
        );

      const result =
        (await response.json()) as
          AISettingsResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ??
            "No fue posible guardar el nombre del asistente.",
        );
      }

      setSettings(
        result.data,
      );

      setAssistantNameDraft(
        result.data.assistantName,
      );

      window.dispatchEvent(
        new CustomEvent(
          "datara-ai-settings-updated",
          {
            detail: {
              assistantName:
                result.data
                  .assistantName,

              internalAssistantEnabled:
                result.data
                  .internalAssistantEnabled,
            },
          },
        ),
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "No fue posible guardar el nombre del asistente.",
      );
    } finally {
      setSavingSetting(
        null,
      );
    }
  }

  const usagePercentage =
    settings &&
    settings.usage.limit >
      0
      ? Math.min(
          100,

          (
            settings.usage.used /
            settings.usage.limit
          ) *
            100,
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Button
          href="/crm/configuracion"
          variant="secondary"
          size="sm"
        >
          Volver a configuración
        </Button>

        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Inteligencia artificial
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {settings?.assistantName ?? "Dara"} y chatbot público
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Controla qué canales pueden utilizar la inteligencia artificial y consulta el consumo compartido de tu empresa.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
            Cargando configuración de IA...
          </div>
        ) : settings ? (
          <>
            <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Bot
                    aria-hidden="true"
                    size={24}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Identidad del asistente
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Este nombre aparecerá en el asistente interno y en el chatbot público.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1 text-sm font-bold text-slate-800">
                  Nombre público

                  <input
                    type="text"
                    value={
                      assistantNameDraft
                    }
                    minLength={2}
                    maxLength={40}
                    disabled={
                      savingSetting !==
                      null
                    }
                    onChange={(
                      event,
                    ) =>
                      setAssistantNameDraft(
                        event.target.value,
                      )
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </label>

                <Button
                  type="button"
                  disabled={
                    savingSetting !==
                      null ||
                    assistantNameDraft.trim() ===
                      settings.assistantName
                  }
                  onClick={() =>
                    void saveAssistantName()
                  }
                >
                  {savingSetting ===
                  "assistantName"
                    ? "Guardando..."
                    : "Guardar nombre"}
                </Button>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
                Consumo mensual compartido
              </p>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-black text-slate-950">
                    {settings.usage.remaining.toLocaleString(
                      "es-MX",
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    consultas disponibles de{" "}
                    {settings.usage.limit.toLocaleString(
                      "es-MX",
                    )}
                  </p>
                </div>

                <p className="text-sm font-semibold text-slate-600">
                  {settings.usage.used.toLocaleString(
                    "es-MX",
                  )}{" "}
                  utilizadas
                </p>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-400 transition-all"
                  style={{
                    width:
                      `${usagePercentage}%`,
                  }}
                />
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                {settings.assistantName} interna y el chatbot del sitio web consumen esta misma bolsa. La cuota se restablece cada mes.
              </p>
            </section>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <Bot
                        aria-hidden="true"
                        size={24}
                      />
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-slate-950">
                        {settings.assistantName} interna
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Permite que los empleados consulten la guía de Datara CRM desde cualquier módulo.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={
                      settings.internalAssistantEnabled
                    }
                    aria-label="Activar o desactivar Dara interna"
                    disabled={
                      savingSetting !==
                      null
                    }
                    onClick={() =>
                      void updateSetting(
                        "internalAssistantEnabled",

                        !settings.internalAssistantEnabled,
                      )
                    }
                    className={[
                      "relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60",
                      settings.internalAssistantEnabled
                        ? "bg-blue-700"
                        : "bg-slate-300",
                    ].join(
                      " ",
                    )}
                  >
                    <span
                      className={[
                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                        settings.internalAssistantEnabled
                          ? "left-6"
                          : "left-1",
                      ].join(
                        " ",
                      )}
                    />
                  </button>
                </div>

                <p className={[
                  "mt-5 text-sm font-bold",
                  settings.internalAssistantEnabled
                    ? "text-emerald-700"
                    : "text-slate-500",
                ].join(
                  " ",
                )}>
                  {settings.internalAssistantEnabled
                    ? "Activa para los empleados"
                    : "Desactivada para los empleados"}
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                      <Globe2
                        aria-hidden="true"
                        size={24}
                      />
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-slate-950">
                        Chatbot público
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Atiende consultas de visitantes desde el sitio web autorizado de la empresa.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={
                      settings.publicChatbotEnabled
                    }
                    aria-label="Activar o desactivar chatbot público"
                    disabled={
                      savingSetting !==
                      null
                    }
                    onClick={() =>
                      void updateSetting(
                        "publicChatbotEnabled",

                        !settings.publicChatbotEnabled,
                      )
                    }
                    className={[
                      "relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-60",
                      settings.publicChatbotEnabled
                        ? "bg-cyan-600"
                        : "bg-slate-300",
                    ].join(
                      " ",
                    )}
                  >
                    <span
                      className={[
                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                        settings.publicChatbotEnabled
                          ? "left-6"
                          : "left-1",
                      ].join(
                        " ",
                      )}
                    />
                  </button>
                </div>

                <p className={[
                  "mt-5 text-sm font-bold",
                  settings.publicChatbotEnabled
                    ? "text-emerald-700"
                    : "text-slate-500",
                ].join(
                  " ",
                )}>
                  {settings.publicChatbotEnabled
                    ? "Activo para visitantes"
                    : "Desactivado para visitantes"}
                </p>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
