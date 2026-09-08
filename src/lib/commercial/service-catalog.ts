import type { serviceCatalogItems } from "@/db/schema";

// Presentation-only configuration. Commercial content belongs in the database.
export const serviceCatalogCategories = {
  website: { label: "Sitios Web", href: "/sitios-web" },
} as const;

export type ServiceCategory = keyof typeof serviceCatalogCategories;
export const serviceCatalogIcons = [
  "layout", "building", "catalog", "calendar", "shopping-bag", "code", "globe", "workflow", "chart",
] as const;
export type ServiceCatalogIcon = (typeof serviceCatalogIcons)[number];

export type ServiceCatalogRecord = typeof serviceCatalogItems.$inferSelect;
export type ServiceCatalogItem = Omit<ServiceCatalogRecord, "createdAt" | "updatedAt" | "updatedByClerkUserId"> & {
  createdAt: string;
  updatedAt: string;
};
export type PublicServiceCatalogItem = Pick<ServiceCatalogItem,
  "id" | "category" | "itemKey" | "name" | "shortDescription" | "description" |
  "oneTimePrice" | "pricePrefix" | "monthlyPrice" | "monthlyLabel" | "currency" |
  "features" | "icon" | "badge" | "recommended" | "requiresQuote" | "ctaLabel" | "sortOrder"
>;
export type ServiceCatalogDraft = Omit<ServiceCatalogItem, "id" | "createdAt" | "updatedAt">;

export function formatCatalogMoney(value: string | number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: currency.toUpperCase(),
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function featuresToText(features: string[]): string {
  return features.join("\n");
}

export function textToFeatures(text: string): string[] {
  return Array.from(new Set(text.split("\n").map((line) => line.trim()).filter(Boolean)));
}

export function createServiceCatalogDraft(category: ServiceCategory, sortOrder = 0): ServiceCatalogDraft {
  return {
    category, itemKey: "", name: "", shortDescription: "", description: null,
    oneTimePrice: "0.00", pricePrefix: "Desde", monthlyPrice: null,
    monthlyLabel: "/ mes", currency: "mxn", features: [], icon: "globe",
    badge: null, recommended: false, requiresQuote: false,
    ctaLabel: "Solicitar cotización", active: true, sortOrder,
  };
}
