import {
  and,
  eq,
} from "drizzle-orm";

import { db } from "@/db";
import {
  memberProductRoles,
  roles,
  tenantProducts,
} from "@/db/schema";

import { getAuthorizationContext } from "./session";

import type {
  AuthorizationContext,
  DataraProduct,
  ProductAccessResult,
} from "./types";

export async function canAccessProductWithContext(
  context: AuthorizationContext,
  product: DataraProduct,
): Promise<ProductAccessResult> {
    const [access] = await db
    .select({
      enabled:
        memberProductRoles.enabled,
      roleId:
        memberProductRoles.roleId,
      roleKey: roles.key,
      roleName: roles.name,
    })
    .from(memberProductRoles)
    .innerJoin(
      roles,
      eq(
        memberProductRoles.roleId,
        roles.id,
      ),
    )
    .innerJoin(
      tenantProducts,
      and(
        eq(
          tenantProducts.tenantId,
          context.tenantId,
        ),
        eq(
          tenantProducts.product,
          memberProductRoles.product,
        ),
      ),
    )
    .where(
      and(
        eq(
          memberProductRoles.tenantId,
          context.tenantId,
        ),
        eq(
          memberProductRoles.memberId,
          context.memberId,
        ),
        eq(
          memberProductRoles.product,
          product,
        ),
        eq(
          memberProductRoles.enabled,
          true,
        ),
        eq(
          tenantProducts.enabled,
          true,
        ),
      ),
    )
    .limit(1);

  return {
    allowed: Boolean(access),
    product,
    roleId:
      access?.roleId ?? null,
    roleKey:
      access?.roleKey ?? null,
    roleName:
      access?.roleName ?? null,
  };
}

export async function canAccessProduct(
  product: DataraProduct,
): Promise<ProductAccessResult> {
  const context =
    await getAuthorizationContext();

  return canAccessProductWithContext(
    context,
    product,
  );
}