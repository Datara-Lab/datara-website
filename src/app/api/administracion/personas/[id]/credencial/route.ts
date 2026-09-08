import {
    and,
    desc,
    eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
    digitalCredentials,
    people,
} from "@/db/schema";

import {
    AdministrationAuthError,
    requireAdminContext,
} from "@/lib/administration/require-admin-context";

export const dynamic = "force-dynamic";

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

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof
        ApiError
    ) {
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
        error instanceof
        AdministrationAuthError
    ) {
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

    console.error(
        "No fue posible cargar la credencial digital:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible cargar la credencial digital.",
        },
        {
            status: 500,
        },
    );
}

function createPublicToken() {
    return crypto
        .randomUUID()
        .replaceAll(
            "-",
            "",
        );
}

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    try {
        const {
            tenantId,
        } =
            await requireAdminContext();

        const {
            id,
        } =
            await context.params;

        const [person] =
            await db
                .select({
                    id:
                        people.id,

                    personType:
                        people.personType,
                })
                .from(
                    people,
                )
                .where(
                    and(
                        eq(
                            people.id,
                            id,
                        ),
                        eq(
                            people.tenantId,
                            tenantId,
                        ),
                    ),
                )
                .limit(1);

        if (!person) {
            throw new ApiError(
                "La persona no existe o no pertenece a esta organización.",
                404,
            );
        }

        const [existingCredential] =
            await db
                .select()
                .from(
                    digitalCredentials,
                )
                .where(
                    and(
                        eq(
                            digitalCredentials.tenantId,
                            tenantId,
                        ),
                        eq(
                            digitalCredentials.personId,
                            person.id,
                        ),
                    ),
                )
                .orderBy(
                    desc(
                        digitalCredentials.issuedAt,
                    ),
                )
                .limit(1);

        if (existingCredential) {
            return NextResponse.json({
                success: true,

                data: {
                    ...existingCredential,

                    publicPath:
                        `/id/${existingCredential.publicToken}`,
                },

                created:
                    false,
            });
        }

        const publicToken =
            createPublicToken();

        const [createdCredential] =
            await db
                .insert(
                    digitalCredentials,
                )
                .values({
                    tenantId,

                    personId:
                        person.id,

                    publicToken,

                    credentialType:
                        person.personType,

                    status:
                        "active",
                })
                .returning();

        if (!createdCredential) {
            throw new ApiError(
                "No fue posible generar la credencial digital.",
                500,
            );
        }

        return NextResponse.json(
            {
                success: true,

                data: {
                    ...createdCredential,

                    publicPath:
                        `/id/${createdCredential.publicToken}`,
                },

                created:
                    true,
            },
            {
                status: 201,
            },
        );
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}