import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commercialPurchases, crmDeals, crmQuotes, crmQuoteItems, serviceCatalogItems, serviceEngagements } from "@/db/schema";
import { resolveCommercialContact } from "@/lib/crm/commercial-intake";
import { getInternalDataraTenant } from "@/lib/platform/internal-tenant";
import { getInternalCommercialOwner } from "@/lib/platform/internal-commercial-owner";
import { ServiceCommerceError, parseAdminUpdate, parseRequest } from "./service-engagement-validation";

export type ServiceEngagement = typeof serviceEngagements.$inferSelect;
export type ServiceEngagementView = Omit<ServiceEngagement, "createdAt" | "updatedAt" | "acceptedAt" | "checkoutStartedAt"> & { createdAt: string; updatedAt: string; acceptedAt: string | null; checkoutStartedAt: string | null };
export function engagementView(item: ServiceEngagement): ServiceEngagementView {
  return { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(), acceptedAt: item.acceptedAt?.toISOString() ?? null, checkoutStartedAt: item.checkoutStartedAt?.toISOString() ?? null };
}
export async function ownedEngagement(id: string, userId: string) {
  const [item] = await db.select().from(serviceEngagements).where(and(eq(serviceEngagements.id, id), eq(serviceEngagements.clerkUserId, userId)));
  if (!item) throw new ServiceCommerceError("No encontramos la contratación.", 404);
  return item;
}
export async function listEngagements(filter: { userId: string } | { tenantId: string }) {
  return (await db.select().from(serviceEngagements).where("userId" in filter ? eq(serviceEngagements.clerkUserId, filter.userId) : eq(serviceEngagements.tenantId, filter.tenantId)).orderBy(desc(serviceEngagements.createdAt)).limit(200)).map(engagementView);
}
export async function requestService(input: ReturnType<typeof parseRequest>, identity: { userId: string; email: string; name: string }) {
  const [existing] = await db.select().from(serviceEngagements).where(eq(serviceEngagements.id, input.id));
  if (existing) {
    if (existing.clerkUserId !== identity.userId) throw new ServiceCommerceError("Solicitud no disponible.", 409);
    return existing;
  }
  const [item] = await db.select().from(serviceCatalogItems).where(and(eq(serviceCatalogItems.id, input.catalogItemId), eq(serviceCatalogItems.active, true)));
  if (!item) throw new ServiceCommerceError("El servicio ya no está disponible.", 404);
  if (!item.requiresQuote && Number(item.oneTimePrice) + Number(item.monthlyPrice) <= 0) throw new ServiceCommerceError("Este servicio necesita una cotización antes de contratarse.");
  const { tenantId } = await getInternalDataraTenant();
  const owner = await getInternalCommercialOwner(tenantId);
  const contact = await resolveCommercialContact({ tenantId, firstName: identity.name, lastName: null, email: identity.email, phone: input.phone || null, company: input.companyName, source: "Servicios Datara", owner, metadata: { source: "service_purchase", clerkUserId: identity.userId } });
  const id = input.id;
  const scope = [item.shortDescription, item.description, ...item.features.map(f => `• ${f}`)].filter(Boolean).join("\n");
  const oneTimePrice = item.requiresQuote ? null : item.oneTimePrice;
  const monthlyPrice = item.requiresQuote ? "0.00" : item.monthlyPrice ?? "0.00";
  const total = (Number(oneTimePrice) + Number(monthlyPrice)).toFixed(2);
  const status = item.requiresQuote ? "awaiting_quote" : "awaiting_payment";
  const metadata = { source: "service_purchase", engagementId: id, monthlyPrice, oneTimePrice, scope };
  const lines = [{ name: item.name, amount: oneTimePrice ?? "0.00" }, ...(Number(monthlyPrice) > 0 ? [{ name: `${item.name} · primer mes`, amount: monthlyPrice }] : [])];
  // Neon HTTP batch is one transaction: the quote, purchase and contract commit together.
  await db.batch([
    db.insert(crmDeals).values({ id, tenantId, name: `${item.name} · ${input.companyName}`, customerId: contact.customerId, sourceLeadId: contact.leadId, ownerClerkUserId: owner.id, ownerName: owner.name, ownerEmail: owner.email, acquisitionChannel: "Servicios Datara", stage: "Nueva", status: "Abierta", currency: item.currency, baseAmount: total, totalAmount: total, metadata }).onConflictDoNothing(),
    db.insert(crmQuotes).values({ id, tenantId, dealId: id, quoteNumber: `COT-S-${id}`, subject: item.name, status: item.requiresQuote ? "Borrador" : "Enviada", customerId: contact.customerId, sourceLeadId: contact.leadId, ownerClerkUserId: owner.id, ownerName: owner.name, ownerEmail: owner.email, currency: item.currency, baseAmount: total, totalAmount: total, description: scope, calculationSnapshot: metadata }).onConflictDoNothing(),
    db.insert(crmQuoteItems).values(lines.map((line, index) => ({ id: index === 0 ? id : id.slice(0, -1) + (id.endsWith("0") ? "1" : "0"), tenantId, quoteId: id, name: line.name, unitPrice: line.amount, baseAmount: line.amount, totalAmount: line.amount, position: index }))).onConflictDoNothing(),
    db.insert(commercialPurchases).values({ id, purchaseType: "service_purchase", productKey: item.category, tenantId, clerkUserId: identity.userId, ownerEmail: identity.email, companyName: input.companyName, billingPeriod: Number(monthlyPrice) > 0 ? "monthly" : "one_time", catalogItemIds: [item.id], currency: item.currency, totalAmount: total, status: item.requiresQuote ? "quote_pending" : "checkout_pending", lineItems: lines.map(line => ({ catalogItemId: item.id, itemKey: item.itemKey, name: line.name, quantity: 1, unitAmount: Math.round(Number(line.amount) * 100) })) }).onConflictDoNothing(),
    db.insert(serviceEngagements).values({ id, tenantId, clerkUserId: identity.userId, catalogItemId: item.id, category: item.category, name: item.name, scope, brief: input.brief, companyName: input.companyName, contactName: identity.name, email: identity.email, phone: input.phone || null, oneTimePrice, monthlyPrice, currency: item.currency, status, purchaseId: id, quoteId: id, dealId: id, leadId: contact.leadId, customerId: contact.customerId }).onConflictDoNothing(),
  ]);
  return ownedEngagement(id, identity.userId);
}

