import type Stripe from "stripe";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commercialPurchases, serviceEngagements } from "@/db/schema";
import { legalBundleVersion } from "@/lib/legal/legal-documents";
import { createStripeClient } from "./create-stripe-client";
import { ownedEngagement, type ServiceEngagement } from "./service-engagements";
import { ServiceCommerceError, parseAcceptance } from "./service-engagement-validation";

export function serviceStripe() {
  let key = process.env.STRIPE_SECRET_KEY;
  let environment = process.env.DATARA_ENVIRONMENT;
  try { const env = getCloudflareContext().env as { STRIPE_SECRET_KEY?: string; DATARA_ENVIRONMENT?: string }; key ||= env.STRIPE_SECRET_KEY; environment ||= env.DATARA_ENVIRONMENT; } catch { /* Local Node runtime. */ }
  if (!key) throw new ServiceCommerceError("El servicio de pagos no está configurado.", 503);
  if (environment !== "production" && !key.trim().startsWith("sk_test_")) throw new ServiceCommerceError("El entorno de desarrollo requiere Stripe en modo de prueba.", 503);
  return createStripeClient(key);
}
export function serviceCheckoutPayload(item: ServiceEngagement, origin: string): Stripe.Checkout.SessionCreateParams {
  const monthly = Math.round(Number(item.monthlyPrice) * 100), initial = Math.round(Number(item.oneTimePrice) * 100);
  if (!Number.isSafeInteger(monthly) || !Number.isSafeInteger(initial) || monthly < 0 || initial < 0 || monthly + initial <= 0 || item.oneTimePrice === null) throw new ServiceCommerceError("La cotización no tiene importes válidos.");
  const metadata = { purchaseId: item.purchaseId, engagementId: item.id, purchaseType: "service_purchase", attempt: String(item.checkoutAttempt) };
  return {
    mode: monthly > 0 ? "subscription" : "payment", customer_email: item.email, client_reference_id: item.clerkUserId,
    success_url: `${origin}/mis-servicios?contratacion=${item.id}&pago=regreso`, cancel_url: `${origin}/mis-servicios?contratacion=${item.id}&pago=cancelado`,
    expires_at: Math.floor(item.checkoutStartedAt!.getTime() / 1000) + 23 * 60 * 60,
    metadata, ...(monthly > 0 ? { subscription_data: { metadata } } : { payment_intent_data: { metadata }, customer_creation: "always" as const }),
    line_items: [
      ...(initial > 0 ? [{ quantity: 1, price_data: { currency: item.currency, unit_amount: initial, product_data: { name: item.name } } }] : []),
      ...(monthly > 0 ? [{ quantity: 1, price_data: { currency: item.currency, unit_amount: monthly, product_data: { name: `${item.name} · mensualidad` }, recurring: { interval: "month" as const } } }] : []),
    ],
    payment_method_types: ["card"], locale: "es", allow_promotion_codes: false,
  };
}
export async function startServiceCheckout(id: string, userId: string, acceptance: ReturnType<typeof parseAcceptance>, origin: string) {
  const stripe = serviceStripe();
  let item = await ownedEngagement(id, userId);
  if (item.status !== "awaiting_payment" || item.version !== acceptance.version) throw new ServiceCommerceError("La cotización cambió o ya fue pagada. Actualiza la pantalla.", 409);
  if (Number(item.monthlyPrice) > 0 && !acceptance.recurringChargesAccepted) throw new ServiceCommerceError("Confirma la mensualidad antes de continuar.");
  const [purchase] = await db.select().from(commercialPurchases).where(eq(commercialPurchases.id, item.purchaseId));
  if (purchase.stripeCheckoutSessionId) {
    const previous = await stripe.checkout.sessions.retrieve(purchase.stripeCheckoutSessionId);
    if (previous.status === "complete") {
      await fulfillServiceCheckout(previous);
      return { url: "/mis-servicios" };
    }
    if (previous.status === "open" && previous.url) return { url: previous.url };
    // Only an expired session can advance the attempt. All retries keep the accepted scope.
    await db.batch([
      db.update(commercialPurchases).set({ stripeCheckoutSessionId: null, status: "checkout_pending", updatedAt: new Date() }).where(and(eq(commercialPurchases.id, item.purchaseId), eq(commercialPurchases.stripeCheckoutSessionId, previous.id))),
      db.update(serviceEngagements).set({ checkoutStartedAt: null, updatedAt: new Date() }).where(and(eq(serviceEngagements.id, id), eq(serviceEngagements.checkoutAttempt, item.checkoutAttempt), eq(serviceEngagements.status, "awaiting_payment"))),
    ]);
  }
  const result = await db.execute(sql`WITH accepted AS (
    UPDATE service_engagements SET checkout_started_at=now(), checkout_attempt=checkout_attempt+1, accepted_at=coalesce(accepted_at,now()), updated_at=now()
    WHERE id=${id} AND clerk_user_id=${userId} AND status='awaiting_payment' AND version=${acceptance.version} AND checkout_started_at IS NULL RETURNING *
  ), legal AS (INSERT INTO commercial_legal_acceptances (commercial_purchase_id,tenant_id,clerk_user_id,owner_email,legal_bundle_version,document_keys,documents_accepted,recurring_charges_accepted,billing_period,total_amount,currency,metadata)
    SELECT purchase_id,tenant_id,clerk_user_id,email,${legalBundleVersion},'["terms","privacy"]'::jsonb,true,${acceptance.recurringChargesAccepted},CASE WHEN monthly_price>0 THEN 'monthly' ELSE 'one_time' END,one_time_price+monthly_price,currency,jsonb_build_object('scope',scope,'oneTimePrice',one_time_price,'monthlyPrice',monthly_price,'version',version) FROM accepted
    ON CONFLICT (commercial_purchase_id) DO NOTHING)
  SELECT id FROM accepted`);
  void result;
  item = await ownedEngagement(id, userId);
  if (!item.checkoutStartedAt || item.status !== "awaiting_payment" || item.version !== acceptance.version) throw new ServiceCommerceError("La cotización cambió. Actualiza la pantalla.", 409);
  if (Date.now() > item.checkoutStartedAt.getTime() + 22 * 60 * 60 * 1000) throw new ServiceCommerceError("El intento de pago necesita revisión. Contacta a Datara desde tu portal.", 409);
  const session = await stripe.checkout.sessions.create(serviceCheckoutPayload(item, origin), { idempotencyKey: `service:${id}:${item.checkoutAttempt}` });
  await db.update(commercialPurchases).set({ stripeCheckoutSessionId: session.id, expiresAt: new Date(session.expires_at * 1000), updatedAt: new Date() }).where(and(eq(commercialPurchases.id, item.purchaseId), eq(commercialPurchases.status, "checkout_pending")));
  if (!session.url) throw new ServiceCommerceError("Stripe no devolvió el enlace de pago.", 502);
  return { url: session.url };
}

