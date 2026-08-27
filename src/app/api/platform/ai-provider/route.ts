import {
    and,
    count,
    eq,
    gte,
    sql,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import { db } from "@/db";

import {
    aiProviderConfigurations,
    aiUsageEvents,
} from "@/db/schema";

import {
    getAIProviderConfiguration,
    getDataraEnvironment,
    hasAIProviderSecret,
    type AIProvider,
} from "@/lib/ai/provider-configuration";

import {
    PlatformAuthorizationError,
    requirePlatformAdministrator,
} from "@/lib/platform/authorization";

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

function errorResponse(error: unknown) {
    if (
        error instanceof ApiError ||
        error instanceof PlatformAuthorizationError
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
        "No fue posible administrar la configuración de IA:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error: "No fue posible administrar la configuración de IA.",
        },
        {
            status: 500,
        },
    );
}

function text(
    value: unknown,
    name: string,
): string {
    if (typeof value !== "string") {
        throw new ApiError(
            `${name} no tiene un formato válido.`,
            400,
        );
    }

    const normalized = value.trim();

    if (!normalized || normalized.length > 120) {
        throw new ApiError(
            `${name} es obligatorio y no puede exceder 120 caracteres.`,
            400,
        );
    }

    return normalized;
}

async function getDashboard() {
    const configuration =
        await getAIProviderConfiguration();

    const since = new Date(
        Date.now() -
        30 * 24 * 60 * 60 * 1000,
    );

    const usage = await db
        .select({
            provider:
                aiUsageEvents.provider,
            model:
                aiUsageEvents.model,
            requests:
                count(aiUsageEvents.id),
            successfulRequests:
                sql<number>`count(*) filter (where ${aiUsageEvents.status} = 'success')`,
            totalTokens:
                sql<number>`coalesce(sum(${aiUsageEvents.totalTokenCount}), 0)`,
            averageDurationMs:
                sql<number>`coalesce(round(avg(${aiUsageEvents.requestDurationMs})), 0)`,
            estimatedCostUsd:
                sql<string>`coalesce(sum(${aiUsageEvents.estimatedTotalCostUsd}), 0)`,
        })
        .from(aiUsageEvents)
        .where(
            and(
                gte(
                    aiUsageEvents.createdAt,
                    since,
                ),
                eq(
                    aiUsageEvents.product,
                    "crm",
                ),
            ),
        )
        .groupBy(
            aiUsageEvents.provider,
            aiUsageEvents.model,
        );

    const geminiUsesPaidBilling =
        process.env
            .GEMINI_BILLING_MODE
            ?.trim()
            .toLowerCase() ===
        "paid";

    return {
        configuration,
        secrets: {
            gemini:
                hasAIProviderSecret("gemini"),
            openai:
                hasAIProviderSecret("openai"),
        },
        periodDays: 30,
        usage: usage.map((item) => {
            const estimatedCostUsd =
                Number(
                    item.estimatedCostUsd,
                );

            const actualChargeUsd =
                item.provider === "gemini" &&
                !geminiUsesPaidBilling
                    ? 0
                    : estimatedCostUsd;

            return {
                ...item,
                requests:
                    Number(item.requests),
                successfulRequests:
                    Number(
                        item.successfulRequests,
                    ),
                totalTokens:
                    Number(item.totalTokens),
                averageDurationMs:
                    Number(
                        item.averageDurationMs,
                    ),
                estimatedCostUsd,
                actualChargeUsd,
                billingMode:
                    item.provider === "gemini" &&
                    !geminiUsesPaidBilling
                        ? "free"
                        : "paid",
            };
        }),
    };
}

export async function GET() {
    try {
        await requirePlatformAdministrator();

        return NextResponse.json({
            success: true,
            data: await getDashboard(),
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PATCH(
    request: Request,
) {
    try {
        const administrator =
            await requirePlatformAdministrator();

        const payload =
            await request.json() as
            Record<string, unknown>;

        const enabled =
            payload.enabled;

        if (typeof enabled !== "boolean") {
            throw new ApiError(
                "El estado del servicio no es válido.",
                400,
            );
        }

        const provider =
            payload.provider;

        if (
            provider !== "gemini" &&
            provider !== "openai"
        ) {
            throw new ApiError(
                "Selecciona un proveedor válido.",
                400,
            );
        }

        const typedProvider:
            AIProvider = provider;

        if (
            enabled &&
            !hasAIProviderSecret(
                typedProvider,
            )
        ) {
            throw new ApiError(
                `No puedes activar ${typedProvider}: falta configurar su secreto en este ambiente.`,
                409,
            );
        }

        const environment =
            getDataraEnvironment();

        const values = {
            environment,
            enabled,
            provider:
                typedProvider,
            geminiModel:
                text(
                    payload.geminiModel,
                    "El modelo de Gemini",
                ),
            openAIModel:
                text(
                    payload.openAIModel,
                    "El modelo de OpenAI",
                ),
            changedByClerkUserId:
                administrator.userId,
            updatedAt: new Date(),
        };

        await db
            .insert(
                aiProviderConfigurations,
            )
            .values(values)
            .onConflictDoUpdate({
                target:
                    aiProviderConfigurations.environment,
                set: values,
            });

        return NextResponse.json({
            success: true,
            message:
                "La configuración de IA fue actualizada.",
            data: await getDashboard(),
        });
    } catch (error) {
        return errorResponse(error);
    }
}
