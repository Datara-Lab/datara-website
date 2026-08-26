import type {
    AIUsageMeasurement,
    GenerateAITextOptions,
} from "@/lib/ai/types";

type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
                thought?: boolean;
            }>;
        };
    }>;

    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        thoughtsTokenCount?: number;
        cachedContentTokenCount?: number;
        totalTokenCount?: number;
    };

    error?: {
        code?: number;
        status?: string;
        message?: string;
        details?: unknown;
    };
};

function getTokenCount(
    value: number | undefined,
): number {
    return Number.isInteger(value) &&
        (value ?? 0) >= 0
        ? value ?? 0
        : 0;
}

export async function generateGeminiText({
    systemInstruction,
    messages,
    temperature = 0.2,
    maxOutputTokens = 2048,
    onUsage,
}: GenerateAITextOptions): Promise<string> {
    const apiKey =
        process.env.GEMINI_API_KEY?.trim();

    const model =
        process.env.AI_MODEL?.trim();

    if (!apiKey) {
        throw new Error(
            "GEMINI_API_KEY no está configurada.",
        );
    }

    if (!model) {
        throw new Error(
            "AI_MODEL no está configurado.",
        );
    }

    const startedAt =
        Date.now();

    const maxAttempts =
        4;

    let attemptCount =
        0;

    let result:
        GeminiResponse | undefined;

    let lastError:
        Error | undefined;

    async function notifyUsage(
        status:
            | "success"
            | "error",
        errorCode?: string,
        metadata?: Record<
            string,
            unknown
        >,
    ): Promise<void> {
        if (!onUsage) {
            return;
        }

        const usage =
            result?.usageMetadata;

        const measurement:
            AIUsageMeasurement = {
                provider:
                    "gemini",

                model: model!,

                status,

                inputTokenCount:
                    getTokenCount(
                        usage
                            ?.promptTokenCount,
                    ),

                outputTokenCount:
                    getTokenCount(
                        usage
                            ?.candidatesTokenCount,
                    ),

                thinkingTokenCount:
                    getTokenCount(
                        usage
                            ?.thoughtsTokenCount,
                    ),

                cachedInputTokenCount:
                    getTokenCount(
                        usage
                            ?.cachedContentTokenCount,
                    ),

                totalTokenCount:
                    getTokenCount(
                        usage
                            ?.totalTokenCount,
                    ),

                requestDurationMs:
                    Math.max(
                        0,
                        Date.now() -
                            startedAt,
                    ),

                attemptCount:
                    Math.max(
                        1,
                        attemptCount,
                    ),

                errorCode,
                metadata,
            };

        try {
            await onUsage(
                measurement,
            );
        } catch (telemetryError) {
            console.error(
                "No fue posible registrar la medición de IA:",
                telemetryError,
            );
        }
    }

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt += 1
    ) {
        attemptCount =
            attempt;

        const response =
            await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
                    model,
                )}:generateContent`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            apiKey,
                    },

                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [
                                {
                                    text:
                                        systemInstruction,
                                },
                            ],
                        },

                        contents:
                            messages.map(
                                (message) => ({
                                    role:
                                    message.role ===
                                        "assistant"
                                        ? "model"
                                        : "user",

                                    parts: [
                                        {
                                            text:
                                                message.content,
                                        },
                                    ],
                                }),
                            ),

                        generationConfig: {
                            temperature,
                            maxOutputTokens,

                            thinkingConfig: {
                                thinkingLevel:
                                    "low",
                            },
                        },
                    }),
                },
            );

        result =
            await response.json() as
            GeminiResponse;

        if (response.ok) {
            break;
        }

        const retryable =
            response.status === 429 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504;

        lastError =
            new Error(
                result.error?.message ??
                `Gemini respondió con HTTP ${response.status}.`,
            );

        lastError.name =
            response.status === 429
                ? "AIProviderRateLimitError"
                : "AIProviderError";

        const retryAfterHeader =
            response.headers.get(
                "retry-after",
            );

        const retryAfterSeconds =
            retryAfterHeader &&
            Number.isFinite(
                Number(
                    retryAfterHeader,
                ),
            )
                ? Math.max(
                    0,
                    Number(
                        retryAfterHeader,
                    ),
                )
                : undefined;

        const providerMetadata = {
            providerErrorCode:
                result.error?.code ??
                response.status,

            providerErrorStatus:
                result.error?.status ??
                null,

            providerErrorMessage:
                result.error?.message
                    ?.slice(
                        0,
                        1_000,
                    ) ?? null,

            providerErrorDetails:
                result.error?.details ??
                null,

            retryAfterSeconds:
                retryAfterSeconds ??
                null,
        };

        if (
            !retryable ||
            attempt === maxAttempts
        ) {
            await notifyUsage(
                "error",
                `http_${response.status}`,
                providerMetadata,
            );

            throw lastError;
        }

        const exponentialDelayMs =
            Math.min(
                15_000,
                2_000 *
                    2 **
                        (attempt - 1),
            );

        const retryAfterDelayMs =
            retryAfterSeconds ===
                undefined
                ? 0
                : Math.min(
                    15_000,
                    retryAfterSeconds *
                        1_000,
                );

        const jitterMs =
            Math.floor(
                Math.random() *
                    750,
            );

        const delayMs =
            Math.max(
                exponentialDelayMs,
                retryAfterDelayMs,
            ) + jitterMs;

        console.warn(
            `Gemini temporalmente no disponible. Reintento ${attempt + 1}/${maxAttempts} en ${delayMs} ms.`,
        );

        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    delayMs,
                ),
        );
    }

    if (!result) {
        await notifyUsage(
            "error",
            "empty_response",
        );

        throw (
            lastError ??
            new Error(
                "Gemini no devolvió una respuesta.",
            )
        );
    }

    const generatedText =
        result.candidates?.[0]
            ?.content?.parts
            ?.filter(
                (part) =>
                    !part.thought &&
                    typeof part.text ===
                    "string",
            )
            .map(
                (part) =>
                    part.text?.trim(),
            )
            .filter(Boolean)
            .join("\n")
            .trim();

    if (!generatedText) {
        await notifyUsage(
            "error",
            "empty_text",
        );

        throw new Error(
            "Gemini no devolvió una respuesta de texto.",
        );
    }

    await notifyUsage(
        "success",
    );

    return generatedText;
}
