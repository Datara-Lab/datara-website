import { eq } from "drizzle-orm";

import { db } from "@/db";

import { inventoryLocations, tenantBranches } from "@/db/schema";

function getAddressLine(address: {
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
}): string | null {
  const streetAndNumber = [
    address.street,
    address.exteriorNumber,
    address.interiorNumber ? `Int. ${address.interiorNumber}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    [streetAndNumber, address.neighborhood].filter(Boolean).join(", ") || null
  );
}

export async function syncBranchInventoryLocations(
  tenantId: string,
): Promise<void> {
  const branches = await db
    .select({
      id: tenantBranches.id,
      name: tenantBranches.name,
      active: tenantBranches.active,
      address: tenantBranches.address,
    })
    .from(tenantBranches)
    .where(eq(tenantBranches.tenantId, tenantId));

  if (branches.length === 0) {
    return;
  }

  const now = new Date();

  for (const branch of branches) {
    const address = branch.address ?? {};

    await db
      .insert(inventoryLocations)
      .values({
        tenantId,
        branchId: branch.id,
        name: branch.name,
        code: null,
        type: "Sucursal",
        source: "branch",
        active: branch.active,
        isDefault: false,
        addressLine: getAddressLine(address),
        city: address.city ?? null,
        state: address.state ?? null,
        postalCode: address.postalCode ?? null,
        country: address.country ?? "MX",
        metadata: {
          managedBy: "tenant_branch",
        },
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [inventoryLocations.tenantId, inventoryLocations.branchId],
        targetWhere: eq(inventoryLocations.source, "branch"),
        set: {
          name: branch.name,
          type: "Sucursal",
          active: branch.active,
          addressLine: getAddressLine(address),
          city: address.city ?? null,
          state: address.state ?? null,
          postalCode: address.postalCode ?? null,
          country: address.country ?? "MX",
          updatedAt: now,
        },
      });
  }
}
