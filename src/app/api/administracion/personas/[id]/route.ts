import {
    and,
    eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
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
        "No fue posible cargar la persona:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible cargar la persona.",
        },
        {
            status: 500,
        },
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

                    linkedInUrl:
                        people.linkedInUrl,

                    professionalBio:
                        people.professionalBio,

                    photoObjectKey:
                        people.photoObjectKey,

                    hiredAt:
                        people.hiredAt,

                    personType:
                        people.personType,

                    status:
                        people.status,

                    publicVisibility:
                        people.publicVisibility,

                    createdAt:
                        people.createdAt,

                    updatedAt:
                        people.updatedAt,
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

        return NextResponse.json({
            success: true,

            data: {
                ...person,

                hasSystemAccess:
                    Boolean(
                        person.memberId,
                    ),
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}

type UpdatePersonPayload = {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    phone?: unknown;
    jobTitle?: unknown;
    department?: unknown;
    location?: unknown;
    linkedInUrl?: unknown;
    professionalBio?: unknown;
    hiredAt?: unknown;
    personType?: unknown;
    status?: unknown;
    publicVisibility?: unknown;
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

function getOptionalNullableString(
    value: unknown,
) {
    if (
        value ===
        undefined
    ) {
        return undefined;
    }

    return getNullableString(
        value,
    );
}

function getPersonType(
    value: unknown,
) {
    const normalized =
        getOptionalString(
            value,
        );

    if (!normalized) {
        return undefined;
    }

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

function getPersonStatus(
    value: unknown,
) {
    const normalized =
        getOptionalString(
            value,
        );

    if (!normalized) {
        return undefined;
    }

    if (
        ![
            "active",
            "inactive",
        ].includes(
            normalized,
        )
    ) {
        throw new ApiError(
            "El estado de la persona no es válido.",
            400,
        );
    }

    return normalized;
}

function getPublicVisibility(
    value: unknown,
) {
    if (
        value ===
        undefined
    ) {
        return undefined;
    }

    if (
        !isRecord(
            value,
        )
    ) {
        throw new ApiError(
            "La configuración de privacidad no tiene un formato válido.",
            400,
        );
    }

    const allowedKeys = [
        "photo",
        "personCode",
        "jobTitle",
        "department",
        "email",
        "phone",
        "location",
        "linkedIn",
        "professionalBio",
        "hiredAt",
    ] as const;

    const visibility: Record<
        string,
        boolean
    > = {};

    for (
        const key of allowedKeys
    ) {
        const fieldValue =
            value[key];

        if (
            fieldValue !==
                undefined &&
            typeof fieldValue !==
                "boolean"
        ) {
            throw new ApiError(
                `El campo de privacidad "${key}" no es válido.`,
                400,
            );
        }

        if (
            typeof fieldValue ===
            "boolean"
        ) {
            visibility[key] =
                fieldValue;
        }
    }

    return visibility;
}

export async function PATCH(
    request: Request,
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
            requestBody as UpdatePersonPayload;

        const firstName =
            values.firstName ===
            undefined
                ? undefined
                : getOptionalString(
                      values.firstName,
                  );

        if (
            values.firstName !==
                undefined &&
            !firstName
        ) {
            throw new ApiError(
                "El nombre es obligatorio.",
                400,
            );
        }

        const email =
            getOptionalString(
                values.email,
            )?.toLowerCase() ??
            null;

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

            if (
                existingPerson &&
                existingPerson.id !== id
            ) {
                throw new ApiError(
                    "Ya existe otra persona con ese correo electrónico.",
                    409,
                );
            }
        }

        const [updatedPerson] =
            await db
                .update(
                    people,
                )
                .set({
                    firstName,

                    lastName:
                        getOptionalNullableString(
                            values.lastName,
                        ),

                    email:
                        values.email ===
                        undefined
                            ? undefined
                            : email,

                    phone:
                        getOptionalNullableString(
                            values.phone,
                        ),

                    jobTitle:
                        getOptionalNullableString(
                            values.jobTitle,
                        ),

                    department:
                        getOptionalNullableString(
                            values.department,
                        ),

                    location:
                        getOptionalNullableString(
                            values.location,
                        ),

                    linkedInUrl:
                        getOptionalNullableString(
                            values.linkedInUrl,
                        ),

                    professionalBio:
                        getOptionalNullableString(
                            values.professionalBio,
                        ),

                    hiredAt:
                        getOptionalNullableString(
                            values.hiredAt,
                        ),

                    personType:
                        getPersonType(
                            values.personType,
                        ),

                    status:
                        getPersonStatus(
                            values.status,
                        ),

                    publicVisibility:
                        getPublicVisibility(
                            values.publicVisibility,
                        ),

                    updatedAt:
                        new Date(),
                })
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
                .returning();

        if (!updatedPerson) {
            throw new ApiError(
                "La persona no existe o no pertenece a esta organización.",
                404,
            );
        }

        return NextResponse.json({
            success: true,

            message:
                "La información de la persona fue actualizada correctamente.",

            data: {
                ...updatedPerson,

                hasSystemAccess:
                    Boolean(
                        updatedPerson.memberId,
                    ),
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}