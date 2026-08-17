import {
    auth,
} from "@clerk/nextjs/server";

import {
    and,
    desc,
    eq,
    inArray,
    isNull,
    or,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    db,
} from "@/db";

import {
    crmAutomationExecutions,
    crmAutomationRules,
    crmAutomationScheduledJobs,
    tenants,
} from "@/db/schema";

import {
    CRMBranchAccessError,
    getCRMBranchAccess,
} from "@/lib/crm/branch-access";

import {
    CRMPermissionError,
    requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
    "force-dynamic";

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

export async function GET(
    request: Request,
) {
    try {
        const {
            userId,
            orgId,
        } = await auth();

        if (!userId) {
            throw new ApiError(
                "No autenticado.",
                401,
            );
        }

        if (!orgId) {
            throw new ApiError(
                "No hay una organización activa.",
                400,
            );
        }

        const [tenant] =
            await db
                .select({
                    id:
                        tenants.id,
                })
                .from(tenants)
                .where(
                    eq(
                        tenants
                            .clerkOrganizationId,
                        orgId,
                    ),
                )
                .limit(1);

        if (!tenant) {
            throw new ApiError(
                "La empresa aún no está sincronizada.",
                404,
            );
        }

        const [
            branchAccess,
            permissions,
        ] = await Promise.all([
            getCRMBranchAccess(
                tenant.id,
                userId,
            ),

            requireCRMModulePermission(
                tenant.id,
                userId,
                "automations",
                "view",
            ),
        ]);

        const requestUrl =
            new URL(
                request.url,
            );

        const requestedRuleId =
            requestUrl.searchParams
                .get("ruleId")
                ?.trim() ??
            null;

        const requestedLimit =
            Number(
                requestUrl.searchParams
                    .get("limit") ??
                "50",
            );

        const limit =
            Number.isInteger(
                requestedLimit,
            )
                ? Math.min(
                    100,
                    Math.max(
                        1,
                        requestedLimit,
                    ),
                )
                : 50;

        const branchFilter =
            branchAccess.allBranches
                ? undefined
                : branchAccess
                    .branchIds
                    .length >
                    0
                    ? or(
                        isNull(
                            crmAutomationRules
                                .branchId,
                        ),

                        inArray(
                            crmAutomationRules
                                .branchId,
                            branchAccess
                                .branchIds,
                        ),
                    )
                    : isNull(
                        crmAutomationRules
                            .branchId,
                    );

        const executions =
            await db
                .select({
                    id:
                        crmAutomationExecutions
                            .id,

                    ruleId:
                        crmAutomationExecutions
                            .ruleId,

                    ruleName:
                        crmAutomationRules
                            .name,

                    entityType:
                        crmAutomationExecutions
                            .entityType,

                    entityId:
                        crmAutomationExecutions
                            .entityId,

                    triggerType:
                        crmAutomationExecutions
                            .triggerType,

                    status:
                        crmAutomationExecutions
                            .status,

                    actionResults:
                        crmAutomationExecutions
                            .actionResults,

                    errorMessage:
                        crmAutomationExecutions
                            .errorMessage,

                    startedAt:
                        crmAutomationExecutions
                            .startedAt,

                    completedAt:
                        crmAutomationExecutions
                            .completedAt,
                })
                .from(
                    crmAutomationExecutions,
                )
                .innerJoin(
                    crmAutomationRules,
                    and(
                        eq(
                            crmAutomationRules.id,
                            crmAutomationExecutions
                                .ruleId,
                        ),

                        eq(
                            crmAutomationRules
                                .tenantId,
                            tenant.id,
                        ),
                    ),
                )
                .where(
                    and(
                        eq(
                            crmAutomationExecutions
                                .tenantId,
                            tenant.id,
                        ),

                        requestedRuleId
                            ? eq(
                                crmAutomationExecutions
                                    .ruleId,
                                requestedRuleId,
                            )
                            : undefined,

                        branchFilter,
                    ),
                )
                .orderBy(
                    desc(
                        crmAutomationExecutions
                            .createdAt,
                    ),
                )
                .limit(limit);

        const executionIds =
            executions.map(
                (execution) =>
                    execution.id,
            );

        const scheduledJobs =
            executionIds.length >
                0
                ? await db
                    .select({
                        id:
                            crmAutomationScheduledJobs
                                .id,

                        executionId:
                            crmAutomationScheduledJobs
                                .executionId,

                        actionIndex:
                            crmAutomationScheduledJobs
                                .actionIndex,

                        action:
                            crmAutomationScheduledJobs
                                .action,

                        status:
                            crmAutomationScheduledJobs
                                .status,

                        scheduledFor:
                            crmAutomationScheduledJobs
                                .scheduledFor,

                        attempts:
                            crmAutomationScheduledJobs
                                .attempts,

                        maxAttempts:
                            crmAutomationScheduledJobs
                                .maxAttempts,

                        errorMessage:
                            crmAutomationScheduledJobs
                                .errorMessage,

                        completedAt:
                            crmAutomationScheduledJobs
                                .completedAt,
                    })
                    .from(
                        crmAutomationScheduledJobs,
                    )
                    .where(
                        and(
                            eq(
                                crmAutomationScheduledJobs
                                    .tenantId,
                                tenant.id,
                            ),

                            inArray(
                                crmAutomationScheduledJobs
                                    .executionId,
                                executionIds,
                            ),
                        ),
                    )
                    .orderBy(
                        desc(
                            crmAutomationScheduledJobs
                                .scheduledFor,
                        ),
                    )
                : [];

        return NextResponse.json({
            success: true,

            data: {
                executions:
                    executions.map(
                        (
                            execution,
                        ) => ({
                            ...execution,

                            scheduledJobs:
                                scheduledJobs.filter(
                                    (
                                        job,
                                    ) =>
                                        job.executionId ===
                                        execution.id,
                                ),
                        }),
                    ),

                permissions,
            },
        });
    } catch (error) {
        if (
            error instanceof
            ApiError ||
            error instanceof
            CRMBranchAccessError ||
            error instanceof
            CRMPermissionError
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        error.message,
                },
                {
                    status:
                        error.status,
                },
            );
        }

        console.error(
            "No fue posible consultar el historial de automatizaciones:",
            error,
        );

        return NextResponse.json(
            {
                success: false,

                error:
                    "No fue posible consultar el historial de automatizaciones.",
            },
            {
                status: 500,
            },
        );
    }
}