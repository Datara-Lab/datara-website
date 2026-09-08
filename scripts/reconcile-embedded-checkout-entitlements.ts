import { config } from "dotenv";
import { sql } from "drizzle-orm";

const environment = process.argv[2];
const apply = process.argv.includes("--apply");
const confirmProduction = process.argv.includes("--confirm-production");
const environmentFiles: Record<string, string> = {
  development: ".env.development.local",
  demo: ".env.demo.local",
  production: ".env.production.local",
};
const environmentFile = environmentFiles[environment];

if (!environmentFile) {
  throw new Error("Selecciona development, demo o production.");
}
if (environment === "production" && !confirmProduction) {
  throw new Error("Producción requiere --confirm-production.");
}

config({ path: environmentFile, override: true });

if (process.env.DATARA_ENVIRONMENT !== environment) {
  throw new Error(`Ambiente inconsistente. Solicitado: ${environment}. Recibido: ${process.env.DATARA_ENVIRONMENT ?? "vacío"}.`);
}

const databaseUrl = process.env.DATABASE_URL;
const expectedHost = process.env.DATARA_EXPECTED_DATABASE_HOST;
if (!databaseUrl || !expectedHost) {
  throw new Error("DATABASE_URL y DATARA_EXPECTED_DATABASE_HOST son obligatorias.");
}
const databaseHost = new URL(databaseUrl).hostname;
if (databaseHost !== expectedHost) {
  throw new Error(`Base bloqueada. Endpoint recibido: ${databaseHost}. Permitido: ${expectedHost}.`);
}

const triggerModuleIds = [
  "sales-orders",
  "services",
  "pet-veterinary",
  "pet-grooming",
  "pet-stays",
  "pet-store",
];

async function main() {
  const { db } = await import("../src/db");
  const candidates = await db.execute<{
  tenantId: string;
  tenantName: string;
  triggerModules: string[];
  source: string;
  expiresAt: string | null;
}>(sql`
  SELECT entitlement.tenant_id AS "tenantId", tenant.name AS "tenantName",
    array_agg(DISTINCT entitlement.module_id ORDER BY entitlement.module_id) AS "triggerModules",
    CASE WHEN bool_or(entitlement.source = 'subscription') THEN 'subscription' ELSE 'trial' END AS source,
    CASE WHEN bool_or(entitlement.expires_at IS NULL) THEN NULL ELSE max(entitlement.expires_at) END AS "expiresAt"
  FROM tenant_module_entitlements entitlement
  INNER JOIN tenants tenant ON tenant.id = entitlement.tenant_id
  WHERE entitlement.product = 'crm'
    AND entitlement.module_id IN (${sql.join(triggerModuleIds.map((moduleId) => sql`${moduleId}`), sql`, `)})
    AND entitlement.enabled = true
    AND (entitlement.expires_at IS NULL OR entitlement.expires_at > NOW())
  GROUP BY entitlement.tenant_id, tenant.name
  ORDER BY tenant.name
`);

  console.table(candidates.rows);
  if (!apply) {
    console.log("DATARA_EMBEDDED_CHECKOUT_RECONCILIATION_PREVIEW=1");
    return;
  }

  const result = await db.execute<{ tenantId: string }>(sql`
  WITH candidates AS (
    SELECT entitlement.tenant_id,
      CASE WHEN bool_or(entitlement.source = 'subscription') THEN 'subscription' ELSE 'trial' END AS source,
      CASE WHEN bool_or(entitlement.expires_at IS NULL) THEN NULL ELSE max(entitlement.expires_at) END AS expires_at,
      array_agg(DISTINCT entitlement.module_id ORDER BY entitlement.module_id) AS trigger_modules
    FROM tenant_module_entitlements entitlement
    WHERE entitlement.product = 'crm'
      AND entitlement.module_id IN (${sql.join(triggerModuleIds.map((moduleId) => sql`${moduleId}`), sql`, `)})
      AND entitlement.enabled = true
      AND (entitlement.expires_at IS NULL OR entitlement.expires_at > NOW())
    GROUP BY entitlement.tenant_id
  )
  INSERT INTO tenant_module_entitlements
    (tenant_id, product, module_id, enabled, source, granted_at, expires_at, configuration)
  SELECT tenant_id, 'crm', 'embedded-checkout', true, source, NOW(), expires_at,
    jsonb_build_object('automatic', true, 'triggerModules', to_jsonb(trigger_modules))
  FROM candidates
  ON CONFLICT (tenant_id, product, module_id) DO UPDATE
    SET enabled = true,
        source = EXCLUDED.source,
        granted_at = NOW(),
        expires_at = EXCLUDED.expires_at,
        configuration = EXCLUDED.configuration
    WHERE tenant_module_entitlements.source IN ('trial', 'subscription')
  RETURNING tenant_id AS "tenantId"
`);

  console.log(`Entitlements reconciliados: ${result.rows.length}`);
  console.log("DATARA_EMBEDDED_CHECKOUT_RECONCILIATION_APPLIED=1");
}

void main().catch((error: unknown) => {
  console.error("No fue posible reconciliar el cobro integrado.");
  console.error(error);
  process.exitCode = 1;
});
