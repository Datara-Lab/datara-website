import {
    auth,
    currentUser,
} from "@clerk/nextjs/server";

import {
    and,
    eq,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import { db } from "@/db";

import {
    roles,
    tenantMembers,
    tenants,
} from "@/db/schema";

import {
    createInventoryAuditQuery,
} from "@/lib/crm/inventory-audit";

export const dynamic =
    "force-dynamic";

type TenantMetadata =
    Record<string, unknown>;

type ReservationSettings = {
    manualHours: number;
    qualifiedHours: number;
    proposalHours: number;
    negotiationHours: number;
    depositHours: number;
    maximumHours: number;
    allowExtensions: boolean;
    autoReleaseExpired: boolean;
};

type SettingsPayload = {
    manualHours?: unknown;
    qualifiedHours?: unknown;
    proposalHours?: unknown;
    negotiationHours?: unknown;
    depositHours?: unknown;
    maximumHours?: unknown;
    allowExtensions?: unknown;
    autoReleaseExpired?: unknown;
};

const defaultSettings:
    ReservationSettings = {
    manualHours: 24,
    qualifiedHours: 24,
    proposalHours: 48,
    negotiationHours: 72,
    depositHours: 168,
    maximumHours: 360,
    allowExtensions: true,
    autoReleaseExpired: true,
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

function isRecord(
    value: unknown,
): value is Record<
    string,
    unknown
> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function getStoredInteger(
    value: unknown,
    fallback: number,
): number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value > 0
    )
        ? value
        : fallback;
}

function getStoredBoolean(
    value: unknown,
    fallback: boolean,
): boolean {
    return typeof value ===
        "boolean"
        ? value
        : fallback;
}

function getReservationSettings(
    metadata:
        TenantMetadata,
): ReservationSettings {
    const stored =
        metadata
            .inventoryReservationSettings;

    if (!isRecord(stored)) {
        return {
            ...defaultSettings,
        };
    }

    return {
        manualHours:
            getStoredInteger(
                stored.manualHours,
                defaultSettings
                    .manualHours,
            ),

        qualifiedHours:
            getStoredInteger(
                stored.qualifiedHours,
                defaultSettings
                    .qualifiedHours,
            ),

        proposalHours:
            getStoredInteger(
                stored.proposalHours,
                defaultSettings
                    .proposalHours,
            ),

        negotiationHours:
            getStoredInteger(
                stored.negotiationHours,
                defaultSettings
                    .negotiationHours,
            ),

        depositHours:
            getStoredInteger(
                stored.depositHours,
                defaultSettings
                    .depositHours,
            ),

        maximumHours:
            getStoredInteger(
                stored.maximumHours,
                defaultSettings
                    .maximumHours,
            ),

        allowExtensions:
            getStoredBoolean(
                stored.allowExtensions,
                defaultSettings
                    .allowExtensions,
            ),

        autoReleaseExpired:
            getStoredBoolean(
                stored.autoReleaseExpired,
                defaultSettings
                    .autoReleaseExpired,
            ),
    };
}

function getRequestedInteger(
    value: unknown,
    label: string,
): number {
    const parsed =
        Number(value);

    if (
        !Number.isInteger(parsed) ||
        parsed <= 0
    ) {
        throw new ApiError(
            `${label} debe ser un número entero mayor que cero.`,
            400,
        );
    }

    return parsed;
}

function getRequestedBoolean(
    value: unknown,
    label: string,
): boolean {
    if (
        typeof value !==
        "boolean"
    ) {
        throw new ApiError(
            `${label} no tiene un valor válido.`,
            400,
        );
    }

    return value;
}

