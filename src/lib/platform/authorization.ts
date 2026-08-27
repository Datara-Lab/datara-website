import {
    auth,
} from "@clerk/nextjs/server";

import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    and,
    eq,
    isNull,
} from "drizzle-orm";

import { db } from "@/db";

import {
    roles,
    tenantMembers,
    tenants,
} from "@/db/schema";

type PlatformEnvironment = {
    DATARA_INTERNAL_ORGANIZATION_ID?:
    string;
};

export class PlatformAuthorizationError
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

function getInternalOrganizationId():
    string | undefined {
    const processValue =
        process.env
            .DATARA_INTERNAL_ORGANIZATION_ID;

    if (processValue) {
        return processValue;
    }

    try {
        const {
            env,
        } = getCloudflareContext();

        return (
            env as PlatformEnvironment
        ).DATARA_INTERNAL_ORGANIZATION_ID;
    } catch {
        return undefined;
    }
}

export async function requirePlatformAdministrator() {
    const {
        userId,
        orgId,
    } = await auth();

    if (!userId) {
        throw new PlatformAuthorizationError(
            "No autenticado.",
            401,
        );
    }

    if (!orgId) {
        throw new PlatformAuthorizationError(
            "Selecciona la organización Datara Lab.",
            400,
        );
    }

    const internalOrganizationId =
        getInternalOrganizationId();

    if (!internalOrganizationId) {
        throw new PlatformAuthorizationError(
            "La organización interna de Datara no está configurada.",
            500,
        );
    }

if (
    orgId !==
    internalOrganizationId
) {
    throw new PlatformAuthorizationError(
        "Esta sección es exclusiva para el equipo de Datara Lab.",
        403,
    );
}

    const [administrator] =
        await db
            .select({
                tenantId:
                    tenants.id,

                memberId:
                    tenantMembers.id,

                roleKey:
                    roles.key,
            })
            .from(tenants)
            .innerJoin(
                tenantMembers,
                and(
                    eq(
                        tenantMembers.tenantId,
                        tenants.id,
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
            .innerJoin(
                roles,
                and(
                    eq(
                        tenantMembers.roleId,
                        roles.id,
                    ),
                    eq(
                        roles.tenantId,
                        tenants.id,
                    ),
                ),
            )
            .where(
                and(
                    eq(
                        tenants.clerkOrganizationId,
                        internalOrganizationId,
                    ),
                    isNull(
                        roles.product,
                    ),
                ),
            )
            .limit(1);

    if (
        !administrator ||
        (
            administrator.roleKey !==
            "owner" &&
            administrator.roleKey !==
            "admin"
        )
    ) {
        throw new PlatformAuthorizationError(
            "No tienes permisos para administrar Datara.",
            403,
        );
    }

    return {
        userId,
        organizationId:
            internalOrganizationId,
        tenantId:
            administrator.tenantId,
        memberId:
            administrator.memberId,
        roleKey:
            administrator.roleKey,
    };
}
export async function requireCloudAdministrator() {
    const {
        userId,
        orgId,
    } = await auth();

    if (!userId) {
        throw new PlatformAuthorizationError(
            "No autenticado.",
            401,
        );
    }

    if (!orgId) {
        throw new PlatformAuthorizationError(
            "Selecciona la organización Datara Lab.",
            400,
        );
    }

    const internalOrganizationId =
        getInternalOrganizationId();

    if (!internalOrganizationId) {
        throw new PlatformAuthorizationError(
            "La organización interna de Datara no está configurada.",
            500,
        );
    }

    if (
        orgId !==
        internalOrganizationId
    ) {
        throw new PlatformAuthorizationError(
            "Esta sección es exclusiva para el equipo de Datara Lab.",
            403,
        );
    }

    const [administrator] =
        await db
            .select({
                tenantId:
                    tenants.id,

                memberId:
                    tenantMembers.id,

                roleKey:
                    roles.key,
            })
            .from(
                tenants,
            )
            .innerJoin(
                tenantMembers,
                and(
                    eq(
                        tenantMembers.tenantId,
                        tenants.id,
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
            .innerJoin(
                roles,
                and(
                    eq(
                        tenantMembers.roleId,
                        roles.id,
                    ),
                    eq(
                        roles.tenantId,
                        tenants.id,
                    ),
                ),
            )
            .where(
                and(
                    eq(
                        tenants.clerkOrganizationId,
                        internalOrganizationId,
                    ),
                    isNull(
                        roles.product,
                    ),
                ),
            )
            .limit(1);

    if (
        !administrator ||
        (
            administrator.roleKey !==
                "owner" &&
            administrator.roleKey !==
                "admin" &&
            administrator.roleKey !==
                "admin_cloud"
        )
    ) {
        throw new PlatformAuthorizationError(
            "No tienes permisos para administrar Datara Cloud.",
            403,
        );
    }

    return {
        userId,

        organizationId:
            internalOrganizationId,

        tenantId:
            administrator.tenantId,

        memberId:
            administrator.memberId,

        roleKey:
            administrator.roleKey,

        isCloudOnlyAdministrator:
            administrator.roleKey ===
            "admin_cloud",
    };
}