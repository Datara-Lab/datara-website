"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";

import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useCRMConfig } from "@/hooks/useCRMConfig";
import type { NavigationItem } from "@/lib/navigation";

type CRMLayoutProps = {
  children: ReactNode;
};

export default function CRMLayout({
  children,
}: CRMLayoutProps) {
  const router = useRouter();

  const { user, isAuthenticated } = useAuth();

  const {
    tenantConfig,
    navigation,
    isConfigured,
  } = useCRMConfig();

  const appNavigation = useMemo<NavigationItem[]>(() => {
    return navigation
      .filter(
        (
          item,
        ): item is typeof item & {
          route: string;
        } => typeof item.route === "string" && item.route.length > 0,
      )
      .map((item) => ({
        id: item.id,
        label: item.label,
        href: item.route,
      }));
  }, [navigation]);

  if (!isAuthenticated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
          <h1 className="text-3xl font-bold text-slate-950">
            Sesión no disponible
          </h1>

          <p className="mt-4 text-slate-500">
            Inicia sesión para acceder a Datara CRM.
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

  const hasCRMAccess = user.products.includes("crm");

  if (!hasCRMAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
          <Image
            src="/logos/crm.png"
            alt="Datara CRM"
            width={240}
            height={90}
            priority
            className="mx-auto h-20 w-auto object-contain"
          />

          <h1 className="mt-8 text-3xl font-bold text-slate-950">
            Aplicación no habilitada
          </h1>

          <p className="mt-4 text-slate-500">
            Tu empresa no tiene acceso a Datara CRM.
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

  if (!isConfigured || !tenantConfig) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-10 text-center shadow-xl">
          <Image
            src="/logos/crm-icon.png"
            alt="Datara CRM"
            width={64}
            height={64}
            priority
            className="mx-auto h-16 w-16 object-contain"
          />

          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
            Configuración pendiente
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            El CRM de esta empresa aún no está configurado
          </h1>

          <p className="mt-4 leading-7 text-slate-500">
            Datara no encontró una configuración de CRM asociada al espacio de
            trabajo de tu empresa.
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
      product="crm"
      productName="Datara CRM"
      productLogo="/logos/crm-icon.png"
      navigation={appNavigation}
    >
      {children}
    </AppShell>
  );
}