export type NavigationItem = {
  id: string;
  label: string;
  href: string;
};

export const analyticsNavigation: NavigationItem[] = [
  {
    id: "executive-summary",
    label: "Resumen ejecutivo",
    href: "/analytics",
  },
  {
    id: "dashboards",
    label: "Dashboards",
    href: "/analytics/dashboards",
  },
  {
    id: "reports",
    label: "Reportes",
    href: "/analytics/reports",
  },
  {
    id: "settings",
    label: "Configuración",
    href: "/analytics/settings",
  },
];

export const crmNavigation: NavigationItem[] = [
  {
    id: "home",
    label: "Inicio",
    href: "/crm",
  },
  {
    id: "leads",
    label: "Prospectos",
    href: "/crm/prospectos",
  },
  {
    id: "customers",
    label: "Clientes",
    href: "/crm/clientes",
  },
  {
    id: "opportunities",
    label: "Oportunidades",
    href: "/crm/oportunidades",
  },
  {
    id: "activities",
    label: "Actividades",
    href: "/crm/actividades",
  },
  {
    id: "settings",
    label: "Configuración",
    href: "/crm/configuracion",
  },
];