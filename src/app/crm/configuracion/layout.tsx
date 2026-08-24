import type {
  ReactNode,
} from "react";

import {
  redirect,
} from "next/navigation";

import {
  createAuthorization,
} from "@/lib/auth/authorization";

import {
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

type CRMConfigurationLayoutProps = {
  children: ReactNode;
};

export default async function CRMConfigurationLayout({
  children,
}: CRMConfigurationLayoutProps) {
  try {
    const authorization =
      await createAuthorization();

    const context =
      authorization.getContext();

    await requireCRMModulePermission(
      context.tenantId,
      context.clerkUserId,
      "crm-settings",
      "manage",
    );
  } catch {
    redirect("/crm");
  }

  return children;
}
