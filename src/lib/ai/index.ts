import {
    generateGeminiText,
} from "@/lib/ai/gemini";

import {
    generateOpenAIText,
} from "@/lib/ai/openai";

import {
    getAIProviderConfiguration,
    hasAIProviderSecret,
} from "@/lib/ai/provider-configuration";

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
    const configuration =
        await getAIProviderConfiguration();

    if (!configuration.enabled) {
        throw new Error(
            "El servicio de IA está pausado por Datara.",
        );
    }

    const provider =
        configuration.provider;

    if (!hasAIProviderSecret(provider)) {
        throw new Error(
            `El secreto de ${provider} no está configurado en este ambiente.`,
        );
    }

    switch (provider) {
        case "gemini":
            return generateGeminiText(
                options,
                configuration.geminiModel,
            );

        case "openai":
            return generateOpenAIText(
                options,
                configuration.openAIModel,
            );

        default:
            throw new Error(
                `Proveedor de IA no soportado: ${provider || "no configurado"}.`,
            );
    }
}
