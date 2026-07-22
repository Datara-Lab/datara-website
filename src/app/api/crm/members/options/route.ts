import { auth } from "@clerk/nextjs/server";
import {
  and,
  asc,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  tenantMembers,
  tenants,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
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
      })
      .from(tenantMembers)
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
        ),
      )
      .orderBy(
        asc(tenantMembers.firstName),
        asc(tenantMembers.lastName),
        asc(tenantMembers.email),
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
