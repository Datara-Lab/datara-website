import {
  canAccessProduct,
  canAccessProductWithContext,
} from "./products";

import { getAuthorizationContext } from "./session";

import type {
  AuthorizationContext,
  DataraProduct,
  ModulePermissionResult,
  PermissionAction,
  ProductAccessResult,
} from "./types";

type ProductAccessMap = Record<
  DataraProduct,
  ProductAccessResult
>;

export class AuthorizationEngine {
  constructor(
    private readonly context: AuthorizationContext,
    public readonly products: ProductAccessMap,
  ) {}

  canAccessProduct(
    product: DataraProduct,
  ): ProductAccessResult {
    return this.products[product];
  }

  getContext(): AuthorizationContext {
    return this.context;
  }
}

export async function createAuthorization(): Promise<AuthorizationEngine> {
  const context =
    await getAuthorizationContext();

  const [
    crm,
    analytics,
    cloud,
  ] = await Promise.all([
    canAccessProductWithContext(
      context,
      "crm",
    ),
    canAccessProductWithContext(
      context,
      "analytics",
    ),
    canAccessProductWithContext(
      context,
      "cloud",
    ),
  ]);

  return new AuthorizationEngine(
    context,
    {
      crm,
      analytics,
      cloud,
    },
  );
}

export {
  canAccessProduct,
};

export type {
  AuthorizationContext,
  DataraProduct,
  ModulePermissionResult,
  PermissionAction,
  ProductAccessResult,
};