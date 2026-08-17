import {
    and,
    asc,
    eq,
    lt,
    lte,
} from "drizzle-orm";

import {
    db,
} from "@/db";

import {
    crmAutomationScheduledJobs,
} from "@/db/schema";

import {
    executeAutomationAction,
} from "@/lib/crm/automation-actions";

export type AutomationJobProcessorResult = {
    selected: number;
    succeeded: number;
    retried: number;
    failed: number;
    skipped: number;
};

const maximumJobsPerRun =
    50;

function getRetryDate(
    attempts: number,
): Date {
    const delayMinutes =
        Math.min(
            60,
            5 *
            2 **
            Math.max(
                0,
                attempts - 1,
            ),
        );

    return new Date(
        Date.now() +
        delayMinutes *
        60_000,
    );
}

export async function processScheduledAutomationJobs():
    Promise<
        AutomationJobProcessorResult
    > {
    const now =
        new Date();

    const staleProcessingDate =
        new Date(
            now.getTime() -
            15 *
            60_000,
        );

    await db
        .update(
            crmAutomationScheduledJobs,
        )
        .set({
            status:
                "pending",

            errorMessage:
                "El procesamiento anterior fue interrumpido; el trabajo se reintentará.",

            updatedAt:
                now,
        })
        .where(
            and(
                eq(
                    crmAutomationScheduledJobs
                        .status,
                    "processing",
                ),

                lt(
                    crmAutomationScheduledJobs
                        .updatedAt,
                    staleProcessingDate,
                ),
            ),
        );

    const dueJobs =
        await db
            .select()
            .from(
                crmAutomationScheduledJobs,
            )
            .where(
                and(
                    eq(
                        crmAutomationScheduledJobs
                            .status,
                        "pending",
                    ),

                    lte(
                        crmAutomationScheduledJobs
                            .scheduledFor,
                        now,
                    ),
                ),
            )
            .orderBy(
                asc(
                    crmAutomationScheduledJobs
                        .scheduledFor,
                ),
            )
            .limit(
                maximumJobsPerRun,
            );

    const result:
        AutomationJobProcessorResult = {
        selected:
            dueJobs.length,

        succeeded: 0,
        retried: 0,
        failed: 0,
        skipped: 0,
    };

    for (const job of dueJobs) {
        const attemptNumber =
            job.attempts +
            1;

        const [claimedJob] =
            await db
                .update(
                    crmAutomationScheduledJobs,
                )
                .set({
                    status:
                        "processing",

                    attempts:
                        attemptNumber,

                    lastAttemptAt:
                        new Date(),

                    errorMessage:
                        null,

                    updatedAt:
                        new Date(),
                })
                .where(
                    and(
                        eq(
                            crmAutomationScheduledJobs
                                .id,
                            job.id,
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

        if (!claimedJob) {
            result.skipped +=
                1;

            continue;
        }

        try {
            await executeAutomationAction(
                {
                    tenantId:
                        job.tenantId,

                    ruleId:
                        job.ruleId,

                    executionId:
                        job.executionId,

                    entityType:
                        job.entityType,

                    entityId:
                        job.entityId,

                    actorClerkUserId:
                        job.actorClerkUserId,

                    record:
                        job.recordSnapshot,
                },
                job.action,
            );

            await db
                .update(
                    crmAutomationScheduledJobs,
                )
                .set({
                    status:
                        "succeeded",

                    completedAt:
                        new Date(),

                    errorMessage:
                        null,

                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        crmAutomationScheduledJobs
                            .id,
                        job.id,
                    ),
                );

            result.succeeded +=
                1;
        } catch (
        processingError
        ) {
            const errorMessage =
                processingError instanceof
                    Error
                    ? processingError.message
                    : "La acción programada falló.";

            const exhaustedAttempts =
                attemptNumber >=
                job.maxAttempts;

            await db
                .update(
                    crmAutomationScheduledJobs,
                )
                .set(
                    exhaustedAttempts
                        ? {
                            status:
                                "failed",

                            completedAt:
                                new Date(),

                            errorMessage,

                            updatedAt:
                                new Date(),
                        }
                        : {
                            status:
                                "pending",

                            scheduledFor:
                                getRetryDate(
                                    attemptNumber,
                                ),

                            errorMessage,

                            updatedAt:
                                new Date(),
                        },
                )
                .where(
                    eq(
                        crmAutomationScheduledJobs
                            .id,
                        job.id,
                    ),
                );

            if (exhaustedAttempts) {
                result.failed +=
                    1;
            } else {
                result.retried +=
                    1;
            }
        }
    }

    return result;
}