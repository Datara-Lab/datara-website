import {
  auth,
  clerkClient,
  currentUser,
} from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  roles,
  tenantMembers,
  tenantProducts,
  tenants,
} from "@/db/schema";

const supportedProducts = [
  "crm",
  "analytics",
  "cloud",
] as const;

type ProductKey =
  (typeof supportedProducts)[number];

const defaultRoles = [
  {
    key: "owner",
    name: "Propietario",
    description:
      "Control total de la organización.",
  },
  {
    key: "admin",
    name: "Administrador",
    description:
      "Administra usuarios, permisos y configuración.",
  },
  {
    key: "manager",
    name: "Gerente",
    description:
      "Supervisa la operación y los equipos.",
  },
  {
    key: "user",
    name: "Usuario",
    description:
      "Acceso operativo según sus permisos.",
  },
] as const;

function getProducts(
  metadata: unknown,
): ProductKey[] {
  if (
    typeof metadata !== "object" ||
    metadata === null
  ) {
    return [];
  }

  const products = (
    metadata as {
      products?: unknown;
    }
  ).products;

  if (!Array.isArray(products)) {
    return [];
  }

  return products.filter(
    (product): product is ProductKey =>
      typeof product === "string" &&
      supportedProducts.includes(
        product as ProductKey,
      ),
  );
}

function getLocalRoleKey(
  clerkRole?: string | null,
) {
  switch (clerkRole) {
    case "org:admin":
      return "admin";

    case "org:manager":
      return "manager";

    default:
      return "user";
  }
}

export async function POST() {
  const {
    userId,
    orgId,
    orgRole,
  } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "No autenticado.",
      },
      {
        status: 401,
      },
    );
  }

  if (!orgId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Selecciona una organización antes de continuar.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const user = await currentUser();
    const clerk = await clerkClient();

    const organization =
      await clerk.organizations.getOrganization({
        organizationId: orgId,
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No fue posible consultar el usuario.",
        },
        {
          status: 404,
        },
      );
    }

    const now = new Date();
    const organizationProducts =
      getProducts(
        organization.publicMetadata,
      );

    const [tenant] = await db
      .insert(tenants)
      .values({
        clerkOrganizationId:
          organization.id,
        slug:
          organization.slug ??
          organization.id,
        name: organization.name,
        status: "provisioning",
        metadata: {
          clerkPublicMetadata:
            organization.publicMetadata,
        },
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target:
          tenants.clerkOrganizationId,
        set: {
          slug:
            organization.slug ??
            organization.id,
          name: organization.name,
          metadata: {
            clerkPublicMetadata:
              organization.publicMetadata,
          },
          updatedAt: now,
        },
      })
      .returning();

    if (!tenant) {
      throw new Error(
        "No fue posible registrar la empresa.",
      );
    }

    await db
      .insert(roles)
      .values(
        defaultRoles.map((role) => ({
          tenantId: tenant.id,
          key: role.key,
          name: role.name,
          description:
            role.description,
          isSystem: true,
          updatedAt: now,
        })),
      )
      .onConflictDoNothing({
        target: [
          roles.tenantId,
          roles.key,
        ],
      });

    const tenantRoles = await db
      .select()
      .from(roles)
      .where(
        eq(
          roles.tenantId,
          tenant.id,
        ),
      );

    const localRoleKey =
      getLocalRoleKey(orgRole);

    const assignedRole =
      tenantRoles.find(
        (role) =>
          role.key === localRoleKey,
      ) ??
      tenantRoles.find(
        (role) =>
          role.key === "user",
      );

    const primaryEmail =
      user.emailAddresses.find(
        (email) =>
          email.id ===
          user.primaryEmailAddressId,
      ) ??
      user.emailAddresses[0];

    if (!primaryEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El usuario no tiene un correo electrónico.",
        },
        {
          status: 400,
        },
      );
    }

    await db
      .insert(tenantMembers)
      .values({
        tenantId: tenant.id,
        clerkUserId: user.id,
        roleId:
          assignedRole?.id ?? null,
        email:
          primaryEmail.emailAddress,
        firstName:
          user.firstName ?? null,
        lastName:
          user.lastName ?? null,
        status: "active",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          tenantMembers.tenantId,
          tenantMembers.clerkUserId,
        ],
        set: {
          roleId:
            assignedRole?.id ?? null,
          email:
            primaryEmail.emailAddress,
          firstName:
            user.firstName ?? null,
          lastName:
            user.lastName ?? null,
          status: "active",
          updatedAt: now,
        },
      });

    await db
      .update(tenantProducts)
      .set({
        enabled: false,
        disabledAt: now,
      })
      .where(
        eq(
          tenantProducts.tenantId,
          tenant.id,
        ),
      );

    if (
      organizationProducts.length > 0
    ) {
      await db
        .insert(tenantProducts)
        .values(
          organizationProducts.map(
            (product) => ({
              tenantId: tenant.id,
              product,
              enabled: true,
              enabledAt: now,
              disabledAt: null,
              configuration: {},
            }),
          ),
        )
        .onConflictDoUpdate({
          target: [
            tenantProducts.tenantId,
            tenantProducts.product,
          ],
          set: {
            enabled: true,
            enabledAt: now,
            disabledAt: null,
          },
        });
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        clerkOrganizationId:
          tenant.clerkOrganizationId,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
      },
      member: {
        clerkUserId: user.id,
        role: assignedRole?.key ?? null,
      },
      products:
        organizationProducts,
    });
  } catch (error) {
    console.error(
      "Error al sincronizar la organización:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "No fue posible sincronizar la organización.",
      },
      {
        status: 500,
      },
    );
  }
}
