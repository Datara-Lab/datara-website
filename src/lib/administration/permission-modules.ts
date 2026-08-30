export type PermissionProduct =
  | "global"
  | "crm"
  | "analytics"
  | "cloud";

export type PermissionModule = {
  id: string;
  label: string;
  product: PermissionProduct;
  description: string;
};

export const permissionModules:
  PermissionModule[] = [
  {
    id: "company",
    label: "Empresa",
    product: "global",
    description:
      "Información general e identidad de la empresa.",
  },
  {
    id: "organization-structure",
    label: "Regiones y sucursales",
    product: "global",
    description:
      "Estructura territorial y datos de las sucursales.",
  },
  {
    id: "users",
    label: "Usuarios",
    product: "global",
    description:
      "Miembros, invitaciones y asignaciones.",
  },
  {
    id: "roles",
    label: "Roles y permisos",
    product: "global",
    description:
      "Roles personalizados y permisos administrativos.",
  },

  {
    id: "leads",
    label: "Prospectos",
    product: "crm",
    description:
      "Prospectos y seguimiento comercial.",
  },
  {
    id: "contacts",
    label: "Clientes",
    product: "crm",
    description:
      "Personas y empresas clientes.",
  },
  {
    id: "deals",
    label: "Oportunidades",
    product: "crm",
    description:
      "Oportunidades y procesos de venta.",
  },
  {
    id: "quotes",
    label: "Cotizaciones",
    product: "crm",
    description:
      "Cotizaciones, PDF y envíos.",
  },
  {
    id: "sales-orders",
    label: "Órdenes de venta",
    product: "crm",
    description:
      "Órdenes generadas por operaciones comerciales.",
  },
  {
    id: "inventory",
    label: "Inventarios",
    product: "crm",
    description:
      "Existencias, reservas, movimientos, conteos y reposición.",
  },
  {
    id: "services",
    label: "Servicios",
    product: "crm",
    description:
      "Órdenes de servicio y atención de taller.",
  },
  {
    id: "products",
    label: "Productos",
    product: "crm",
    description:
      "Catálogo de productos y servicios.",
  },
  {
    id: "promotions",
    label: "Promociones",
    product: "crm",
    description:
      "Promociones y reglas comerciales.",
  },
  {
    id: "activities",
    label: "Agenda",
    product: "crm",
    description:
      "Actividades, citas y seguimiento.",
  },
  {
    id: "documents",
    label: "Documentos",
    product: "crm",
    description:
      "Documentos relacionados con registros del CRM.",
  },
  {
    id: "campaigns",
    label: "Campañas",
    product: "crm",
    description:
      "Campañas comerciales.",
  },
  {
    id: "invoice-control",
    label: "Control de facturas",
    product: "crm",
    description:
      "Registro, consulta y seguimiento de facturas vinculadas con ventas.",
  },
  {
    id: "cfdi-stamping",
    label: "Timbrado CFDI",
    product: "crm",
    description:
      "Emisión y cancelación de CFDI mediante el proveedor fiscal configurado.",
  },
  {
    id: "invoice-control",
    label: "Control de facturas",
    product: "crm",
    description:
      "Registro, consulta y seguimiento de facturas vinculadas con ventas.",
  },
  {
    id: "cfdi-stamping",
    label: "Timbrado CFDI",
    product: "crm",
    description:
      "Emisión y cancelación de CFDI mediante el proveedor fiscal configurado.",
  },
  {
    id: "crm-users",
    label: "Usuarios del CRM",
    product: "crm",
    description:
      "Accesos operativos dentro del CRM.",
  },
  {
    id: "crm-settings",
    label: "Configuración del CRM",
    product: "crm",
    description:
      "Catálogos y configuración específica del CRM.",
  },
  {
    id: "integrations",
    label: "Integraciones",
    product: "crm",
    description:
      "Conexiones con formularios, redes sociales, pagos y canales externos.",
  },
  {
    id: "automations",
    label: "Automatizaciones",
    product: "crm",
    description:
      "Reglas, disparadores y acciones automáticas del CRM.",
  },
  {
    id: "crm-analytics",
    label: "Analytics del CRM",
    product: "crm",
    description:
      "Indicadores, embudos y análisis del desempeño comercial del CRM.",
  },
];

export function getPermissionModules(
  product:
    | "crm"
    | "analytics"
    | "cloud"
    | null,
): PermissionModule[] {
  const expectedProduct =
    product ?? "global";

  return permissionModules.filter(
    (module) =>
      module.product ===
      expectedProduct,
  );
}