export async function updateEngagement(input: ReturnType<typeof parseAdminUpdate>, administrator: { tenantId: string; userId: string }) {
  const scope = and(eq(serviceEngagements.id, input.id), eq(serviceEngagements.tenantId, administrator.tenantId), eq(serviceEngagements.version, input.version));
  // A single CTE makes the contract and CRM document changes atomic and versioned.
  if (input.action === "quote") {
    const result = await db.execute(sql`WITH changed AS (
      UPDATE service_engagements SET one_time_price=${input.oneTimePrice}, monthly_price=${input.monthlyPrice}, scope=${input.scope}, status='awaiting_payment', version=version+1, updated_at=now()
      WHERE ${scope} AND status IN ('awaiting_quote','awaiting_payment') AND checkout_started_at IS NULL RETURNING *
    ), quote AS (UPDATE crm_quotes q SET base_amount=c.one_time_price+c.monthly_price, total_amount=c.one_time_price+c.monthly_price, description=c.scope, status='Enviada', updated_at=now(), calculation_snapshot=jsonb_build_object('source','service_purchase','scope',c.scope,'monthlyPrice',c.monthly_price,'oneTimePrice',c.one_time_price,'approvedBy',${administrator.userId}::text) FROM changed c WHERE q.id=c.quote_id RETURNING q.id),
    removed AS (DELETE FROM crm_quote_items WHERE quote_id IN (SELECT quote_id FROM changed)),
    lines AS (INSERT INTO crm_quote_items (tenant_id,quote_id,name,unit_price,base_amount,total_amount,position) SELECT tenant_id,quote_id,name,one_time_price,one_time_price,one_time_price,0 FROM changed UNION ALL SELECT tenant_id,quote_id,name || ' · primer mes',monthly_price,monthly_price,monthly_price,1 FROM changed WHERE monthly_price>0),
    purchase AS (UPDATE commercial_purchases p SET total_amount=c.one_time_price+c.monthly_price, billing_period=CASE WHEN c.monthly_price>0 THEN 'monthly' ELSE 'one_time' END, status='checkout_pending',updated_at=now() FROM changed c WHERE p.id=c.purchase_id)
    SELECT id FROM changed`);
    if (!result.rows.length) throw new ServiceCommerceError("La cotización cambió o ya tiene un pago en curso. Actualiza la pantalla.", 409);
  } else {
    const result = await db.execute(sql`WITH changed AS (
      UPDATE service_engagements SET status=${input.status}, public_update=${input.publicUpdate || null}, delivery_url=${input.deliveryUrl || null},version=version+1,updated_at=now()
      WHERE ${scope} AND ((status IN ('paid','in_progress','review','delivered') AND ${input.status}<>'cancelled') OR (status='awaiting_quote' AND ${input.status}='cancelled')) RETURNING *
    ), work AS (UPDATE crm_service_orders w SET status=CASE c.status WHEN 'in_progress' THEN 'En proceso' WHEN 'review' THEN 'Trabajo terminado' WHEN 'delivered' THEN 'Entregado' ELSE w.status END, result=c.public_update, updated_at=now(), updated_by_clerk_user_id=${administrator.userId}, completed_at=CASE WHEN c.status='delivered' THEN now() ELSE w.completed_at END FROM changed c WHERE w.id=c.service_order_id)
    SELECT id FROM changed`);
    if (!result.rows.length) throw new ServiceCommerceError("El estado cambió o todavía no se ha confirmado el pago.", 409);
  }
}
