"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ChartCard from "@/components/shared/ChartCard";
import MetricCard from "@/components/shared/MetricCard";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import { useAuth } from "@/contexts/AuthContext";

import {
  getAnalyticsComparisonPeriod,
  getAnalyticsPeriodDates,
  getAnalyticsPeriodLabel,
  getCurrentAnalyticsMonth,
  getCurrentAnalyticsQuarter,
  parseAnalyticsMonth,
  type AnalyticsPeriodSelection,
  type AnalyticsRollingDays,
} from "@/lib/crm/analytics-period";

type AnalyticsMetrics = {
  leadsCreated: number;
  openDeals: number;
  openPipelineValue: number;
  dealsCreated: number;
  dealsWon: number;
  dealsClosed: number;
  wonRevenue: number;
  conversionRate: number;
  quotesCreated: number;
  quotesSent: number;
  quotesAccepted: number;
  acceptedQuoteValue: number;
  quoteAcceptanceRate: number;
  confirmedOrders: number;
  confirmedOrderValue: number;
  deliveredOrders: number;
  deliveredRevenue: number;
};

type FunnelStep = {
  id: string;
  label: string;
  count: number;
};

type TrendPoint = {
  month: string;
  leads: number;
  deals: number;
  deliveredOrders: number;
  revenue: number;
};

type CRMAnalyticsData = {
  period: {
    from: string;
    to: string;
    days: number;
  };

  scope: {
    branchId: string | null;
    allBranches: boolean;
    branchIds: string[];
  };

  aiUsage: {
    assistantName: string;

    monthly: {
      used: number;
      limit: number;
      remaining: number;
    };

    extra: {
      original: number;
      used: number;
      remaining: number;
      nextExpiresAt: string | null;
    };
  } | null;

  metrics: AnalyticsMetrics;
  funnel: FunnelStep[];
  trends: TrendPoint[];
};

type CRMAnalyticsResponse = {
  success: boolean;
  data?: CRMAnalyticsData;
  error?: string;
};

const periodOptions: Array<{
  value: AnalyticsRollingDays;
  label: string;
}> = [
  {
    value: 30,
    label: "30 días",
  },
  {
    value: 90,
    label: "90 días",
  },
  {
    value: 365,
    label: "12 meses",
  },
];

const quarterOptions =
  (() => {
    const current =
      getCurrentAnalyticsQuarter();

    const currentQuarterIndex =
      current.year *
        4 +
      (
        current.quarter -
        1
      );

    return Array.from(
      {
        length: 8,
      },
      (
        _,
        index,
      ) => {
        const quarterIndex =
          currentQuarterIndex -
          index;

        const year =
          Math.floor(
            quarterIndex /
              4,
          );

        const quarter =
          (
            (
              quarterIndex %
                4
            ) +
            1
          ) as
            | 1
            | 2
            | 3
            | 4;

        return {
          value:
            `${year}-Q${quarter}`,

          label:
            `Q${quarter} ${year}`,

          year,
          quarter,
        };
      },
    );
  })();

function getPeriodHelperText(
  selection:
    AnalyticsPeriodSelection,
): string {
  const label =
    getAnalyticsPeriodLabel(
      selection,
    );

  return selection.kind ===
    "rolling"
    ? `Durante los ${label.toLowerCase()}`
    : `Durante ${label}`;
}

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    },
  ).format(
    value,
  );
}

function formatCompactCurrency(
  value: number,
): string {
  const formatCompactValue = (
    compactValue: number,
  ) =>
    new Intl.NumberFormat(
      "es-MX",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    ).format(
      compactValue,
    );

  if (
    Math.abs(value) >=
    1_000_000
  ) {
    return `$${formatCompactValue(
      value /
        1_000_000,
    )} M`;
  }

  if (
    Math.abs(value) >=
    1_000
  ) {
    return `$${formatCompactValue(
      value /
        1_000,
    )} mil`;
  }

  return formatCurrency(
    value,
  );
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    "es-MX",
    {
      maximumFractionDigits: 0,
    },
  ).format(
    value,
  );
}

