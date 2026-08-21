"use client";

import MetricCard from "@/components/shared/MetricCard";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import { useAuth } from "@/contexts/AuthContext";

import {
  useEffect,
  useState,
} from "react";

type CRMAlertTone = "success" | "warning" | "danger" | "info";

type CRMAlert = {
  id: string;
  title: string;
  description: string;
  tone: CRMAlertTone;
};

type Opportunity = {
  id: string;
  name: string;
  company: string;
  value: string;
  stage: string;
  probability: string;
};

const alertStyles: Record<
  CRMAlertTone,
  {
    dot: string;
    badge: string;
    label: string;
  }
> = {
  success: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    label: "Positivo",
  },
  warning: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
    label: "Atención",
  },
  danger: {
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700",
    label: "Prioridad",
  },
  info: {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700",
    label: "Oportunidad",
  },
};

type CRMSummaryResponse = {
  success: boolean;

  data?: {
    metrics: {
      activeLeads: number;
      openDeals: number;
      pipelineTotal: number;
      conversionRate: number;
    };

    pipelineStages: Array<{
      name: string;
      count: number;
      total: number;
      width: number;
    }>;

    activitySummary: {
      pendingFollowUps: number;
      upcomingMeetings: number;
      expiringQuotes: number;
    };

    alerts: CRMAlert[];

    priorityDeals: Array<{
      id: string;
      name: string;
      stage: string;
      probability: number;
      totalAmount: number;
      currency: string;
      customerId: string | null;
      company: string;
    }>;
  };

  error?: string;
};

