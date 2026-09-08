import { redirect } from "next/navigation";
import ServiceCatalogManager from "@/components/administracion/ServiceCatalogManager";
import { requirePlatformAdministrator } from "@/lib/platform/authorization";

export const dynamic = "force-dynamic";
export default async function WebsitesAdministrationPage() {
  try { await requirePlatformAdministrator(); }
  catch { redirect("/portal"); }
  return <ServiceCatalogManager category="website" />;
}
