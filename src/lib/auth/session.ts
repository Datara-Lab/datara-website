import { auth } from "@clerk/nextjs/server";
import {
  and,
  eq,
} from "drizzle-orm";

import { db } from "@/db";
import {
  tenantMembers,
  tenants,
} from "@/db/schema";

import type { AuthorizationContext } from "./types";

export async function getAuthorizationContext(): Promise<AuthorizationContext> {
  const {
    userId,
    orgId,
  } = await auth();

  if (!userId) {
    throw new Error(
      "No existe una sesión activa.",
    );
  }

  if (!orgId) {
    throw new Error(
      "No existe una organización activa.",
    );
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
    throw new Error(
      "No fue posible resolver el Workspace.",
    );
  }

  const [member] = await db
    .select({
      id: tenantMembers.id,
    })
    .from(tenantMembers)
    .where(
      and(
        eq(
          tenantMembers.tenantId,
          tenant.id,
        ),
        eq(
          tenantMembers.clerkUserId,
          userId,
        ),
        eq(
          tenantMembers.status,
          "active",
        ),
      ),
    )
    .limit(1);

  if (!member) {
    throw new Error(
      "El usuario no pertenece al Workspace.",
    );
  }

  return {
    tenantId: tenant.id,
    memberId: member.id,
    clerkUserId: userId,
  };
}