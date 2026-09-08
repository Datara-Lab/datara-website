import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { permissionModules } from "../src/lib/administration/permission-modules";
import {
  getCRMModuleEntitlements,
  hasCRMModuleEntitlement,
} from "../src/lib/crm/module-entitlements";

async function main() {
  const availableModuleIds = permissionModules
    .filter((module) => module.product === "crm")
    .map((module) => module.id);

  const tenants = await db.execute<{
    id: string;
    name: string;
  }>(sql`
    SELECT id, name
    FROM tenants
    WHERE name IN ('Datara Lab Desarrollo', 'Demo Motos Desarrollo')
    ORDER BY name
  `);

  const report = [];

  for (const tenant of tenants.rows) {
    const entitlements = await getCRMModuleEntitlements(tenant.id);
    const invoiceControlRecognized = await hasCRMModuleEntitlement(
      tenant.id,
      "invoice-control",
      availableModuleIds,
    );
    const rawEntitlements = await db.execute<{
      product: string;
      moduleId: string;
      enabled: boolean;
      source: string;
      expiresAt: Date | null;
    }>(sql`
      SELECT
        product,
        module_id AS "moduleId",
        enabled,
        source,
        expires_at AS "expiresAt"
      FROM tenant_module_entitlements
      WHERE tenant_id = ${tenant.id}
      ORDER BY product, module_id
    `);
    const dealStages = await db.execute<{
      stage: string | null;
      count: number;
    }>(sql`
      SELECT stage, COUNT(*)::integer AS count
      FROM crm_deals
      WHERE tenant_id = ${tenant.id}
      GROUP BY stage
      ORDER BY stage NULLS FIRST
    `);

    report.push({
      tenant,
      invoiceControlInPermissionCatalog:
        availableModuleIds.includes("invoice-control"),
      invoiceControlRecognized,
      resolvedEntitlements: entitlements,
      rawEntitlements: rawEntitlements.rows,
      dealStages: dealStages.rows,
    });
  }

  console.dir(report, { depth: null });
  console.log("DATARA_P0_VISIBILITY_AUDITED=1");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