export function assertPaidServiceSession(session: Stripe.Checkout.Session, item: ServiceEngagement, purchase: typeof commercialPurchases.$inferSelect) {
  if (session.payment_status !== "paid" || session.status !== "complete") throw new ServiceCommerceError("El pago aún no está confirmado.", 409);
  if (session.metadata?.engagementId !== item.id || session.metadata?.purchaseId !== item.purchaseId || session.metadata?.attempt !== String(item.checkoutAttempt) || session.client_reference_id !== item.clerkUserId || (purchase.stripeCheckoutSessionId && purchase.stripeCheckoutSessionId !== session.id) || session.currency !== item.currency || session.amount_total !== Math.round((Number(item.oneTimePrice) + Number(item.monthlyPrice)) * 100)) throw new Error("La confirmación de Stripe no coincide con la contratación.");
  if (Number(item.monthlyPrice) > 0 && !session.subscription) throw new Error("Falta la suscripción de la contratación.");
}
function stripeId(value: string | { id: string } | null) { return typeof value === "string" ? value : value?.id ?? null; }
export async function fulfillServiceCheckout(session: Stripe.Checkout.Session) {
  const id = session.metadata?.engagementId;
  if (!id) return;
  const [item] = await db.select().from(serviceEngagements).where(eq(serviceEngagements.id, id));
  if (!item) throw new Error("No encontramos la contratación del pago.");
  const [purchase] = await db.select().from(commercialPurchases).where(eq(commercialPurchases.id, item.purchaseId));
  if (!purchase || purchase.purchaseType !== "service_purchase") throw new Error("Compra de servicio no válida.");
  if (session.payment_status !== "paid") return; // Async checkout completion is not proof of payment.
  assertPaidServiceSession(session, item, purchase);
  const subscriptionId = stripeId(session.subscription), customerId = stripeId(session.customer);
  // Lock and state predicate serialize duplicate webhooks. All CRM records commit with payment.
  await db.execute(sql`WITH locked AS (
    SELECT * FROM service_engagements WHERE id=${item.id} AND status='awaiting_payment' FOR UPDATE
  ), existing_customer AS (
    SELECT c.id FROM crm_customers c JOIN locked e ON c.tenant_id=e.tenant_id WHERE c.id=e.customer_id OR lower(trim(c.email))=lower(e.email) ORDER BY c.created_at LIMIT 1
  ), new_customer AS (
    INSERT INTO crm_customers (id,tenant_id,name,email,phone,status,source_lead_id,owner_clerk_user_id,owner_name,owner_email)
    SELECT e.id,e.tenant_id,e.contact_name,e.email,e.phone,'Activo',e.lead_id,q.owner_clerk_user_id,q.owner_name,q.owner_email FROM locked e JOIN crm_quotes q ON q.id=e.quote_id WHERE NOT EXISTS (SELECT 1 FROM existing_customer) RETURNING id
  ), customer AS (SELECT id FROM existing_customer UNION ALL SELECT id FROM new_customer),
  lead AS (UPDATE crm_leads l SET status='Convertido',updated_at=now() FROM locked e WHERE l.id=e.lead_id AND EXISTS(SELECT 1 FROM customer)),
  deal AS (UPDATE crm_deals d SET customer_id=c.id,status='Ganada',stage='Ganada',updated_at=now() FROM locked e CROSS JOIN customer c WHERE d.id=e.deal_id),
  quote AS (UPDATE crm_quotes q SET customer_id=c.id,status='Aceptada',accepted_at=now(),updated_at=now() FROM locked e CROSS JOIN customer c WHERE q.id=e.quote_id RETURNING q.*),
  sale AS (
    INSERT INTO crm_sales_orders (id,tenant_id,customer_id,deal_id,quote_id,reference,status,customer_name,customer_email,customer_phone,owner_clerk_user_id,owner_name,owner_email,currency,base_amount,total_amount,payment_method,created_by_clerk_user_id,confirmed_by_clerk_user_id,confirmed_at,metadata)
    SELECT e.id,e.tenant_id,c.id,e.deal_id,e.quote_id,'OV-S-'||e.id,'Confirmada',e.contact_name,e.email,e.phone,q.owner_clerk_user_id,q.owner_name,q.owner_email,e.currency,e.one_time_price+e.monthly_price,e.one_time_price+e.monthly_price,'Stripe',q.owner_clerk_user_id,q.owner_clerk_user_id,now(),jsonb_build_object('sourceType','service_purchase','purchaseId',e.purchase_id) FROM locked e CROSS JOIN customer c JOIN quote q ON true RETURNING *
  ), sale_lines AS (
    INSERT INTO crm_sales_order_items (tenant_id,sales_order_id,name,quantity,unit_price,total_amount,position) SELECT i.tenant_id,s.id,i.name,1,i.unit_price,i.total_amount,i.position FROM sale s JOIN crm_quote_items i ON i.quote_id=s.quote_id
  ), work AS (
    INSERT INTO crm_service_orders (id,tenant_id,customer_id,deal_id,sales_order_id,reference,status,service_type,customer_name,customer_email,customer_phone,unit_model,reported_problem,owner_clerk_user_id,owner_name,owner_email,created_by_clerk_user_id,metadata)
    SELECT e.id,e.tenant_id,s.customer_id,e.deal_id,s.id,'OT-S-'||e.id,'Pendiente',e.category,e.contact_name,e.email,e.phone,e.name,e.scope||E'\n\nBrief del cliente:\n'||e.brief,s.owner_clerk_user_id,s.owner_name,s.owner_email,s.owner_clerk_user_id,jsonb_build_object('sourceType','service_purchase','engagementId',e.id) FROM locked e JOIN sale s ON s.id=e.id RETURNING id
  ), payment AS (
    UPDATE commercial_purchases p SET status='provisioned',stripe_checkout_session_id=${session.id},stripe_customer_id=${customerId},stripe_subscription_id=${subscriptionId},paid_at=now(),provisioned_at=now(),updated_at=now() FROM locked e WHERE p.id=e.purchase_id AND EXISTS(SELECT 1 FROM work)
  ) UPDATE service_engagements e SET status='paid',billing_status=${subscriptionId ? "active" : "paid"},customer_id=c.id,sales_order_id=w.id,service_order_id=w.id,version=e.version+1,updated_at=now() FROM locked l CROSS JOIN customer c CROSS JOIN work w WHERE e.id=l.id`);
}

