import type {
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

    error?: {
        message?: string;
    };
};

export async function generateGeminiText({
    systemInstruction,
    messages,
    temperature = 0.2,
    maxOutputTokens = 800,
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

    const response = await fetch(
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
                },
            }),
        },
    );

    const result =
        await response.json() as
        GeminiResponse;

    if (!response.ok) {
        throw new Error(
            result.error?.message ??
            `Gemini respondió con HTTP ${response.status}.`,
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
        throw new Error(
            "Gemini no devolvió una respuesta de texto.",
        );
    }

    return generatedText;
}