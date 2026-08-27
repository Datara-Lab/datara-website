import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmLeads,
  metaIntegrations,
  metaWebhookEvents,
} from "@/db/schema";
import { getMetaConfiguration } from "@/lib/meta/config";
import { decryptMetaToken } from "@/lib/meta/crypto";

export const dynamic = "force-dynamic";

type MetaChange = {
  field?: string;
  value?: Record<string, unknown>;
};

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    changes?: MetaChange[];
  }>;
};

type LeadResponse = {
  id?: string;
  created_time?: string;
  field_data?: Array<{
    name?: string;
    values?: string[];
  }>;
  form_id?: string;
  ad_id?: string;
  ad_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  error?: { message?: string };
};

const encoder = new TextEncoder();

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function validSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const calculated = hex(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)),
    ),
  );
  const received = signature.slice("sha256=".length);
  if (received.length !== calculated.length) return false;
  let difference = 0;
  for (let index = 0; index < received.length; index += 1) {
    difference |= received.charCodeAt(index) ^ calculated.charCodeAt(index);
  }
  return difference === 0;
}

function textValue(
  fields: Map<string, string>,
  ...names: string[]
): string | null {
  for (const name of names) {
    const value = fields.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function splitName(fullName: string | null): {
  firstName: string;
  lastName: string | null;
} {
  if (!fullName) return { firstName: "Prospecto Meta", lastName: null };
  const parts = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() ?? "Prospecto Meta",
    lastName: parts.length ? parts.join(" ") : null,
  };
}

async function processLeadgen(
  integration: typeof metaIntegrations.$inferSelect,
  eventId: string,
  value: Record<string, unknown>,
  encryptionKey: string,
): Promise<void> {
  const leadgenId =
    typeof value.leadgen_id === "string" ? value.leadgen_id : null;
  if (!leadgenId) throw new Error("El webhook no contiene leadgen_id.");

  const accessToken = await decryptMetaToken(
    integration.encryptedPageAccessToken,
    encryptionKey,
  );
  const leadUrl = new URL(
    `https://graph.facebook.com/v26.0/${encodeURIComponent(leadgenId)}`,
  );
  leadUrl.searchParams.set(
    "fields",
    "id,created_time,field_data,form_id,ad_id,ad_name,campaign_id,campaign_name",
  );
  leadUrl.searchParams.set("access_token", accessToken);
  const response = await fetch(leadUrl, { cache: "no-store" });
  const lead = (await response.json()) as LeadResponse;
  if (!response.ok) {
    throw new Error(lead.error?.message ?? `Meta respondió HTTP ${response.status}.`);
  }

  const fields = new Map<string, string>();
  for (const field of lead.field_data ?? []) {
    if (field.name && field.values?.[0]) fields.set(field.name, field.values[0]);
  }
  const name = splitName(textValue(fields, "full_name", "name"));
  const email = textValue(fields, "email");
  const phone = textValue(fields, "phone_number", "phone");
  const company = textValue(fields, "company_name", "company");

  await db.insert(crmLeads).values({
    tenantId: integration.tenantId,
    firstName: name.firstName,
    lastName: name.lastName,
    email,
    phone,
    mobile: phone,
    company,
    source: "Facebook Lead Ads",
    status: "Nuevo",
    commercialConsent: false,
    notes: lead.ad_name
      ? `Prospecto recibido desde el anuncio ${lead.ad_name}.`
      : "Prospecto recibido desde Facebook Lead Ads.",
    metadata: {
      metaLeadgenId: leadgenId,
      metaWebhookEventId: eventId,
      metaPageId: integration.pageId,
      metaFormId: lead.form_id ?? value.form_id ?? null,
      metaAdId: lead.ad_id ?? value.ad_id ?? null,
      metaAdName: lead.ad_name ?? null,
      metaCampaignId: lead.campaign_id ?? null,
      metaCampaignName: lead.campaign_name ?? null,
      metaCreatedTime: lead.created_time ?? null,
      rawFields: Object.fromEntries(fields),
    },
  });
}

export async function GET(request: Request) {
  const configuration = await getMetaConfiguration();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (
    mode === "subscribe" &&
    token === configuration.webhookVerifyToken &&
    challenge
  ) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ success: false }, { status: 403 });
}

export async function POST(request: Request) {
  const configuration = await getMetaConfiguration();
  const rawBody = await request.text();
  if (
    !(await validSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      configuration.appSecret,
    ))
  ) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  for (const entry of payload.entry ?? []) {
    if (!entry.id) continue;
    const [integration] = await db
      .select()
      .from(metaIntegrations)
      .where(eq(metaIntegrations.pageId, entry.id))
      .limit(1);
    if (!integration || integration.status !== "active") continue;

    for (let index = 0; index < (entry.changes ?? []).length; index += 1) {
      const change = entry.changes?.[index];
      if (!change?.field || !change.value) continue;
      const leadgenId =
        typeof change.value.leadgen_id === "string"
          ? change.value.leadgen_id
          : "unknown";
      const eventId = [
        payload.object ?? "page",
        entry.id,
        change.field,
        leadgenId,
        String(entry.time ?? 0),
        String(index),
      ].join(":");

      const [event] = await db
        .insert(metaWebhookEvents)
        .values({
          integrationId: integration.id,
          tenantId: integration.tenantId,
          metaEventId: eventId,
          objectType: payload.object ?? "page",
          field: change.field,
          payload: change.value,
        })
        .onConflictDoNothing({ target: metaWebhookEvents.metaEventId })
        .returning({ id: metaWebhookEvents.id });
      if (!event) continue;

      try {
        if (change.field === "leadgen" && integration.leadAdsEnabled) {
          await processLeadgen(
            integration,
            eventId,
            change.value,
            configuration.encryptionKey,
          );
          await db
            .update(metaWebhookEvents)
            .set({ status: "processed", processedAt: new Date() })
            .where(eq(metaWebhookEvents.id, event.id));
        } else {
          await db
            .update(metaWebhookEvents)
            .set({ status: "ignored", processedAt: new Date() })
            .where(eq(metaWebhookEvents.id, event.id));
        }
      } catch (error) {
        console.error("No fue posible procesar un webhook de Meta:", error);
        await db
          .update(metaWebhookEvents)
          .set({
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message.slice(0, 1000) : "Error desconocido",
            processedAt: new Date(),
          })
          .where(eq(metaWebhookEvents.id, event.id));
      }
    }
  }

  return NextResponse.json({ success: true });
}
