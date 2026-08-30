import type {
  CRMNavigationItemConfig,
  CRMNavigationSectionConfig,
  CRMTerminologyConfig,
} from "@/types/crm-config";

function getModuleLabel(
  terminology: CRMTerminologyConfig,
  moduleId: string,
  fallback: string,
): string {
  return (
    terminology.modules[moduleId]
      ?.plural ?? fallback
  );
}

export function createCRMNavigation(
  terminology: CRMTerminologyConfig,
): {
  sections:
    CRMNavigationSectionConfig[];
  items: CRMNavigationItemConfig[];
} {
  const sections:
    CRMNavigationSectionConfig[] = [
    {
      id: "sales",
      label: "Ventas",
      order: 1,
      visible: true,
    },
    {
      id: "commercial-operation",
      label: "Operación comercial",
      order: 2,
      visible: true,
    },
    {
      id: "administration",
      label: "Administración",
      order: 3,
      visible: true,
      allowedRoles: [
        "owner",
        "admin",
        "manager",
      ],
    },
    {
      id: "coming-soon",
      label: "Próximamente",
      order: 4,
      visible: true,
    },
  ];

  const items:
    CRMNavigationItemConfig[] = [
    {
      id: "home",
      label: "Resumen",
      route: "/crm",
      sectionId: "sales",
      order: 1,
      status: "active",
      visible: true,
    },
    {
      id: "analytics",
      label: "Analytics",
      route: "/crm/analytics",
      moduleId: "crm-analytics",
      sectionId: "sales",
      order: 2,
      status: "active",
      visible: true,
    },
    {
      id: "leads",
      label: getModuleLabel(
        terminology,
        "leads",
        "Prospectos",
      ),
      route: "/crm/prospectos",
      moduleId: "leads",
      sectionId: "sales",
      order: 3,
      status: "active",
      visible: true,
    },
    {
      id: "contacts",
      label: getModuleLabel(
        terminology,
        "contacts",
        "Clientes",
      ),
      route: "/crm/clientes",
      moduleId: "contacts",
      sectionId: "sales",
      order: 4,
      status: "active",
      visible: true,
    },
    {
      id: "deals",
      label: getModuleLabel(
        terminology,
        "deals",
        "Oportunidades",
      ),
      route: "/crm/oportunidades",
      moduleId: "deals",
      sectionId: "sales",
      order: 5,
      status: "active",
      visible: true,
    },
    {
      id: "operations",
      label: "Operaciones",
      route: "/crm/operaciones",
      moduleId: "deals",
      sectionId: "sales",
      order: 6,
      status: "active",
      visible: true,
    },
    {
      id: "quotes",
      label: "Cotizaciones",
      route: "/crm/cotizaciones",
      moduleId: "quotes",
      sectionId: "sales",
      order: 7,
      status: "active",
      visible: true,
    },
    {
      id: "sales-orders",
      label: "Órdenes de venta",
      route:
        "/crm/ordenes-de-venta",
      moduleId: "sales-orders",
      sectionId: "sales",
      order: 8,
      status: "active",
      visible: true,
    },
    {
      id: "products",
      label: getModuleLabel(
        terminology,
        "products",
        "Productos",
      ),
      route: "/crm/productos",
      moduleId: "products",
      sectionId:
        "commercial-operation",
      order: 2,
      status: "active",
      visible: true,
    },
    {
      id: "inventory",
      label: "Inventarios",
      route: "/crm/inventarios",
      moduleId: "inventory",
      sectionId:
        "commercial-operation",
      order: 1,
      status: "active",
      visible: true,
    },
    {
      id: "promotions",
      label: "Promociones",
      route: "/crm/promociones",
      moduleId: "promotions",
      sectionId:
        "commercial-operation",
      order: 3,
      status: "active",
      visible: true,
    },
    {
      id: "agenda",
      label: "Agenda",
      route: "/crm/agenda",
      moduleId: "activities",
      sectionId:
        "commercial-operation",
      order: 4,
      status: "active",
      visible: true,
    },
    {
      id: "documents",
      label: "Documentos",
      route: "/crm/documentos",
      moduleId: "documents",
      sectionId:
        "commercial-operation",
      order: 5,
      status: "active",
      visible: true,
    },
    {
      id: "campaigns",
      label: "Campañas",
      route: "/crm/campanas",
      moduleId: "campaigns",
      sectionId:
        "administration",
      order: 1,
      status: "active",
      visible: true,
      allowedRoles: [
        "owner",
        "admin",
        "manager",
      ],
    },
    {
      id: "automations",
      label: "Automatizaciones",
      route: "/crm/automatizaciones",
      moduleId: "automations",
      sectionId:
        "administration",
      order: 3,
      status: "active",
      visible: true,
      allowedRoles: [
        "owner",
        "admin",
        "manager",
      ],
    },
    {
      id: "settings",
      label: "Configuración",
      route: "/crm/configuracion",
      moduleId: "crm-settings",
      sectionId:
        "administration",
      order: 4,
      status: "active",
      visible: true,
      allowedRoles: [
        "owner",
        "admin",
        "manager",
      ],
    },
    {
      id: "after-sales",
      label: "Postventa",
      sectionId: "coming-soon",
      order: 2,
      status: "coming-soon",
      visible: true,
    },
    {
      id: "billing",
      label: "Facturación",
      route: "/crm/facturacion",
      moduleId: "invoice-control",
      sectionId:
        "commercial-operation",
      order: 6,
      status: "active",
      visible: true,
    },
  ];

  return {
    sections,
    items,
  };
}