export async function handleServiceStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<boolean> {
  const object = event.data.object;
  if (event.type.startsWith("checkout.session.")) {
    const session = object as Stripe.Checkout.Session;
    if (session.metadata?.purchaseType !== "service_purchase") return false;
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") await fulfillServiceCheckout(session);
    else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      await db.update(commercialPurchases).set({ status: "checkout_expired", updatedAt: new Date() }).where(and(eq(commercialPurchases.stripeCheckoutSessionId, session.id), eq(commercialPurchases.status, "checkout_pending")));
    }
    return true;
  }
  let subscriptionId: string | null = null;
  if (event.type.startsWith("customer.subscription.")) subscriptionId = (object as Stripe.Subscription).id;
  if (event.type.startsWith("invoice.")) subscriptionId = stripeId((object as Stripe.Invoice).parent?.subscription_details?.subscription ?? null);
  if (!subscriptionId) return false;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.metadata.purchaseType !== "service_purchase") return false;
  const id = subscription.metadata.engagementId;
  await db.execute(sql`UPDATE service_engagements e SET billing_status=${subscription.status === "unpaid" ? "unpaid_subscription" : subscription.status},updated_at=now() FROM commercial_purchases p WHERE p.id=e.purchase_id AND e.id=${id} AND p.stripe_subscription_id=${subscriptionId} AND p.purchase_type='service_purchase'`);
  return true;
}
export async function reconcileServicePayment(id: string, userId: string) {
  const item = await ownedEngagement(id, userId);
  if (item.status !== "awaiting_payment") return;
  const [purchase] = await db.select().from(commercialPurchases).where(eq(commercialPurchases.id, item.purchaseId));
  if (!purchase.stripeCheckoutSessionId) return;
  await fulfillServiceCheckout(await serviceStripe().checkout.sessions.retrieve(purchase.stripeCheckoutSessionId));
}
export async function serviceBillingPortal(id: string, userId: string, origin: string) {
  const item = await ownedEngagement(id, userId);
  const [purchase] = await db.select().from(commercialPurchases).where(eq(commercialPurchases.id, item.purchaseId));
  if (!purchase.stripeCustomerId || purchase.status !== "provisioned") throw new ServiceCommerceError("Todavía no hay una cuenta de facturación para esta contratación.", 409);
  const session = await serviceStripe().billingPortal.sessions.create({ customer: purchase.stripeCustomerId, return_url: `${origin}/mis-servicios` });
  return { url: session.url };
}
