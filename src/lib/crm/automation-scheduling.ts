import {
    and,
    eq,
} from "drizzle-orm";

import {
    db,
} from "@/db";

import {
    crmAutomationScheduledJobs,
    type CRMAutomationAction,
    type CRMAutomationEntityType,
} from "@/db/schema";

type AutomationRecord =
    Record<string, unknown>;

type ScheduleAutomationActionInput = {
    tenantId: string;
    ruleId: string;
    executionId: string;
    actionIndex: number;

    action:
    CRMAutomationAction;

    entityType:
    CRMAutomationEntityType;

    entityId: string;
    actorClerkUserId: string;

    record:
    AutomationRecord;
};

function getRecordValue(
    record:
        AutomationRecord,
    fieldPath: string,
): unknown {
    return fieldPath
        .split(".")
        .reduce<unknown>(
            (
                currentValue,
                field,
            ) => {
                if (
                    typeof currentValue !==
                    "object" ||
                    currentValue ===
                    null ||
                    Array.isArray(
                        currentValue,
                    )
                ) {
                    return undefined;
                }

                return (
                    currentValue as
                    AutomationRecord
                )[field];
            },
            record,
        );
}

function getBaseDate(
    record:
        AutomationRecord,
    baseField?:
        string,
): Date {
    if (!baseField) {
        return new Date();
    }

    const value =
        getRecordValue(
            record,
            baseField,
        );

    const date =
        value instanceof Date
            ? new Date(
                value.getTime(),
            )
            : typeof value ===
                "string" ||
                typeof value ===
                "number"
                ? new Date(value)
                : null;

    if (
        !date ||
        Number.isNaN(
            date.getTime(),
        )
    ) {
        throw new Error(
            `El campo ${baseField} no contiene una fecha válida.`,
        );
    }

    return date;
}

function addMonths(
    date: Date,
    amount: number,
): Date {
    const result =
        new Date(
            date.getTime(),
        );

    const originalDay =
        result.getUTCDate();

    result.setUTCDate(1);

    result.setUTCMonth(
        result.getUTCMonth() +
        amount,
    );

    const lastDayOfMonth =
        new Date(
            Date.UTC(
                result.getUTCFullYear(),
                result.getUTCMonth() +
                1,
                0,
            ),
        ).getUTCDate();

    result.setUTCDate(
        Math.min(
            originalDay,
            lastDayOfMonth,
        ),
    );

    return result;
}

export function getScheduledFor(
    action:
        CRMAutomationAction,
    record:
        AutomationRecord,
): Date | null {
    const delay =
        action.delay;

    if (!delay) {
        return null;
    }

    const baseDate =
        getBaseDate(
            record,
            delay.baseField,
        );

    switch (delay.unit) {
        case "minutes":
            return new Date(
                baseDate.getTime() +
                delay.amount *
                60_000,
            );

        case "hours":
            return new Date(
                baseDate.getTime() +
                delay.amount *
                3_600_000,
            );

        case "days":
            return new Date(
                baseDate.getTime() +
                delay.amount *
                86_400_000,
            );

        case "months":
            return addMonths(
                baseDate,
                delay.amount,
            );
    }
}

export async function cancelPendingAutomationJobs({
    tenantId,
    ruleId,
    entityType,
    entityId,
    reason,
}: {
    tenantId: string;
    ruleId: string;

    entityType:
        CRMAutomationEntityType;

    entityId: string;
    reason: string;
}) {
    const cancelledJobs =
        await db
            .update(
                crmAutomationScheduledJobs,
            )
            .set({
                status:
                    "cancelled",

                completedAt:
                    new Date(),

                errorMessage:
                    reason,

                updatedAt:
                    new Date(),
            })
            .where(
                and(
                    eq(
                        crmAutomationScheduledJobs
                            .tenantId,
                        tenantId,
                    ),

                    eq(
                        crmAutomationScheduledJobs
                            .ruleId,
                        ruleId,
                    ),

                    eq(
                        crmAutomationScheduledJobs
                            .entityType,
                        entityType,
                    ),

                    eq(
                        crmAutomationScheduledJobs
                            .entityId,
                        entityId,
                    ),

                    eq(
                        crmAutomationScheduledJobs
                            .status,
                        "pending",
                    ),
                ),
            )
            .returning({
                id:
                    crmAutomationScheduledJobs
                        .id,
            });

    return cancelledJobs.length;
}

function removeDelay(
    action:
        CRMAutomationAction,
): CRMAutomationAction {
    const actionRecord = {
        ...action,
    } as CRMAutomationAction &
        Record<
            string,
            unknown
        >;

    delete actionRecord.delay;

    return actionRecord;
}

export async function scheduleAutomationAction({
    tenantId,
    ruleId,
    executionId,
    actionIndex,
    action,
    entityType,
    entityId,
    actorClerkUserId,
    record,
}: ScheduleAutomationActionInput) {
    const scheduledFor =
        getScheduledFor(
            action,
            record,
        );

    if (!scheduledFor) {
        throw new Error(
            "La acción no contiene una programación diferida.",
        );
    }

    await cancelPendingAutomationJobs({
        tenantId,
        ruleId,
        entityType,
        entityId,

        reason:
            "El trabajo fue sustituido por una programación más reciente.",
    });


    const [scheduledJob] =
        await db
            .insert(
                crmAutomationScheduledJobs,
            )
            .values({
                tenantId,
                ruleId,
                executionId,
                actionIndex,

                action:
                    removeDelay(
                        action,
                    ),

                entityType,
                entityId,
                actorClerkUserId,

                recordSnapshot:
                    JSON.parse(
                        JSON.stringify(
                            record,
                        ),
                    ) as
                    AutomationRecord,

                scheduledFor,
                status:
                    "pending",
            })
            .onConflictDoNothing()
            .returning({
                id:
                    crmAutomationScheduledJobs
                        .id,

                scheduledFor:
                    crmAutomationScheduledJobs
                        .scheduledFor,
            });

    if (!scheduledJob) {
        return {
            scheduled: false,
            message:
                "La acción ya estaba programada.",
        };
    }

    return {
        scheduled: true,

        message:
            `Acción programada para ${scheduledJob.scheduledFor.toISOString()}.`,
    };
}