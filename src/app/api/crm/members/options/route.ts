import { auth } from "@clerk/nextjs/server";
import {
  and,
  asc,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  memberProductRoles,
  roles,
  tenantMembers,
  tenants,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
) {
  const url =
    new URL(request.url);

  const roleKey =
    url.searchParams
      .get("roleKey")
      ?.trim()
      .toLowerCase() ??
    null;
  const {
    userId,
    orgId,
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
          "No hay una organización activa.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const [tenant] = await db
      .select({
        id: tenants.id,
      })
      .from(tenants)
      .where(
        eq(
          tenants.clerkOrganizationId,
          orgId,
        ),
      )
      .limit(1);

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La empresa aún no está sincronizada.",
        },
        {
          status: 404,
        },
      );
    }

    const members = await db
      .select({
        clerkUserId:
          tenantMembers.clerkUserId,

        firstName:
          tenantMembers.firstName,

        lastName:
          tenantMembers.lastName,

        email:
          tenantMembers.email,

        roleKey:
          roles.key,

        roleName:
          roles.name,
      })
      .from(tenantMembers)
      .leftJoin(
        memberProductRoles,
        and(
          eq(
            memberProductRoles
              .tenantId,
            tenant.id,
          ),
          eq(
            memberProductRoles
              .memberId,
            tenantMembers.id,
          ),
          eq(
            memberProductRoles
              .product,
            "crm",
          ),
          eq(
            memberProductRoles
              .enabled,
            true,
          ),
        ),
      )
      .leftJoin(
        roles,
        and(
          eq(
            roles.id,
            memberProductRoles
              .roleId,
          ),
          eq(
            roles.tenantId,
            tenant.id,
          ),
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
          roleKey
            ? eq(
                roles.key,
                roleKey,
              )
            : undefined,
        ),
      )
      .orderBy(
        asc(
          tenantMembers
            .firstName,
        ),
        asc(
          tenantMembers
            .lastName,
        ),
        asc(
          tenantMembers.email,
        ),
      );

    const data = members.map(
      (member) => {
        const fullName = [
          member.firstName,
          member.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        const name =
          fullName || member.email;

        return {
          value:
            member.clerkUserId,
          label:
            fullName
              ? `${fullName} (${member.email})`
              : member.email,
          name,
          email:
            member.email,

          roleKey:
            member.roleKey,

          roleName:
            member.roleName,
        };
      },
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "No fue posible cargar los miembros de la empresa:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "No fue posible cargar la lista de responsables.",
      },
      {
        status: 500,
      },
    );
  }
}
