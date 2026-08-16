import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import type { NavigationItem } from "@/lib/navigation";

type AdministrationLayoutProps = {
  children: ReactNode;
};

const administrationNavigation: NavigationItem[] =
  [
    {
      id: "administration-home",
      label: "Resumen",
      href: "/administracion",
    },
    {
      id: "administration-company",
      label: "Empresa",
      href: "/administracion/empresa",
    },
    {
      id: "administration-structure",
      label: "Regiones y sucursales",
      href: "/administracion/estructura",
    },
    {
      id: "administration-users",
      label: "Usuarios",
      href: "/administracion/usuarios",
    },
    {
      id: "administration-roles",
      label: "Roles y permisos",
      href: "/administracion/roles",
    },
    {
      id: "administration-invitations",
      label: "Invitaciones",
      href: "/administracion/invitaciones",
    },
  ];

export default function AdministrationLayout({
  children,
}: AdministrationLayoutProps) {
  return (
    <AppShell
      product="workspace"
      productName="Datara Workspace"
      productLogo="/logos/lab-icon.png"
      navigation={
        administrationNavigation
      }
    >
      {children}
    </AppShell>
  );
}