function formatMonth(
  value: string,
): string {
  const [
    year,
    month,
  ] =
    value
      .split("-")
      .map(Number);

  if (
    !year ||
    !month
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    },
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        1,
      ),
    ),
  );
}

function formatComparisonChange(
  currentValue: number,
  comparisonValue: number,
  comparisonLabel: string,
  unit:
    | "percent"
    | "points" =
    "percent",
): string {
  if (
    unit ===
    "points"
  ) {
    const difference =
      currentValue -
      comparisonValue;

    if (
      Math.abs(
        difference,
      ) <
      0.005
    ) {
      return `Sin cambio vs ${comparisonLabel}`;
    }

    const formatted =
      Math.abs(
        difference,
      ).toLocaleString(
        "es-MX",
        {
          maximumFractionDigits: 2,
        },
      );

    return `${difference > 0 ? "+" : "-"}${formatted} puntos vs ${comparisonLabel}`;
  }

  if (
    comparisonValue ===
    0
  ) {
    return currentValue ===
      0
      ? `Sin cambio vs ${comparisonLabel}`
      : `Sin base comparable en ${comparisonLabel}`;
  }

  const difference =
    (
      (
        currentValue -
        comparisonValue
      ) /
      Math.abs(
        comparisonValue,
      )
    ) *
    100;

  if (
    Math.abs(
      difference,
    ) <
    0.05
  ) {
    return `Sin cambio vs ${comparisonLabel}`;
  }

  const formatted =
    Math.abs(
      difference,
    ).toLocaleString(
      "es-MX",
      {
        maximumFractionDigits: 1,
      },
    );

  return `${difference > 0 ? "+" : "-"}${formatted}% vs ${comparisonLabel}`;
}

