"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";

type FiscalMode = "test" | "live";
type FiscalStatus = "active" | "paused" | "blocked";

type Configuration = {
  enabled: boolean;
  provider: string;
  mode: FiscalMode;
  credentialSecretReference: string;
  costPerStamp: number;
  currency: string;
  configured: boolean;
  updatedAt: string | null;
};

type TenantAccount = {
  tenantId: string;
  tenantName: string;
  tenantStatus: string;
  configured: boolean;
  enabled: boolean;
  status: FiscalStatus;
  includedMonthlyStamps: number;
  usedMonthlyStamps: number;
  monthlyRemaining: number;
  topUpStampBalance: number;
  monthlyWindowStart: string | null;
  monthlyWindowEnd: string | null;
  maxMonthlySpend: number;
};

type ProviderRequest = {
  id: string;
  tenantName: string;
  operation: string;
  status: "pending" | "success" | "error";
  provider: string;
  fiscalUuid: string | null;
  durationMs: number;
  providerCost: number;
  currency: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type Dashboard = {
  environment: string;
  databaseEndpoint: string;
  configuration: Configuration;
  metrics: {
    requests: number;
    successfulRequests: number;
    failedRequests: number;
    pendingRequests: number;
    providerCost: number;
    enabledTenants: number;
    totalMonthlyRemaining: number;
    totalTopUpRemaining: number;
  };
  accounts: TenantAccount[];
  requests: ProviderRequest[];
};

type ApiResponse = {
  success: boolean;
  data?: Dashboard;
  message?: string;
  error?: string;
};

const number =
  new Intl.NumberFormat("es-MX");

const money =
  new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    },
  );

function statusLabel(
  status: FiscalStatus,
) {
  if (status === "paused") {
    return "Pausada";
  }

  if (status === "blocked") {
    return "Bloqueada";
  }

  return "Activa";
}

