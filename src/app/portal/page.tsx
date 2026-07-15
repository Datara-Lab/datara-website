"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import type { ProductAccess } from "@/types/user";

type Product = {
  id: ProductAccess;
  name: string;
  description: string;
  logo: string;
  route: string;
  features: string[];
  buttonVariant: "primary" | "secondary";
};

const products: Product[] = [
  {
    id: "analytics",
    name: "Datara Analytics",
    description:
      "Dashboards, indicadores y reportes para entender el desempeño de tu negocio.",
    logo: "/logos/analytics.png",
    route: "/analytics",
    features: [
      "Dashboards ejecutivos",
      "KPIs en tiempo real",
      "Reportes automáticos",
      "Análisis empresarial",
    ],
    buttonVariant: "primary",
  },
  {
    id: "crm",
    name: "Datara CRM",
    description:
      "Gestiona prospectos, clientes, oportunidades y seguimiento comercial.",
    logo: "/logos/crm.png",
    route: "/crm",
    features: [
      "Gestión de prospectos",
      "Pipeline de ventas",
      "Seguimiento comercial",
      "Automatizaciones",
    ],
    buttonVariant: "secondary",
  },
];

export default function PortalPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
          <h1 className="text-3xl font-bold text-slate-950">
            Sesión no disponible
          </h1>

          <p className="mt-4 text-slate-500">
            Inicia sesión para acceder a tus productos de Datara.
          </p>

          <Button
            className="mt-8 w-full justify-center"
            size="lg"
            onClick={() => router.push("/login")}
          >
            Ir al inicio de sesión
          </Button>
        </div>
      </main>
    );
  }

  const enabledProducts = products.filter((product) =>
    user.products.includes(product.id),
  );

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-4">
            <Image
              src="/logos/lab-icon.png"
              alt="Datara"
              width={42}
              height={42}
              priority
              className="h-10 w-10 object-contain"
            />

            <div>
              <h1 className="font-bold text-slate-950">Datara</h1>

              <p className="text-sm text-slate-500">
                {user.tenantName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {user.firstName} {user.lastName}
              </p>

              <p className="text-xs capitalize text-slate-500">
                {user.role}
              </p>
            </div>

            <Button variant="secondary" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Espacio de trabajo
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Hola, {user.firstName} 👋
          </h2>

          <p className="mt-4 text-lg text-slate-500">
            Selecciona el producto que deseas utilizar.
          </p>
        </div>

        {enabledProducts.length > 0 ? (
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {enabledProducts.map((product) => (
              <article
                key={product.id}
                className="group rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-950/5 transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-950/10 sm:p-10"
              >
                <Image
                  src={product.logo}
                  alt={product.name}
                  width={240}
                  height={90}
                  className="h-20 w-auto object-contain"
                />

                <p className="mt-7 max-w-xl leading-7 text-slate-600">
                  {product.description}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {product.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        ✓
                      </span>

                      {feature}
                    </div>
                  ))}
                </div>

                <Button
                  className="mt-9"
                  size="lg"
                  variant={product.buttonVariant}
                  onClick={() => router.push(product.route)}
                >
                  Abrir {product.id === "analytics" ? "Analytics" : "CRM"} →
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="text-2xl font-bold text-slate-950">
              No tienes productos habilitados
            </h3>

            <p className="mt-3 text-slate-500">
              Contacta al administrador de tu empresa para revisar tu licencia.
            </p>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white/70 px-6 py-5 text-sm text-slate-500">
          Has iniciado sesión como{" "}
          <span className="font-semibold text-slate-700">
            {user.email}
          </span>
          .
        </div>
      </section>
    </main>
  );
}