export default function CRMAnalyticsPage() {
  const { user } =
    useAuth();

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] =
    useState<
      AnalyticsPeriodSelection
    >({
      kind: "rolling",
      days: 30,
    });

  const [
    previousPeriod,
    setPreviousPeriod,
  ] =
    useState<
      AnalyticsPeriodSelection |
      null
    >(null);

  const [
    comparisonAnalytics,
    setComparisonAnalytics,
  ] =
    useState<
      CRMAnalyticsData |
      null
    >(null);

  const [
    analytics,
    setAnalytics,
  ] =
    useState<
      CRMAnalyticsData |
      null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(null);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadPeriod(
      period: {
        from: string;
        to: string;
      },
    ): Promise<CRMAnalyticsData> {
      const parameters =
        new URLSearchParams({
          from:
            period.from,

          to:
            period.to,
        });

      const response =
        await fetch(
          `/api/crm/analytics/overview?${parameters.toString()}`,
          {
            cache:
              "no-store",

            signal:
              controller.signal,
          },
        );

      const result =
        (await response.json()) as
          CRMAnalyticsResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ??
            "No fue posible cargar Analytics del CRM.",
        );
      }

      return result.data;
    }

    async function loadAnalytics() {
      try {
        setIsLoading(true);
        setError(null);

        const period =
          getAnalyticsPeriodDates(
            selectedPeriod,
          );

        const comparisonPeriod =
          getAnalyticsComparisonPeriod(
            selectedPeriod,
            "previous_period",
          );

        const [
          currentResult,
          comparisonResult,
        ] =
          await Promise.all([
            loadPeriod(
              period,
            ),

            loadPeriod(
              comparisonPeriod,
            ),
          ]);

        setAnalytics(
          currentResult,
        );

        setComparisonAnalytics(
          comparisonResult,
        );
      } catch (loadError) {
        if (
          loadError instanceof
            DOMException &&
          loadError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "No fue posible cargar Analytics del CRM.",
        );

        setAnalytics(null);
        setComparisonAnalytics(
          null,
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      controller.abort();
    };
  }, [
    selectedPeriod,
  ]);

  const metrics =
    analytics?.metrics;

  const aiUsage =
    analytics?.aiUsage ??
    null;

  const comparisonMetrics =
    comparisonAnalytics
      ?.metrics;

  const comparisonLabel =
    getAnalyticsComparisonPeriod(
      selectedPeriod,
      "previous_period",
    ).label;

  const leadsComparison =
    !isLoading &&
    metrics &&
    comparisonMetrics
      ? formatComparisonChange(
          metrics.leadsCreated,
          comparisonMetrics
            .leadsCreated,
          comparisonLabel,
        )
      : undefined;

  const pipelineComparison =
    !isLoading &&
    metrics &&
    comparisonMetrics
      ? formatComparisonChange(
          metrics
            .openPipelineValue,
          comparisonMetrics
            .openPipelineValue,
          comparisonLabel,
        )
      : undefined;

  const closeRateComparison =
    !isLoading &&
    metrics &&
    comparisonMetrics
      ? formatComparisonChange(
          metrics.conversionRate,
          comparisonMetrics
            .conversionRate,
          comparisonLabel,
          "points",
        )
      : undefined;

  const revenueComparison =
    !isLoading &&
    metrics &&
    comparisonMetrics
      ? formatComparisonChange(
          metrics.deliveredRevenue,
          comparisonMetrics
            .deliveredRevenue,
          comparisonLabel,
        )
      : undefined;

  const maximumFunnelCount =
    useMemo(
      () =>
        Math.max(
          1,
          ...(
            analytics?.funnel.map(
              (step) =>
                step.count,
            ) ?? []
          ),
        ),
      [
        analytics,
      ],
    );

  const maximumTrendRevenue =
    useMemo(
      () =>
        Math.max(
          1,
          ...(
            analytics?.trends.map(
              (point) =>
                point.revenue,
            ) ?? []
          ),
        ),
      [
        analytics,
      ],
    );

  const hasData =
    Boolean(
      metrics &&
      (
        metrics.leadsCreated >
          0 ||
        metrics.dealsCreated >
          0 ||
        metrics.quotesCreated >
          0 ||
        metrics.deliveredOrders >
          0
      ),
    );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Analytics del CRM"
        title={`Desempeño comercial de ${
          user?.tenantName ??
          "tu empresa"
        }`}
        description="Analiza el comportamiento histórico del proceso comercial, sus conversiones y los ingresos generados."
        action={
          <div className="flex max-w-xl flex-col gap-2">
            <div className="flex flex-wrap rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {periodOptions.map(
                (option) => {
                  const isSelected =
                    selectedPeriod.kind ===
                      "rolling" &&
                    selectedPeriod.days ===
                      option.value;

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      className={[
                        "rounded-xl px-4 py-2 text-sm font-semibold transition",
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                      ].join(
                        " ",
                      )}
                      onClick={() => {
                        setPreviousPeriod(
                          null,
                        );

                        setSelectedPeriod({
                          kind:
                            "rolling",

                          days:
                            option.value,
                        });
                      }}
                    >
                      {option.label}
                    </button>
                  );
                },
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Mes exacto
                </span>

                <input
                  type="month"
                  max={
                    getCurrentAnalyticsMonth()
                  }
                  value={
                    selectedPeriod.kind ===
                    "month"
                      ? [
                          selectedPeriod.year,

                          String(
                            selectedPeriod.month,
                          ).padStart(
                            2,
                            "0",
                          ),
                        ].join(
                          "-",
                        )
                      : ""
                  }
                  onChange={(
                    event,
                  ) => {
                    const month =
                      parseAnalyticsMonth(
                        event.target.value,
                      );

                    if (month) {
                      setPreviousPeriod(
                        null,
                      );

                      setSelectedPeriod(
                        month,
                      );
                    }
                  }}
                  className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                  aria-label="Seleccionar mes exacto"
                />
              </label>

              <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Trimestre
                </span>

                <select
                  value={
                    selectedPeriod.kind ===
                    "quarter"
                      ? `${selectedPeriod.year}-Q${selectedPeriod.quarter}`
                      : ""
                  }
                  onChange={(
                    event,
                  ) => {
                    const option =
                      quarterOptions.find(
                        (
                          candidate,
                        ) =>
                          candidate.value ===
                          event.target.value,
                      );

                    if (option) {
                      setPreviousPeriod(
                        null,
                      );

                      setSelectedPeriod({
                        kind:
                          "quarter",

                        year:
                          option.year,

                        quarter:
                          option.quarter,
                      });
                    }
                  }}
                  className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                  aria-label="Seleccionar trimestre"
                >
                  <option value="">
                    Seleccionar
                  </option>

                  {quarterOptions.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

          </div>
        }
      />

      {error && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-700">
            No fue posible cargar Analytics
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        </div>
      )}

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Prospectos generados"
          value={
            isLoading
              ? "..."
              : formatNumber(
                  metrics
                    ?.leadsCreated ??
                    0,
                )
          }
          helperText={
            getPeriodHelperText(
              selectedPeriod,
            )
          }
          comparisonText={
            leadsComparison
          }
          tone="neutral"
        />

        <MetricCard
          label="Valor de oportunidades"
          value={
            isLoading
              ? "..."
              : formatCurrency(
                  metrics
                    ?.openPipelineValue ??
                    0,
                )
          }
          change={
            isLoading
              ? undefined
              : `${formatNumber(
                  metrics
                    ?.openDeals ??
                    0,
                )} oportunidades`
          }
          helperText={
            `Oportunidades creadas. ${getPeriodHelperText(
              selectedPeriod,
            )}`
          }
          comparisonText={
            pipelineComparison
          }
          tone="neutral"
        />

        <MetricCard
          label="Tasa de cierre"
          value={
            isLoading
              ? "..."
              : `${
                  metrics
                    ?.conversionRate ??
                  0
                }%`
          }
          change={
            isLoading
              ? undefined
              : `${formatNumber(
                  metrics
                    ?.dealsWon ??
                    0,
                )} ganadas de ${formatNumber(
                  metrics
                    ?.dealsClosed ??
                    0,
                )} cerradas`
          }
          helperText="Porcentaje de oportunidades cerradas que fueron ganadas"
          comparisonText={
            closeRateComparison
          }
          tone="positive"
        />

        <MetricCard
          label="Ingresos entregados"
          value={
            isLoading
              ? "..."
              : formatCurrency(
                  metrics
                    ?.deliveredRevenue ??
                    0,
                )
          }
          change={
            isLoading
              ? undefined
              : `${formatNumber(
                  metrics
                    ?.deliveredOrders ??
                    0,
                )} órdenes entregadas`
          }
          helperText={
            getPeriodHelperText(
              selectedPeriod,
            )
          }
          comparisonText={
            revenueComparison
          }
          tone="positive"
        />
      </section>

      {!isLoading &&
        !error &&
        !hasData && (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Todavía no hay actividad suficiente
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Cuando se registren prospectos, oportunidades, cotizaciones u órdenes dentro del periodo seleccionado, aparecerán aquí.
            </p>
          </div>
        )}

      {(isLoading ||
        hasData) && (
        <>
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <ChartCard
              eyebrow="Evolución comercial"
              title="Ingresos por mes"
              description="Importe de las órdenes entregadas durante el periodo seleccionado."
              action={
                previousPeriod ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(
                        previousPeriod,
                      );

                      setPreviousPeriod(
                        null,
                      );
                    }}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                  >
                    Volver a{" "}
                    {getAnalyticsPeriodLabel(
                      previousPeriod,
                    )}
                  </button>
                ) : undefined
              }
            >
              {isLoading ? (
                <div className="flex h-72 items-center justify-center text-sm font-medium text-slate-400">
                  Cargando tendencia...
                </div>
              ) : analytics &&
                analytics.trends.length >
                  0 ? (
                <>
                  <div className="flex h-72 items-end gap-3">
                    {analytics.trends.map(
                      (point) => {
                        const height =
                          Math.max(
                            4,
                            (
                              point.revenue /
                              maximumTrendRevenue
                            ) *
                              86,
                          );

                        return (
                          <div
                            key={
                              point.month
                            }
                            className="group relative flex h-full min-w-0 flex-1 items-end"
                          >
                            <span
                              className={[
                                "absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-slate-500",
                                analytics.trends.length <=
                                2
                                  ? "text-sm"
                                  : analytics.trends.length <=
                                      4
                                    ? "text-xs"
                                    : "text-[10px]",
                              ].join(
                                " ",
                              )}
                              style={{
                                bottom:
                                  `calc(${height}% + 0.4rem)`,
                              }}
                              title={formatCurrency(
                                point.revenue,
                              )}
                            >
                              {formatCompactCurrency(
                                point.revenue,
                              )}
                            </span>

                            <button
                              type="button"
                              className="w-full cursor-pointer rounded-t-xl bg-gradient-to-t from-blue-700 to-cyan-400 transition hover:opacity-75 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                              aria-label={`Ver Analytics de ${formatMonth(
                                point.month,
                              )}`}
                              onClick={() => {
                                const month =
                                  parseAnalyticsMonth(
                                    point.month,
                                  );

                                if (
                                  month &&
                                  !(
                                    selectedPeriod.kind ===
                                      "month" &&
                                    selectedPeriod.year ===
                                      month.year &&
                                    selectedPeriod.month ===
                                      month.month
                                  )
                                ) {
                                  setPreviousPeriod(
                                    selectedPeriod,
                                  );

                                  setSelectedPeriod(
                                    month,
                                  );
                                }
                              }}
                              style={{
                                height:
                                  `${height}%`,
                              }}
                              title={`${formatMonth(
                                point.month,
                              )}: ${formatCurrency(
                                point.revenue,
                              )}`}
                            />
                          </div>
                        );
                      },
                    )}
                  </div>

                  <div
                    className="mt-4 grid gap-3 text-center text-xs font-medium text-slate-400"
                    style={{
                      gridTemplateColumns:
                        `repeat(${analytics.trends.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {analytics.trends.map(
                      (point) => (
                        <span
                          key={
                            point.month
                          }
                          className="truncate"
                        >
                          {formatMonth(
                            point.month,
                          )}
                        </span>
                      ),
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-slate-400">
                  No hay ingresos entregados en este periodo.
                </div>
              )}
            </ChartCard>

            <SectionCard
              subtitle="Actividad"
              title="Actividad del periodo"
            >
              {isLoading ? (
                <div className="flex h-72 items-center justify-center text-sm font-medium text-slate-400">
                  Cargando embudo...
                </div>
              ) : (
                <div className="space-y-5">
                  {analytics?.funnel.map(
                    (
                      step,
                    ) => {
                      const width =
                        Math.max(
                          8,
                          (
                            step.count /
                            maximumFunnelCount
                          ) *
                            100,
                        );

                      return (
                        <div
                          key={
                            step.id
                          }
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {step.label}
                              </p>

                            </div>

                            <p className="text-xl font-black text-slate-950">
                              {formatNumber(
                                step.count,
                              )}
                            </p>
                          </div>

                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-400"
                              style={{
                                width:
                                  `${width}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </SectionCard>
          </section>

          <section className="mt-6">
            <SectionCard
              subtitle="Detalle del periodo"
              title="Resultados comerciales"
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label:
                      "Oportunidades creadas",
                    value:
                      metrics
                        ?.dealsCreated ??
                      0,
                  },
                  {
                    label:
                      "Cotizaciones enviadas",
                    value:
                      metrics
                        ?.quotesSent ??
                      0,
                  },
                  {
                    label:
                      "Cotizaciones aceptadas",
                    value:
                      metrics
                        ?.quotesAccepted ??
                      0,
                  },
                  {
                    label:
                      "Órdenes confirmadas",
                    value:
                      metrics
                        ?.confirmedOrders ??
                      0,
                  },
                ].map(
                  (item) => (
                    <article
                      key={
                        item.label
                      }
                      className="rounded-2xl bg-slate-50 p-5"
                    >
                      <p className="text-sm font-medium text-slate-500">
                        {item.label}
                      </p>

                      <p className="mt-3 text-3xl font-black text-slate-950">
                        {isLoading
                          ? "..."
                          : formatNumber(
                              item.value,
                            )}
                      </p>
                    </article>
                  ),
                )}
              </div>

              {!isLoading &&
                metrics && (
                  <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-sm text-slate-500">
                        Ventas ganadas
                      </p>

                      <p className="mt-2 text-lg font-bold text-slate-950">
                        {formatCurrency(
                          metrics.wonRevenue,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Cotizaciones aceptadas
                      </p>

                      <p className="mt-2 text-lg font-bold text-slate-950">
                        {formatCurrency(
                          metrics.acceptedQuoteValue,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Órdenes confirmadas
                      </p>

                      <p className="mt-2 text-lg font-bold text-slate-950">
                        {formatCurrency(
                          metrics.confirmedOrderValue,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Aceptación de cotizaciones
                      </p>

                      <p className="mt-2 text-lg font-bold text-slate-950">
                        {metrics.quoteAcceptanceRate}%
                      </p>
                    </div>
                  </div>
                )}
            </SectionCard>
          </section>

      {!isLoading &&
        aiUsage && (
          <section className="mt-5 overflow-hidden rounded-3xl border border-violet-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-violet-700">
                Consumo de inteligencia artificial
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {aiUsage.assistantName}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                El asistente interno y el chatbot público consumen primero la bolsa mensual y después los créditos extra.
              </p>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              <article className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                      Créditos mensuales
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {formatNumber(
                        aiUsage.monthly.remaining,
                      )}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      disponibles
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-blue-700">
                    {formatNumber(
                      aiUsage.monthly.used,
                    )}{" "}
                    de{" "}
                    {formatNumber(
                      aiUsage.monthly.limit,
                    )}{" "}
                    utilizados
                  </p>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-400"
                    style={{
                      width:
                        `${
                          aiUsage.monthly.limit >
                          0
                            ? Math.min(
                                100,

                                (
                                  aiUsage.monthly.used /
                                  aiUsage.monthly.limit
                                ) *
                                  100,
                              )
                            : 0
                        }%`,
                    }}
                  />
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Se restablecen cada mes y no son acumulables.
                </p>
              </article>

              <article className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                      Créditos extra
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {formatNumber(
                        aiUsage.extra.remaining,
                      )}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      disponibles
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-violet-700">
                    {formatNumber(
                      aiUsage.extra.used,
                    )}{" "}
                    de{" "}
                    {formatNumber(
                      aiUsage.extra.original,
                    )}{" "}
                    utilizados
                  </p>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-violet-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-700 via-blue-600 to-cyan-400"
                    style={{
                      width:
                        `${
                          aiUsage.extra.original >
                          0
                            ? Math.min(
                                100,

                                (
                                  aiUsage.extra.used /
                                  aiUsage.extra.original
                                ) *
                                  100,
                              )
                            : 0
                        }%`,
                    }}
                  />
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  {aiUsage.extra.nextExpiresAt
                    ? `La siguiente bolsa vence el ${new Intl.DateTimeFormat(
                        "es-MX",
                        {
                          dateStyle:
                            "medium",
                        },
                      ).format(
                        new Date(
                          aiUsage.extra.nextExpiresAt,
                        ),
                      )}.`
                    : "No hay créditos extra disponibles."}
                </p>
              </article>
            </div>
          </section>
        )}
        </>
      )}
    </div>
  );
}
