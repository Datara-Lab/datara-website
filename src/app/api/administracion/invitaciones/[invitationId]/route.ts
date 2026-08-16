import {
  eq,
  inArray,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  roles,
  tenants,
  workspaceInvitations,
} from "@/db/schema";

export const dynamic = "force-dynamic";

type Product =
  | "crm"
  | "analytics"
  | "cloud";

const productNames: Record<
  Product,
  string
> = {
  crm: "Datara CRM",
  analytics: "Datara Analytics",
  cloud: "Datara Cloud",
};

function createErrorResponse(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
    },
  );
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      invitationId: string;
    }>;
  },
) {
  try {
    const {
      invitationId,
    } = await context.params;

    if (!invitationId) {
      return createErrorResponse(
        "La invitación no es válida.",
        400,
      );
    }

    const [invitation] = await db
      .select({
        id: workspaceInvitations.id,
        email:
          workspaceInvitations.email,
        firstName:
          workspaceInvitations.firstName,
        lastName:
          workspaceInvitations.lastName,
        status:
          workspaceInvitations.status,
        message:
          workspaceInvitations.message,
        expiresAt:
          workspaceInvitations.expiresAt,
        productAssignments:
          workspaceInvitations.productAssignments,

        tenantId: tenants.id,
        tenantName: tenants.name,
        tenantTagline:
          tenants.tagline,
        primaryColor:
          tenants.primaryColor,
        secondaryColor:
          tenants.secondaryColor,
        logoObjectKey:
          tenants.logoObjectKey,
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
          workspaceInvitations.id,
          invitationId,
        ),
      )
      .limit(1);

    if (!invitation) {
      return createErrorResponse(
        "No se encontró la invitación.",
        404,
      );
    }

    if (
      invitation.status !== "pending"
    ) {
      return createErrorResponse(
        "Esta invitación ya no está disponible.",
        410,
      );
    }

    if (
      invitation.expiresAt &&
      invitation.expiresAt.getTime() <
        Date.now()
    ) {
      return createErrorResponse(
        "La invitación ha expirado.",
        410,
      );
    }

    const assignments =
      invitation.productAssignments;

    const roleIds = assignments
      .map(
        (assignment) =>
          assignment.roleId,
      )
      .filter(Boolean);

    const assignedRoles =
      roleIds.length > 0
        ? await db
            .select({
              id: roles.id,
              name: roles.name,
              key: roles.key,
              product: roles.product,
            })
            .from(roles)
            .where(
              inArray(
                roles.id,
                roleIds,
              ),
            )
        : [];

    const roleById = new Map(
      assignedRoles.map(
        (role) => [
          role.id,
          role,
        ],
      ),
    );

    const products = assignments.map(
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

    return NextResponse.json({
      success: true,
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          firstName:
            invitation.firstName,
          lastName:
            invitation.lastName,
          message:
            invitation.message,
          expiresAt:
            invitation.expiresAt,
        },

        company: {
          id: invitation.tenantId,
          name:
            invitation.tenantName,
          tagline:
            invitation.tenantTagline,
          primaryColor:
            invitation.primaryColor,
          secondaryColor:
            invitation.secondaryColor,
          hasLogo:
            Boolean(
              invitation.logoObjectKey,
            ),
        },

        products,
      },
    });
  } catch (error) {
    console.error(
      "No fue posible consultar la invitación:",
      error,
    );

    return createErrorResponse(
      "No fue posible consultar la invitación.",
      500,
    );
  }
}