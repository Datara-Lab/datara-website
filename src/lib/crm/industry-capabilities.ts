import {
  eq,
} from "drizzle-orm";

import { db } from "@/db";

import {
  tenants,
} from "@/db/schema";

export type CRMIndustryCapability =
  | "motorcycle_commercial_cycle";

const CAPABILITY_INDUSTRIES:
  Record<
    CRMIndustryCapability,
    ReadonlySet<string>
  > = {
    motorcycle_commercial_cycle:
      new Set([
        "motorcycle_dealership",
      ]),
  };

export class CRMIndustryCapabilityError
  extends Error {
  status: number;

  constructor(
    message =
      "Esta función no está habilitada para la industria de la empresa.",
  ) {
    super(message);
    this.status = 403;
  }
}

export async function requireCRMIndustryCapability(
  tenantId: string,
  capability: CRMIndustryCapability,
) {
  const [tenant] =
    await db
      .select({
        industry:
          tenants.industry,
      })
      .from(tenants)
      .where(
        eq(
          tenants.id,
          tenantId,
        ),
      )
      .limit(1);

  if (!tenant) {
    throw new CRMIndustryCapabilityError(
      "La empresa no existe.",
    );
  }

  if (
    !CAPABILITY_INDUSTRIES[
      capability
    ].has(
      tenant.industry ?? "",
    )
  ) {
    throw new CRMIndustryCapabilityError();
  }

  return {
    industry: tenant.industry,
    capability,
  };
}
