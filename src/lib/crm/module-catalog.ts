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
    "crm-analytics",
] as const;

export const CRM_SALES_MODULE_IDS = [
    "quotes",
    "sales-orders",
    "promotions",
    "embedded-checkout",
] as const;

export const CRM_INVENTORY_MODULE_IDS = [
    "inventory",
] as const;

export const CRM_SERVICES_MODULE_IDS = [
    "services",
    "embedded-checkout",
] as const;

export const CRM_PET_VETERINARY_MODULE_IDS = [
    "pet-veterinary",
    "contacts",
    "products",
    "activities",
    "services",
    "documents",
    "embedded-checkout",
    "qr-codes",
] as const;

export const CRM_PET_GROOMING_MODULE_IDS = [
    "pet-grooming",
    "contacts",
    "products",
    "activities",
    "services",
    "embedded-checkout",
    "qr-codes",
] as const;

export const CRM_PET_STAYS_MODULE_IDS = [
    "pet-stays",
    "contacts",
    "products",
    "activities",
    "services",
    "embedded-checkout",
    "qr-codes",
] as const;

export const CRM_PET_STORE_MODULE_IDS = [
    "pet-store",
    "contacts",
    "products",
    "inventory",
    "promotions",
    "sales-orders",
    "embedded-checkout",
    "qr-codes",
] as const;

export const CRM_PET_INTEGRATED_MODULE_IDS = [
    ...CRM_PET_VETERINARY_MODULE_IDS,
    ...CRM_PET_GROOMING_MODULE_IDS,
    ...CRM_PET_STAYS_MODULE_IDS,
    ...CRM_PET_STORE_MODULE_IDS,
    "leads",
    "deals",
    "quotes",
    "automations",
    "crm-analytics",
] as const;

export const CRM_QR_CODE_MODULE_IDS = [
    "qr-codes",
] as const;

export const CRM_CAMPAIGNS_MODULE_IDS = [
    "campaigns",
] as const;

export const CRM_INVOICE_CONTROL_MODULE_IDS = [
    "invoice-control",
] as const;

export const CRM_CFDI_STAMPING_MODULE_IDS = [
    "cfdi-stamping",
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

    "pet-veterinary": {
        key: "pet-veterinary",
        name: "Veterinaria",
        description: "Expedientes, consultas, vacunas, tratamientos y seguimiento clínico.",
        moduleIds: CRM_PET_VETERINARY_MODULE_IDS,
    },

    "pet-grooming": {
        key: "pet-grooming",
        name: "Grooming y estética",
        description: "Agenda, preferencias, paquetes y servicios recurrentes de estética.",
        moduleIds: CRM_PET_GROOMING_MODULE_IDS,
    },

    "pet-stays": {
        key: "pet-stays",
        name: "Guardería y pensión",
        description: "Reservaciones, check-in/out y paquetes de días o noches.",
        moduleIds: CRM_PET_STAYS_MODULE_IDS,
    },

    "pet-store": {
        key: "pet-store",
        name: "Tienda de mascotas",
        description: "Catálogo, inventario, ventas, promociones y facturación.",
        moduleIds: CRM_PET_STORE_MODULE_IDS,
    },

    "pet-integrated": {
        key: "pet-integrated",
        name: "Centro integral de mascotas",
        description: "Veterinaria, grooming, guardería, pensión y tienda en una sola operación.",
        moduleIds: CRM_PET_INTEGRATED_MODULE_IDS,
    },

    "qr-codes": {
        key: "qr-codes",
        name: "Códigos QR",
        description: "Identificación segura, lectura de mostrador y trazabilidad para entidades operativas.",
        moduleIds: CRM_QR_CODE_MODULE_IDS,
    },

    campaigns: {
        key: "campaigns",
        name: "Campañas",
        description:
            "Campañas comerciales y segmentación.",
        moduleIds:
            CRM_CAMPAIGNS_MODULE_IDS,
    },

    "invoice-control": {
        key: "invoice-control",
        name: "Control de facturas",
        description:
            "Registro, seguimiento y trazabilidad de facturas comerciales.",
        moduleIds:
            CRM_INVOICE_CONTROL_MODULE_IDS,
    },

    "cfdi-stamping": {
        key: "cfdi-stamping",
        name: "Timbrado CFDI",
        description:
            "Emisión y cancelación fiscal de CFDI mediante un PAC autorizado.",
        moduleIds:
            CRM_CFDI_STAMPING_MODULE_IDS,
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
