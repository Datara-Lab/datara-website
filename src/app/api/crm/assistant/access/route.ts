import {
    NextResponse,
} from "next/server";

import {
    getCRMAssistantAccess,
} from "@/lib/ai/crm-assistant-access";

import {
    canAccessProductWithContext,
} from "@/lib/auth/products";

import {
    getAuthorizationContext,
} from "@/lib/auth/session";

import {
    CRMPermissionError,
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

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof ApiError ||
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
        "No fue posible consultar el acceso al asistente de CRM:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible consultar el acceso al asistente.",
        },
        {
            status: 500,
        },
    );
}

export async function GET() {
    try {
        const context =
            await getAuthorizationContext();

        const productAccess =
            await canAccessProductWithContext(
                context,
                "crm",
            );

        if (
            !productAccess.allowed
        ) {
            throw new ApiError(
                "No tienes acceso activo a Datara CRM.",
                403,
            );
        }

        const assistantAccess =
            await getCRMAssistantAccess(
                context.tenantId,
                context.clerkUserId,
            );

        return NextResponse.json({
            success: true,

            data: {
                enabled:
                    assistantAccess.enabled,

                isReadOnly:
                    assistantAccess.isReadOnly,

                isAdministrator:
                    assistantAccess
                        .isAdministrator,
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}