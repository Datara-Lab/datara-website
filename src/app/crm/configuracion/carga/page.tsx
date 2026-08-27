import {
  auth,
} from "@clerk/nextjs/server";

import {
  eq,
} from "drizzle-orm";

import {
  redirect,
} from "next/navigation";

import CRMImportCenter from "@/components/crm/CRMImportCenter";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import {
  getCRMModulePermissions,
} from "@/lib/crm/permissions";

export default async function CRMImportPage() {
  const {
    userId,
    orgId,
  } = await auth();

  if (!userId || !orgId) {
    redirect("/portal");
  }

  const [tenant] = await db
    .select({
      id: tenants.id,
    })
    .from(tenants)
    .where(
      eq(
        tenants.clerkOrganizationId,
        orgId,
      ),
    )
    .limit(1);

  if (!tenant) {
    redirect("/crm/configuracion");
  }

  const permissions =
    await getCRMModulePermissions(
      tenant.id,
      userId,
      "crm",
    );

  if (
    !permissions
      .isGlobalAdministrator
  ) {
    redirect("/crm/configuracion");
  }

  return <CRMImportCenter />;
}
