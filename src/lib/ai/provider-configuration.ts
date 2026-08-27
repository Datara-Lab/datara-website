import { eq } from "drizzle-orm";

import { db } from "@/db";
import { aiProviderConfigurations } from "@/db/schema";

export type AIProvider = "gemini" | "openai";

export type AIProviderConfiguration = {
  environment: string;
  enabled: boolean;
  provider: AIProvider;
  geminiModel: string;
  openAIModel: string;
  source: "database" | "environment";
};

export function getDataraEnvironment(): string {
  return process.env.DATARA_ENVIRONMENT?.trim().toLowerCase() ||
    (process.env.NODE_ENV === "production" ? "production" : "development");
}

function getEnvironmentProvider(): AIProvider {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "openai"
    ? "openai"
    : "gemini";
}

export async function getAIProviderConfiguration(): Promise<AIProviderConfiguration> {
  const environment = getDataraEnvironment();
  const [stored] = await db
    .select()
    .from(aiProviderConfigurations)
    .where(eq(aiProviderConfigurations.environment, environment))
    .limit(1);

  if (stored) {
    return {
      environment,
      enabled: stored.enabled,
      provider: stored.provider,
      geminiModel: stored.geminiModel,
      openAIModel: stored.openAIModel,
      source: "database",
    };
  }

  return {
    environment,
    enabled: true,
    provider: getEnvironmentProvider(),
    geminiModel: process.env.AI_MODEL?.trim() || "gemini-3.6-flash",
    openAIModel: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
    source: "environment",
  };
}

export function hasAIProviderSecret(provider: AIProvider): boolean {
  return Boolean(
    provider === "gemini"
      ? process.env.GEMINI_API_KEY?.trim()
      : process.env.OPENAI_API_KEY?.trim(),
  );
}
