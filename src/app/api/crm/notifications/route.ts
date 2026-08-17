import {
    auth,
} from "@clerk/nextjs/server";

import {
    and,
    desc,
    eq,
    isNull,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    db,
} from "@/db";

import {
    crmNotifications,
    tenants,
} from "@/db/schema";

export const dynamic =
    "force-dynamic";

type MarkReadPayload = {
    id?: unknown;
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

async function getContext() {
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

    return {
        tenantId:
            tenant.id,

        userId,
    };
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
        "No fue posible procesar las notificaciones:",
        error,
    );

    return NextResponse.json(
        {
            success: false,

            error:
                "No fue posible procesar las notificaciones.",
        },
        {
            status: 500,
        },
    );
}

export async function GET() {
    try {
        const {
            tenantId,
            userId,
        } = await getContext();

        const notifications =
            await db
                .select({
                    id:
                        crmNotifications.id,

                    title:
                        crmNotifications.title,

                    message:
                        crmNotifications.message,

                    entityType:
                        crmNotifications
                            .entityType,

                    entityId:
                        crmNotifications
                            .entityId,

                    readAt:
                        crmNotifications
                            .readAt,

                    createdAt:
                        crmNotifications
                            .createdAt,
                })
                .from(
                    crmNotifications,
                )
                .where(
                    and(
                        eq(
                            crmNotifications
                                .tenantId,
                            tenantId,
                        ),

                        eq(
                            crmNotifications
                                .recipientClerkUserId,
                            userId,
                        ),
                    ),
                )
                .orderBy(
                    desc(
                        crmNotifications
                            .createdAt,
                    ),
                )
                .limit(50);

        const unreadCount =
            notifications.filter(
                (
                    notification,
                ) =>
                    !notification.readAt,
            ).length;

        return NextResponse.json({
            success: true,

            data: {
                notifications,
                unreadCount,
            },
        });
    } catch (error) {
        return createErrorResponse(
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
        } = await getContext();

        const requestBody =
            (await request.json()) as
            MarkReadPayload;

        const notificationId =
            typeof requestBody.id ===
                "string"
                ? requestBody.id
                    .trim()
                : "";

        const readAt =
            new Date();

        const updatedNotifications =
            await db
                .update(
                    crmNotifications,
                )
                .set({
                    readAt,
                })
                .where(
                    and(
                        eq(
                            crmNotifications
                                .tenantId,
                            tenantId,
                        ),

                        eq(
                            crmNotifications
                                .recipientClerkUserId,
                            userId,
                        ),

                        isNull(
                            crmNotifications
                                .readAt,
                        ),

                        notificationId
                            ? eq(
                                crmNotifications
                                    .id,
                                notificationId,
                            )
                            : undefined,
                    ),
                )
                .returning({
                    id:
                        crmNotifications.id,
                });

        return NextResponse.json({
            success: true,

            data: {
                updated:
                    updatedNotifications
                        .length,

                readAt:
                    readAt.toISOString(),
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}