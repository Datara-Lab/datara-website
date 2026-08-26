export type AIMessage = {
    role: "user" | "assistant";
    content: string;
};

export type AIUsageMeasurement = {
    provider: string;
    model: string;
    status:
        | "success"
        | "error";
    inputTokenCount: number;
    outputTokenCount: number;
    thinkingTokenCount: number;
    cachedInputTokenCount: number;
    totalTokenCount: number;
    requestDurationMs: number;
    attemptCount: number;
    errorCode?: string;
    metadata?: Record<
        string,
        unknown
    >;
};

export type GenerateAITextOptions = {
    systemInstruction: string;
    messages: AIMessage[];
    temperature?: number;
    maxOutputTokens?: number;

    onUsage?: (
        usage: AIUsageMeasurement,
    ) =>
        | Promise<void>
        | void;
};