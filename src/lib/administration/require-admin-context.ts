import { auth } from "@clerk/nextjs/server";
import {
    and,
    eq,
} from "drizzle-orm";

import { db } from "@/db";
import {
    roles,
    tenantMembers,
    tenants,
} from "@/db/schema";

export class AdministrationAuthError
    extends Error {
    status: number;

    constructor(
        message: string,
        status: number,
    ) {
        super(message);
        this.status = status;
    }
}

export async function requireAdminContext() {
    const {
        userId,
        orgId,
    } = await auth();

    if (!userId) {
        throw new AdministrationAuthError(
            "No autenticado.",
            401,
        );
    }

    if (!orgId) {
        throw new AdministrationAuthError(
            "No hay una organización activa.",
            400,
        );
    }

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
        throw new AdministrationAuthError(
            "La empresa aún no está sincronizada.",
            404,
        );
    }

    const [member] = await db
        .select({
            id: tenantMembers.id,
            roleKey: roles.key,
            roleProduct: roles.product,
        })
        .from(tenantMembers)
        .leftJoin(
            roles,
            and(
                eq(
                    tenantMembers.roleId,
                    roles.id,
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
                    tenantMembers.clerkUserId,
                    userId,
                ),
                eq(
                    tenantMembers.status,
                    "active",
                ),
            ),
        )
        .limit(1);

    if (!member) {
        throw new AdministrationAuthError(
            "Tu usuario no pertenece a la organización activa.",
            403,
        );
    }

      if (
        (
        member.roleKey !== "owner" &&
        member.roleKey !== "admin"
        ) ||
        member.roleProduct !== null
    ) {
        throw new AdministrationAuthError(
            "No tienes permisos para administrar la organización.",
            403,
        );
    }

    return {
        tenantId: tenant.id,
        memberId: member.id,
        clerkUserId: userId,
        roleKey:
            member.roleKey,
    };
}