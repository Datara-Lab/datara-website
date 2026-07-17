import Image from "next/image";
import Link from "next/link";

type DataraProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  logo: string;
  route: string;
  features: string[];
  status: "available" | "coming-soon";
  accent: string;
  buttonClassName: string;
};

const products: DataraProduct[] = [
  {
    id: "analytics",
    name: "Datara Analytics",
    category: "Inteligencia empresarial",
    description:
      "Convierte la información de tu empresa en indicadores, reportes y decisiones claras.",
    logo: "/logos/analytics.png",
    route: "/analytics",
    status: "available",
    features: [
      "Dashboards ejecutivos",
      "KPIs en tiempo real",
      "Reportes automáticos",
      "Análisis empresarial",
    ],
    accent:
      "from-blue-500/15 via-cyan-400/10 to-transparent",
    buttonClassName:
      "bg-gradient-to-r from-blue-700 to-cyan-500 hover:from-blue-800 hover:to-cyan-600",
  },
  {
    id: "crm",
    name: "Datara CRM",
    category: "Gestión comercial",
    description:
      "Administra prospectos, clientes, oportunidades y procesos comerciales desde una sola plataforma.",
    logo: "/logos/crm.png",
    route: "/crm",
    status: "available",
    features: [
      "Gestión de prospectos",
      "Seguimiento de ventas",
      "Cotizaciones y promociones",
      "Automatizaciones comerciales",
    ],
    accent:
      "from-emerald-500/15 via-green-400/10 to-transparent",
    buttonClassName:
      "bg-gradient-to-r from-emerald-700 to-green-500 hover:from-emerald-800 hover:to-green-600",
  },
  {
    id: "cloud",
    name: "Datara Cloud",
    category: "Infraestructura y servicios administrados",
    description:
      "Alojamos, protegemos y administramos la infraestructura tecnológica de tu empresa para que tu operación nunca se detenga.",
    logo: "/logos/cloud.png",
    route: "/cloud",
    status: "available",
    features: [
      "Infraestructura Cloud",
      "Hosting de aplicaciones",
      "Seguridad y respaldos",
      "Servicios administrados",
    ],
    accent:
      "from-cyan-500/15 via-teal-400/10 to-transparent",
    buttonClassName:
      "bg-gradient-to-r from-blue-700 via-cyan-500 to-teal-500 hover:from-blue-800 hover:via-cyan-600 hover:to-teal-600",
  },
];

function ProductCard({
  product,
}: {
  product: DataraProduct;
}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 sm:p-7">
      <div
        className={[
          "pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b",
          product.accent,
        ].join(" ")}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <Image
              src={product.logo}
              alt={`Logo de ${product.name}`}
              width={160}
              height={160}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            Disponible
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            {product.category}
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {product.name}
          </h2>

          <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600">
            {product.description}
          </p>
        </div>

        <div className="my-6 h-px bg-slate-200" />

        <ul className="space-y-3">
          {product.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 text-sm font-medium text-slate-700"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                ✓
              </span>

              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <Link
            href={product.route}
            className={[
              "flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition duration-200 hover:-translate-y-0.5",
              product.buttonClassName,
            ].join(" ")}
          >
            Abrir {product.name.replace("Datara ", "")}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function PortalPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />

        <div className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">
              Datara Workspace
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Todo lo que tu empresa necesita,
              en una sola plataforma.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              Accede a los productos y servicios
              empresariales de Datara desde un único
              espacio de trabajo seguro.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              Una sola cuenta
            </span>

            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              Productos integrados
            </span>

            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              Infraestructura administrada
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Productos Datara
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Selecciona dónde quieres trabajar
            </h2>
          </div>

          <p className="text-sm font-medium text-slate-500">
            {products.length} productos disponibles
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>

        <section className="mt-10 overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
                Ecosistema Datara
              </p>

              <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                Tu empresa. Tus procesos. Tu plataforma.
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                CRM, analítica, infraestructura Cloud y
                servicios administrados trabajando juntos
                para que tu empresa opere mejor.
              </p>
            </div>

            <Link
              href="/#contacto"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50"
            >
              Hablar con Datara
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}