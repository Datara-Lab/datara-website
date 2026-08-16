import {
  auth,
  clerkClient,
} from "@clerk/nextjs/server";
import {
  and,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  memberProductRoles,
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
    tenantName: tenant.name,
    memberId,
    clerkOrganizationId:
      tenant.clerkOrganizationId,
    inviterUserId: clerkUserId,
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
            id: roles.id,
            product: roles.product,
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

    const invitationToken =
      randomBytes(32).toString("hex");

    const invitationTokenHash =
    createHash("sha256")
      .update(invitationToken)
      .digest("hex");

    const [removedMember] = await db
      .select({
        id: tenantMembers.id,
        clerkUserId:
          tenantMembers.clerkUserId,
      })
      .from(tenantMembers)
      .where(
        and(
          eq(
            tenantMembers.tenantId,
            context.tenantId,
          ),
          eq(
            tenantMembers.email,
            email,
          ),
          eq(
            tenantMembers.status,
            "removed",
          ),
        ),
      )
      .limit(1);

    const clerk =
      await clerkClient();

    if (removedMember) {
      const now = new Date();

      try {
        await clerk.organizations
          .createOrganizationMembership({
            organizationId:
              context.clerkOrganizationId,
            userId:
              removedMember.clerkUserId,
            role: "org:member",
          });
      } catch (membershipError) {
        console.warn(
          "La membresía de Clerk ya existía o no fue necesario recrearla:",
          membershipError,
        );
      }

      await db
        .delete(memberProductRoles)
        .where(
          and(
            eq(
              memberProductRoles.tenantId,
              context.tenantId,
            ),
            eq(
              memberProductRoles.memberId,
              removedMember.id,
            ),
          ),
        );

      if (
        normalizedProducts.length > 0
      ) {
        await db
          .insert(memberProductRoles)
          .values(
            normalizedProducts.map(
              (assignment) => ({
                tenantId:
                  context.tenantId,
                memberId:
                  removedMember.id,
                product:
                  assignment.product,
                roleId:
                  assignment.roleId,
                enabled: true,
                updatedAt: now,
              }),
            ),
          );
      }

      await db
        .update(tenantMembers)
        .set({
          roleId:
            payload.globalRoleId,
          email,
          firstName,
          lastName,
          status: "active",
          updatedAt: now,
        })
        .where(
          and(
            eq(
              tenantMembers.tenantId,
              context.tenantId,
            ),
            eq(
              tenantMembers.id,
              removedMember.id,
            ),
          ),
        );

      await db
        .update(workspaceInvitations)
        .set({
          status: "accepted",
          acceptedByMemberId:
            removedMember.id,
          acceptedAt: now,
          revokedAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(
              workspaceInvitations.tenantId,
              context.tenantId,
            ),
            eq(
              workspaceInvitations.email,
              email,
            ),
          ),
        );

      return NextResponse.json({
        success: true,
        message:
          "El usuario fue reactivado correctamente.",
        data: {
          memberId:
            removedMember.id,
          reactivated: true,
          developmentLink: null,
        },
      });
    }

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