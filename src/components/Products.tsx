import Image from "next/image";
import Button from "@/components/ui/Button";

const products = [
  {
    name: "Datara Analytics",
    description:
      "Transforma la información de tu negocio en dashboards, indicadores y reportes que facilitan la toma de decisiones.",
    logo: "/logos/analytics.png",
    icon: "/logos/analytics-icon.png",
    accent: "blue",
    features: [
      "Dashboards ejecutivos",
      "KPIs en tiempo real",
      "Reportes automáticos",
      "Análisis personalizado",
    ],
  },
  {
    name: "Datara CRM",
    description:
      "Centraliza prospectos, clientes y oportunidades para mejorar el seguimiento comercial y acelerar tus ventas.",
    logo: "/logos/crm.png",
    icon: "/logos/crm-icon.png",
    accent: "green",
    features: [
      "Gestión de prospectos",
      "Pipeline de ventas",
      "Seguimiento comercial",
      "Automatizaciones",
    ],
  },
];

export default function Products() {
  return (
    <section
      id="productos"
      className="relative overflow-hidden bg-white px-8 py-24 sm:py-28"
    >
      <div className="pointer-events-none absolute left-0 top-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-5 py-2 text-sm font-semibold text-cyan-700">
            Nuestros productos
          </span>

          <h2 className="mt-6 text-4xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-5xl">
            Dos productos.
            <span className="block bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent">
              Una sola experiencia.
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Contrata Datara Analytics, Datara CRM o ambos. Tus usuarios acceden
            con una sola cuenta y únicamente ven los productos incluidos en su
            paquete.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {products.map((product) => {
            const isAnalytics = product.accent === "blue";

            return (
              <article
                key={product.name}
                className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-950/5 transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-950/10 sm:p-10"
              >
                <div
                  className={`pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl ${
                    isAnalytics ? "bg-blue-500/15" : "bg-emerald-500/15"
                  }`}
                />

                <div className="relative">
                  <div className="flex items-center justify-between gap-6">
                    <Image
                      src={product.logo}
                      alt={product.name}
                      width={230}
                      height={90}
                      className="h-16 w-auto object-contain sm:h-20"
                    />

                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                        isAnalytics ? "bg-blue-50" : "bg-emerald-50"
                      }`}
                    >
                      <Image
                        src={product.icon}
                        alt=""
                        width={38}
                        height={38}
                        className="h-9 w-9 object-contain"
                      />
                    </div>
                  </div>

                  <h3 className="mt-8 text-3xl font-bold tracking-tight text-slate-950">
                    {product.name}
                  </h3>

                  <p className="mt-4 min-h-20 text-base leading-7 text-slate-600">
                    {product.description}
                  </p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {product.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                            isAnalytics ? "bg-blue-600" : "bg-emerald-600"
                          }`}
                        >
                          ✓
                        </span>

                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-10">
                    <Button
                      href="mailto:paul@datara-lab.com?subject=Solicitud%20de%20demo%20Datara"
                      variant={isAnalytics ? "primary" : "secondary"}
                      size="lg"
                      className={
                        isAnalytics
                          ? ""
                          : "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                      }
                    >
                      Conocer {isAnalytics ? "Analytics" : "CRM"} →
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm font-medium text-slate-600">
          Cada empresa recibe acceso únicamente a los productos y funciones
          incluidos en su paquete.
        </div>
      </div>
    </section>
  );
}