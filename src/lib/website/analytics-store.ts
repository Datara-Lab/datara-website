import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { getInternalOrganizationId } from "@/lib/platform/authorization";
import { parseWebsiteEvent, type WebsiteEvent, type WebsiteAnalyticsOverview } from "./analytics";
import { isProductionWebsite, publicWebsitePages, websiteUrl } from "./seo";

export async function getWebsiteTenant() {
  const organizationId = getInternalOrganizationId();
  if (!organizationId) throw new Error("La organización interna de Datara no está configurada.");
  const [tenant] = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).where(eq(tenants.clerkOrganizationId, organizationId)).limit(1);
  if (!tenant) throw new Error("No existe la empresa interna de Datara.");
  return tenant;
}

export async function saveWebsiteEvent(tenantId: string, event: WebsiteEvent) {
  const result = await db.execute<{ id: string }>(sql`
    WITH budget AS (
      INSERT INTO website_analytics_sessions (tenant_id, session_id, event_count)
      VALUES (${tenantId}::uuid, ${event.sessionId}::uuid, 1)
      ON CONFLICT (tenant_id, session_id) DO UPDATE SET event_count = website_analytics_sessions.event_count + 1
      WHERE website_analytics_sessions.event_count < 500 RETURNING session_id
    ) INSERT INTO website_analytics_events (id, tenant_id, session_id, event_name, path, source, device, target)
      SELECT ${event.id}::uuid, ${tenantId}::uuid, session_id, ${event.name}, ${event.path}, ${event.source}, ${event.device}, ${event.target} FROM budget
      ON CONFLICT (id) DO NOTHING RETURNING id
  `);
  return result.rows.length > 0;
}

export async function recordWebsiteContactSubmission(tenantId: string, leadId: string, context: unknown) {
  if (!context || typeof context !== "object" || Array.isArray(context)) return;
  try {
    // Only this server-side path records a successful form, after the existing contact flow succeeds.
    const event = parseWebsiteEvent({ ...context, id: leadId, name: "form_submit", target: null }, true);
    const internal = await getWebsiteTenant();
    if (internal.id !== tenantId) return;
    await saveWebsiteEvent(tenantId, event);
  } catch { console.error("No fue posible registrar la medición del formulario de contacto."); }
}

export async function getWebsiteAnalyticsOverview(tenantId: string, tenantName: string, days: number): Promise<WebsiteAnalyticsOverview> {
  if (![7, 30, 90].includes(days)) throw new Error("Periodo inválido.");
  // All grouped queries use the same tenant and local calendar-day boundary.
  const result = await db.execute<{ overview: Omit<WebsiteAnalyticsOverview, "tenantName" | "days" | "generatedAt" | "seo"> }>(sql`
    WITH period AS (
      SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date - (${days}::int - 1) AS first_day,
        (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date AS last_day
    ), events AS (
      SELECT * FROM website_analytics_events WHERE tenant_id = ${tenantId}::uuid
      AND created_at >= ((SELECT first_day FROM period)::timestamp AT TIME ZONE 'America/Mexico_City')
      AND created_at <= CURRENT_TIMESTAMP
    ), sessions AS (
      SELECT DISTINCT ON (session_id) session_id, source, device FROM events ORDER BY session_id, created_at
    ), daily AS (
      SELECT day::date::text AS date, count(events.id) FILTER (WHERE event_name = 'page_view')::int AS views,
        count(events.id) FILTER (WHERE event_name = 'form_submit')::int AS submissions
      FROM generate_series((SELECT first_day FROM period)::timestamp, (SELECT last_day FROM period)::timestamp, interval '1 day') day
      LEFT JOIN events ON (events.created_at AT TIME ZONE 'America/Mexico_City')::date = day::date
      GROUP BY day ORDER BY day
    ) SELECT jsonb_build_object(
      'totals', (SELECT jsonb_build_object(
        'pageViews', count(*) FILTER (WHERE event_name = 'page_view'), 'sessions', count(DISTINCT session_id),
        'clicks', count(*) FILTER (WHERE event_name IN ('contact_click', 'quote_click', 'whatsapp_click', 'product_click')),
        'formStarts', count(*) FILTER (WHERE event_name = 'form_start'),
        'formSubmits', count(*) FILTER (WHERE event_name = 'form_submit'),
        'convertingSessions', count(DISTINCT session_id) FILTER (WHERE event_name = 'form_submit')) FROM events),
      'daily', (SELECT coalesce(jsonb_agg(daily), '[]'::jsonb) FROM daily),
      'pages', (SELECT coalesce(jsonb_agg(p), '[]'::jsonb) FROM (SELECT path, count(*)::int AS views FROM events WHERE event_name = 'page_view' GROUP BY path ORDER BY views DESC, path LIMIT 20) p),
      'sources', (SELECT coalesce(jsonb_agg(s), '[]'::jsonb) FROM (SELECT source, count(*)::int AS sessions FROM sessions GROUP BY source ORDER BY sessions DESC, source) s),
      'devices', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT device, count(*)::int AS sessions FROM sessions GROUP BY device ORDER BY sessions DESC, device) d),
      'actions', (SELECT coalesce(jsonb_agg(a), '[]'::jsonb) FROM (SELECT event_name AS name, count(*)::int AS count FROM events WHERE event_name <> 'page_view' GROUP BY event_name ORDER BY count DESC, event_name) a),
      'recent', (SELECT coalesce(jsonb_agg(r), '[]'::jsonb) FROM (SELECT event_name AS name, path, target, created_at AS "createdAt" FROM events ORDER BY created_at DESC LIMIT 15) r)
    ) AS overview
  `);
  return { ...result.rows[0].overview, tenantName, days, generatedAt: new Date().toISOString(), seo: { production: isProductionWebsite(), siteUrl: websiteUrl, pages: [...publicWebsitePages] } };
}
