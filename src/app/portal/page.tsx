import {
  currentUser,
} from "@clerk/nextjs/server";

import {
  eq,
} from "drizzle-orm";


import Image from "next/image";
import Link from "next/link";

import PortalHeader from "@/components/layout/PortalHeader";

import {
  db,
} from "@/db";

import {
  tenants,
} from "@/db/schema";

import { createAuthorization } from "@/lib/auth/authorization";

type DataraProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  logo?: string;
  route: string;
  contracted: boolean;
  status: "available" | "coming-soon";
  accent: string;
  buttonClassName: string;
  features?: string[];
};

const products: DataraProduct[] = [
  {
    id: "analytics",
    name: "Datara Analytics",
    category: "Inteligencia empresarial",
    description: "Reportes, dashboards e indicadores.",
    logo: "/logos/analytics.png",
    route: "/analytics",
    contracted: true,
    status: "available",
    accent: "border-blue-200 bg-blue-50/70",
    buttonClassName:
      "border-blue-200 text-blue-700 hover:bg-blue-100",
  },
  {
    id: "crm",
    name: "Datara CRM",
    category: "Gestión comercial",
    description: "Clientes, oportunidades y ventas.",
    logo: "/logos/crm.png",
    route: "/crm",
    contracted: true,
    status: "available",
    accent: "border-emerald-200 bg-emerald-50/70",
    buttonClassName:
      "border-emerald-200 text-emerald-700 hover:bg-emerald-100",
  },
  {
    id: "cloud",
    name: "Datara Cloud",
    category: "Infraestructura",
    description: "Servicios Cloud administrados.",
    logo: "/logos/cloud.png",
    route: "/cloud",
    contracted: true,
    status: "available",
    accent: "border-cyan-200 bg-cyan-50/70",
    buttonClassName:
      "border-cyan-200 text-cyan-700 hover:bg-cyan-100",
  },
  {
    id: "erp",
    name: "Datara ERP",
    category: "Administración empresarial",
    description:
      "Gestiona inventarios, compras, ventas, proveedores y operaciones.",
    route: "/#contacto",
    contracted: false,
    status: "coming-soon",
    accent: "border-violet-200 bg-violet-50/60",
    buttonClassName:
      "border-violet-200 text-violet-700 hover:bg-violet-100",
    features: [
      "Inventarios y almacenes",
      "Compras y proveedores",
      "Ventas y facturación",
    ],
  },
  {
    id: "pets",
    name: "Datara Pets",
    category: "Gestión de mascotas",
    description:
      "Plataforma para guarderías, clínicas y servicios especializados.",
    route: "/#contacto",
    contracted: false,
    status: "coming-soon",
    accent: "border-orange-200 bg-orange-50/60",
    buttonClassName:
      "border-orange-200 text-orange-700 hover:bg-orange-100",
    features: [
      "Control de mascotas",
      "Vacunas y expedientes",
      "Reservas y asistencias",
    ],
  },
  {
    id: "ai",
    name: "Datara AI",
    category: "Inteligencia artificial",
    description:
      "Automatiza procesos y genera recomendaciones para tu empresa.",
    route: "/#contacto",
    contracted: false,
    status: "coming-soon",
    accent: "border-indigo-200 bg-indigo-50/60",
    buttonClassName:
      "border-indigo-200 text-indigo-700 hover:bg-indigo-100",
    features: [
      "Análisis predictivo",
      "Automatizaciones inteligentes",
      "Asistentes empresariales",
    ],
  },
];

const availableProducts = products.filter(
  (product) => !product.contracted,
);

