import {
  serviceCatalogCategories, serviceCatalogIcons, type ServiceCategory,
} from "./service-catalog";

export class ServiceCatalogError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function catalogRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ServiceCatalogError("La información enviada no tiene un formato válido.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, max: number, optional = false): string | null {
  if (optional && (value === null || value === "")) return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new ServiceCatalogError(`${field} es obligatorio y no puede exceder ${max} caracteres.`);
  }
  return value.trim();
}

export function parseServiceCategory(value: unknown): ServiceCategory {
  if (typeof value !== "string" || !Object.hasOwn(serviceCatalogCategories, value)) {
    throw new ServiceCatalogError("Selecciona una categoría disponible.");
  }
  return value as ServiceCategory;
}

export function parseCatalogId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServiceCatalogError("El identificador no es válido.");
  }
  return value;
}

export function parseCatalogVersion(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new ServiceCatalogError("La versión del producto no es válida. Recarga el catálogo.");
  }
  return value;
}

function money(value: unknown, field: string): string | null {
  if (value === null || value === "") return null;
  if ((typeof value !== "string" && typeof value !== "number") ||
      !/^\d{1,10}(\.\d{1,2})?$/.test(String(value))) {
    throw new ServiceCatalogError(`${field} debe ser un importe positivo o cero, con hasta dos decimales.`);
  }
  return Number(value).toFixed(2);
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new ServiceCatalogError(`${field} debe ser verdadero o falso.`);
  return value;
}

export function parseServiceCatalogValues(input: unknown) {
  const payload = catalogRecord(input);
  const allowed = new Set([
    "id", "updatedAt", "category", "itemKey", "name", "shortDescription", "description",
    "oneTimePrice", "pricePrefix", "monthlyPrice", "monthlyLabel", "currency", "features",
    "icon", "badge", "recommended", "requiresQuote", "ctaLabel", "active", "sortOrder",
  ]);
  if (Object.keys(payload).some((key) => !allowed.has(key))) {
    throw new ServiceCatalogError("El producto contiene campos no admitidos.");
  }
  const category = parseServiceCategory(payload.category);
  const itemKey = text(payload.itemKey, "La clave", 80)!;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(itemKey)) {
    throw new ServiceCatalogError("La clave solo admite minúsculas, números y guiones entre palabras.");
  }
  const requiresQuote = boolean(payload.requiresQuote, "Requiere cotización");
  const oneTimePrice = money(payload.oneTimePrice, "El precio inicial");
  if (!requiresQuote && oneTimePrice === null) {
    throw new ServiceCatalogError("Define el precio inicial o marca que requiere cotización.");
  }
  const currency = text(payload.currency, "La moneda", 3)!.toLowerCase();
  if (currency !== "mxn") throw new ServiceCatalogError("Por ahora el catálogo admite MXN.");
  if (!Array.isArray(payload.features) || payload.features.length > 100) {
    throw new ServiceCatalogError("Las características deben ser una lista de hasta 100 elementos.");
  }
  const features = Array.from(new Set(payload.features.map((value) => text(value, "Cada característica", 160)!)));
  const icon = text(payload.icon, "El icono", 40)!;
  if (!(serviceCatalogIcons as readonly string[]).includes(icon)) {
    throw new ServiceCatalogError("Selecciona un icono disponible.");
  }
  if (typeof payload.sortOrder !== "number" || !Number.isInteger(payload.sortOrder) || payload.sortOrder < 0 || payload.sortOrder > 2147483647) {
    throw new ServiceCatalogError("El orden debe ser un entero entre 0 y 2147483647.");
  }
  return {
    category, itemKey, name: text(payload.name, "El nombre", 120)!,
    shortDescription: text(payload.shortDescription, "La descripción corta", 400)!,
    description: text(payload.description, "La descripción", 5000, true),
    oneTimePrice, pricePrefix: text(payload.pricePrefix, "El texto previo al precio", 80, true),
    monthlyPrice: money(payload.monthlyPrice, "La mensualidad"),
    monthlyLabel: text(payload.monthlyLabel, "El texto de mensualidad", 120, true),
    currency, features, icon, badge: text(payload.badge, "El badge", 60, true),
    recommended: boolean(payload.recommended, "Destacado"), requiresQuote,
    ctaLabel: text(payload.ctaLabel, "El texto del botón", 80)!,
    active: boolean(payload.active, "Activo"), sortOrder: payload.sortOrder,
  };
}
