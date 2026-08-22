import {
  and,
  eq,
} from "drizzle-orm";

import {
  db,
} from "../src/db";

import {
  tenantProducts,
  tenants,
} from "../src/db/schema";

import {
  provisionCRMTemplateRoles,
} from "../src/lib/crm/provision-template-roles";

import type {
  CRMIndustry,
} from "../src/types/crm-config";

function validateDatabaseHost() {
  const databaseUrl =
    process.env.DATABASE_URL;

  const expectedHost =
    process.env
      .DATARA_EXPECTED_DATABASE_HOST
      ?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL no está configurada.",
    );
  }

  if (!expectedHost) {
    throw new Error(
      "DATARA_EXPECTED_DATABASE_HOST es obligatorio.",
    );
  }

  const receivedHost =
    new URL(
      databaseUrl,
    ).hostname;

  if (
    receivedHost !==
    expectedHost
  ) {
    throw new Error(
      [
        "Backfill bloqueado.",
        `Host recibido: ${receivedHost}.`,
        `Host esperado: ${expectedHost}.`,
      ].join(" "),
    );
  }

  console.log(
    "Host de base de datos validado.",
  );
}

async function run() {
  validateDatabaseHost();

  const dryRun =
    process.argv.includes(
      "--dry-run",
    );

  const workspaces =
    await db
      .select({
        id:
          tenants.id,
        name:
          tenants.name,
        industry:
          tenants.industry,
      })
      .from(tenants)
      .innerJoin(
        tenantProducts,
        and(
          eq(
            tenantProducts.tenantId,
            tenants.id,
          ),
          eq(
            tenantProducts.product,
            "crm",
          ),
          eq(
            tenantProducts.enabled,
            true,
          ),
        ),
      );

  console.log(
    `Workspaces CRM encontrados: ${workspaces.length}`,
  );

  for (
    const workspace of
    workspaces
  ) {
    const industry =
      (
        workspace.industry ??
        "other"
      ) as CRMIndustry;

    if (dryRun) {
      console.log(
        `[DRY RUN] ${workspace.name} · ${industry}`,
      );

      continue;
    }

    await provisionCRMTemplateRoles(
      workspace.id,
      workspace.name,
      industry,
    );

    console.log(
      `Roles reparados: ${workspace.name}`,
    );
  }

  console.log(
    dryRun
      ? "Dry-run completado sin cambios."
      : "Backfill completado.",
  );
}

run().catch(
  (error: unknown) => {
    console.error(
      "No fue posible ejecutar el backfill de roles.",
    );

    console.error(error);
    process.exit(1);
  },
);
