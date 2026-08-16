import { auth } from "@clerk/nextjs/server";
import {
  and,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  roles,
  tenantMembers,
  tenants,
  workspaceInvitations,
} from "@/db/schema";

import {
  AdministrationAuthError,
  requireAdminContext,
} from "@/lib/administration/require-admin-context";

export const dynamic = "force-dynamic";

type Product =
  | "crm"
  | "analytics"
  | "cloud";

type InvitationStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

const productNames: Record<
  Product,
  string
> = {
  crm: "Datara CRM",
  analytics: "Datara Analytics",
  cloud: "Datara Cloud",
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
  } = await requireAdminContext();

  const [tenant] = await db
    .select({
      name: tenants.name,
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
  };
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
    "No fue posible cargar las invitaciones:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible cargar las invitaciones.",
    },
    {
      status: 500,
    },
  );
}

function resolveInvitationStatus(
  status: InvitationStatus,
  expiresAt: Date | null,
): InvitationStatus {
  if (
    status === "pending" &&
    expiresAt &&
    expiresAt.getTime() < Date.now()
  ) {
    return "expired";
  }

  return status;
}

export async function GET() {
  try {
    const {
      tenantId,
      tenantName,
    } = await getAdministratorContext();

    const invitations = await db
      .select({
        id: workspaceInvitations.id,
        email: workspaceInvitations.email,
        firstName:
          workspaceInvitations.firstName,
        lastName:
          workspaceInvitations.lastName,
        globalRoleId:
          workspaceInvitations.globalRoleId,
        productAssignments:
          workspaceInvitations.productAssignments,
        message:
          workspaceInvitations.message,
        status:
          workspaceInvitations.status,
        invitedByMemberId:
          workspaceInvitations.invitedByMemberId,
        acceptedByMemberId:
          workspaceInvitations.acceptedByMemberId,
        expiresAt:
          workspaceInvitations.expiresAt,
        acceptedAt:
          workspaceInvitations.acceptedAt,
        revokedAt:
          workspaceInvitations.revokedAt,
        createdAt:
          workspaceInvitations.createdAt,
        updatedAt:
          workspaceInvitations.updatedAt,
      })
      .from(workspaceInvitations)
      .where(
        eq(
          workspaceInvitations.tenantId,
          tenantId,
        ),
      )
      .orderBy(
        desc(
          workspaceInvitations.createdAt,
        ),
      );

    const inviterIds = Array.from(
      new Set(
        invitations.map(
          (invitation) =>
            invitation.invitedByMemberId,
        ),
      ),
    );

    const inviters =
      inviterIds.length > 0
        ? await db
            .select({
              id: tenantMembers.id,
              firstName:
                tenantMembers.firstName,
              lastName:
                tenantMembers.lastName,
              email:
                tenantMembers.email,
            })
            .from(tenantMembers)
            .where(
              and(
                eq(
                  tenantMembers.tenantId,
                  tenantId,
                ),
                inArray(
                  tenantMembers.id,
                  inviterIds,
                ),
              ),
            )
        : [];

    const roleIds = Array.from(
      new Set(
        invitations.flatMap(
          (invitation) => [
            ...(invitation.globalRoleId
              ? [
                  invitation.globalRoleId,
                ]
              : []),

            ...invitation.productAssignments.map(
              (assignment) =>
                assignment.roleId,
            ),
          ],
        ),
      ),
    );

    const availableRoles =
      roleIds.length > 0
        ? await db
            .select({
              id: roles.id,
              key: roles.key,
              name: roles.name,
              product: roles.product,
            })
            .from(roles)
            .where(
              and(
                eq(
                  roles.tenantId,
                  tenantId,
                ),
                inArray(
                  roles.id,
                  roleIds,
                ),
              ),
            )
        : [];

    const inviterById = new Map(
      inviters.map(
        (inviter) => [
          inviter.id,
          inviter,
        ],
      ),
    );

    const roleById = new Map(
      availableRoles.map(
        (role) => [
          role.id,
          role,
        ],
      ),
    );

    const items = invitations.map(
      (invitation) => {
        const fullName = [
          invitation.firstName,
          invitation.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        const inviter =
          inviterById.get(
            invitation.invitedByMemberId,
          );

        const inviterName = inviter
          ? [
              inviter.firstName,
              inviter.lastName,
            ]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            inviter.email
          : "Usuario no disponible";

        const resolvedStatus =
          resolveInvitationStatus(
            invitation.status,
            invitation.expiresAt,
          );

        const globalRole =
          invitation.globalRoleId
            ? roleById.get(
                invitation.globalRoleId,
              )
            : null;

        const products =
          invitation.productAssignments.map(
            (assignment) => {
              const role =
                roleById.get(
                  assignment.roleId,
                );

              return {
                product:
                  assignment.product,
                productName:
                  productNames[
                    assignment.product
                  ],
                roleId:
                  assignment.roleId,
                roleKey:
                  role?.key ?? null,
                roleName:
                  role?.name ??
                  "Rol no disponible",
              };
            },
          );

        return {
          id: invitation.id,
          name:
            fullName ||
            invitation.email,
          firstName:
            invitation.firstName,
          lastName:
            invitation.lastName,
          email:
            invitation.email,
          status: resolvedStatus,
          message:
            invitation.message,

          globalRole: globalRole
            ? {
                id: globalRole.id,
                key: globalRole.key,
                name: globalRole.name,
              }
            : null,

          products,

          invitedBy: {
            memberId:
              invitation.invitedByMemberId,
            name: inviterName,
            email:
              inviter?.email ?? null,
          },

          acceptedByMemberId:
            invitation.acceptedByMemberId,

          expiresAt:
            invitation.expiresAt
              ?.toISOString() ??
            null,

          acceptedAt:
            invitation.acceptedAt
              ?.toISOString() ??
            null,

          revokedAt:
            invitation.revokedAt
              ?.toISOString() ??
            null,

          createdAt:
            invitation.createdAt.toISOString(),

          updatedAt:
            invitation.updatedAt.toISOString(),
        };
      },
    );

    const summary = items.reduce(
      (current, invitation) => {
        current.total += 1;
        current[
          invitation.status
        ] += 1;

        return current;
      },
      {
        total: 0,
        pending: 0,
        accepted: 0,
        expired: 0,
        revoked: 0,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: tenantId,
          name: tenantName,
        },

        summary,
        invitations: items,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}