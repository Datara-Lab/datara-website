import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { parseWebsiteEvent, classifyWebsiteSource, type WebsiteEvent } from "../src/lib/website/analytics";

async function main() {
  const event: WebsiteEvent = { id: randomUUID(), sessionId: randomUUID(), path: "/", source: "Newsletter", device: "desktop", consent: true, name: "page_view", target: null };
  assert.equal(classifyWebsiteSource("https://www.google.com/search?q=private", null, "datara-lab.com"), "Google");
  assert.equal(classifyWebsiteSource("https://unknown.example/private", null, "datara-lab.com"), "Otro sitio");
  assert.equal(classifyWebsiteSource("", null, "datara-lab.com"), "Directo / desconocido");
  for (const invalid of [{ consent: false }, { tenantId: randomUUID() }, { email: "private@example.test" }, { path: "/crm" }, { path: "/?email=private" }, { name: "form_submit" }, { id: "invalid" }, { source: "https://private.example" }, { target: "private@example.test" }]) {
    assert.throws(() => parseWebsiteEvent({ ...event, ...invalid }));
  }
  console.log("PASS: schema validation, exclusion of personal fields and source classification.");
  if (!process.argv.includes("--database")) return;
  if (process.argv[2] !== "development") throw new Error("Use development --database; production is not supported by this test.");
  const loaded = config({ path: ".env.development.local", override: true, quiet: true });
  if (loaded.error || process.env.DATARA_ENVIRONMENT !== "development" || !process.env.DATARA_EXPECTED_DATABASE_HOST) throw new Error("Development environment not verified.");
  const { db } = await import("../src/db");
  const { websiteAnalyticsEvents, websiteAnalyticsSessions } = await import("../src/db/schema");
  const { getWebsiteTenant, saveWebsiteEvent, getWebsiteAnalyticsOverview, recordWebsiteContactSubmission } = await import("../src/lib/website/analytics-store");
  const tenant = await getWebsiteTenant();
  console.log(`Verified owner: ${tenant.name}.`);
  const base = "http://localhost:3000";
  const send = (body: unknown, overrides: Record<string, string> = {}) => fetch(`${base}/api/public/website-events`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: base, ...overrides }, body: JSON.stringify(body),
  });
  try {
    const baseline = await getWebsiteAnalyticsOverview(tenant.id, tenant.name, 7);
    assert.equal(baseline.daily.length, 7);
    assert.equal((await send(event, { Origin: "https://other.example" })).status, 403);
    assert.equal((await send({ ...event, consent: false })).status, 400);
    assert.equal((await send({ ...event, name: "form_submit" })).status, 400);
    assert.equal((await send({ ...event, tenantId: randomUUID() })).status, 400);
    assert.equal((await send({ ...event, junk: "x".repeat(3000) })).status, 413);
    assert.equal((await send(event, { "Sec-GPC": "1" })).status, 204);
    assert.equal((await db.select().from(websiteAnalyticsEvents).where(eq(websiteAnalyticsEvents.sessionId, event.sessionId))).length, 0);
    assert.equal((await send(event)).status, 204);
    assert.equal((await send(event)).status, 204);
    const stored = await db.select().from(websiteAnalyticsEvents).where(eq(websiteAnalyticsEvents.sessionId, event.sessionId));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].tenantId, tenant.id);
    assert.equal(stored[0].path, "/");
    await saveWebsiteEvent(tenant.id, { ...event, id: randomUUID(), name: "quote_click", target: "sitio-empresarial" });
    const { sessionId, path, source, device, consent } = event;
    await recordWebsiteContactSubmission(tenant.id, randomUUID(), { sessionId, path, source, device, consent });
    const after = await getWebsiteAnalyticsOverview(tenant.id, tenant.name, 7);
    assert(after.totals.pageViews >= baseline.totals.pageViews + 1);
    assert(after.totals.formSubmits >= baseline.totals.formSubmits + 1);
    assert(after.totals.convertingSessions >= baseline.totals.convertingSessions + 1);
    assert(after.pages.some((page) => page.path === "/"));
    assert.equal((await getWebsiteAnalyticsOverview(randomUUID(), "Other tenant", 7)).totals.pageViews, 0);
    await db.update(websiteAnalyticsSessions).set({ eventCount: 500 }).where(eq(websiteAnalyticsSessions.sessionId, event.sessionId));
    assert.equal(await saveWebsiteEvent(tenant.id, { ...event, id: randomUUID() }), false);
    assert.equal((await fetch(`${base}/api/platform/website-analytics`)).status, 401);
    const protectedPage = await fetch(`${base}/administracion/analitica-web`, { redirect: "manual" });
    assert.equal(protectedPage.status, 307);
    assert.equal(protectedPage.headers.get("location"), "/portal");
    console.log("PASS: collector origin/consent/GPC/size limits, deduplication, fixed tenant ownership, verified submissions, aggregates, rate cap and admin protection.");
  } finally {
    await db.delete(websiteAnalyticsEvents).where(eq(websiteAnalyticsEvents.sessionId, event.sessionId));
    await db.delete(websiteAnalyticsSessions).where(eq(websiteAnalyticsSessions.sessionId, event.sessionId));
  }
  for (const path of ["/", "/sitios-web", "/cloud", "/catalogo/crm"]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert(html.includes('rel="canonical"'));
    assert(html.includes('property="og:title"'));
    assert(html.includes('name="robots" content="noindex, nofollow"'));
    if (path === "/") { assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1); assert(html.includes('application/ld+json')); }
  }
  assert((await (await fetch(`${base}/robots.txt`)).text()).includes("Disallow: /"));
  const image = await fetch(`${base}/opengraph-image`);
  assert.equal(image.status, 200);
  assert(image.headers.get("content-type")?.includes("image/png"));
  console.log("PASS: rendered metadata, single landing H1, structured data, staging noindex, robots and share image.");
  const final = await getWebsiteAnalyticsOverview(tenant.id, tenant.name, 30);
  console.log(JSON.stringify({ company: tenant.name, totals: final.totals }));
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
