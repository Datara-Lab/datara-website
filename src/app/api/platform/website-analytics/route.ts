import { NextResponse } from "next/server";
import { requirePlatformAdministrator, PlatformAuthorizationError } from "@/lib/platform/authorization";
import { getWebsiteAnalyticsOverview, getWebsiteTenant } from "@/lib/website/analytics-store";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const administrator = await requirePlatformAdministrator();
    const days = Number(new URL(request.url).searchParams.get("days") ?? "30");
    if (![7, 30, 90].includes(days)) return NextResponse.json({ success: false, error: "Selecciona 7, 30 o 90 días." }, { status: 400, headers });
    const tenant = await getWebsiteTenant();
    if (tenant.id !== administrator.tenantId) return NextResponse.json({ success: false, error: "Acceso no autorizado." }, { status: 403, headers });
    const data = await getWebsiteAnalyticsOverview(administrator.tenantId, tenant.name, days);
    return NextResponse.json({ success: true, data }, { headers });
  } catch (error) {
    const known = error instanceof PlatformAuthorizationError;
    if (!known) console.error("No fue posible consultar la analítica web.");
    return NextResponse.json({ success: false, error: known ? error.message : "No fue posible cargar la analítica web." }, { status: known ? error.status : 500, headers });
  }
}
