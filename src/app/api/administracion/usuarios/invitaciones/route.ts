import {
  clerkClient,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
  gt,
} from "drizzle-orm";

import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  roles,
  tenantMembers,
  tenantProducts,
  tenants,
  workspaceInvitations,
} from "@/db/schema";

import {
  createHash,
  randomBytes,
} from "crypto";

import {
  AdministrationAuthError,
  requireAdminContext,
} from "@/lib/administration/require-admin-context";

import {
  getTenantCommercialCapacity,
} from "@/lib/commercial/tenant-capacity";

export const dynamic = "force-dynamic";

type Product =
  | "crm"
  | "analytics"
  | "cloud";

type InvitationRequest = {
  email: string;
  firstName?: string;
  lastName?: string;
  globalRoleId: string | null;
  products: Array<{
    product: Product;
    roleId: string;
  }>;
};

class ApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

async function getAdministratorContext() {
  const {
    tenantId,
    memberId,
    clerkUserId,
  } = await requireAdminContext();

    const [administratorRole] =
    await db
      .select({
        key:
          roles.key,
        product:
          roles.product,
      })
      .from(
        tenantMembers,
      )
      .innerJoin(
        roles,
        and(
          eq(
            tenantMembers.roleId,
            roles.id,
          ),
          eq(
            roles.tenantId,
            tenantId,
          ),
        ),
      )
      .where(
        and(
          eq(
            tenantMembers.id,
            memberId,
          ),
          eq(
            tenantMembers.tenantId,
            tenantId,
          ),
          eq(
            tenantMembers.status,
            "active",
          ),
        ),
      )
      .limit(1);

  if (
    !administratorRole ||
    administratorRole.product !==
      null
  ) {
    throw new ApiError(
      "No fue posible validar tu rol global.",
      403,
    );
  }

  const [tenant] = await db
    .select({
      name: tenants.name,
      clerkOrganizationId:
        tenants.clerkOrganizationId,
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
    throw new ApiError(
      "La empresa aún no está sincronizada.",
      404,
    );
  }

  return {
    tenantId,
    tenantName:
      tenant.name,
    memberId,

    clerkOrganizationId:
      tenant.clerkOrganizationId,

    inviterUserId:
      clerkUserId,

    globalRoleKey:
      administratorRole.key,
  };
}

function normalizeEmail(
  value: unknown,
): string {
  if (typeof value !== "string") {
    throw new ApiError(
      "Escribe un correo válido.",
      400,
    );
  }

  const email =
    value.trim().toLowerCase();

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new ApiError(
      "Escribe un correo válido.",
      400,
    );
  }

  return email;
}

function normalizeOptionalName(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function createErrorResponse(
  error: unknown,
) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  if (
    error instanceof AdministrationAuthError
  ) {
    const authError =
      error as AdministrationAuthError;

    return NextResponse.json(
      {
        success: false,
        error: authError.message,
      },
      {
        status: authError.status,
      },
    );
  }

  console.error(
    "No fue posible invitar al usuario:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible enviar la invitación.",
    },
    {
      status: 500,
    },
  );
}

