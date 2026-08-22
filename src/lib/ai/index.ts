import {
    generateGeminiText,
} from "@/lib/ai/gemini";

import type {
    GenerateAITextOptions,
} from "@/lib/ai/types";

export type {
    AIMessage,
    GenerateAITextOptions,
} from "@/lib/ai/types";

export async function generateAIText(
    options: GenerateAITextOptions,
): Promise<string> {
    const provider =
        process.env.AI_PROVIDER
            ?.trim()
            .toLowerCase();

    switch (provider) {
        case "gemini":
            return generateGeminiText(
                options,
            );

        default:
            throw new Error(
                `Proveedor de IA no soportado: ${provider || "no configurado"}.`,
            );
    }
}