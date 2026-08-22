import {
    NextResponse,
} from "next/server";

import {
    generateAIText,
} from "@/lib/ai";

import {
    getCRMAssistantSystemInstruction,
} from "@/lib/ai/crm-assistant";

import type {
    AIMessage,
} from "@/lib/ai";

import {
    consumeTenantAIQuota,
    getTenantAIConfiguration,
} from "@/lib/ai/entitlements";

import {
    consumeAIRateLimit,
    getMinuteWindowStart,
} from "@/lib/ai/rate-limit";

import {
    canAccessProductWithContext,
} from "@/lib/auth/products";

import {
    getAuthorizationContext,
} from "@/lib/auth/session";

export const dynamic =
    "force-dynamic";

const MAX_MESSAGES = 12;
const INTERNAL_MINUTE_LIMIT = 6;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_TOTAL_LENGTH = 10_000;

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
        typeof value ===
        "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function getMessages(
    value: unknown,
): AIMessage[] {
    if (
        !Array.isArray(value) ||
        value.length === 0
    ) {
        throw new ApiError(
            "Envía al menos un mensaje.",
            400,
        );
    }

    if (
        value.length >
        MAX_MESSAGES
    ) {
        throw new ApiError(
            `La conversación no puede exceder ${MAX_MESSAGES} mensajes.`,
            400,
        );
    }

    const messages =
        value.map(
            (
                item,
                index,
            ): AIMessage => {
                if (!isRecord(item)) {
                    throw new ApiError(
                        `El mensaje ${index + 1} no tiene un formato válido.`,
                        400,
                    );
                }

                const role =
                    item.role;

                const content =
                    typeof item.content ===
                        "string"
                        ? item.content.trim()
                        : "";

                if (
                    role !== "user" &&
                    role !== "assistant"
                ) {
                    throw new ApiError(
                        `El mensaje ${index + 1} tiene un rol inválido.`,
                        400,
                    );
                }

                if (!content) {
                    throw new ApiError(
                        `El mensaje ${index + 1} está vacío.`,
                        400,
                    );
                }

                if (
                    content.length >
                    MAX_MESSAGE_LENGTH
                ) {
                    throw new ApiError(
                        `El mensaje ${index + 1} es demasiado largo.`,
                        400,
                    );
                }

                return {
                    role,
                    content,
                };
            },
        );

    const totalLength =
        messages.reduce(
            (
                total,
                message,
            ) =>
                total +
                message.content.length,
            0,
        );

    if (
        totalLength >
        MAX_TOTAL_LENGTH
    ) {
        throw new ApiError(
            "La conversación es demasiado larga. Inicia una conversación nueva.",
            400,
        );
    }

    if (
        messages[
            messages.length - 1
        ].role !== "user"
    ) {
        throw new ApiError(
            "El último mensaje debe ser del usuario.",
            400,
        );
    }

    return messages;
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
        "No fue posible responder con el asistente de CRM:",
        error,
    );

    return NextResponse.json(
        {
            success: false,

            error:
                "No fue posible obtener una respuesta del asistente.",
        },
        {
            status: 500,
        },
    );
}

export async function POST(
    request: Request,
) {
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

        const aiConfiguration =
            await getTenantAIConfiguration(
                context.tenantId,
                "crm",
            );

        if (
            !aiConfiguration
                .internalAssistantEnabled
        ) {
            throw new ApiError(
                "El administrador de la empresa desactivó el asistente interno.",
                403,
            );
        }

        const requestBody:
            unknown =
            await request.json();

        if (
            !isRecord(requestBody)
        ) {
            throw new ApiError(
                "La solicitud no tiene un formato válido.",
                400,
            );
        }

        const messages =
            getMessages(
                requestBody.messages,
            );

        const minuteRateLimit =
            await consumeAIRateLimit({
                tenantId:
                    context.tenantId,

                scope:
                    "internal_minute",

                subjectKey:
                    context.clerkUserId,

                windowStartedAt:
                    getMinuteWindowStart(),

                limit:
                    INTERNAL_MINUTE_LIMIT,
            });

        if (
            !minuteRateLimit.allowed
        ) {
            throw new ApiError(
                "Has enviado demasiadas preguntas. Espera un minuto antes de continuar.",
                429,
            );
        }

        const tenantQuota =
            await consumeTenantAIQuota(
                context.tenantId,
                "crm",

                aiConfiguration
                    .monthlyMessageLimit,
            );

        if (
            !tenantQuota.allowed
        ) {
            throw new ApiError(
                tenantQuota.limit ===
                    0
                    ? "La suscripción de la empresa no incluye consultas de IA."
                    : "La empresa alcanzó su límite mensual de consultas de IA.",
                429,
            );
        }

        const message =
            await generateAIText({
                systemInstruction:
                    getCRMAssistantSystemInstruction(
                        messages[
                            messages.length -
                                1
                        ].content,
                    ),

                messages,

                temperature: 0.2,
                maxOutputTokens: 2_048,
            });

        return NextResponse.json({
            success: true,

            data: {
                message,

                usage: {
                    limit:
                        tenantQuota.limit,

                    remaining:
                        tenantQuota
                            .remaining,
                },
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}