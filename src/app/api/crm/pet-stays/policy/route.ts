import {
    and,
    eq,
    sql,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    db,
} from "@/db";

import {
    tenantBranches,
} from "@/db/schema";

import {
    createPetApiErrorResponse,
    getPetApiContext,
    getRequiredString,
    PetApiError,
} from "@/lib/crm/pet-api-context";

import {
    CRMBranchAccessError,
    getCRMBranchAccess,
    validateCRMBranchId,
} from "@/lib/crm/branch-access";

import {
    readPetBranchPolicy,
} from "@/lib/crm/pet-branch-policy";

const timePattern =
    /^([01]\d|2[0-3]):[0-5]\d$/;

const datePattern =
    /^\d{4}-\d{2}-\d{2}$/;

function fail(
    error: unknown,
) {
    return error instanceof
        CRMBranchAccessError
        ? NextResponse.json(
              {
                  success: false,
                  error: error.message,
              },
              {
                  status: error.status,
              },
          )
        : createPetApiErrorResponse(
              error,
              "No fue posible consultar o guardar las reglas de estancia.",
          );
}

function isValidTimeOrNull(
    value: unknown,
) {
    return (
        value === null ||
        (
            typeof value ===
                "string" &&
            timePattern.test(
                value,
            )
        )
    );
}

export async function GET(
    request: Request,
) {
    try {
        const {
            tenantId,
            userId,
        } =
            await getPetApiContext(
                "contacts",
                "view",
            );

        const branchId =
            getRequiredString(
                new URL(
                    request.url,
                ).searchParams.get(
                    "branchId",
                ),
                "La sucursal",
            );

        await validateCRMBranchId(
            tenantId,
            await getCRMBranchAccess(
                tenantId,
                userId,
            ),
            branchId,
        );

        const [branch] =
            await db
                .select({
                    metadata:
                        tenantBranches.metadata,
                    timezone:
                        tenantBranches.timezone,
                })
                .from(
                    tenantBranches,
                )
                .where(
                    and(
                        eq(
                            tenantBranches.id,
                            branchId,
                        ),
                        eq(
                            tenantBranches.tenantId,
                            tenantId,
                        ),
                    ),
                )
                .limit(1);

        if (!branch) {
            throw new PetApiError(
                "La sucursal no existe.",
                404,
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...readPetBranchPolicy(
                    branch.metadata,
                ),
                timezone:
                    branch.timezone,
            },
        });
    } catch (error) {
        return fail(
            error,
        );
    }
}

