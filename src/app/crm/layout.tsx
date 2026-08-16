import { redirect } from "next/navigation";

import CRMClientLayout from "./CRMClientLayout";

import { createAuthorization } from "@/lib/auth/authorization";

type CRMLayoutProps = {
  children: React.ReactNode;
};

export default async function CRMLayout({
  children,
}: CRMLayoutProps) {
  const authz =
    await createAuthorization();

  if (!authz.products.crm.allowed) {
    redirect("/portal");
  }

  return (
    <CRMClientLayout>
      {children}
    </CRMClientLayout>
  );
}