import { getCloudflareContext } from "@opennextjs/cloudflare";

type MetaEnvironment = {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_TOKEN_ENCRYPTION_KEY?: string;
  META_WEBHOOK_VERIFY_TOKEN?: string;
  DATARA_PUBLIC_URL?: string;
};

export type MetaConfiguration = {
  appId: string;
  appSecret: string;
  encryptionKey: string;
  webhookVerifyToken: string;
  publicUrl: string;
};

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} no está configurada.`);
  return normalized;
}

export async function getMetaConfiguration(): Promise<MetaConfiguration> {
  const cloudflare = await getCloudflareContext({ async: true });
  const environment = cloudflare.env as MetaEnvironment;
  return {
    appId: required(environment.META_APP_ID ?? process.env.META_APP_ID, "META_APP_ID"),
    appSecret: required(
      environment.META_APP_SECRET ?? process.env.META_APP_SECRET,
      "META_APP_SECRET",
    ),
    encryptionKey: required(
      environment.META_TOKEN_ENCRYPTION_KEY ??
        process.env.META_TOKEN_ENCRYPTION_KEY,
      "META_TOKEN_ENCRYPTION_KEY",
    ),
    webhookVerifyToken: required(
      environment.META_WEBHOOK_VERIFY_TOKEN ??
        process.env.META_WEBHOOK_VERIFY_TOKEN,
      "META_WEBHOOK_VERIFY_TOKEN",
    ),
    publicUrl: required(
      environment.DATARA_PUBLIC_URL ?? process.env.DATARA_PUBLIC_URL,
      "DATARA_PUBLIC_URL",
    ).replace(/\/$/, ""),
  };
}
