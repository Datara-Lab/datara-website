import {
    and,
    eq,
    isNull,
    or,
} from "drizzle-orm";

import {
    db,
} from "@/db";

import {
    crmAutomationExecutions,
    crmAutomationRules,
    type CRMAutomationEntityType,
    type CRMAutomationTriggerType,
} from "@/db/schema";

import {
    executeAutomationAction,
} from "@/lib/crm/automation-actions";

import {
    matchesAutomationConditions,
} from "@/lib/crm/automation-conditions";

import {
    cancelPendingAutomationJobs,
    scheduleAutomationAction,
} from "@/lib/crm/automation-scheduling";

type AutomationRecord =
    Record<string, unknown>;

export type CRMAutomationEvent = {
    eventKey: string;
    tenantId: string;

    branchId:
    | string
    | null;

    entityType:
    CRMAutomationEntityType;

    entityId: string;

    triggerType:
    CRMAutomationTriggerType;

    actorClerkUserId: string;

    previousRecord:
    AutomationRecord | null;

    nextRecord:
    AutomationRecord;
};

export type CRMAutomationEventResult = {
    matchedRules: number;
    succeededRules: number;
    failedRules: number;
    skippedRules: number;
};

function normalizeRecord(
    value:
        AutomationRecord | null,
): AutomationRecord | null {
    if (!value) {
        return null;
    }

    return JSON.parse(
        JSON.stringify(value),
    ) as AutomationRecord;
}

function hasStatusChanged(
    previousRecord:
        AutomationRecord | null,
    nextRecord:
        AutomationRecord,
): boolean {
    if (!previousRecord) {
        return false;
    }

    return (
        previousRecord.status !==
        nextRecord.status
    );
}

export async function executeCRMAutomations(
    event:
        CRMAutomationEvent,
): Promise<
    CRMAutomationEventResult