function getRequestedSettings(
    payload:
        SettingsPayload,
): ReservationSettings {
    const maximumHours =
        getRequestedInteger(
            payload.maximumHours,
            "El plazo máximo",
        );

    if (
        maximumHours >
        2160
    ) {
        throw new ApiError(
            "El plazo máximo no puede superar 90 días.",
            400,
        );
    }

    const settings:
        ReservationSettings = {
        manualHours:
            getRequestedInteger(
                payload.manualHours,
                "El plazo manual",
            ),

        qualifiedHours:
            getRequestedInteger(
                payload.qualifiedHours,
                "El plazo de oportunidad calificada",
            ),

        proposalHours:
            getRequestedInteger(
                payload.proposalHours,
                "El plazo de propuesta",
            ),

        negotiationHours:
            getRequestedInteger(
                payload.negotiationHours,
                "El plazo de negociación",
            ),

        depositHours:
            getRequestedInteger(
                payload.depositHours,
                "El plazo con anticipo",
            ),

        maximumHours,

        allowExtensions:
            getRequestedBoolean(
                payload.allowExtensions,
                "La configuración para extender reservas",
            ),

        autoReleaseExpired:
            getRequestedBoolean(
                payload.autoReleaseExpired,
                "La liberación automática",
            ),
    };

    const configuredPeriods = [
        settings.manualHours,
        settings.qualifiedHours,
        settings.proposalHours,
        settings.negotiationHours,
        settings.depositHours,
    ];

    if (
        configuredPeriods.some(
            (hours) =>
                hours >
                maximumHours,
        )
    ) {
        throw new ApiError(
            "Ningún plazo de reserva puede superar el plazo máximo.",
            400,
        );
    }

    return settings;
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

    const [record] =
        await db
            .select({
                tenantId:
                    tenants.id,

                metadata:
                    tenants.metadata,

                roleKey:
                    roles.key,
            })
            .from(tenants)
            .innerJoin(
                tenantMembers,
                and(
                    eq(
                        tenantMembers
                            .tenantId,
                        tenants.id,
                    ),
                    eq(
                        tenantMembers
                            .clerkUserId,
                        userId,
                    ),
                    eq(
                        tenantMembers.status,
                        "active",
                    ),
                ),
            )
            .leftJoin(
                roles,
                eq(
                    tenantMembers.roleId,
                    roles.id,
                ),
            )
            .where(
                eq(
                    tenants
                        .clerkOrganizationId,
                    orgId,
                ),
            )
            .limit(1);

    if (!record) {
        throw new ApiError(
            "No tienes acceso a esta empresa.",
            403,
        );
    }

    return {
        ...record,
        userId,
    };
}

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof ApiError
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
        "No fue posible procesar la configuración de reservas:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible procesar la configuración de reservas.",
        },
        {
            status: 500,
        },
    );
}

export async function GET() {
    try {
        const context =
            await getContext();

        const metadata =
            isRecord(
                context.metadata,
            )
                ? context.metadata
                : {};

        return NextResponse.json({
            success: true,

            data: {
                settings:
                    getReservationSettings(
                        metadata,
                    ),

                canManage:
                    context.roleKey ===
                    "owner" ||
                    context.roleKey ===
                    "admin",
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
        const context =
            await getContext();

        if (
            context.roleKey !==
            "owner" &&
            context.roleKey !==
            "admin"
        ) {
            throw new ApiError(
                "Solo el dueño o un administrador pueden modificar la política de reservas.",
                403,
            );
        }

        const payload =
            (await request.json()) as
            SettingsPayload;

        const settings =
            getRequestedSettings(
                payload,
            );

        const currentMetadata =
            isRecord(
                context.metadata,
            )
                ? context.metadata
                : {};

        const previousSettings =
            getReservationSettings(
                currentMetadata,
            );

        const user =
            await currentUser();

        const actorName =
            [
                user?.firstName,
                user?.lastName,
            ]
                .filter(Boolean)
                .join(" ")
                .trim() ||
            user?.emailAddresses[0]
                ?.emailAddress ||
            "Usuario";

        const nextMetadata = {
            ...currentMetadata,

            inventoryReservationSettings:
                settings,
        };

        const now =
            new Date();

        const settingsQuery =
            db
                .update(tenants)
                .set({
                    metadata:
                        nextMetadata,

                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        tenants.id,
                        context.tenantId,
                    ),
                );

        const auditQuery =
            createInventoryAuditQuery({
                tenantId:
                    context.tenantId,

                branchId:
                    null,

                locationId:
                    null,

                productId:
                    null,

                entityType:
                    "Política de reservas",

                entityId:
                    context.tenantId,

                action:
                    "Actualizar",

                summary:
                    "Se actualizó la política de reservas de inventario.",

                actorClerkUserId:
                    context.userId,

                actorName,

                before:
                    previousSettings,

                after:
                    settings,
            });

        await db.batch([
            settingsQuery,
            auditQuery,
        ]);

        return NextResponse.json({
            success: true,

            message:
                "La política de reservas fue actualizada correctamente.",

            data: {
                settings,
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}