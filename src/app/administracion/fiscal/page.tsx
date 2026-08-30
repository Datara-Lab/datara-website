import {
  redirect,
} from "next/navigation";

import FiscalPlatformManager from "@/components/administracion/FiscalPlatformManager";

import {
  requirePlatformAdministrator,
} from "@/lib/platform/authorization";

export const dynamic =
  "force-dynamic";

export default async function FiscalAdministrationPage() {
  try {
    await requirePlatformAdministrator();
  } catch {
    redirect("/portal");
  }

  return <FiscalPlatformManager />;
}
