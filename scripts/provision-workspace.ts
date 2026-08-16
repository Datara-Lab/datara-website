import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import {
  and,
  eq,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import {
  memberProductRoles,
  roles,
  tenantMembers,
  tenantProducts,
  tenants,
} from "../src/db/schema";

config({
  path: ".env.local",
  override: true,
});

type Product =
  | "crm"
  | "analytics"
  | "cloud";

type RoleDefinition = {
  key: string;
  name: string;
  description: string;
};

const productRoles: Record<
  Product,
  RoleDefinition[]
> = {
  crm: [
    {
      key: "crm_admin",
      name: "Administrador CRM",
      description:
        "Administra todos los módulos y configuraciones de Datara CRM.",
    },
    {
      key: "crm_manager",
      name: "Gerente comercial",
      description:
        "Supervisa equipos, oportunidades, cotizaciones y resultados comerciales.",
    },
    {
      key: "crm_sales",
      name: "Vendedor",
      description:
        "Administra prospectos, clientes, oportunidades y actividades asignadas.",
    },
    {
      key: "crm_marketing",
      name: "Marketing",
      description:
        "Administra campañas, promociones y generación de prospectos.",
    },
    {
      key: "crm_readonly",
      name: "Solo lectura CRM",
      description:
        "Puede consultar información del CRM sin modificarla.",
    },
  ],

  analytics: [
    {
      key: "analytics_admin",
      name: "Administrador Analytics",
      description:
        "Administra dashboards, fuentes de datos y configuraciones de Analytics.",
    },
    {
      key: "analytics_analyst",
      name: "Analista",
      description:
        "Crea análisis, reportes, indicadores y dashboards.",
    },
    {
      key: "analytics_executive",
      name: "Ejecutivo",
      description:
        "Consulta dashboards e indicadores ejecutivos.",
    },
    {
      key: "analytics_readonly",
      name: "Solo lectura Analytics",
      description:
        "Puede consultar reportes sin modificarlos.",
    },
  ],

  cloud: [
    {
      key: "cloud_admin",
      name: "Administrador Cloud",
      description:
        "Consulta el monitoreo, rendimiento, disponibilidad, respaldos y estado general de los servicios Cloud contratados.",
    },
    {
      key: "cloud_monitor",
      name: "Monitoreo Cloud",
      description:
        "Consulta disponibilidad, respaldos, métricas y estado de servicios.",
    },
  ],
};

function getDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "La variable DATABASE_URL no está configurada.",
    );
  }

  return databaseUrl;
}

function getTenantName(): string {
  const tenantName =
    process.argv.slice(2).join(" ").trim();

  if (!tenantName) {
    throw new Error(
      'Indica el nombre del Workspace. Ejemplo: npx tsx scripts/provision-workspace.ts "Datara Lab"',
    );
  }

  return tenantName;
}

async function provisionWorkspace() {
  const databaseUrl =
    getDatabaseUrl();

  const tenantName =
    getTenantName();

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log(
    `Buscando Workspace: ${tenantName}`,
  );

  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
    })
    .from(tenants)
    .where(
      eq(
        tenants.name,
        tenantName,
      ),
    )
    .limit(1);

  if (!tenant) {
    throw new Error(
      `No se encontró el Workspace "${tenantName}".`,
    );
  }

  const enabledProducts =
    await db
      .select({
        product:
          tenantProducts.product,
      })
      .from(tenantProducts)
      .where(
        and(
          eq(
            tenantProducts.tenantId,
            tenant.id,
          ),
          eq(
            tenantProducts.enabled,
            true,
          ),
        ),
      );

  if (enabledProducts.length === 0) {
    throw new Error(
      "El Workspace no tiene productos habilitados.",
    );
  }

  console.log(
    `Productos habilitados: ${enabledProducts
      .map((item) => item.product)
      .join(", ")}`,
  );

  const createdRoles =
    new Map<
      Product,
      string
    >();

  for (const item of enabledProducts) {
    const product =
      item.product as Product;

    const definitions =
      productRoles[product];

    if (!definitions) {
      console.log(
        `Sin roles predefinidos para: ${product}`,
      );
      continue;
    }

    for (const definition of definitions) {
      const [existingRole] =
        await db
          .select({
            id: roles.id,
          })
          .from(roles)
          .where(
            and(
              eq(
                roles.tenantId,
                tenant.id,
              ),
              eq(
                roles.key,
                definition.key,
              ),
            ),
          )
          .limit(1);

      let roleId =
        existingRole?.id;

      if (!roleId) {
        const [createdRole] =
          await db
            .insert(roles)
            .values({
              tenantId:
                tenant.id,
              key:
                definition.key,
              name:
                definition.name,
              description:
                definition.description,
              product,
              isSystem: true,
            })
            .returning({
              id: roles.id,
            });

        roleId =
          createdRole.id;

        console.log(
          `Rol creado: ${definition.name}`,
        );
      } else {
        await db
          .update(roles)
          .set({
            name:
              definition.name,
            description:
              definition.description,
            product,
            isSystem: true,
            updatedAt:
              new Date(),
          })
          .where(
            eq(
              roles.id,
              roleId,
            ),
          );

        console.log(
          `Rol actualizado: ${definition.name}`,
        );
      }

      if (
        definition.key ===
        `${product}_admin`
      ) {
        createdRoles.set(
          product,
          roleId,
        );
      }
    }
  }

  const administrators =
    await db
      .select({
        memberId:
          tenantMembers.id,
        name:
          tenantMembers.firstName,
        email:
          tenantMembers.email,
      })
      .from(tenantMembers)
      .innerJoin(
        roles,
        eq(
          tenantMembers.roleId,
          roles.id,
        ),
      )
      .where(
        and(
          eq(
            tenantMembers.tenantId,
            tenant.id,
          ),
          eq(
            tenantMembers.status,
            "active",
          ),
          eq(
            roles.key,
            "admin",
          ),
        ),
      );

  for (const administrator of administrators) {
    for (const [
      product,
      roleId,
    ] of createdRoles) {
      await db
        .insert(
          memberProductRoles,
        )
        .values({
          tenantId:
            tenant.id,
          memberId:
            administrator.memberId,
          product,
          roleId,
          enabled: true,
        })
        .onConflictDoUpdate({
          target: [
            memberProductRoles.memberId,
            memberProductRoles.product,
          ],
          set: {
            roleId,
            enabled: true,
            updatedAt:
              new Date(),
          },
        });

      console.log(
        `Acceso ${product} asignado a ${administrator.name ?? administrator.email}`,
      );
    }
  }

  console.log(
    `Workspace "${tenant.name}" provisionado correctamente.`,
  );
}

provisionWorkspace().catch(
  (error: unknown) => {
    console.error(
      "No fue posible provisionar el Workspace.",
    );

    console.error(error);
    process.exit(1);
  },
);