export type AIMessage = {
    role: "user" | "assistant";
    content: string;
};

export type GenerateAITextOptions = {
    systemInstruction: string;
    messages: AIMessage[];
    temperature?: number;
    maxOutputTokens?: number;
};