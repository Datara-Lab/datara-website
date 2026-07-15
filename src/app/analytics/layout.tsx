"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

type AnalyticsLayoutProps = {
  children: ReactNode;
};

const navigation = [
  {
    label: "Resumen",
    href: "/analytics",
  },
  {
    label: "Dashboards",
    href: "/analytics/dashboards",
  },
  {
    label: "KPIs",
    href: "/analytics/kpis",
  },
  {
    label: "Reportes",
    href: "/analytics/reportes",
  },
  {
    label: "Datasets",
    href: "/analytics/datasets",
  },
];

export default function AnalyticsLayout({
  children,
}: AnalyticsLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { user, isAuthenticated, logout } = useAuth();

  const hasAnalyticsAccess =
    Boolean(user) && user?.products.includes("analytics");

  if (!isAuthenticated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
          <h1 className="text-3xl font-bold text-slate-950">
            Sesión no disponible
          </h1>

          <p className="mt-4 text-slate-500">
            Inicia sesión para acceder a Datara Analytics.
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

  if (!hasAnalyticsAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
          <Image
            src="/logos/analytics.png"
            alt="Datara Analytics"
            width={240}
            height={90}
            className="mx-auto h-20 w-auto object-contain"
          />

          <h1 className="mt-8 text-3xl font-bold text-slate-950">
            Producto no habilitado
          </h1>

          <p className="mt-4 text-slate-500">
            Tu empresa no tiene acceso a Datara Analytics.
          </p>

          <Button
            className="mt-8 w-full justify-center"
            size="lg"
            onClick={() => router.push("/portal")}
          >
            Volver al portal
          </Button>
        </div>
      </main>
    );
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-7 py-6">
            <button
              type="button"
              onClick={() => router.push("/portal")}
              className="flex items-center gap-4 text-left"
            >
              <Image
                src="/logos/analytics-icon.png"
                alt="Datara Analytics"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />

              <div>
                <p className="font-bold text-slate-950">
                  Datara Analytics
                </p>

                <p className="text-sm text-slate-500">
                  {user.tenantName}
                </p>
              </div>
            </button>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const isActive =
                item.href === "/analytics"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={[
                    "flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-semibold transition",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => router.push("/portal")}
            >
              Volver al portal
            </Button>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 sm:px-8">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Datara Analytics
              </p>

              <h1 className="text-xl font-bold text-slate-950">
                {user.tenantName}
              </h1>
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
          </header>

          <div className="p-6 sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}