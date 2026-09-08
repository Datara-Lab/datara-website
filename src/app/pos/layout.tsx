import { redirect } from "next/navigation";

import { createAuthorization } from "@/lib/auth/authorization";

export default async function POSLayout({ children }: { children: React.ReactNode }) {
  const authorization = await createAuthorization();
  if (!authorization.products.pos.allowed) redirect("/portal");
  return children;
}
