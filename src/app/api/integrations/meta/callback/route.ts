import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  metaIntegrations,
  tenantMembers,
  tenants,
} from "@/db/schema";
import { encryptMetaToken } from "@/lib/meta/crypto";
import { getMetaConfiguration } from "@/lib/meta/config";
import { verifyMetaState } from "@/lib/meta/state";

export const dynamic = "force-dynamic";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: { message?: string };
};

type PageResponse = {
  data?: Array<{
    id: string;
    name: string;
    access_token?: string;
    instagram_business_account?: {
      id: string;
      username?: string;
    };
  }>;
  error?: { message?: string };
};

async function getJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json()) as T;
  if (!response.ok) {
    const message = (body as { error?: { message?: string } }).error?.message;
    throw new Error(message ?? `Meta respondió HTTP ${response.status}.`);
  }
  return body;
}

export async function GET(request: Request) {
  const configuration = await getMetaConfiguration();
  const destination = new URL(
    "/crm/configuracion/integraciones/configurar",
    configuration.publicUrl,
  );

  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");
    const oauthError = requestUrl.searchParams.get("error");
    if (oauthError || !code || !state) {
      throw new Error("La autorización de Meta fue cancelada o está incompleta.");
    }

    const stateData = await verifyMetaState(state, configuration.appSecret);
    const [member] = await db
      .select({ id: tenantMembers.id })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, stateData.tenantId),
          eq(tenantMembers.clerkUserId, stateData.clerkUserId),
          eq(tenantMembers.status, "active"),
        ),
      )
      .limit(1);
    if (!member) throw new Error("El usuario ya no pertenece a la empresa.");

    const redirectUri = `${configuration.publicUrl}/api/integrations/meta/callback`;
    const tokenUrl = new URL(
      "https://graph.facebook.com/v26.0/oauth/access_token",
    );
    tokenUrl.searchParams.set("client_id", configuration.appId);
    tokenUrl.searchParams.set("client_secret", configuration.appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    const token = await getJson<TokenResponse>(tokenUrl);
    if (!token.access_token) throw new Error("Meta no devolvió un token de acceso.");

    const longLivedUrl = new URL(
      "https://graph.facebook.com/v26.0/oauth/access_token",
    );
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", configuration.appId);
    longLivedUrl.searchParams.set("client_secret", configuration.appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", token.access_token);
    const longLived = await getJson<TokenResponse>(longLivedUrl);
    const userToken = longLived.access_token ?? token.access_token;

    const pagesUrl = new URL("https://graph.facebook.com/v26.0/me/accounts");
    pagesUrl.searchParams.set(
      "fields",
      "id,name,access_token,instagram_business_account{id,username}",
    );
    pagesUrl.searchParams.set("access_token", userToken);
    const pages = await getJson<PageResponse>(pagesUrl);
    const page = pages.data?.find((candidate) => candidate.access_token);
    if (!page?.access_token) {
      throw new Error("No encontramos una página administrada para conectar.");
    }

    const subscriptionUrl = new URL(
      `https://graph.facebook.com/v26.0/${encodeURIComponent(page.id)}/subscribed_apps`,
    );
    subscriptionUrl.searchParams.set("subscribed_fields", "leadgen");
    subscriptionUrl.searchParams.set("access_token", page.access_token);
    const subscriptionResponse = await fetch(subscriptionUrl, { method: "POST" });
    if (!subscriptionResponse.ok) {
      const body = (await subscriptionResponse.json()) as {
        error?: { message?: string };
      };
      throw new Error(
        body.error?.message ?? "No fue posible suscribir la página a Lead Ads.",
      );
    }

    const encryptedToken = await encryptMetaToken(
      page.access_token,
      configuration.encryptionKey,
    );
    const now = new Date();
    const tokenExpiresAt = longLived.expires_in
      ? new Date(now.getTime() + longLived.expires_in * 1000)
      : null;

    await db
      .insert(metaIntegrations)
      .values({
        tenantId: stateData.tenantId,
        pageId: page.id,
        pageName: page.name,
        instagramBusinessAccountId:
          page.instagram_business_account?.id ?? null,
        instagramUsername:
          page.instagram_business_account?.username ?? null,
        encryptedPageAccessToken: encryptedToken,
        tokenExpiresAt,
        leadAdsEnabled: true,
        instagramMessagesEnabled: false,
        status: "active",
        connectedByClerkUserId: stateData.clerkUserId,
        metadata: { graphApiVersion: "v26.0" },
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: metaIntegrations.tenantId,
        set: {
          pageId: page.id,
          pageName: page.name,
          instagramBusinessAccountId:
            page.instagram_business_account?.id ?? null,
          instagramUsername:
            page.instagram_business_account?.username ?? null,
          encryptedPageAccessToken: encryptedToken,
          tokenExpiresAt,
          status: "active",
          connectedByClerkUserId: stateData.clerkUserId,
          updatedAt: now,
        },
      });

    const [tenant] = await db
      .select({ metadata: tenants.metadata })
      .from(tenants)
      .where(eq(tenants.id, stateData.tenantId))
      .limit(1);
    const metadata =
      tenant?.metadata && typeof tenant.metadata === "object"
        ? tenant.metadata
        : {};
    await db
      .update(tenants)
      .set({
        metadata: {
          ...metadata,
          crmSocialIntegrations: {
            metaBusinessAccountId: "",
            facebook: {
              enabled: true,
              pageId: page.id,
              pageName: page.name,
              leadAdsEnabled: true,
            },
            instagram: {
              enabled: Boolean(page.instagram_business_account),
              businessAccountId: page.instagram_business_account?.id ?? "",
              username: page.instagram_business_account?.username ?? "",
              messagesEnabled: false,
            },
            connectedAt: now.toISOString(),
          },
        },
        updatedAt: now,
      })
      .where(eq(tenants.id, stateData.tenantId));

    destination.searchParams.set("meta", "connected");
  } catch (error) {
    console.error("No fue posible completar OAuth con Meta:", error);
    destination.searchParams.set("meta", "error");
  }

  return NextResponse.redirect(destination);
}