function ClientProductCard({
  product,
}: {
  product: DataraProduct;
}) {
  return (
    <article
      className={[
        "flex min-h-[148px] flex-col rounded-2xl border p-4",
        product.accent,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {product.logo ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white p-1.5 shadow-sm">
            <Image
              src={product.logo}
              alt={`Logo de ${product.name}`}
              width={96}
              height={96}
              className="h-full w-full object-contain"
            />
          </div>
        ) : null}

        <div>
          <h3 className="text-sm font-black text-slate-950">
            {product.name}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            {product.description}
          </p>
        </div>
      </div>

      <Link
        href={product.route}
        className={[
          "mt-auto flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-xs font-bold transition",
          product.buttonClassName,
        ].join(" ")}
      >
        Entrar →
      </Link>
    </article>
  );
}

function AvailableProductCard({
  product,
}: {
  product: DataraProduct;
}) {
  return (
    <article
      className={[
        "flex h-full flex-col rounded-[28px] border p-6 shadow-sm",
        product.accent,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {product.category}
          </p>

          <h3 className="mt-2 text-xl font-black text-slate-950">
            {product.name}
          </h3>
        </div>

        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
          Próximamente
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {product.description}
      </p>

      {product.features ? (
        <ul className="mt-5 space-y-2">
          {product.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <span className="text-blue-600">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        href={product.route}
        className={[
          "mt-6 flex items-center justify-center rounded-xl border bg-white px-4 py-3 text-sm font-bold transition",
          product.buttonClassName,
        ].join(" ")}
      >
        Más información →
      </Link>
    </article>
  );
}

export default async function PortalPage() {
  const authz = await createAuthorization();

    const authorizationContext =
    authz.getContext();

  const [
    tenantRows,
    clerkUser,
  ] = await Promise.all([
    db
      .select({
        id:
          tenants.id,

        name:
          tenants.name,
      })
      .from(
        tenants,
      )
      .where(
        eq(
          tenants.id,
          authorizationContext
            .tenantId,
        ),
      )
      .limit(1),

    currentUser(),
  ]);

  const tenant =
    tenantRows[0];

  if (!tenant) {
    throw new Error(
      "No encontramos la empresa activa.",
    );
  }

  const now =
    new Date();

  const company = {
    name:
      tenant.name,

    workspaceName:
      "Workspace Empresarial",

    userName:
      clerkUser
        ?.firstName ??
      clerkUser
        ?.username ??
      "Usuario",

    lastAccessDate:
      new Intl.DateTimeFormat(
        "es-MX",
        {
          dateStyle:
            "long",

          timeZone:
            "America/Mexico_City",
        },
      ).format(
        now,
      ),

    lastAccessTime:
      new Intl.DateTimeFormat(
        "es-MX",
        {
          hour:
            "2-digit",

          minute:
            "2-digit",

          timeZone:
            "America/Mexico_City",
        },
      ).format(
        now,
      ),
  };

  const activeProducts = products.filter(
    (product) => {
      if (!product.contracted) {
        return false;
      }

      if (product.id === "crm") {
        return authz.products.crm.allowed;
      }

      if (product.id === "analytics") {
        return authz.products.analytics.allowed;
      }

      if (product.id === "cloud") {
        return authz.products.cloud.allowed;
      }

      return false;
    },
  );
  return (
    <main className="min-h-screen bg-slate-50">
      <PortalHeader />

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">
              Datara Workspace
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Todo lo que tu empresa necesita, en una sola
              plataforma.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Accede a todos los productos y servicios
              empresariales de Datara desde un único espacio
              de trabajo seguro.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {[
                "Una sola cuenta",
                "Productos integrados",
                "Infraestructura administrada",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <article className="overflow-hidden rounded-[30px] border border-slate-200 border-l-blue-500 bg-white shadow-2xl shadow-blue-950/10 lg:border-l-4">
            <div className="relative overflow-hidden border-b border-slate-200 px-6 py-6 sm:px-8">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-cyan-50" />

                <div className="relative flex items-center gap-5">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-3 shadow-lg">
                    <Image
                      src={`/api/settings/company-logo/content?tenant=${encodeURIComponent(
                        authorizationContext
                          .tenantId,
                      )}`}
                      alt={`Logo de ${company.name}`}
                      width={96}
                      height={96}
                      unoptimized
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-base font-semibold text-slate-600">
                      ¡Buenos días, {company.userName}!
                    </p>

                    <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                      {company.name}
                    </h2>

                    <p className="mt-1 font-bold text-blue-600">
                      {company.workspaceName}
                    </p>
                  </div>
                </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-black text-slate-950">
                  Tus productos activos
                </h3>

                <span className="text-xs font-bold text-emerald-600">
                  ● Todo en orden
                </span>
              </div>

              <div
                className={[
                  "mt-5 grid gap-4",
                  activeProducts.length === 1
                    ? "md:grid-cols-1"
                    : activeProducts.length === 2
                      ? "md:grid-cols-2"
                      : "md:grid-cols-3",
                ].join(" ")}
              >
                {activeProducts.map((product) => (
                  <ClientProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Último acceso
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {company.lastAccessDate} ·{" "}
                    {company.lastAccessTime}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/administracion"
                    className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    Administración →
                  </Link>

                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver actividad →
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">
              Más productos Datara
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Expande tu plataforma
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Agrega nuevas soluciones conforme tu empresa
              crece.
            </p>
          </div>

          <p className="text-sm font-medium text-slate-500">
            {availableProducts.length} soluciones disponibles
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {availableProducts.map((product) => (
            <AvailableProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>

        <section className="mt-10 overflow-hidden rounded-[30px] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                Tu empresa. Tus procesos. Tu plataforma.
              </h2>

              <p className="mt-2 max-w-3xl text-slate-300">
                Todos los productos Datara trabajando juntos
                para que tu empresa opere mejor.
              </p>
            </div>

            <Link
              href="/#contacto"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-50"
            >
              Hablar con Datara →
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}