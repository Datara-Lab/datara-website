import { randomBytes, randomUUID } from "node:crypto";

export const QR_ENTITY_TYPES = [
  "pet",
  "product",
  "inventory_unit",
  "customer",
  "asset",
] as const;

export type QREntityType = (typeof QR_ENTITY_TYPES)[number];

export function isQREntityType(value: unknown): value is QREntityType {
  return typeof value === "string" &&
    (QR_ENTITY_TYPES as readonly string[]).includes(value);
}

export function createQrPublicToken(): string {
  return randomUUID();
}

export function createQrDisplayCode(): string {
  return `DT${randomBytes(9).toString("hex").toUpperCase()}`;
}

export function normalizeQrToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^\][A-Za-z][0-9]/, "")
    .trim();
  if (!normalized) return null;

  // Formato alfanumérico para lectores USB: no depende del teclado para los símbolos.
  const compact = normalized.match(/^DATARA([0-9a-f]{32})$/i)?.[1];
  const keyboardVariant = normalized.match(/^DATARA>([0-9a-f]{8})\/([0-9a-f]{4})\/([0-9a-f]{4})\/([0-9a-f]{4})\/([0-9a-f]{12})$/i);
  if (compact) {
    return normalizeQrToken(`${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`);
  }
  if (keyboardVariant) return normalizeQrToken(keyboardVariant.slice(1).join("-"));

  const fromUrl = normalized.match(/\/q\/([0-9a-f-]{36})(?:[/?#]|$)/i)?.[1];
  const token = fromUrl ?? normalized.replace(/^DATARA:/i, "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)
    ? token.toLowerCase()
    : null;
}

export function normalizeScannedCode(value: unknown): {
  publicToken: string | null;
  displayCode: string | null;
} {
  const publicToken = normalizeQrToken(value);
  if (publicToken) return { publicToken, displayCode: null };
  const normalized = typeof value === "string"
    ? value.replace(/^\uFEFF/, "").trim().replace(/^\][A-Za-z][0-9]/, "").trim().toUpperCase()
    : "";
  return /^DT[0-9A-F]{18}$/.test(normalized)
    ? { publicToken: null, displayCode: normalized }
    : { publicToken: null, displayCode: null };
}

export function buildQrPublicUrl(token: string): string | null {
  const configuredUrl = process.env.DATARA_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_DATARA_PUBLIC_URL?.trim();
  if (!configuredUrl) {
    return null;
  }
  return `${configuredUrl.replace(/\/$/, "")}/q/${token}`;
}

// La identificación operativa no depende de un portal público.
export function buildQrScanPayload(token: string): string {
  return `DATARA${token.replaceAll("-", "").toUpperCase()}`;
}
