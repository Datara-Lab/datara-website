import {
    auth,
} from "@clerk/nextjs/server";

import {
    and,
    eq,
    inArray,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    db,
} from "@/db";

import {
    crmAutomationRules,
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

type RouteContext = {
    params: Promise<{
        ruleId: string;
    }>;
};

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
        | "edit"
        | "delete",
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
        "No fue posible modificar la automatización:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible modificar la automatización.",
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

export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    try {
        const {
            ruleId,
        } = await context.params;

        const {
            tenantId,
            userId,
            branchAccess,
            permissions,
        } = await getContext(
            "edit",
        );

        const [existingRule] =
            await db
                .select({
                    id:
                        crmAutomationRules.id,
                })
                .from(
                    crmAutomationRules,
                )
                .where(
                    and(
                        eq(
                            crmAutomationRules.id,
                            ruleId,
                        ),

                        eq(
                            crmAutomationRules
                                .tenantId,
                            tenantId,
                        ),
                    ),
                )
                .limit(1);

        if (!existingRule) {
            throw new ApiError(
                "La automatización no existe.",
                404,
            );
        }

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
                .update(
                    crmAutomationRules,
                )
                .set({
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

                    updatedByClerkUserId:
                        userId,

                    updatedAt:
                        new Date(),
                })
                .where(
                    and(
                        eq(
                            crmAutomationRules.id,
                            ruleId,
                        ),

                        eq(
                            crmAutomationRules
                                .tenantId,
                            tenantId,
                        ),
                    ),
                )
                .returning();

        if (!rule) {
            throw new ApiError(
                "No fue posible actualizar la automatización.",
                500,
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                rule,
                permissions,
            },
            message:
                "La automatización se actualizó correctamente.",
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}

export async function DELETE(
    _request: Request,
    context: RouteContext,
) {
    try {
        const {
            ruleId,
        } = await context.params;

        const {
            tenantId,
            permissions,
        } = await getContext(
            "delete",
        );

        const [deletedRule] =
            await db
                .delete(
                    crmAutomationRules,
                )
                .where(
                    and(
                        eq(
                            crmAutomationRules.id,
                            ruleId,
                        ),

                        eq(
                            crmAutomationRules
                                .tenantId,
                            tenantId,
                        ),
                    ),
                )
                .returning({
                    id:
                        crmAutomationRules.id,
                });

        if (!deletedRule) {
            throw new ApiError(
                "La automatización no existe.",
                404,
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id:
                    deletedRule.id,

                permissions,
            },
            message:
                "La automatización se eliminó correctamente.",
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}