import {
    and,
    asc,
    eq,
    inArray,
    sql,
} from "drizzle-orm";

import {
    db,
} from "@/db";

import {
    roles,
    tenantMembers,
} from "@/db/schema";

export async function getInternalCommercialOwner(
    tenantId: string,
) {
    const [owner] =
        await db
            .select({
                clerkUserId:
                    tenantMembers.clerkUserId,

                email:
                    tenantMembers.email,

                firstName:
                    tenantMembers.firstName,

                lastName:
                    tenantMembers.lastName,

                roleKey:
                    roles.key,
            })
            .from(
                tenantMembers,
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
                        tenantMembers.tenantId,
                    ),
                ),
            )
            .where(
                and(
                    eq(
                        tenantMembers.tenantId,
                        tenantId,
                    ),
                    eq(
                        tenantMembers.status,
                        "active",
                    ),
                    inArray(
                        roles.key,
                        [
                            "owner",
                            "admin",
                        ],
                    ),
                ),
            )
            .orderBy(
                sql`
                    CASE
                        WHEN ${roles.key} = 'owner' THEN 0
                        WHEN ${roles.key} = 'admin' THEN 1
                        ELSE 2
                    END
                `,
                asc(
                    tenantMembers.createdAt,
                ),
            )
            .limit(1);

    if (!owner) {
        throw new Error(
            "No encontramos un responsable comercial activo para Datara Lab.",
        );
    }

    const name =
        [
            owner.firstName,
            owner.lastName,
        ]
            .filter(Boolean)
            .join(" ")
            .trim() ||
        owner.email;

    return {
        id:
            owner.clerkUserId,

        name,

        email:
            owner.email,

        roleKey:
            owner.roleKey,
    };
}