import Image from "next/image";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-14 px-8 py-20 lg:grid-cols-[1fr_0.95fr]">
        <div>
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700">
            Analytics y CRM para empresas
          </span>

          <h1 className="mt-8 max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
            Convierte tus datos en{" "}
            <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              decisiones inteligentes.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Centraliza tu operación comercial, conoce el desempeño de tu
            negocio y toma mejores decisiones con Datara CRM y Datara
            Analytics.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button
              href="mailto:ventas@datara-lab.com?subject=Solicitud%20de%20demo%20Datara"
              size="lg"
            >
              Solicitar una demo
            </Button>

            <Button href="#productos" variant="secondary" size="lg">
              Conocer los productos
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-slate-500">
            <span>✓ Implementación personalizada</span>
            <span>✓ Acceso por producto</span>
            <span>✓ Una sola cuenta</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-400/30 blur-3xl" />

          <div className="relative rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-2xl shadow-blue-950/10 backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Datara
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  Resumen ejecutivo
                </h2>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-slate-400">Ventas</p>
                  <p className="mt-2 text-3xl font-bold text-white">$1.28M</p>
                  <p className="mt-2 text-sm text-emerald-300">↑ 18.4%</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-slate-400">Conversión CRM</p>
                  <p className="mt-2 text-3xl font-bold text-white">34.2%</p>
                  <p className="mt-2 text-sm text-cyan-300">148 leads activos</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Rendimiento mensual
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Ventas y oportunidades
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    En tiempo real
                  </span>
                </div>

                <div className="mt-6 flex h-36 items-end gap-3">
                  {[38, 52, 47, 66, 58, 76, 92, 84].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-blue-700 to-cyan-400"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -bottom-7 -left-7 hidden w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:block">
              <div className="flex items-center gap-3">
                <Image
                  src="/logos/analytics-icon.png"
                  alt="Datara Analytics"
                  width={38}
                  height={38}
                />

                <div>
                  <p className="font-bold text-slate-900">Analytics</p>
                  <p className="text-xs text-slate-500">
                    KPIs y dashboards
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -right-7 -top-7 hidden w-52 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:block">
              <div className="flex items-center gap-3">
                <Image
                  src="/logos/crm-icon.png"
                  alt="Datara CRM"
                  width={38}
                  height={38}
                />

                <div>
                  <p className="font-bold text-slate-900">CRM</p>
                  <p className="text-xs text-slate-500">
                    Ventas y clientes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}