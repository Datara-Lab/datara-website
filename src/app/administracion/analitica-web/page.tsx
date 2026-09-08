import { redirect } from "next/navigation";
import { requirePlatformAdministrator } from "@/lib/platform/authorization";
import { getWebsiteAnalyticsOverview, getWebsiteTenant } from "@/lib/website/analytics-store";
import WebsiteAnalyticsDashboard from "@/components/administracion/WebsiteAnalyticsDashboard";

export const dynamic = "force-dynamic";
export default async function WebsiteAnalyticsPage() {
  let administrator;
  try { administrator = await requirePlatformAdministrator(); } catch { redirect("/portal"); }
  const tenant = await getWebsiteTenant();
  if (tenant.id !== administrator.tenantId) redirect("/portal");
  const initial = await getWebsiteAnalyticsOverview(administrator.tenantId, tenant.name, 30);
  return <WebsiteAnalyticsDashboard initial={initial} />;
}
