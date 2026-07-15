"use client";

import { useAuth } from "@/contexts/AuthContext";
import MetricCard from "@/components/shared/MetricCard";

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

const monthlyPerformance = [42, 58, 51, 68, 63, 79, 74, 92, 84, 96, 89, 100];

const topProducts = [
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

export default function AnalyticsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-7xl">

      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Resumen ejecutivo
        </p>

        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Hola, {user?.firstName}
        </h2>

        <p className="mt-3 text-slate-500">
          Este es el desempeño general de {user?.tenantName}.
        </p>
      </section>

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

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-semibold text-blue-600">
                Ventas
              </p>

              <h3 className="mt-1 text-2xl font-bold text-slate-950">
                Rendimiento mensual
              </h3>
            </div>

            <span className="w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              Últimos 12 meses
            </span>

          </div>

          <div className="mt-10 flex h-72 items-end gap-3">
            {monthlyPerformance.map((height, index) => (
              <div
                key={`${height}-${index}`}
                className="group flex h-full flex-1 items-end"
              >
                <div
                  className="w-full rounded-t-xl bg-gradient-to-t from-blue-700 to-cyan-400 transition group-hover:opacity-80"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-6 gap-3 text-center text-xs font-medium text-slate-400 sm:grid-cols-12">
            {[
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
            ].map((month) => (
              <span key={month}>
                {month}
              </span>
            ))}
          </div>

        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <p className="text-sm font-semibold text-blue-600">
            Productos
          </p>

          <h3 className="mt-1 text-2xl font-bold text-slate-950">
            Mayores ventas
          </h3>

          <div className="mt-8 space-y-4">

            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4"
              >
                <div className="flex min-w-0 items-center gap-4">

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {product.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {product.sales}
                    </p>
                  </div>

                </div>

                <span className="shrink-0 text-sm font-semibold text-emerald-600">
                  {product.growth}
                </span>

              </div>
            ))}

          </div>

        </article>

      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">

        <MetricCard
          label="Mejor sucursal"
          value="Sucursal Centro"
          change="+24.8%"
        />

        <MetricCard
          label="Producto más rentable"
          value="Producto A"
          change="+41.3%"
        />

        <MetricCard
          label="Actualización"
          value="Hace 5 minutos"
          change="Sincronizado"
        />

      </section>

    </div>
  );
}