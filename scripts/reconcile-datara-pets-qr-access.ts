import { config } from "dotenv";
import { sql } from "drizzle-orm";

async function main() {
  config({ path: ".env.development.local", override: true });
  if (process.env.DATARA_ENVIRONMENT !== "development") throw new Error("Solo desarrollo.");
  const url = process.env.DATABASE_URL;
  if (!url || new URL(url).hostname !== process.env.DATARA_EXPECTED_DATABASE_HOST) throw new Error("Host de desarrollo inconsistente.");
  const { db } = await import("../src/db");
  const organizationId = "org_3IjVLioFfSkbdwRBB2HjVHGLkMG";
  const result = await db.execute<{ tenantId: string; tenantName: string; source: string; expiresAt: string | null }>(sql`
    SELECT tenant.id AS "tenantId", tenant.name AS "tenantName", entitlement.source,
      entitlement.expires_at AS "expiresAt"
    FROM tenants tenant
    JOIN tenant_module_entitlements entitlement ON entitlement.tenant_id = tenant.id
    WHERE tenant.clerk_organization_id = ${organizationId} AND tenant.industry = 'veterinary'
      AND entitlement.product = 'crm' AND entitlement.module_id IN ('pet-veterinary', 'pet-grooming', 'pet-stays', 'pet-store')
      AND entitlement.enabled = true AND entitlement.source IN ('trial', 'subscription')
      AND (entitlement.expires_at IS NULL OR entitlement.expires_at > NOW())
    ORDER BY entitlement.expires_at DESC NULLS FIRST LIMIT 1
  `);
  console.table(result.rows);
  if (result.rows.length !== 1) throw new Error("No existe una contratación Pets activa para esta organización. No se modificó nada.");
  if (!process.argv.includes("--apply")) return;
  const candidate = result.rows[0];
  await db.execute(sql`
    INSERT INTO tenant_module_entitlements
      (tenant_id, product, module_id, enabled, source, granted_at, expires_at, configuration)
    VALUES (${candidate.tenantId}, 'crm', 'qr-codes', true, ${candidate.source}, NOW(),
      ${candidate.expiresAt}::timestamptz, '{"dependencyOf":"pets","repair":"restore-qr"}'::jsonb)
    ON CONFLICT (tenant_id, product, module_id) DO UPDATE
    SET enabled = true, source = EXCLUDED.source, expires_at = EXCLUDED.expires_at,
      configuration = EXCLUDED.configuration
    WHERE tenant_module_entitlements.source IN ('trial', 'subscription')
  `);
  const { requireCRMModulePermission } = await import("../src/lib/crm/permissions");
  const members = await db.execute<{ userId: string }>(sql`
    SELECT clerk_user_id AS "userId" FROM tenant_members WHERE tenant_id = ${candidate.tenantId} AND status = 'active'
  `);
  let authorized = 0;
  for (const member of members.rows) {
    try {
      await requireCRMModulePermission(candidate.tenantId, member.userId, "qr-codes", "create");
      await requireCRMModulePermission(candidate.tenantId, member.userId, "qr-codes", "view");
      authorized += 1;
    } catch (error) {
      console.error("Miembro sin autorización QR:", member.userId, error instanceof Error ? error.message : error);
    }
  }
  if (!authorized) throw new Error("El entitlement se revisó pero ningún miembro puede generar QR; falta resolver el rol.");
  console.log(`Miembros autorizados para generar y ver QR: ${authorized}`);
  console.log("DATARA_PETS_QR_ACCESS_VERIFIED=1");
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
