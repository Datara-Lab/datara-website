"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsNavigation } from "@/lib/navigation";

type AnalyticsLayoutProps = {
  children: ReactNode;
};

export default function AnalyticsLayout({
  children,
}: AnalyticsLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

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

  const hasAnalyticsAccess = user.products.includes("analytics");

  if (!hasAnalyticsAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
          <Image
            src="/logos/analytics.png"
            alt="Datara Analytics"
            width={240}
            height={90}
            priority
            className="mx-auto h-20 w-auto object-contain"
          />

          <h1 className="mt-8 text-3xl font-bold text-slate-950">
            Aplicación no habilitada
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

  return (
    <AppShell
      product="analytics"
      productName="Datara Analytics"
      productLogo="/logos/analytics-icon.png"
      navigation={analyticsNavigation}
    >
      {children}
    </AppShell>
  );
}