export async function POST(
  request: Request,
) {
  try {
    const context =
      await getAdministratorContext();

    const origin =
      new URL(request.url).origin;

    const payload =
      (await request.json()) as InvitationRequest;

    const email =
      normalizeEmail(payload.email);

    const firstName =
      normalizeOptionalName(
        payload.firstName,
      );

    const lastName =
      normalizeOptionalName(
        payload.lastName,
      );

    if (!Array.isArray(payload.products)) {
      throw new ApiError(
        "La configuración de productos no es válida.",
        400,
      );
    }

    if (payload.globalRoleId) {
      const [selectedGlobalRole] =
        await db
          .select({
            id: roles.id,
            key: roles.key,
            product: roles.product,
          })
          .from(roles)
          .where(
            and(
              eq(
                roles.id,
                payload.globalRoleId,
              ),
              eq(
                roles.tenantId,
                context.tenantId,
              ),
            ),
          )
          .limit(1);

      if (
        !selectedGlobalRole ||
        selectedGlobalRole.product !== null
      ) {
        throw new ApiError(
          "El rol global seleccionado no es válido.",
          400,
        );
      }
            if (
        selectedGlobalRole.key ===
          "admin_cloud" &&
        context.globalRoleKey !==
          "owner"
      ) {
        throw new ApiError(
          "Solo el propietario de Datara puede asignar el rol Admin Cloud.",
          403,
        );
      }
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
              context.tenantId,
            ),
            eq(
              tenantProducts.enabled,
              true,
            ),
          ),
        );

    const enabledProductSet =
      new Set<Product>(
        enabledProducts.map(
          (item) =>
            item.product as Product,
        ),
      );

    const normalizedProducts: Array<{
      product: Product;
      roleId: string;
    }> = [];

    for (const item of payload.products) {
      if (
        !enabledProductSet.has(
          item.product,
        )
      ) {
        throw new ApiError(
          `El producto ${item.product} no está habilitado.`,
          400,
        );
      }

      const [productRole] =
        await db
          .select({
            id:
              roles.id,
            key:
              roles.key,
            product:
              roles.product,
          })
          .from(roles)
          .where(
            and(
              eq(
                roles.id,
                item.roleId,
              ),
              eq(
                roles.tenantId,
                context.tenantId,
              ),
            ),
          )
          .limit(1);

      if (
        !productRole ||
        productRole.product !==
          item.product
      ) {
        throw new ApiError(
          `El rol seleccionado no corresponde a ${item.product}.`,
          400,
        );
      }

      normalizedProducts.push({
        product: item.product,
        roleId: item.roleId,
      });
    }

    const crmCapacity =
      await getTenantCommercialCapacity(
        context.tenantId,
        "crm",
      );

    const activeMembers =
      await db
        .select({
          id:
            tenantMembers.id,
        })
        .from(
          tenantMembers,
        )
        .where(
          and(
            eq(
              tenantMembers.tenantId,
              context.tenantId,
            ),
            eq(
              tenantMembers.status,
              "active",
            ),
          ),
        );

    const pendingInvitations =
      await db
        .select({
          id:
            workspaceInvitations.id,
        })
        .from(
          workspaceInvitations,
        )
        .where(
          and(
            eq(
              workspaceInvitations.tenantId,
              context.tenantId,
            ),
            eq(
              workspaceInvitations.status,
              "pending",
            ),
            gt(
              workspaceInvitations.expiresAt,
              new Date(),
            ),
          ),
        );

    const reservedUserSlots =
      activeMembers.length +
      pendingInvitations.length;

    if (
      crmCapacity.users > 0 &&
      reservedUserSlots >=
        crmCapacity.users
    ) {
      throw new ApiError(
        "Tu plan alcanzó el límite de usuarios. Agrega capacidad para invitar más miembros.",
        409,
      );
    }

    const invitationToken =
      randomBytes(32).toString("hex");

    const invitationTokenHash =
    createHash("sha256")
      .update(invitationToken)
      .digest("hex");

    const clerk =
      await clerkClient();

    const invitation =
      await clerk.organizations
        .createOrganizationInvitation({
          organizationId:
            context.clerkOrganizationId,

          inviterUserId:
            context.inviterUserId,

          emailAddress: email,

          role: "org:member",

          expiresInDays: 30,

          redirectUrl:
            `${origin}/aceptar-invitacion?token=${invitationToken}`,

          publicMetadata: {
            dataraInvitation: {
              tenantId:
                context.tenantId,

              tenantName:
                context.tenantName,

              firstName,
              lastName,

              globalRoleId:
                payload.globalRoleId ??
                null,

              products:
                normalizedProducts,
            },
          },
        });

    await db
  .insert(workspaceInvitations)
  .values({
    tenantId:
      context.tenantId,

    clerkOrganizationInvitationId:
      invitation.id,

    tokenHash:
      invitationTokenHash,

    email,

    firstName,
    lastName,

    globalRoleId:
      payload.globalRoleId,

    productAssignments:
      normalizedProducts,

    message: null,

    status: "pending",

    invitedByMemberId:
      context.memberId,

    acceptedByMemberId: null,

    expiresAt: new Date(
      Date.now() +
        30 *
          24 *
          60 *
          60 *
          1000,
    ),

    acceptedAt: null,
    revokedAt: null,

    updatedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: [
      workspaceInvitations.tenantId,
      workspaceInvitations.email,
    ],
    set: {
      clerkOrganizationInvitationId:
        invitation.id,

      tokenHash:
        invitationTokenHash,

      firstName,
      lastName,

      globalRoleId:
        payload.globalRoleId,

      productAssignments:
        normalizedProducts,

      message: null,

      status: "pending",

      invitedByMemberId:
        context.memberId,

      acceptedByMemberId: null,

      expiresAt: new Date(
        Date.now() +
          30 *
            24 *
            60 *
            60 *
            1000,
      ),

      acceptedAt: null,
      revokedAt: null,

      updatedAt: new Date(),
    },
  });

    return NextResponse.json({
      success: true,
      message:
        "La invitación fue creada correctamente.",

      data: {
        invitationId: invitation.id,
        developmentLink:
          process.env.NODE_ENV ===
          "development"
            ? `${new URL(request.url).origin}/aceptar-invitacion?token=${invitationToken}`
            : null,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}