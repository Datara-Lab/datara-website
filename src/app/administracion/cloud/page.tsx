import {
  redirect,
} from "next/navigation";

import CloudCatalogManager from "@/components/administracion/CloudCatalogManager";

import {
  requireCloudAdministrator,
} from "@/lib/platform/authorization";

export const dynamic =
  "force-dynamic";

export default async function CloudAdministrationPage() {
  try {
    await requireCloudAdministrator();
  } catch {
    redirect("/portal");
  }

  return (
    <CloudCatalogManager />
  );
}