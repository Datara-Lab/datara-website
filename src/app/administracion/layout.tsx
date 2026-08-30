import type {
  ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";

import type {
  NavigationItem,
} from "@/lib/navigation";

import {
  requireCloudAdministrator,
} from "@/lib/platform/authorization";

type AdministrationLayoutProps = {
  children: ReactNode;
};

const administrationNavigation:
  NavigationItem[] = [
    {
      id:
        "administration-home",

      label:
        "Resumen",

      href:
        "/administracion",
    },
    {
      id:
        "administration-company",

      label:
        "Empresa",

      href:
        "/administracion/empresa",
    },
    {
      id:
        "administration-structure",

      label:
        "Regiones y sucursales",

      href:
        "/administracion/estructura",
    },
    {
      id:
        "administration-users",

      label:
        "Usuarios",

      href:
        "/administracion/usuarios",
    },
    {
      id:
        "administration-roles",

      label:
        "Roles y permisos",

      href:
        "/administracion/roles",
    },
    {
      id:
        "administration-invitations",

      label:
        "Invitaciones",

      href:
        "/administracion/invitaciones",
    },
  ];

const cloudNavigation:
  NavigationItem[] = [
    {
      id:
        "administration-cloud",

      label:
        "Datara Cloud",

      href:
        "/administracion/cloud",
    },
    {
      id:
        "administration-fiscal",

      label:
        "Operación fiscal",

      href:
        "/administracion/fiscal",
    },
  ];

export default async function AdministrationLayout({
  children,
}: AdministrationLayoutProps) {
  let isPlatformAdministrator =
    false;

  let isCloudOnlyAdministrator =
    false;

  try {
    const cloudAdministrator =
      await requireCloudAdministrator();

    isPlatformAdministrator =
      cloudAdministrator.roleKey ===
        "owner" ||
      cloudAdministrator.roleKey ===
        "admin";

    isCloudOnlyAdministrator =
      cloudAdministrator
        .isCloudOnlyAdministrator;
  } catch {
    /*
     * Un administrador normal de un
     * Workspace no pertenece
     * necesariamente a la organización
     * interna de Datara.
     *
     * Conserva la navegación estándar.
     */
  }

  const navigation:
    NavigationItem[] =
    isCloudOnlyAdministrator
      ? cloudNavigation
      : isPlatformAdministrator
        ? [
            ...administrationNavigation,
            ...cloudNavigation,
          ]
        : administrationNavigation;

  return (
    <AppShell
      product="workspace"
      productName={
        isCloudOnlyAdministrator
          ? "Datara Cloud"
          : "Datara Workspace"
      }
      productLogo="/logos/lab-icon.png"
      navigation={
        navigation
      }
    >
      {children}
    </AppShell>
  );
}