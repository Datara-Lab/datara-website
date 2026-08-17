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
    crmAutomationRules,
    tenantBranches,
    tenantMembers,
    tenants,
} from "@/db/schema";

import {
    AutomationValidationError,
    getAutomationRulePayload,
} from "@/lib/crm/automation-validation";

import {
    CRMBranchAccessError,
    getCRMBranchAccess,
    validateCRMBranchId,
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

async function getContext(
    permission:
        | "view"
        | "create",
) {
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
            permission,
        ),
    ]);

    return {
        tenantId:
            tenant.id,

        userId,
        branchAccess,
        permissions,
    };
}

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof
        ApiError ||
        error instanceof
        AutomationValidationError ||
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
        "No fue posible procesar las automatizaciones:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible procesar las automatizaciones.",
        },
        {
            status: 500,
        },
    );
}

async function validateActionMembers(
    tenantId: string,
    actions:
        ReturnType<
            typeof getAutomationRulePayload
        >["actions"],
) {
    const requestedUserIds =
        Array.from(
            new Set(
                actions.flatMap(
                    (action) => {
                        if (
                            action.type ===
                            "assign_owner"
                        ) {
                            return [
                                action.clerkUserId,
                            ];
                        }

                        if (
                            action.type ===
                            "create_activity" &&
                            action.ownerClerkUserId
                        ) {
                            return [
                                action
                                    .ownerClerkUserId,
                            ];
                        }

                        if (
                            action.type ===
                            "create_notification" &&
                            action
                                .recipientClerkUserId
                        ) {
                            return [
                                action
                                    .recipientClerkUserId,
                            ];
                        }

                        return [];
                    },
                ),
            ),
        );

    if (
        requestedUserIds.length ===
        0
    ) {
        return;
    }

    const members =
        await db
            .select({
                clerkUserId:
                    tenantMembers
                        .clerkUserId,
            })
            .from(tenantMembers)
            .where(
                and(
                    eq(
                        tenantMembers
                            .tenantId,
                        tenantId,
                    ),

                    eq(
                        tenantMembers.status,
                        "active",
                    ),

                    inArray(
                        tenantMembers
                            .clerkUserId,
                        requestedUserIds,
                    ),
                ),
            );

    const availableUserIds =
        new Set(
            members.map(
                (member) =>
                    member.clerkUserId,
            ),
        );

    if (
        requestedUserIds.some(
            (userId) =>
                !availableUserIds.has(
                    userId,
                ),
        )
    ) {
        throw new ApiError(
            "Una de las acciones contiene un usuario que no pertenece a la empresa.",
            400,
        );
    }
}

export async function GET() {
    try {
        const {
            tenantId,
            branchAccess,
            permissions,
        } = await getContext(
            "view",
        );

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

        const rules =
            await db
                .select({
                    id:
                        crmAutomationRules.id,

                    name:
                        crmAutomationRules.name,

                    description:
                        crmAutomationRules
                            .description,

                    branchId:
                        crmAutomationRules
                            .branchId,

                    branchName:
                        tenantBranches.name,

                    entityType:
                        crmAutomationRules
                            .entityType,

                    triggerType:
                        crmAutomationRules
                            .triggerType,

                    conditions:
                        crmAutomationRules
                            .conditions,

                    actions:
                        crmAutomationRules
                            .actions,

                    enabled:
                        crmAutomationRules
                            .enabled,

                    stopOnError:
                        crmAutomationRules
                            .stopOnError,

                    lastRunAt:
                        crmAutomationRules
                            .lastRunAt,

                    createdAt:
                        crmAutomationRules
                            .createdAt,

                    updatedAt:
                        crmAutomationRules
                            .updatedAt,
                })
                .from(
                    crmAutomationRules,
                )
                .leftJoin(
                    tenantBranches,
                    and(
                        eq(
                            tenantBranches.id,
                            crmAutomationRules
                                .branchId,
                        ),

                        eq(
                            tenantBranches
                                .tenantId,
                            tenantId,
                        ),
                    ),
                )
                .where(
                    branchFilter
                        ? and(
                            eq(
                                crmAutomationRules
                                    .tenantId,
                                tenantId,
                            ),

                            branchFilter,
                        )
                        : eq(
                            crmAutomationRules
                                .tenantId,
                            tenantId,
                        ),
                )
                .orderBy(
                    desc(
                        crmAutomationRules
                            .updatedAt,
                    ),
                );

        return NextResponse.json({
            success: true,
            data: {
                rules,
                permissions,
            },
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
            userId,
            branchAccess,
            permissions,
        } = await getContext(
            "create",
        );

        const requestBody:
            unknown =
            await request.json();

        const payload =
            getAutomationRulePayload(
                requestBody,
            );

        const branchId =
            payload.branchId
                ? await validateCRMBranchId(
                    tenantId,
                    branchAccess,
                    payload.branchId,
                )
                : branchAccess
                    .allBranches
                    ? null
                    : await validateCRMBranchId(
                        tenantId,
                        branchAccess,
                        null,
                    );

        await validateActionMembers(
            tenantId,
            payload.actions,
        );

        const [rule] =
            await db
                .insert(
                    crmAutomationRules,
                )
                .values({
                    tenantId,
                    branchId,

                    name:
                        payload.name,

                    description:
                        payload.description,

                    entityType:
                        payload.entityType,

                    triggerType:
                        payload.triggerType,

                    conditions:
                        payload.conditions,

                    actions:
                        payload.actions,

                    enabled:
                        payload.enabled,

                    stopOnError:
                        payload.stopOnError,

                    createdByClerkUserId:
                        userId,

                    updatedByClerkUserId:
                        userId,
                })
                .returning();

        if (!rule) {
            throw new ApiError(
                "No fue posible crear la automatización.",
                500,
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    rule,
                    permissions,
                },
                message:
                    "La automatización se creó correctamente.",
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