export default function CRMPage() {
  const { user } = useAuth();

    const [
    summaryMetrics,
    setSummaryMetrics,
  ] = useState<
    CRMSummaryResponse["data"]
  >();

  const [
    isLoadingSummary,
    setIsLoadingSummary,
  ] = useState(true);

  const [
    summaryError,
    setSummaryError,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      try {
        setIsLoadingSummary(true);
        setSummaryError(null);

        const response =
          await fetch(
            "/api/crm/summary",
            {
              cache:
                "no-store",
            },
          );

        const result =
          (await response.json()) as
            CRMSummaryResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.error ??
              "No fue posible cargar el resumen.",
          );
        }

        if (!isActive) {
          return;
        }

        setSummaryMetrics(
          result.data,
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setSummaryError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar el resumen.",
        );
      } finally {
        if (isActive) {
          setIsLoadingSummary(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isActive = false;
    };
  }, []);

  const metrics = [
    {
      label: "Prospectos activos",
      value:
        isLoadingSummary
          ? "..."
          : String(
              summaryMetrics
                ?.metrics
                .activeLeads ??
                0,
            ),
      change:
        summaryError
          ? "Sin datos"
          : "Actual",
    },
    {
      label: "Oportunidades abiertas",
      value:
        isLoadingSummary
          ? "..."
          : String(
              summaryMetrics
                ?.metrics
                .openDeals ??
                0,
            ),
      change:
        summaryError
          ? "Sin datos"
          : "Actual",
    },
    {
      label: "Pipeline estimado",
      value:
        isLoadingSummary
          ? "..."
          : new Intl.NumberFormat(
              "es-MX",
              {
                style: "currency",
                currency: "MXN",
                maximumFractionDigits:
                  0,
              },
            ).format(
              summaryMetrics
                ?.metrics
                .pipelineTotal ??
                0,
            ),
      change:
        summaryError
          ? "Sin datos"
          : "Actual",
    },
    {
      label: "Conversión comercial",
      value:
        isLoadingSummary
          ? "..."
          : `${(
              summaryMetrics
                ?.metrics
                .conversionRate ??
              0
            ).toFixed(1)}%`,
      change:
        summaryError
          ? "Sin datos"
          : "Actual",
    },
  ];

  const pipelineStages =
    (
      summaryMetrics
        ?.pipelineStages ??
      []
    ).map(
      (stage) => ({
        name:
          stage.name,

        count:
          stage.count,

        value:
          new Intl.NumberFormat(
            "es-MX",
            {
              style:
                "currency",

              currency:
                "MXN",

              maximumFractionDigits:
                0,
            },
          ).format(
            stage.total,
          ),

        width:
          stage.width,
      }),
    );

  const alerts =
    summaryMetrics
      ?.alerts ??
    [];

  const opportunities: Opportunity[] =
    (
      summaryMetrics
        ?.priorityDeals ??
      []
    ).map(
      (deal) => ({
        id:
          deal.id,

        name:
          deal.name,

        company:
          deal.company,

        value:
          new Intl.NumberFormat(
            "es-MX",
            {
              style:
                "currency",

              currency:
                deal.currency.toUpperCase(),

              maximumFractionDigits:
                0,
            },
          ).format(
            deal.totalAmount,
          ),

        stage:
          deal.stage,

        probability:
          `${deal.probability}%`,
      }),
    );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Resumen del CRM"
        title={`Hola, ${user?.firstName ?? "usuario"}`}
        description={`Este es el estado actual del proceso comercial de ${
          user?.tenantName ?? "tu empresa"
        }.`}
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Pipeline actualizado
          </span>
        }
      />

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            change={metric.change}
          />
        ))}
      </section>

      <section className="mt-6">
        <SectionCard
          subtitle="Prioridades del día"
          title="Lo que requiere tu atención"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {alerts.map((alert) => {
              const styles = alertStyles[alert.tone];

              return (
                <article
                  key={alert.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition duration-200 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={[
                        "mt-1.5 h-3 w-3 shrink-0 rounded-full",
                        styles.dot,
                      ].join(" ")}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold text-slate-900">
                          {alert.title}
                        </h3>

                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            styles.badge,
                          ].join(" ")}
                        >
                          {styles.label}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          subtitle="Pipeline comercial"
          title="Distribución de oportunidades"
        >
          <div className="space-y-6">
            {pipelineStages.map((stage) => (
              <div key={stage.name}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {stage.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {stage.count} oportunidades
                    </p>
                  </div>

                  <p className="font-bold text-slate-950">
                    {stage.value}
                  </p>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-400"
                    style={{ width: `${stage.width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          subtitle="Actividad comercial"
          title="Acciones recomendadas"
        >
          <div className="space-y-4">
            <article className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Seguimientos pendientes
              </p>

              <p className="mt-3 text-3xl font-black text-slate-950">
                {isLoadingSummary
                  ? "..."
                  : summaryMetrics
                      ?.activitySummary
                      .pendingFollowUps ??
                    0}
              </p>

              <p className="mt-2 text-sm text-amber-600">
                Requieren atención hoy
              </p>
            </article>

            <article className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Reuniones programadas
              </p>

              <p className="mt-3 text-3xl font-black text-slate-950">
                {isLoadingSummary
                  ? "..."
                  : summaryMetrics
                      ?.activitySummary
                      .upcomingMeetings ??
                    0}
              </p>

              <p className="mt-2 text-sm text-blue-600">
                Durante los próximos tres días
              </p>
            </article>

            <article className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Cotizaciones por vencer
              </p>

              <p className="mt-3 text-3xl font-black text-slate-950">
                {isLoadingSummary
                  ? "..."
                  : summaryMetrics
                      ?.activitySummary
                      .expiringQuotes ??
                    0}
              </p>

              <p className="mt-2 text-sm text-red-600">
                Vencen esta semana
              </p>
            </article>
          </div>
        </SectionCard>
      </section>

      <section className="mt-8">
        <PageHeader
          eyebrow="Oportunidades"
          title="Operaciones prioritarias"
          description="Oportunidades con mayor valor y probabilidad de cierre durante el periodo actual."
        />

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Oportunidad
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Empresa
                  </th>

                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                    Valor
                  </th>

                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                    Etapa
                  </th>

                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                    Probabilidad
                  </th>
                </tr>
              </thead>

              <tbody>
                {opportunities.map((opportunity) => (
                  <tr
                    key={opportunity.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {opportunity.name}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {opportunity.company}
                    </td>

                    <td className="px-6 py-4 text-right font-semibold text-slate-900">
                      {opportunity.value}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {opportunity.stage}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right font-semibold text-slate-700">
                      {opportunity.probability}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}