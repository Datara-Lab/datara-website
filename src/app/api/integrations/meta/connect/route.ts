import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/auth/session";
import { requireCRMModulePermission } from "@/lib/crm/permissions";
import { getMetaConfiguration } from "@/lib/meta/config";
import { createMetaState } from "@/lib/meta/state";

export const dynamic = "force-dynamic";

const permissions = [
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "leads_retrieval",
  "instagram_basic",
  "instagram_manage_messages",
].join(",");

export async function GET() {
  try {
    const context = await getAuthorizationContext();
    await requireCRMModulePermission(
      context.tenantId,
      context.clerkUserId,
      "integrations",
      "manage",
    );
    const configuration = await getMetaConfiguration();
    const redirectUri = `${configuration.publicUrl}/api/integrations/meta/callback`;
    const state = await createMetaState(
      {
        tenantId: context.tenantId,
        clerkUserId: context.clerkUserId,
      },
      configuration.appSecret,
    );
    const authorizationUrl = new URL(
      "https://www.facebook.com/v26.0/dialog/oauth",
    );
    authorizationUrl.searchParams.set("client_id", configuration.appId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("scope", permissions);
    authorizationUrl.searchParams.set("response_type", "code");
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error("No fue posible iniciar OAuth con Meta:", error);
    return NextResponse.redirect(
      new URL(
        "/crm/configuracion/integraciones/configurar?meta=error",
        "https://datara-lab.com",
      ),
    );
  }
}
