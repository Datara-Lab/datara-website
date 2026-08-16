import {
  clerkClient,
  currentUser,
} from "@clerk/nextjs/server";
import { createHash } from "crypto";
import {
  and,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  memberProductRoles,
  tenantMembers,
  tenants,
  workspaceInvitations,
} from "@/db/schema";

export const dynamic = "force-dynamic";

type AcceptInvitationRequest = {
  token: string;
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

  console.error(
    "No fue posible aceptar la invitación:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible completar la invitación.",
    },
    {
      status: 500,
    },
  );
}

function normalizeEmail(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

export async function POST(
  request: Request,
) {
  try {
    const user =
      await currentUser();

    if (!user) {
      throw new ApiError(
        "Debes iniciar sesión antes de aceptar la invitación.",
        401,
      );
    }

    const payload =
      (await request.json()) as AcceptInvitationRequest;

    if (
      typeof payload.token !==
        "string" ||
      !payload.token.trim()
    ) {
      throw new ApiError(
        "El enlace de invitación no es válido.",
        400,
      );
    }

    const tokenHash =
      createHash("sha256")
        .update(
          payload.token.trim(),
        )
        .digest("hex");

    const [invitation] = await db
      .select({
        id:
          workspaceInvitations.id,

        tenantId:
          workspaceInvitations.tenantId,

        email:
          workspaceInvitations.email,

        firstName:
          workspaceInvitations.firstName,

        lastName:
          workspaceInvitations.lastName,

        globalRoleId:
          workspaceInvitations.globalRoleId,

        productAssignments:
          workspaceInvitations.productAssignments,

        status:
          workspaceInvitations.status,

        expiresAt:
          workspaceInvitations.expiresAt,

        clerkOrganizationId:
          tenants.clerkOrganizationId,
      })
      .from(workspaceInvitations)
      .innerJoin(
        tenants,
        eq(
          workspaceInvitations.tenantId,
          tenants.id,
        ),
      )
      .where(
        eq(
          workspaceInvitations.tokenHash,
          tokenHash,
        ),
      )
      .limit(1);

    if (!invitation) {
      throw new ApiError(
        "No se encontró la invitación.",
        404,
      );
    }

    if (
      invitation.status !==
      "pending"
    ) {
      throw new ApiError(
        "Esta invitación ya no está disponible.",
        410,
      );
    }

    if (
      invitation.expiresAt &&
      invitation.expiresAt.getTime() <
        Date.now()
    ) {
      throw new ApiError(
        "La invitación ha expirado.",
        410,
      );
    }

    const userEmails =
      user.emailAddresses.map(
        (emailAddress) =>
          normalizeEmail(
            emailAddress.emailAddress,
          ),
      );

    const invitationEmail =
      normalizeEmail(
        invitation.email,
      );

    if (
      !userEmails.includes(
        invitationEmail,
      )
    ) {
      throw new ApiError(
        "La cuenta iniciada no corresponde al correo invitado.",
        403,
      );
    }

    const clerk =
      await clerkClient();

    await clerk.organizations
      .createOrganizationMembership({
        organizationId:
          invitation.clerkOrganizationId,

        userId: user.id,

        role: "org:member",
      });

    const now = new Date();

    const [member] = await db
      .insert(tenantMembers)
      .values({
        tenantId:
          invitation.tenantId,

        clerkUserId:
          user.id,

        roleId:
          invitation.globalRoleId,

        email:
          invitationEmail,

        firstName:
          invitation.firstName ??
          user.firstName ??
          null,

        lastName:
          invitation.lastName ??
          user.lastName ??
          null,

        status: "active",

        joinedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          tenantMembers.tenantId,
          tenantMembers.clerkUserId,
        ],
        set: {
          roleId:
            invitation.globalRoleId,

          email:
            invitationEmail,

          firstName:
            invitation.firstName ??
            user.firstName ??
            null,

          lastName:
            invitation.lastName ??
            user.lastName ??
            null,

          status: "active",
          updatedAt: now,
        },
      })
      .returning({
        id: tenantMembers.id,
      });

    if (!member) {
      throw new ApiError(
        "No fue posible crear el miembro del Workspace.",
        500,
      );
    }

    for (
      const assignment of
      invitation.productAssignments
    ) {
      await db
        .insert(
          memberProductRoles,
        )
        .values({
          tenantId:
            invitation.tenantId,

          memberId:
            member.id,

          product:
            assignment.product,

          roleId:
            assignment.roleId,

          enabled: true,
        })
        .onConflictDoUpdate({
          target: [
            memberProductRoles.memberId,
            memberProductRoles.product,
          ],
          set: {
            roleId:
              assignment.roleId,

            enabled: true,
            updatedAt: now,
          },
        });
    }

    await db
      .update(
        workspaceInvitations,
      )
      .set({
        status: "accepted",

        acceptedByMemberId:
          member.id,

        acceptedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(
            workspaceInvitations.id,
            invitation.id,
          ),
          eq(
            workspaceInvitations.status,
            "pending",
          ),
        ),
      );

    return NextResponse.json({
      success: true,

      message:
        "La invitación fue aceptada correctamente.",

      data: {
        memberId: member.id,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}