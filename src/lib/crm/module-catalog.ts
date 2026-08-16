export const CRM_PLATFORM_MODULE_IDS = [
    "crm-users",
    "crm-settings",
] as const;

export const CRM_CORE_MODULE_IDS = [
    "leads",
    "contacts",
    "deals",
    "products",
    "activities",
    "documents",
    "integrations",
    "automations",
] as const;

export const CRM_SALES_MODULE_IDS = [
    "quotes",
    "sales-orders",
    "promotions",
] as const;

export const CRM_INVENTORY_MODULE_IDS = [
    "inventory",
] as const;

export const CRM_SERVICES_MODULE_IDS = [
    "services",
] as const;

export const CRM_CAMPAIGNS_MODULE_IDS = [
    "campaigns",
] as const;

export const CRM_MODULE_PACKAGES = {
    core: {
        key: "core",
        name: "CRM Core",
        description:
            "Gestión comercial esencial de prospectos, clientes y oportunidades.",
        moduleIds:
            CRM_CORE_MODULE_IDS,
    },

    sales: {
        key: "sales",
        name: "Ventas",
        description:
            "Cotizaciones, órdenes de venta y promociones.",
        moduleIds:
            CRM_SALES_MODULE_IDS,
    },

    inventory: {
        key: "inventory",
        name: "Inventarios",
        description:
            "Existencias, movimientos, reservas y control de almacenes.",
        moduleIds:
            CRM_INVENTORY_MODULE_IDS,
    },

    services: {
        key: "services",
        name: "Servicios",
        description:
            "Órdenes de taller, autorizaciones y trazabilidad del servicio.",
        moduleIds:
            CRM_SERVICES_MODULE_IDS,
    },

    campaigns: {
        key: "campaigns",
        name: "Campañas",
        description:
            "Campañas comerciales y segmentación.",
        moduleIds:
            CRM_CAMPAIGNS_MODULE_IDS,
    },
} as const;

export type CRMModulePackageKey =
    keyof typeof CRM_MODULE_PACKAGES;

export function isCRMModulePackageKey(
    value: unknown,
): value is CRMModulePackageKey {
    return (
        typeof value ===
            "string" &&
        Object.prototype.hasOwnProperty.call(
            CRM_MODULE_PACKAGES,
            value,
        )
    );
}