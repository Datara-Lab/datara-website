import {
  and,
  eq,
  inArray,
} from "drizzle-orm";

import { db } from "@/db";

import {
  crmProducts,
  crmProductTypes,
} from "@/db/schema";

export async function getInventoryTrackedProductIds(
  tenantId: string,
  productIds: string[],
): Promise<Set<string>> {
  const uniqueProductIds =
    Array.from(
      new Set(
        productIds.filter(Boolean),
      ),
    );

  if (
    uniqueProductIds.length ===
    0
  ) {
    return new Set();
  }

  const products =
    await db
      .select({
        id:
          crmProducts.id,
      })
      .from(crmProducts)
      .innerJoin(
        crmProductTypes,
        and(
          eq(
            crmProductTypes.id,
            crmProducts
              .productTypeId,
          ),
          eq(
            crmProductTypes
              .tenantId,
            tenantId,
          ),
        ),
      )
      .where(
        and(
          eq(
            crmProducts.tenantId,
            tenantId,
          ),
          eq(
            crmProducts.active,
            true,
          ),
          eq(
            crmProductTypes.active,
            true,
          ),
          eq(
            crmProductTypes
              .inventoryTracked,
            true,
          ),
          inArray(
            crmProducts.id,
            uniqueProductIds,
          ),
        ),
      );

  return new Set(
    products.map(
      (product) =>
        product.id,
    ),
  );
}

export async function isInventoryTrackedProduct(
  tenantId: string,
  productId: string,
): Promise<boolean> {
  const productIds =
    await getInventoryTrackedProductIds(
      tenantId,
      [
        productId,
      ],
    );

  return productIds.has(
    productId,
  );
}
