import Image from "next/image";

import Button from "@/components/ui/Button";

type ProductAccent = "blue" | "green" | "cloud";

type Product = {
  name: string;
  shortName: string;
  description: string;
  logo: string;
  icon: string;
  accent: ProductAccent;
  features: string[];
  emailSubject: string;
  status: "available" | "coming-soon";
};

const products: Product[] = [
  {
    name: "Datara CRM",
    shortName: "CRM",
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
    emailSubject: "Solicitud de demo Datara CRM",
    status: "available",
  },
  {
    name: "Datara Cloud",
    shortName: "Cloud",
    description:
      "Infraestructura, hosting y servicios administrados para mantener tus sistemas seguros, disponibles y listos para crecer.",
    logo: "/logos/cloud.png",
    icon: "/logos/cloud-icon.png",
    accent: "cloud",
    features: [
      "Infraestructura Cloud",
      "Hosting de aplicaciones",
      "Seguridad y respaldos",
      "Servicios administrados",
    ],
    emailSubject: "Solicitud de información Datara Cloud",
    status: "available",
  },
  {
    name: "Datara Analytics",
    shortName: "Analytics",
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
    emailSubject: "Solicitud de demo Datara Analytics",
    status: "coming-soon",
  },
];

const accentStyles: Record<
  ProductAccent,
  {
    glow: string;
    iconBackground: string;
    check: string;
  }
> = {
  blue: {
    glow: "bg-blue-500/15",
    iconBackground: "bg-blue-50",
    check: "bg-blue-600",
  },
  green: {
    glow: "bg-emerald-500/15",
    iconBackground: "bg-emerald-50",
    check: "bg-emerald-600",
  },
  cloud: {
    glow: "bg-cyan-500/15",
    iconBackground:
      "bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50",
    check:
      "bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-500",
  },
};

export default function Products() {
  return (
    <section
      id="productos"
      className="relative overflow-hidden bg-white px-5 py-24 sm:px-8 sm:py-28"
    >
      <div className="pointer-events-none absolute left-0 top-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-5 py-2 text-sm font-semibold text-cyan-700">
            Nuestros productos
          </span>

          <h2 className="mt-6 text-4xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-5xl">
            Dos soluciones disponibles.
            <span className="block bg-gradient-to-r from-blue-700 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
              Una plataforma que crece contigo.
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Elige Datara CRM, Datara Cloud o combina ambos en una sola
            plataforma. Explora nuestro catálogo para encontrar la solución
            que mejor se adapte a las necesidades de tu empresa.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const styles = accentStyles[product.accent];
            return (
              <article
                key={product.name}
                className={[
                  "group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-950/5 transition duration-300",
                  product.status === "available"
                    ? "hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-950/10"
                    : "",
                ].join(" ")}
              >
                <div
                  className={[
                    "pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl",
                    styles.glow,
                  ].join(" ")}
                />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <Image
                        src={product.logo}
                        alt={product.name}
                        width={230}
                        height={90}
                        className="h-16 w-auto max-w-[220px] object-contain sm:h-20"
                      />
                    </div>

                    {product.status === "coming-soon" && (
                      <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                        Próximamente
                      </span>
                    )}
                  </div>

                  <h3 className="mt-8 text-3xl font-bold tracking-tight text-slate-950">
                    {product.name}
                  </h3>

                  <p className="mt-4 min-h-[112px] text-base leading-7 text-slate-600">
                    {product.description}
                  </p>

                  <div className="mt-8 grid gap-3">
                    {product.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        <span
                          className={[
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                            styles.check,
                          ].join(" ")}
                        >
                          ✓
                        </span>

                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-10">
                    {product.status === "available" ? (
                      <Button
                        href={
                          product.shortName === "CRM"
                            ? "/catalogo/crm"
                            : product.shortName === "Cloud"
                              ? "/cloud"
                              : "#contacto"
                        }
                        size="lg"
                      >
                        {product.shortName === "CRM" ||
                        product.shortName === "Cloud"
                          ? "Ver catálogo"
                          : "Solicitar información"}
                      </Button>
                    ) : (
                      <div className="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-500">
                        Próximamente
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm font-medium text-slate-600">
          Cada empresa recibe acceso únicamente a los productos, módulos y
          funciones incluidos en su paquete.
        </div>
      </div>
    </section>
  );
}