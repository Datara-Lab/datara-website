import { db } from "@/db";

import {
    aiUsageEvents,
} from "@/db/schema";

import type {
    AIUsageMeasurement,
} from "@/lib/ai/types";

import type {
    DataraProduct,
} from "@/lib/auth/types";

type AIUsageChannel =
    | "internal_assistant"
    | "public_chatbot"
    | "automation"
    | "other";

type RecordAIUsageEventOptions = {
    tenantId: string;
    product: DataraProduct;
    channel: AIUsageChannel;
    clerkUserId?: string | null;
    usage: AIUsageMeasurement;
};

type ModelPricing = {
    inputPerMillionUsd: number;
    cachedInputPerMillionUsd:
        number;
    outputPerMillionUsd: number;
    pricingVersion: string;
};

function getModelPricing(
    provider: string,
    model: string,
    referenceDate =
        new Date(),
): ModelPricing | null {
    if (
        provider === "gemini" &&
        model ===
            "gemini-3.6-flash"
    ) {
        const promotionalPricing =
            referenceDate <
            new Date(
                "2027-01-01T00:00:00.000Z",
            );

        return promotionalPricing
            ? {
                inputPerMillionUsd:
                    0.75,

                cachedInputPerMillionUsd:
                    0.075,

                outputPerMillionUsd:
                    3.75,

                pricingVersion:
                    "gemini-3.6-flash-2026-promotional",
            }
            : {
                inputPerMillionUsd:
                    1.5,

                cachedInputPerMillionUsd:
                    0.15,

                outputPerMillionUsd:
                    7.5,

                pricingVersion:
                    "gemini-3.6-flash-2027-standard",
            };
    }

    return null;
}

function getCost(
    tokenCount: number,
    pricePerMillion: number,
): number {
    return (
        tokenCount /
        1_000_000
    ) * pricePerMillion;
}

function formatCost(
    value: number,
): string {
    return value.toFixed(
        8,
    );
}

export async function recordAIUsageEvent({
    tenantId,
    product,
    channel,
    clerkUserId,
    usage,
}: RecordAIUsageEventOptions): Promise<void> {
    const pricing =
        getModelPricing(
            usage.provider,
            usage.model,
        );

    const billableCachedInputTokens =
        Math.min(
            usage.inputTokenCount,
            usage.cachedInputTokenCount,
        );

    const billableStandardInputTokens =
        Math.max(
            0,

            usage.inputTokenCount -
                billableCachedInputTokens,
        );

    const billedOutputTokens =
        usage.outputTokenCount +
        usage.thinkingTokenCount;

    const estimatedInputCostUsd =
        pricing
            ? getCost(
                billableStandardInputTokens,
                pricing
                    .inputPerMillionUsd,
            ) +
              getCost(
                  billableCachedInputTokens,
                  pricing
                      .cachedInputPerMillionUsd,
              )
            : 0;

    const estimatedOutputCostUsd =
        pricing
            ? getCost(
                billedOutputTokens,
                pricing
                    .outputPerMillionUsd,
            )
            : 0;

    const estimatedTotalCostUsd =
        estimatedInputCostUsd +
        estimatedOutputCostUsd;

    await db
        .insert(
            aiUsageEvents,
        )
        .values({
            tenantId,
            product,
            channel,

            clerkUserId:
                clerkUserId ??
                null,

            provider:
                usage.provider,

            model:
                usage.model,

            status:
                usage.status,

            inputTokenCount:
                usage.inputTokenCount,

            outputTokenCount:
                usage.outputTokenCount,

            thinkingTokenCount:
                usage.thinkingTokenCount,

            cachedInputTokenCount:
                usage
                    .cachedInputTokenCount,

            totalTokenCount:
                usage.totalTokenCount,

            requestDurationMs:
                usage.requestDurationMs,

            attemptCount:
                usage.attemptCount,

            estimatedInputCostUsd:
                formatCost(
                    estimatedInputCostUsd,
                ),

            estimatedOutputCostUsd:
                formatCost(
                    estimatedOutputCostUsd,
                ),

            estimatedTotalCostUsd:
                formatCost(
                    estimatedTotalCostUsd,
                ),

            errorCode:
                usage.errorCode ??
                null,

            metadata: {
                ...(
                    usage.metadata ??
                    {}
                ),

                pricingVersion:
                    pricing
                        ?.pricingVersion ??
                    null,

                inputPerMillionUsd:
                    pricing
                        ?.inputPerMillionUsd ??
                    null,

                cachedInputPerMillionUsd:
                    pricing
                        ?.cachedInputPerMillionUsd ??
                    null,

                outputPerMillionUsd:
                    pricing
                        ?.outputPerMillionUsd ??
                    null,

                billedOutputTokens,
            },
        });
}
