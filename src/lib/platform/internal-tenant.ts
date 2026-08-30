import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    eq,
} from "drizzle-orm";

import { db } from "@/db";

import {
    tenants,
} from "@/db/schema";

type PlatformEnvironment = {
    DATARA_INTERNAL_ORGANIZATION_ID?:
    string;
};

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

export async function getInternalDataraTenant() {
    const organizationId =
        getInternalOrganizationId();

    if (!organizationId) {
        throw new Error(
            "La organización interna de Datara no está configurada.",
        );
    }

    const [tenant] =
        await db
            .select({
                tenantId:
                    tenants.id,
            })
            .from(tenants)
            .where(
                eq(
                    tenants.clerkOrganizationId,
                    organizationId,
                ),
            )
            .limit(1);

    if (!tenant) {
        throw new Error(
            "No encontramos el tenant interno de Datara Lab.",
        );
    }

    return {
        organizationId,
        tenantId:
            tenant.tenantId,
    };
}