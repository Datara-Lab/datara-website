import {
    and,
    asc,
    eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
    people,
    tenantMembers,
} from "@/db/schema";

import {
    AdministrationAuthError,
    requireAdminContext,
} from "@/lib/administration/require-admin-context";

import {
    createEmployeeNumber,
} from "@/lib/identity/create-employee-number";

import {
    ensurePersonForMember,
} from "@/lib/identity/ensure-person-for-member";

import crypto from "crypto";

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
        "No fue posible cargar las personas de la organización:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible cargar las personas de la organización.",
        },
        {
            status: 500,
        },
    );
}

type CreatePersonPayload = {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    phone?: unknown;
    jobTitle?: unknown;
    department?: unknown;
    location?: unknown;
    hiredAt?: unknown;
    personType?: unknown;
};

function isRecord(
    value: unknown,
): value is Record<
    string,
    unknown
> {
    return (
        typeof value ===
            "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function getOptionalString(
    value: unknown,
) {
    if (
        typeof value !==
        "string"
    ) {
        return undefined;
    }

    const normalized =
        value.trim();

    return normalized ||
        undefined;
}

function getNullableString(
    value: unknown,
) {
    return (
        getOptionalString(
            value,
        ) ?? null
    );
}

function getPersonType(
    value: unknown,
) {
    const normalized =
        getOptionalString(
            value,
        ) ?? "employee";

    if (
        ![
            "employee",
            "contractor",
            "provider",
            "visitor",
            "other",
        ].includes(
            normalized,
        )
    ) {
        throw new ApiError(
            "El tipo de persona no es válido.",
            400,
        );
    }

    return normalized;
}

function createPersonCode() {
    return `PER-${crypto.randomUUID()
        .replaceAll("-", "")
        .slice(0, 10)
        .toUpperCase()}`;
}

export async function GET() {
    try {
        const {
            tenantId,
        } =
            await requireAdminContext();

        const members =
            await db
                .select({
                    id:
                        tenantMembers.id,

                    email:
                        tenantMembers.email,

                    firstName:
                        tenantMembers.firstName,

                    lastName:
                        tenantMembers.lastName,
                })
                .from(
                    tenantMembers,
                )
                .where(
                    eq(
                        tenantMembers.tenantId,
                        tenantId,
                    ),
                );

        for (
            const member of
            members
        ) {
            await ensurePersonForMember({
                tenantId,

                memberId:
                    member.id,

                email:
                    member.email,

                firstName:
                    member.firstName,

                lastName:
                    member.lastName,
            });
        }

        const organizationPeople =
            await db
                .select({
                    id:
                        people.id,

                    memberId:
                        people.memberId,

                    personCode:
                        people.personCode,

                    employeeNumber:
                        people.employeeNumber,

                    firstName:
                        people.firstName,

                    lastName:
                        people.lastName,

                    email:
                        people.email,

                    phone:
                        people.phone,

                    jobTitle:
                        people.jobTitle,

                    department:
                        people.department,

                    location:
                        people.location,

                    photoObjectKey:
                        people.photoObjectKey,

                    personType:
                        people.personType,

                    status:
                        people.status,

                    hiredAt:
                        people.hiredAt,

                    createdAt:
                        people.createdAt,
                })
                .from(
                    people,
                )
                .where(
                    eq(
                        people.tenantId,
                        tenantId,
                    ),
                )
                .orderBy(
                    asc(
                        people.firstName,
                    ),
                    asc(
                        people.lastName,
                    ),
                );

        return NextResponse.json({
            success: true,

            people:
                organizationPeople.map(
                    (person) => ({
                        ...person,

                        hasSystemAccess:
                            Boolean(
                                person.memberId,
                            ),
                    }),
                ),
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}

export async function POST(
    request: Request,
) {
    try {
        const {
            tenantId,
        } =
            await requireAdminContext();

        const requestBody: unknown =
            await request.json();

        if (
            !isRecord(
                requestBody,
            )
        ) {
            throw new ApiError(
                "La información enviada no tiene un formato válido.",
                400,
            );
        }

        const values =
            requestBody as CreatePersonPayload;

        const firstName =
            getOptionalString(
                values.firstName,
            );

        if (!firstName) {
            throw new ApiError(
                "El nombre es obligatorio.",
                400,
            );
        }

        const lastName =
            getNullableString(
                values.lastName,
            );

        const email =
            getOptionalString(
                values.email,
            )?.toLowerCase() ??
            null;

        const phone =
            getNullableString(
                values.phone,
            );

        const jobTitle =
            getNullableString(
                values.jobTitle,
            );

        const department =
            getNullableString(
                values.department,
            );

        const location =
            getNullableString(
                values.location,
            );

        const hiredAt =
            getNullableString(
                values.hiredAt,
            );

        const personType =
            getPersonType(
                values.personType,
            );

        if (email) {
            const [existingPerson] =
                await db
                    .select({
                        id:
                            people.id,
                    })
                    .from(
                        people,
                    )
                    .where(
                        and(
                            eq(
                                people.tenantId,
                                tenantId,
                            ),
                            eq(
                                people.email,
                                email,
                            ),
                        ),
                    )
                    .limit(1);

            if (existingPerson) {
                throw new ApiError(
                    "Ya existe una persona con ese correo electrónico.",
                    409,
                );
            }
        }

        const employeeNumber =
            personType ===
            "employee"
                ? await createEmployeeNumber(
                      tenantId,
                  )
                : null;

        const [person] =
            await db
                .insert(
                    people,
                )
                .values({
                    tenantId,

                    memberId:
                        null,

                    personCode:
                        createPersonCode(),

                    employeeNumber,

                    firstName,

                    lastName,

                    email,

                    phone,

                    jobTitle,

                    department,

                    location,

                    hiredAt,

                    personType,

                    status:
                        "active",
                })
                .returning();

        if (!person) {
            throw new ApiError(
                "No fue posible crear la persona.",
                500,
            );
        }

        return NextResponse.json(
            {
                success: true,

                message:
                    "La persona fue creada correctamente.",

                data: {
                    ...person,

                    hasSystemAccess:
                        false,
                },
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