import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { serviceCatalogItems } from "@/db/schema";
import type { PublicServiceCatalogItem, ServiceCategory } from "./service-catalog";
import { ServiceCatalogError, parseServiceCatalogValues } from "./service-catalog-validation";

export async function getPublicServiceCatalog(category: ServiceCategory): Promise<PublicServiceCatalogItem[]> {
  return db.select({
    id: serviceCatalogItems.id, category: serviceCatalogItems.category, itemKey: serviceCatalogItems.itemKey,
    name: serviceCatalogItems.name, shortDescription: serviceCatalogItems.shortDescription,
    description: serviceCatalogItems.description, oneTimePrice: serviceCatalogItems.oneTimePrice,
    pricePrefix: serviceCatalogItems.pricePrefix, monthlyPrice: serviceCatalogItems.monthlyPrice,
    monthlyLabel: serviceCatalogItems.monthlyLabel, currency: serviceCatalogItems.currency,
    features: serviceCatalogItems.features, icon: serviceCatalogItems.icon, badge: serviceCatalogItems.badge,
    recommended: serviceCatalogItems.recommended, requiresQuote: serviceCatalogItems.requiresQuote,
    ctaLabel: serviceCatalogItems.ctaLabel, sortOrder: serviceCatalogItems.sortOrder,
  }).from(serviceCatalogItems).where(and(eq(serviceCatalogItems.category, category), eq(serviceCatalogItems.active, true)))
    .orderBy(asc(serviceCatalogItems.sortOrder), asc(serviceCatalogItems.itemKey));
}

export async function getAdminServiceCatalog(category: ServiceCategory) {
  return db.select().from(serviceCatalogItems).where(eq(serviceCatalogItems.category, category))
    .orderBy(asc(serviceCatalogItems.sortOrder), asc(serviceCatalogItems.itemKey));
}

export async function getServiceCatalogItem(id: string, category: ServiceCategory) {
  const [item] = await db.select().from(serviceCatalogItems)
    .where(and(eq(serviceCatalogItems.id, id), eq(serviceCatalogItems.category, category))).limit(1);
  if (!item) throw new ServiceCatalogError("El producto no existe en esta categoría.", 404);
  return item;
}

type Values = ReturnType<typeof parseServiceCatalogValues>;
const columns: Record<keyof Values, string> = {
  category: "category", itemKey: "item_key", name: "name", shortDescription: "short_description",
  description: "description", oneTimePrice: "one_time_price", pricePrefix: "price_prefix",
  monthlyPrice: "monthly_price", monthlyLabel: "monthly_label", currency: "currency",
  features: "features", icon: "icon", badge: "badge", recommended: "recommended",
  requiresQuote: "requires_quote", ctaLabel: "cta_label", active: "active", sortOrder: "sort_order",
};
function entries(values: Values) {
  return (Object.keys(columns) as (keyof Values)[]).map((key) => ({
    column: sql.identifier(columns[key]),
    value: key === "features" ? sql`${JSON.stringify(values[key])}::jsonb` : sql`${values[key]}`,
  }));
}

// Each change and its audit are one PostgreSQL statement: no partial writes with neon-http.
export async function createServiceCatalogItem(values: Values, userId: string) {
  const fields = entries(values);
  const result = await db.execute<{ id: string }>(sql`
    WITH changed AS (
      INSERT INTO service_catalog_items (${sql.join(fields.map((field) => field.column), sql`, `)}, updated_by_clerk_user_id)
      VALUES (${sql.join(fields.map((field) => field.value), sql`, `)}, ${userId}) RETURNING *
    ), audit AS (
      INSERT INTO service_catalog_audit_logs (catalog_item_id, action, next_values, changed_by_clerk_user_id)
      SELECT id, 'created', to_jsonb(changed), ${userId} FROM changed
    ) SELECT id FROM changed
  `);
  return getServiceCatalogItem(result.rows[0].id, values.category);
}

export async function updateServiceCatalogItem(id: string, values: Values, version: string, userId: string) {
  const result = await db.execute<{ id: string }>(sql`
    WITH previous AS (
      SELECT * FROM service_catalog_items WHERE id = ${id}::uuid AND category = ${values.category}
      AND updated_at = ${version}::timestamptz FOR UPDATE
    ), changed AS (
      UPDATE service_catalog_items SET
        ${sql.join(entries(values).map((field) => sql`${field.column} = ${field.value}`), sql`, `)},
        updated_by_clerk_user_id = ${userId},
        updated_at = GREATEST(date_trunc('milliseconds', clock_timestamp()), service_catalog_items.updated_at + interval '1 millisecond')
      WHERE id IN (SELECT id FROM previous) RETURNING *
    ), audit AS (
      INSERT INTO service_catalog_audit_logs (catalog_item_id, action, previous_values, next_values, changed_by_clerk_user_id)
      SELECT changed.id, 'updated', to_jsonb(previous), to_jsonb(changed), ${userId}
      FROM changed JOIN previous ON changed.id = previous.id
    ) SELECT id FROM changed
  `);
  if (!result.rows.length) throw new ServiceCatalogError("El producto cambió o fue eliminado. Recarga el catálogo antes de continuar.", 409);
  return getServiceCatalogItem(id, values.category);
}

export async function deleteServiceCatalogItem(id: string, category: ServiceCategory, version: string, userId: string) {
  const result = await db.execute<{ id: string }>(sql`
    WITH changed AS (
      DELETE FROM service_catalog_items WHERE id = ${id}::uuid AND category = ${category}
      AND updated_at = ${version}::timestamptz RETURNING *
    ), audit AS (
      INSERT INTO service_catalog_audit_logs (catalog_item_id, action, previous_values, changed_by_clerk_user_id)
      SELECT NULL, 'deleted', to_jsonb(changed), ${userId} FROM changed
    ) SELECT id FROM changed
  `);
  if (!result.rows.length) throw new ServiceCatalogError("El producto cambió o fue eliminado. Recarga el catálogo antes de continuar.", 409);
}
