import type {
    AIUsageMeasurement,
    GenerateAITextOptions,
} from "@/lib/ai/types";

type OpenAIResponse = {
    output_text?: string;
    output?: Array<{
        content?: Array<{
            type?: string;
            text?: string;
        }>;
    }>;
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
        input_tokens_details?: {
            cached_tokens?: number;
        };
        output_tokens_details?: {
            reasoning_tokens?: number;
        };
    };
    error?: {
        message?: string;
    };
};

function count(value: number | undefined): number {
    return Number.isInteger(value) &&
        (value ?? 0) >= 0
        ? value ?? 0
        : 0;
}

export async function generateOpenAIText(
    {
        systemInstruction,
        messages,
        maxOutputTokens = 2048,
        onUsage,
    }: GenerateAITextOptions,
    model: string,
): Promise<string> {
    const apiKey =
        process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
        throw new Error(
            "OPENAI_API_KEY no está configurada.",
        );
    }

    const startedAt = Date.now();
    let result: OpenAIResponse | undefined;

    async function notify(
        status: "success" | "error",
        errorCode?: string,
    ): Promise<void> {
        if (!onUsage) return;
        const usage = result?.usage;
        const reasoningTokens = count(
            usage?.output_tokens_details?.reasoning_tokens,
        );
        const outputTokens = count(
            usage?.output_tokens,
        );
        const measurement: AIUsageMeasurement = {
            provider: "openai",
            model,
            status,
            inputTokenCount: count(usage?.input_tokens),
            outputTokenCount: Math.max(
                0,
                outputTokens - reasoningTokens,
            ),
            thinkingTokenCount:
                reasoningTokens,
            cachedInputTokenCount: count(
                usage?.input_tokens_details?.cached_tokens,
            ),
            totalTokenCount: count(usage?.total_tokens),
            requestDurationMs: Math.max(0, Date.now() - startedAt),
            attemptCount: 1,
            errorCode,
        };
        try {
            await onUsage(measurement);
        } catch (telemetryError) {
            console.error(
                "No fue posible registrar la medición de OpenAI:",
                telemetryError,
            );
        }
    }

    try {
        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    instructions: systemInstruction,
                    input: messages.map((message) => ({
                        role: message.role,
                        content: message.content,
                    })),
                    max_output_tokens: maxOutputTokens,
                }),
            },
        );

        result = await response.json() as OpenAIResponse;

        if (!response.ok) {
            const error = new Error(
                result.error?.message ??
                `OpenAI respondió con HTTP ${response.status}.`,
            );
            error.name = response.status === 429
                ? "AIProviderRateLimitError"
                : "AIProviderError";
            await notify("error", `http_${response.status}`);
            throw error;
        }

        const text = result.output_text?.trim() ||
            result.output
                ?.flatMap((item) => item.content ?? [])
                .filter((item) =>
                    item.type === "output_text" && item.text,
                )
                .map((item) => item.text)
                .join("\n")
                .trim();

        if (!text) {
            await notify("error", "empty_response");
            throw new Error(
                "OpenAI no devolvió una respuesta de texto.",
            );
        }

        await notify("success");
        return text;
    } catch (error) {
        if (!result) {
            await notify(
                "error",
                error instanceof Error ? error.name : "unknown_error",
            );
        }
        throw error;
    }
}
