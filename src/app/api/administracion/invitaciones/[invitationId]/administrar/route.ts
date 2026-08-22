import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  tenants,
  workspaceInvitations,
} from "@/db/schema";
import {
  AdministrationAuthError,
  requireAdminContext,
} from "@/lib/administration/require-admin-context";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    invitationId: string;
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

async function getInvitationContext(
  routeContext: RouteContext,
) {
  const { invitationId } =
    await routeContext.params;
  const admin =
    await requireAdminContext();

  const [invitation] = await db
    .select({
      id: workspaceInvitations.id,
      status:
        workspaceInvitations.status,
      clerkInvitationId:
        workspaceInvitations.clerkOrganizationInvitationId,
      clerkOrganizationId:
        tenants.clerkOrganizationId,
    })
    .from(workspaceInvitations)
    .innerJoin(
      tenants,
      eq(
        tenants.id,
        workspaceInvitations.tenantId,
      ),
    )
    .where(
      and(
        eq(
          workspaceInvitations.id,
          invitationId,
        ),
        eq(
          workspaceInvitations.tenantId,
          admin.tenantId,
        ),
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
    !invitation.clerkInvitationId ||
    !invitation.clerkOrganizationId
  ) {
    throw new ApiError(
      "La invitación no está vinculada con Clerk.",
      409,
    );
  }

  return {
    ...admin,
    ...invitation,
  };
}

function errorResponse(error: unknown) {
  if (
    error instanceof ApiError ||
    error instanceof AdministrationAuthError
  ) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: error.status },
    );
  }

  console.error(
    "No fue posible administrar la invitación:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible administrar la invitación.",
    },
    { status: 500 },
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const invitation =
      await getInvitationContext(context);
    const clerk = await clerkClient();
    const clerkInvitation =
      await clerk.organizations.getOrganizationInvitation(
        {
          organizationId:
            invitation.clerkOrganizationId!,
          invitationId:
            invitation.clerkInvitationId!,
        },
      );

    return NextResponse.json({
      success: true,
      data: {
        url: clerkInvitation.url,
        clerkStatus:
          clerkInvitation.status ?? null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const invitation =
      await getInvitationContext(context);

    if (invitation.status !== "pending") {
      throw new ApiError(
        "Sólo se pueden revocar invitaciones pendientes.",
        409,
      );
    }

    const clerk = await clerkClient();
    await clerk.organizations
      .revokeOrganizationInvitation({
        organizationId:
          invitation.clerkOrganizationId!,
        invitationId:
          invitation.clerkInvitationId!,
        requestingUserId:
          invitation.clerkUserId,
      });

    const now = new Date();
    const [revoked] = await db
      .update(workspaceInvitations)
      .set({
        status: "revoked",
        revokedAt: now,
        tokenHash: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(
            workspaceInvitations.id,
            invitation.id,
          ),
          eq(
            workspaceInvitations.tenantId,
            invitation.tenantId,
          ),
          eq(
            workspaceInvitations.status,
            "pending",
          ),
        ),
      )
      .returning({
        id: workspaceInvitations.id,
      });

    if (!revoked) {
      throw new ApiError(
        "La invitación cambió de estado antes de completar la revocación.",
        409,
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: revoked.id,
        status: "revoked",
        revokedAt: now.toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
