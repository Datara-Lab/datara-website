import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { parseServiceCatalogValues, parseServiceCategory, ServiceCatalogError } from "../src/lib/commercial/service-catalog-validation";
import { websiteCatalogSeed } from "../src/db/seeds/service-catalog";

async function main() {
  const sample = websiteCatalogSeed[0];
  assert.equal(websiteCatalogSeed.length, 6);
  assert.equal(websiteCatalogSeed.filter((item) => item.recommended).length, 1);
  assert.equal(websiteCatalogSeed.filter((item) => item.requiresQuote).length, 1);
  for (const invalid of [
    { oneTimePrice: "-1" }, { oneTimePrice: "1.234" }, { oneTimePrice: "Infinity" },
    { oneTimePrice: "10000000000" }, { oneTimePrice: null }, { monthlyPrice: " " },
    { active: "true" }, { recommended: 1 }, { requiresQuote: "false" },
    { features: [""] }, { features: "No es una lista" }, { sortOrder: -1 }, { sortOrder: 1.5 },
    { category: "crm" }, { category: "__proto__" }, { itemKey: "---" },
    { currency: "usd" }, { icon: "<script>" }, { updatedByClerkUserId: "unauthorized" },
  ]) assert.throws(() => parseServiceCatalogValues({ ...sample, ...invalid }), ServiceCatalogError);
  assert.throws(() => parseServiceCategory(null), ServiceCatalogError);
  assert.equal(parseServiceCatalogValues({ ...sample, requiresQuote: true, oneTimePrice: null }).oneTimePrice, null);
  assert.equal(parseServiceCatalogValues({ ...sample, oneTimePrice: "0" }).oneTimePrice, "0.00");
  console.log("PASS: seed and payload validation (prices, types, limits, categories and protected fields).");

  if (!process.argv.includes("--database")) return;
  if (process.argv[2] !== "development") throw new Error("Las pruebas de BD solo admiten development --database.");
  const loaded = config({ path: ".env.development.local", override: true, quiet: true });
  if (loaded.error || process.env.DATARA_ENVIRONMENT !== "development" || !process.env.DATARA_EXPECTED_DATABASE_HOST) {
    throw new Error("Ambiente de desarrollo no verificado.");
  }
  const { db } = await import("../src/db");
  const { serviceCatalogItems, serviceCatalogAuditLogs } = await import("../src/db/schema");
  const { createServiceCatalogItem, updateServiceCatalogItem, deleteServiceCatalogItem, getPublicServiceCatalog, getAdminServiceCatalog, getServiceCatalogItem } = await import("../src/lib/commercial/service-catalog-store");
  const { seedServiceCatalog } = await import("../src/db/seeds/service-catalog");
  const actor = `catalog-verification-${randomUUID()}`;
  let id: string | undefined;
  try {
    const before = await getAdminServiceCatalog("website");
    assert.equal((await seedServiceCatalog(db)).length, 0);
    assert.deepEqual(await getAdminServiceCatalog("website"), before);
    const values = { ...sample, itemKey: `verify-${randomUUID()}`, name: "Verificación temporal", active: false, sortOrder: 0 };
    let item = await createServiceCatalogItem(values, actor);
    id = item.id;
    assert.equal(item.active, false);
    assert(!(await getPublicServiceCatalog("website")).some((entry) => entry.id === id));
    await assert.rejects(createServiceCatalogItem(values, actor));
    const edited = { ...values, active: true, name: "Verificación editada", badge: "Prueba", recommended: true, oneTimePrice: "123.45", monthlyPrice: "67.89", features: ["Característica editada"] };
    item = await updateServiceCatalogItem(id, edited, item.updatedAt.toISOString(), actor);
    const publicItems = await getPublicServiceCatalog("website");
    assert.equal(publicItems[0].id, id);
    assert.equal(publicItems[0].name, edited.name);
    assert.equal(publicItems[0].oneTimePrice, "123.45");
    assert.equal(publicItems[0].monthlyPrice, "67.89");
    assert.deepEqual(publicItems[0].features, edited.features);
    assert(!("updatedByClerkUserId" in publicItems[0]));
    assert(!("active" in publicItems[0]));
    const concurrent = await Promise.allSettled([
      updateServiceCatalogItem(id, { ...edited, requiresQuote: true, oneTimePrice: null }, item.updatedAt.toISOString(), actor),
      updateServiceCatalogItem(id, { ...edited, requiresQuote: true, oneTimePrice: null }, item.updatedAt.toISOString(), actor),
    ]);
    assert.equal(concurrent.filter((entry) => entry.status === "fulfilled").length, 1);
    const rejected = concurrent.find((entry) => entry.status === "rejected");
    assert(rejected?.status === "rejected" && rejected.reason instanceof ServiceCatalogError && rejected.reason.status === 409);
    await assert.rejects(deleteServiceCatalogItem(id, "website", item.updatedAt.toISOString(), actor), (error: unknown) => error instanceof ServiceCatalogError && error.status === 409);
    item = await getServiceCatalogItem(id, "website");
    assert(item.requiresQuote);
    assert.equal(item.oneTimePrice, null);
    await deleteServiceCatalogItem(id, "website", item.updatedAt.toISOString(), actor);
    assert(!(await getPublicServiceCatalog("website")).some((entry) => entry.id === id));
    const audits = await db.select().from(serviceCatalogAuditLogs).where(eq(serviceCatalogAuditLogs.changedByClerkUserId, actor));
    assert.equal(audits.length, 4); // create, edit, one concurrent edit, delete
    assert.equal(audits.filter((entry) => entry.action === "created").length, 1);
    assert.equal(audits.filter((entry) => entry.action === "updated").length, 2);
    const deletion = audits.find((entry) => entry.action === "deleted");
    assert.equal(deletion?.previousValues?.id, id);
    assert.equal(deletion?.catalogItemId, null);
    console.log("PASS: DB CRUD, public filtering/order, seed preservation, atomic audit and concurrent edit protection.");
  } finally {
    // Only remove this run's disposable test record and its audit entries.
    if (id) await db.delete(serviceCatalogItems).where(eq(serviceCatalogItems.id, id));
    await db.delete(serviceCatalogAuditLogs).where(eq(serviceCatalogAuditLogs.changedByClerkUserId, actor));
  }
  const base = "http://localhost:3000";
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    const response = await fetch(`${base}/api/platform/services/catalog?category=website`, {
      method, ...(method !== "GET" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}),
    });
    assert.equal(response.status, 401, `${method} must require authentication`);
  }
  const invalidCategory = await fetch(`${base}/api/public/services/catalog?category=crm`);
  assert.equal(invalidCategory.status, 400);
  const response = await fetch(`${base}/api/public/services/catalog?category=website`);
  assert.equal(response.status, 200);
  const payload = await response.json() as { data: { items: unknown[] } };
  assert.equal(payload.data.items.length, (await getPublicServiceCatalog("website")).length);
  const page = await fetch(`${base}/administracion/sitios-web`, { redirect: "manual" });
  assert([302, 303, 307, 308].includes(page.status));
  assert(page.headers.get("location")?.includes("/portal"));
  const remaining = await db.execute<{ count: string }>(sql`SELECT count(*)::text AS count FROM service_catalog_items WHERE item_key LIKE 'verify-%' AND updated_by_clerk_user_id = ${actor}`);
  assert.equal(remaining.rows[0].count, "0");
  console.log("PASS: public API, unauthenticated admin rejection for all methods, page protection and test cleanup.");
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