export default function FiscalPlatformManager() {
  const [dashboard, setDashboard] =
    useState<Dashboard | null>(null);
  const [configuration, setConfiguration] =
    useState<Configuration | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<TenantAccount | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [search, setSearch] =
    useState("");

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/platform/fiscal",
        {
          cache: "no-store",
        },
      );

      const result =
        await response.json() as
          ApiResponse;

      if (!response.ok || !result.data) {
        throw new Error(
          result.error ??
            "No fue posible cargar la administración fiscal.",
        );
      }

      setDashboard(result.data);
      setConfiguration(
        result.data.configuration,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar la administración fiscal.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          void loadDashboard();
        },
        0,
      );

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  const visibleAccounts =
    useMemo(() => {
      const normalized =
        search.trim().toLowerCase();

      if (!normalized) {
        return dashboard?.accounts ?? [];
      }

      return (dashboard?.accounts ?? [])
        .filter(
          (account) =>
            account.tenantName
              .toLowerCase()
              .includes(normalized),
        );
    }, [dashboard, search]);

  async function patch(
    body: Record<string, unknown>,
  ) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/platform/fiscal",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const result =
        await response.json() as
          ApiResponse;

      if (!response.ok || !result.data) {
        throw new Error(
          result.error ??
            "No fue posible guardar la configuración fiscal.",
        );
      }

      setDashboard(result.data);
      setConfiguration(
        result.data.configuration,
      );
      setSelectedAccount(null);
      setMessage(
        result.message ??
          "Configuración guardada.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar la configuración fiscal.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    loading ||
    !dashboard ||
    !configuration
  ) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <p className="text-sm font-semibold text-slate-600">
          Cargando administración fiscal…
        </p>
      </main>
    );
  }

  const successRate =
    dashboard.metrics.requests > 0
      ? Math.round(
          dashboard.metrics
            .successfulRequests /
            dashboard.metrics.requests *
            100,
        )
      : null;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Datara Platform"
          title="Operación fiscal"
          description="Administra el proveedor fiscal por ambiente y monitorea timbres, costos y errores de todas las empresas. Los datos mostrados provienen de la operación real."
        />

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 uppercase tracking-[0.1em] text-blue-700">
            Ambiente {dashboard.environment}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-slate-600">
            Base {dashboard.databaseEndpoint}
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            [
              "Empresas habilitadas",
              number.format(
                dashboard.metrics
                  .enabledTenants,
              ),
            ],
            [
              "Solicitudes recientes",
              number.format(
                dashboard.metrics.requests,
              ),
            ],
            [
              "Tasa de éxito",
              successRate === null
                ? "—"
                : `${successRate}%`,
            ],
            [
              "Errores recientes",
              number.format(
                dashboard.metrics
                  .failedRequests,
              ),
            ],
            [
              "Costo registrado",
              money.format(
                dashboard.metrics
                  .providerCost,
              ),
            ],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {value}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                Ambiente {dashboard.environment}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Proveedor fiscal
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                La referencia identifica el secreto protegido del PAC; la credencial nunca se guarda ni se muestra en la base de datos.
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <span>
                {configuration.enabled
                  ? "Servicio encendido"
                  : "Servicio pausado"}
              </span>
              <input
                type="checkbox"
                checked={
                  configuration.enabled
                }
                onChange={(event) =>
                  setConfiguration({
                    ...configuration,
                    enabled:
                      event.target.checked,
                  })
                }
                className="h-5 w-5 accent-blue-600"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-bold text-slate-700">
              Proveedor
              <input
                value={configuration.provider}
                onChange={(event) =>
                  setConfiguration({
                    ...configuration,
                    provider:
                      event.target.value,
                  })
                }
                placeholder="Se definirá al elegir PAC"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Modo
              <select
                value={configuration.mode}
                onChange={(event) =>
                  setConfiguration({
                    ...configuration,
                    mode:
                      event.target.value as
                        FiscalMode,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium outline-none focus:border-blue-500"
              >
                <option value="test">
                  Pruebas
                </option>
                <option value="live">
                  Producción
                </option>
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Costo por timbre
              <input
                type="number"
                min="0"
                step="0.000001"
                value={
                  configuration.costPerStamp
                }
                onChange={(event) =>
                  setConfiguration({
                    ...configuration,
                    costPerStamp:
                      Number(
                        event.target.value,
                      ),
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Moneda
              <input
                value={configuration.currency}
                onChange={(event) =>
                  setConfiguration({
                    ...configuration,
                    currency:
                      event.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium uppercase outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <label className="mt-5 block text-sm font-bold text-slate-700">
            Referencia del secreto protegido
            <input
              value={
                configuration
                  .credentialSecretReference
              }
              onChange={(event) =>
                setConfiguration({
                  ...configuration,
                  credentialSecretReference:
                    event.target.value,
                })
              }
              placeholder="Ej. FISCAL_PAC_API_KEY"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500"
            />
          </label>

          {message && (
            <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              onClick={() =>
                void patch({
                  action: "configuration",
                  ...configuration,
                })
              }
              disabled={saving}
            >
              {saving
                ? "Guardando…"
                : "Guardar proveedor"}
            </Button>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Cuentas fiscales por empresa
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Los timbres mensuales y las recargas se muestran por separado.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar empresa"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 sm:max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Mensuales</th>
                  <th className="px-6 py-4">Utilizados</th>
                  <th className="px-6 py-4">Disponibles</th>
                  <th className="px-6 py-4">Recargas</th>
                  <th className="px-6 py-4">Límite gasto</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.map(
                  (account) => (
                    <tr
                      key={account.tenantId}
                      className="border-t border-slate-100"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">
                          {account.tenantName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {account.configured
                            ? "Cuenta configurada"
                            : "Sin configurar"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={[
                          "rounded-full px-3 py-1 text-xs font-bold",
                          account.enabled &&
                          account.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                        >
                          {account.enabled
                            ? statusLabel(account.status)
                            : "Deshabilitada"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {number.format(
                          account.includedMonthlyStamps,
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {number.format(
                          account.usedMonthlyStamps,
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-700">
                        {number.format(
                          account.monthlyRemaining,
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-violet-700">
                        {number.format(
                          account.topUpStampBalance,
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {money.format(
                          account.maxMonthlySpend,
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAccount({
                              ...account,
                            })
                          }
                          className="font-bold text-blue-700 hover:text-blue-900"
                        >
                          Configurar
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-black text-slate-950">
              Solicitudes recientes al PAC
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Historial técnico real de timbrado, cancelación, consulta y descarga.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Operación</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Proveedor</th>
                  <th className="px-6 py-4">Duración</th>
                  <th className="px-6 py-4">Costo</th>
                  <th className="px-6 py-4">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.requests.map(
                  (request) => (
                    <tr
                      key={request.id}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                        {new Intl.DateTimeFormat(
                          "es-MX",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          },
                        ).format(
                          new Date(request.createdAt),
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {request.tenantName}
                      </td>
                      <td className="px-6 py-4 capitalize">
                        {request.operation}
                      </td>
                      <td className="px-6 py-4">
                        <span className={[
                          "rounded-full px-3 py-1 text-xs font-bold",
                          request.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : request.status === "error"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800",
                        ].join(" ")}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {request.provider}
                      </td>
                      <td className="px-6 py-4">
                        {number.format(
                          request.durationMs,
                        )} ms
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {money.format(
                          request.providerCost,
                        )}
                      </td>
                      <td className="max-w-xs px-6 py-4 text-xs leading-5 text-slate-600">
                        {request.errorMessage ??
                          request.fiscalUuid ??
                          "—"}
                      </td>
                    </tr>
                  ),
                )}

                {dashboard.requests.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      Todavía no existen solicitudes fiscales registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm">
          <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                  Cuenta fiscal
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {selectedAccount.tenantName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedAccount(null)
                }
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={selectedAccount.enabled}
                  onChange={(event) =>
                    setSelectedAccount({
                      ...selectedAccount,
                      enabled:
                        event.target.checked,
                    })
                  }
                  className="h-5 w-5 accent-blue-600"
                />
                Habilitar timbrado para esta empresa
              </label>

              <label className="text-sm font-bold text-slate-700">
                Estado
                <select
                  value={selectedAccount.status}
                  onChange={(event) =>
                    setSelectedAccount({
                      ...selectedAccount,
                      status:
                        event.target.value as
                          FiscalStatus,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="active">Activa</option>
                  <option value="paused">Pausada</option>
                  <option value="blocked">Bloqueada</option>
                </select>
              </label>

              <label className="text-sm font-bold text-slate-700">
                Timbres mensuales incluidos
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    selectedAccount
                      .includedMonthlyStamps
                  }
                  onChange={(event) =>
                    setSelectedAccount({
                      ...selectedAccount,
                      includedMonthlyStamps:
                        Number(
                          event.target.value,
                        ),
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
                Saldo de recargas
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    selectedAccount
                      .topUpStampBalance
                  }
                  onChange={(event) =>
                    setSelectedAccount({
                      ...selectedAccount,
                      topUpStampBalance:
                        Number(
                          event.target.value,
                        ),
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
                Gasto mensual máximo
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    selectedAccount
                      .maxMonthlySpend
                  }
                  onChange={(event) =>
                    setSelectedAccount({
                      ...selectedAccount,
                      maxMonthlySpend:
                        Number(
                          event.target.value,
                        ),
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setSelectedAccount(null)
                }
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() =>
                  void patch({
                    action: "tenant-account",
                    tenantId:
                      selectedAccount.tenantId,
                    enabled:
                      selectedAccount.enabled,
                    status:
                      selectedAccount.status,
                    includedMonthlyStamps:
                      selectedAccount
                        .includedMonthlyStamps,
                    topUpStampBalance:
                      selectedAccount
                        .topUpStampBalance,
                    maxMonthlySpend:
                      selectedAccount
                        .maxMonthlySpend,
                  })
                }
                disabled={saving}
              >
                {saving
                  ? "Guardando…"
                  : "Guardar cuenta"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