> {
    if (
        event.triggerType ===
        "status_changed" &&
        !hasStatusChanged(
            event.previousRecord,
            event.nextRecord,
        )
    ) {
        return {
            matchedRules: 0,
            succeededRules: 0,
            failedRules: 0,
            skippedRules: 0,
        };
    }

    const branchFilter =
        event.branchId
            ? or(
                isNull(
                    crmAutomationRules
                        .branchId,
                ),

                eq(
                    crmAutomationRules
                        .branchId,
                    event.branchId,
                ),
            )
            : isNull(
                crmAutomationRules
                    .branchId,
            );

    const rules =
        await db
            .select()
            .from(
                crmAutomationRules,
            )
            .where(
                and(
                    eq(
                        crmAutomationRules
                            .tenantId,
                        event.tenantId,
                    ),

                    eq(
                        crmAutomationRules
                            .entityType,
                        event.entityType,
                    ),

                    eq(
                        crmAutomationRules
                            .triggerType,
                        event.triggerType,
                    ),

                    eq(
                        crmAutomationRules
                            .enabled,
                        true,
                    ),

                    branchFilter,
                ),
            );

    const result:
        CRMAutomationEventResult = {
        matchedRules:
            rules.length,

        succeededRules: 0,
        failedRules: 0,
        skippedRules: 0,
    };

    const previousRecord =
        normalizeRecord(
            event.previousRecord,
        );

    const nextRecord =
        normalizeRecord(
            event.nextRecord,
        ) ?? {};

    for (const rule of rules) {
        const [execution] =
            await db
                .insert(
                    crmAutomationExecutions,
                )
                .values({
                    tenantId:
                        event.tenantId,

                    ruleId:
                        rule.id,

                    eventKey:
                        event.eventKey,

                    entityType:
                        event.entityType,

                    entityId:
                        event.entityId,

                    triggerType:
                        event.triggerType,

                    status:
                        "running",

                    context: {
                        branchId:
                            event.branchId,

                        previousRecord,
                        nextRecord,
                    },

                    triggeredByClerkUserId:
                        event
                            .actorClerkUserId,
                })
                .onConflictDoNothing()
                .returning({
                    id:
                        crmAutomationExecutions
                            .id,
                });

        if (!execution) {
            result.skippedRules +=
                1;

            continue;
        }

        const matches =
            matchesAutomationConditions(
                rule.conditions,
                previousRecord,
                nextRecord,
            );

        if (!matches) {
                        await cancelPendingAutomationJobs({
                tenantId:
                    event.tenantId,

                ruleId:
                    rule.id,

                entityType:
                    event.entityType,

                entityId:
                    event.entityId,

                reason:
                    "El registro dejó de cumplir las condiciones de la automatización.",
            });

            await db
                .update(
                    crmAutomationExecutions,
                )
                .set({
                    status:
                        "skipped",

                    completedAt:
                        new Date(),
                })
                .where(
                    eq(
                        crmAutomationExecutions
                            .id,
                        execution.id,
                    ),
                );

            result.skippedRules +=
                1;

            continue;
        }

        let currentRecord = {
            ...nextRecord,
        };

        const actionResults:
            Array<{
                actionIndex: number;
                actionType: string;
                status:
                | "succeeded"
                | "failed"
                | "skipped";
                message?: string;
            }> = [];

        let failedActions = 0;
        let succeededActions = 0;

        for (
            let actionIndex = 0;
            actionIndex <
            rule.actions.length;
            actionIndex += 1
        ) {
            const action =
                rule.actions[
                actionIndex
                ];

            if (!action) {
                continue;
            }

            if (
                failedActions > 0 &&
                rule.stopOnError
            ) {
                actionResults.push({
                    actionIndex,
                    actionType:
                        action.type,
                    status:
                        "skipped",
                    message:
                        "Omitida por un error anterior.",
                });

                continue;
            }

            try {
                if (action.delay) {
                    const scheduledResult =
                        await scheduleAutomationAction({
                            tenantId:
                                event.tenantId,

                            ruleId:
                                rule.id,

                            executionId:
                                execution.id,

                            actionIndex,
                            action,

                            entityType:
                                event.entityType,

                            entityId:
                                event.entityId,

                            actorClerkUserId:
                                event
                                    .actorClerkUserId,

                            record:
                                currentRecord,
                        });

                    succeededActions +=
                        1;

                    actionResults.push({
                        actionIndex,

                        actionType:
                            action.type,

                        status:
                            "succeeded",

                        message:
                            scheduledResult
                                .message,
                    });

                    continue;
                }

                const actionResult =
                    await executeAutomationAction(
                        {
                            tenantId:
                                event.tenantId,

                            ruleId:
                                rule.id,

                            executionId:
                                execution.id,

                            entityType:
                                event.entityType,

                            entityId:
                                event.entityId,

                            actorClerkUserId:
                                event
                                    .actorClerkUserId,

                            record:
                                currentRecord,
                        },
                        action,
                    );

                currentRecord =
                    actionResult.record;

                succeededActions +=
                    1;

                actionResults.push({
                    actionIndex,
                    actionType:
                        action.type,
                    status:
                        "succeeded",
                    message:
                        actionResult.message,
                });
            } catch (
            actionError
            ) {
                failedActions +=
                    1;

                actionResults.push({
                    actionIndex,
                    actionType:
                        action.type,
                    status:
                        "failed",
                    message:
                        actionError instanceof
                            Error
                            ? actionError.message
                            : "La acción no pudo ejecutarse.",
                });
            }
        }

        const executionStatus =
            failedActions === 0
                ? "succeeded"
                : succeededActions ===
                    0
                    ? "failed"
                    : "partially_succeeded";

        const firstError =
            actionResults.find(
                (actionResult) =>
                    actionResult.status ===
                    "failed",
            )?.message ?? null;

        const completedAt =
            new Date();

        await Promise.all([
            db
                .update(
                    crmAutomationExecutions,
                )
                .set({
                    status:
                        executionStatus,

                    actionResults,

                    errorMessage:
                        firstError,

                    completedAt,
                })
                .where(
                    eq(
                        crmAutomationExecutions
                            .id,
                        execution.id,
                    ),
                ),

            db
                .update(
                    crmAutomationRules,
                )
                .set({
                    lastRunAt:
                        completedAt,

                    updatedAt:
                        completedAt,
                })
                .where(
                    and(
                        eq(
                            crmAutomationRules.id,
                            rule.id,
                        ),

                        eq(
                            crmAutomationRules
                                .tenantId,
                            event.tenantId,
                        ),
                    ),
                ),
        ]);

        if (
            executionStatus ===
            "failed"
        ) {
            result.failedRules +=
                1;
        } else {
            result.succeededRules +=
                1;
        }
    }

    return result;
}