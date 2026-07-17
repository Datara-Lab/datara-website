"use client";

import { useEffect, useState } from "react";

import ChartCard from "@/components/shared/ChartCard";
import DataTable, {
  type DataTableColumn,
} from "@/components/shared/DataTable";
import InsightsCard, {
  type Insight,
} from "@/components/shared/InsightsCard";
import MetricCard from "@/components/shared/MetricCard";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import { useAuth } from "@/contexts/AuthContext";

type ProductRow = {
  name: string;
  sales: string;
  growth: string;
};

type AlertTone = "success" | "warning" | "danger" | "info";

type BusinessAlert = {
  id: string;
  title: string;
  description: string;
  tone: AlertTone;
};

function formatSyncDate(date: Date): string {
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const syncDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const differenceInDays = Math.round(
    (today.getTime() - syncDay.getTime()) / 86_400_000,
  );

  const time = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (differenceInDays === 0) {
    return `Hoy · ${time}`;
  }

  if (differenceInDays === 1) {
    return `Ayer · ${time}`;
  }

  const fullDate = date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${fullDate} · ${time}`;
}

const insights: Insight[] = [
  {
    id: "sales-growth",
    title: "Las ventas crecieron 18.4%",
    description:
      "El crecimiento fue impulsado principalmente por los productos de mayor margen y el desempeño de la sucursal Centro.",
    tone: "positive",
  },
  {
    id: "margin-warning",
    title: "El margen requiere atención",
    description:
      "Aunque las ventas aumentaron, algunos productos registraron una reducción en su margen durante el periodo actual.",
    tone: "warning",
  },
  {
    id: "customer-opportunity",
    title: "Hay una oportunidad de recompra",
    description:
      "Se identificaron clientes activos con patrones de compra que indican una alta probabilidad de volver a comprar.",
    tone: "info",
  },
  {
    id: "branch-performance",
    title: "La sucursal Centro lidera el crecimiento",
    description:
      "La sucursal Centro registró un desempeño 24.8% superior al periodo anterior.",
    tone: "positive",
  },
];

const metrics = [
  {
    label: "Ventas totales",
    value: "$1.28 M",
    change: "+18.4%",
  },
  {
    label: "Margen promedio",
    value: "32.6%",
    change: "+4.8%",
  },
  {
    label: "Clientes activos",
    value: "1,248",
    change: "+12.1%",
  },
  {
    label: "Conversión",
    value: "34.2%",
    change: "+6.3%",
  },
];

const salesTrend = [
  42,
  58,
  51,
  68,
  63,
  79,
  74,
  92,
  84,
  96,
  89,
  100,
];

const months = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const alerts: BusinessAlert[] = [
  {
    id: "sync",
    title: "Información sincronizada",
    description:
      "Todos los datos disponibles fueron procesados correctamente.",
    tone: "success",
  },
  {
    id: "inventory",
    title: "Inventario bajo en dos categorías",
    description:
      "Se recomienda revisar la disponibilidad de los productos con mayor rotación.",
    tone: "warning",
  },
  {
    id: "customers",
    title: "Tres clientes requieren seguimiento",
    description:
      "Se detectaron clientes con actividad reciente y oportunidades pendientes.",
    tone: "danger",
  },
  {
    id: "report",
    title: "Nuevo reporte ejecutivo disponible",
    description:
      "El reporte del periodo actual ya está listo para consulta.",
    tone: "info",
  },
];

const alertStyles: Record<
  AlertTone,
  {
    dot: string;
    badge: string;
    label: string;
  }
> = {
  success: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    label: "Correcto",
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
    label: "Información",
  },
};

const topProducts: ProductRow[] = [
  {
    name: "Producto A",
    sales: "$286,400",
    growth: "+22.1%",
  },
  {
    name: "Producto B",
    sales: "$218,900",
    growth: "+16.7%",
  },
  {
    name: "Producto C",
    sales: "$184,300",
    growth: "+11.4%",
  },
  {
    name: "Producto D",
    sales: "$142,800",
    growth: "+8.9%",
  },
];

const productColumns: DataTableColumn<ProductRow>[] = [
  {
    key: "name",
    header: "Producto",
    render: (value) => (
      <div>
        <p className="font-semibold text-slate-900">
          {String(value)}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Producto destacado
        </p>
      </div>
    ),
  },
  {
    key: "sales",
    header: "Ventas",
    align: "right",
  },
  {
    key: "growth",
    header: "Crecimiento",
    align: "right",
    render: (value) => (
      <span className="font-semibold text-emerald-600">
        {String(value)}
      </span>
    ),
  },
];

export default function AnalyticsPage() {
  const { user } = useAuth();

  const [lastSyncLabel, setLastSyncLabel] =
    useState("Sincronizando...");

  useEffect(() => {
    /*
     * Por ahora simulamos que la sincronización ocurrió
     * al abrir el dashboard.
     *
     * Cuando conectemos Datara Platform, esta fecha vendrá
     * directamente desde la API.
     */
    const synchronizationDate = new Date();

    const updateSyncLabel = () => {
      setLastSyncLabel(formatSyncDate(synchronizationDate));
    };

    updateSyncLabel();

    const intervalId = window.setInterval(
      updateSyncLabel,
      60_000,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Resumen ejecutivo"
        title={`Hola, ${user?.firstName ?? "usuario"}`}
        description={`Consulta el desempeño general de ${
          user?.tenantName ?? "tu empresa"
        } y los temas que requieren atención.`}
        action={
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Última sincronización
            </p>

            <div className="mt-1 flex items-center justify-end gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]" />

              <p className="text-sm font-semibold text-slate-900">
                {lastSyncLabel}
              </p>
            </div>
          </div>
        }
      />

      <div className="mt-8">
        <InsightsCard
          title="Datara Intelligence"
          description="La plataforma analizó automáticamente la información más reciente de tu empresa y detectó estos hallazgos."
          insights={insights}
        />
      </div>

      <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
          subtitle="Atención requerida"
          title="Alertas de negocio"
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

      <section className="mt-6">
        <ChartCard
          eyebrow="Tendencia principal"
          title="Evolución de ventas"
          description="Comportamiento mensual de las ventas durante los últimos doce meses."
          action={
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              Últimos 12 meses
            </span>
          }
        >
          <div className="flex h-96 items-end gap-3">
            {salesTrend.map((height, index) => (
              <div
                key={`${months[index]}-${height}`}
                className="group flex h-full flex-1 items-end"
              >
                <div
                  className="w-full rounded-t-xl bg-gradient-to-t from-blue-700 to-cyan-400 transition duration-200 group-hover:opacity-75"
                  style={{ height: `${height}%` }}
                  title={`${months[index]}: ${height}%`}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-6 gap-3 text-center text-xs font-medium text-slate-400 sm:grid-cols-12">
            {months.map((month) => (
              <span key={month}>
                {month}
              </span>
            ))}
          </div>
        </ChartCard>
      </section>

      <section className="mt-8">
        <PageHeader
          eyebrow="Desempeño"
          title="Ranking de productos"
          description="Productos con mejor desempeño comercial durante el periodo actual."
        />

        <div className="mt-6">
          <DataTable
            columns={productColumns}
            data={topProducts}
            emptyMessage="No hay productos disponibles."
          />
        </div>
      </section>
    </div>
  );
}