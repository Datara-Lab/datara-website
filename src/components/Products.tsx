import Image from "next/image";

import Button from "@/components/ui/Button";

type ProductAccent =
  | "platform"
  | "blue"
  | "cloud";

type Product = {
  name: string;
  description: string;
  logo: string;
  accent: ProductAccent;
  features: string[];
  href: string;
  ctaLabel: string;
  status: "available" | "coming-soon";
};

const products: Product[] = [
  {
    name: "Datara DBP",
    description:
      "Controla clientes, ventas, inventario, facturación y operación desde un solo lugar, configurado para tu industria.",
    logo: "/logos/dbp-transparent.png",
    accent: "platform",
    features: [
      "Configuración para tu industria",
      "Ventas y operación de principio a fin",
      "Reglas, permisos y automatizaciones",
      "Una sola fuente de información",
    ],
    href: "/catalogo/crm",
    ctaLabel: "Descubrir Datara DBP",
    status: "available",
  },
  {
    name: "Datara Cloud",
    description:
      "Mantén tus sistemas disponibles, protegidos y listos para crecer con infraestructura administrada por especialistas.",
    logo: "/logos/cloud.png",
    accent: "cloud",
    features: [
      "Infraestructura lista para operar",
      "Hosting de aplicaciones",
      "Seguridad y respaldos",
      "Acompañamiento especializado",
    ],
    href: "/cloud",
    ctaLabel: "Ver catálogo",
    status: "available",
  },
  {
    name: "Datara Analytics",
    description:
      "Descubre qué está pasando, por qué sucede y cuál es la siguiente acción que más conviene a tu negocio.",
    logo: "/logos/analytics.png",
    accent: "blue",
    features: [
      "Indicadores de toda la operación",
      "Análisis por sucursal y equipo",
      "Recomendaciones con respaldo de datos",
      "Resultados medibles",
    ],
    href: "#contacto",
    ctaLabel: "Solicitar información",
    status: "coming-soon",
  },
];

const accentStyles: Record<
  ProductAccent,
  {
    glow: string;
    check: string;
  }
> = {
  platform: {
    glow:
      "bg-gradient-to-br from-blue-600/20 via-cyan-400/20 to-emerald-300/15",
    check:
      "bg-gradient-to-br from-blue-700 via-cyan-500 to-teal-400",
  },
  blue: {
    glow: "bg-blue-500/15",
    check: "bg-blue-600",
  },
  cloud: {
    glow: "bg-cyan-500/15",
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
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-5 py-2 text-sm font-semibold text-cyan-700">
            Elige cómo empezar
          </span>

          <h2 className="mt-6 text-4xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-5xl">
            Empieza con lo que necesitas.
            <span className="block bg-gradient-to-r from-blue-700 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
              Crece sin volver a empezar.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Activa Datara DBP, Cloud o Analytics según tu prioridad. Cada
            producto está diseñado para conectarse con los demás.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const styles =
              accentStyles[product.accent];

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
                  <div className="flex min-h-20 items-start justify-between gap-5">
                    <Image
                      src={product.logo}
                      alt={product.name}
                      width={330}
                      height={132}
                      className={[
                        "w-auto object-contain object-left",
                        product.accent === "platform"
                          ? "h-20 max-w-[250px]"
                          : "h-16 max-w-[220px] sm:h-20",
                      ].join(" ")}
                    />

                    {product.status === "coming-soon" && (
                      <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                        Próximamente
                      </span>
                    )}
                  </div>

                  <h3 className="mt-8 text-3xl font-bold tracking-tight text-slate-950">
                    {product.name}
                  </h3>

                  <p className="mt-4 min-h-[140px] text-base leading-7 text-slate-600">
                    {product.description}
                  </p>

                  <div className="mt-8 grid gap-3">
                    {product.features.map(
                      (feature) => (
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
                      ),
                    )}
                  </div>

                  <div className="mt-auto pt-10">
                    {product.status === "available" ? (
                      <Button
                        href={product.href}
                        size="lg"
                      >
                        {product.ctaLabel}
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
          Activa solo lo que necesitas hoy y suma capacidades cuando tu
          operación lo pida.
        </div>
      </div>
    </section>
  );
}
