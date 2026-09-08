export const DATARA_PRODUCT_KEYS = [
    "crm",
    "analytics",
    "cloud",
    "pos",
] as const;

export type DataraProductKey =
    (typeof DATARA_PRODUCT_KEYS)[number];

export type DataraProductConfig = {
    key: DataraProductKey;
    name: string;
    shortName: string;
    description: string;

    logoPath: string;
    iconPath: string;

    accentColor: string;
    applicationPath: string;
    purchaseHref: string;

    trialAvailable: boolean;
};

export const DATARA_PRODUCTS:
    Record<
        DataraProductKey,
        DataraProductConfig
    > = {
    crm: {
        key: "crm",
        name: "Datara DBP",
        shortName: "DBP",

        description:
            "Gestión comercial, clientes y operación.",

        logoPath:
            "/logos/crm.png",

        iconPath:
            "/logos/crm-icon.png",

        accentColor:
            "#16a34a",

        applicationPath:
            "/crm",

        purchaseHref:
            "mailto:ventas@datara-lab.com?subject=Contratar%20Datara%20DBP",

        trialAvailable: true,
    },

    analytics: {
        key: "analytics",
        name: "Datara Analytics",
        shortName: "Analytics",

        description:
            "Indicadores, reportes y análisis empresarial.",

        logoPath:
            "/logos/analytics.png",

        iconPath:
            "/logos/analytics-icon.png",

        accentColor:
            "#2563eb",

        applicationPath:
            "/analytics",

        purchaseHref:
            "mailto:ventas@datara-lab.com?subject=Contratar%20Datara%20Analytics",

        trialAvailable: false,
    },

    cloud: {
        key: "cloud",
        name: "Datara Cloud",
        shortName: "Cloud",

        description:
            "Infraestructura y servicios administrados.",

        logoPath:
            "/logos/cloud.png",

        iconPath:
            "/logos/cloud-icon.png",

        accentColor:
            "#7c3aed",

        applicationPath:
            "/cloud",

        purchaseHref:
            "mailto:ventas@datara-lab.com?subject=Contratar%20Datara%20Cloud",

        trialAvailable: false,
    },

    pos: {
        key: "pos",
        name: "Datara POS",
        shortName: "POS",
        description:
            "Punto de venta, caja, cobros e inventario conectado.",
        logoPath: "/logos/pos.png",
        iconPath: "/logos/pos-icon.png",
        accentColor: "#06b6d4",
        applicationPath: "/pos",
        purchaseHref:
            "mailto:ventas@datara-lab.com?subject=Contratar%20Datara%20POS",
        trialAvailable: true,
    },
};

export function getDataraProduct(
    product: DataraProductKey,
): DataraProductConfig {
    return DATARA_PRODUCTS[product];
}

export function getDataraProductLogoUrl(
    product: DataraProductKey,
): string {
    return new URL(
        DATARA_PRODUCTS[
            product
        ].logoPath,
        "https://datara-lab.com",
    ).toString();
}

export function isDataraProductKey(
  value: unknown,
): value is DataraProductKey {
  return (
    typeof value === "string" &&
    DATARA_PRODUCT_KEYS.some(
      (productKey) =>
        productKey === value,
    )
  );
}
