import {
    auth,
} from "@clerk/nextjs/server";

import {
    and,
    asc,
    eq,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    db,
} from "@/db";

import {
    tenantMembers,
    tenants,
} from "@/db/schema";

export const dynamic =
    "force-dynamic";

export async function GET() {
    try {
        const {
            userId,
        } = await auth();

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "No autenticado.",
                },
                {
                    status: 401,
                },
            );
        }

        const organizations =
            await db
                .select({
                    organizationId:
                        tenants
                            .clerkOrganizationId,

                    tenantId:
                        tenants.id,

                    name:
                        tenants.name,

                    industry:
                        tenants.industry,

                    status:
                        tenants.status,
                })
                .from(
                    tenantMembers,
                )
                .innerJoin(
                    tenants,
                    eq(
                        tenantMembers
                            .tenantId,
                        tenants.id,
                    ),
                )
                .where(
                    and(
                        eq(
                            tenantMembers
                                .clerkUserId,
                            userId,
                        ),

                        eq(
                            tenantMembers
                                .status,
                            "active",
                        ),
                    ),
                )
                .orderBy(
                    asc(
                        tenants.name,
                    ),
                );

        return NextResponse.json({
            success: true,

            data: {
                organizations,
            },
        });
    } catch (error) {
        console.error(
            "No fue posible consultar las empresas del usuario:",
            error,
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "No fue posible cargar tus empresas.",
            },
            {
                status: 500,
            },
        );
    }
}