export async function PATCH(
    request: Request,
) {
    try {
        const {
            tenantId,
            userId,
        } =
            await getPetApiContext(
                "crm-settings",
                "edit",
            );

        const payload =
            (await request.json()) as Record<
                string,
                unknown
            >;

        const branchId =
            getRequiredString(
                payload.branchId,
                "La sucursal",
            );

        await validateCRMBranchId(
            tenantId,
            await getCRMBranchAccess(
                tenantId,
                userId,
            ),
            branchId,
        );

        const toleranceMinutes =
            Number(
                payload.toleranceMinutes,
            );

        const lowUsagePercent =
            Number(
                payload.lowUsagePercent,
            );

        if (
            !Number.isInteger(
                toleranceMinutes,
            ) ||
            toleranceMinutes < 0 ||
            toleranceMinutes >
                1440
        ) {
            throw new PetApiError(
                "La tolerancia debe ser un número entero entre 0 y 1440 minutos.",
                400,
            );
        }

        if (
            !Number.isFinite(
                lowUsagePercent,
            ) ||
            lowUsagePercent < 0 ||
            lowUsagePercent > 100
        ) {
            throw new PetApiError(
                "El porcentaje de bajo uso debe estar entre 0 y 100.",
                400,
            );
        }

        if (
            typeof payload.boardingIncludesDaycare !==
            "boolean"
        ) {
            throw new PetApiError(
                "Revisa la regla de guardería previa a la pensión.",
                400,
            );
        }

        const rawWeeklySchedule =
            payload.weeklySchedule;

        if (
            !rawWeeklySchedule ||
            typeof rawWeeklySchedule !==
                "object" ||
            Array.isArray(
                rawWeeklySchedule,
            )
        ) {
            throw new PetApiError(
                "Configura el horario semanal de la sucursal.",
                400,
            );
        }

        const weeklySchedule =
            rawWeeklySchedule as Record<
                string,
                unknown
            >;

        const dayKeys = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ];

        const normalizedWeeklySchedule: Record<
            string,
            {
                open:
                    | string
                    | null;
                close:
                    | string
                    | null;
                closed: boolean;
            }
        > = {};

        for (
            const day of
            dayKeys
        ) {
            const rawDay =
                weeklySchedule[
                    day
                ];

            if (
                !rawDay ||
                typeof rawDay !==
                    "object" ||
                Array.isArray(
                    rawDay,
                )
            ) {
                throw new PetApiError(
                    `Falta configurar el horario de ${day}.`,
                    400,
                );
            }

            const dayValue =
                rawDay as Record<
                    string,
                    unknown
                >;

            const closed =
                dayValue.closed ===
                true;

            const open =
                dayValue.open ===
                    "" ||
                dayValue.open ===
                    undefined
                    ? null
                    : dayValue.open;

            const close =
                dayValue.close ===
                    "" ||
                dayValue.close ===
                    undefined
                    ? null
                    : dayValue.close;

            if (
                !isValidTimeOrNull(
                    open,
                ) ||
                !isValidTimeOrNull(
                    close,
                )
            ) {
                throw new PetApiError(
                    `Revisa el horario de ${day}.`,
                    400,
                );
            }

            if (
                !closed &&
                (
                    open ===
                        null ||
                    close ===
                        null
                )
            ) {
                throw new PetApiError(
                    `Configura apertura y cierre para ${day}, o márcalo como cerrado.`,
                    400,
                );
            }

            normalizedWeeklySchedule[
                day
            ] = {
                open:
                    open as
                        | string
                        | null,

                close:
                    close as
                        | string
                        | null,

                closed,
            };
        }

        const rawExceptions =
            payload.scheduleExceptions;

        if (
            !Array.isArray(
                rawExceptions,
            )
        ) {
            throw new PetApiError(
                "Las excepciones de horario deben enviarse como una lista.",
                400,
            );
        }

        const scheduleExceptions =
            rawExceptions.map(
                (
                    item,
                    index,
                ) => {
                    if (
                        !item ||
                        typeof item !==
                            "object" ||
                        Array.isArray(
                            item,
                        )
                    ) {
                        throw new PetApiError(
                            `La excepción ${index + 1} no es válida.`,
                            400,
                        );
                    }

                    const value =
                        item as Record<
                            string,
                            unknown
                        >;

                    if (
                        typeof value.date !==
                            "string" ||
                        !datePattern.test(
                            value.date,
                        )
                    ) {
                        throw new PetApiError(
                            `La excepción ${index + 1} necesita una fecha válida.`,
                            400,
                        );
                    }

                    const closed =
                        value.closed ===
                            true;

                    const open =
                        value.open ===
                            "" ||
                        value.open ===
                            undefined
                            ? null
                            : value.open;

                    const close =
                        value.close ===
                            "" ||
                        value.close ===
                            undefined
                            ? null
                            : value.close;

                    if (
                        !isValidTimeOrNull(
                            open,
                        ) ||
                        !isValidTimeOrNull(
                            close,
                        )
                    ) {
                        throw new PetApiError(
                            `Revisa el horario de la excepción ${index + 1}.`,
                            400,
                        );
                    }

                    if (
                        !closed &&
                        (
                            open ===
                                null ||
                            close ===
                                null
                        )
                    ) {
                        throw new PetApiError(
                            `La excepción ${index + 1} debe tener apertura y cierre, o estar marcada como cerrada.`,
                            400,
                        );
                    }

                    return {
                        date:
                            value.date,

                        open:
                            open as
                                | string
                                | null,

                        close:
                            close as
                                | string
                                | null,

                        closed,

                        reason:
                            typeof value.reason ===
                                "string"
                                ? value.reason.trim()
                                : "",
                    };
                },
            );

        const policy =
            JSON.stringify({
                weeklySchedule:
                    normalizedWeeklySchedule,

                scheduleExceptions,

                toleranceMinutes,

                lowUsagePercent,

                boardingIncludesDaycare:
                    payload.boardingIncludesDaycare,

                updatedBy:
                    userId,

                updatedAt:
                    new Date().toISOString(),
            });

        await db
            .update(
                tenantBranches,
            )
            .set({
                metadata:
                    sql`jsonb_set(COALESCE(${tenantBranches.metadata}, '{}'::jsonb), '{petStayPolicy}', ${policy}::jsonb)`,

                updatedAt:
                    new Date(),
            })
            .where(
                and(
                    eq(
                        tenantBranches.id,
                        branchId,
                    ),
                    eq(
                        tenantBranches.tenantId,
                        tenantId,
                    ),
                ),
            );

        return NextResponse.json({
            success: true,
            data: {
                saved: true,
            },
        });
    } catch (error) {
        return fail(
            error,
        );
    }
}