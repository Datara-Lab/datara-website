const encoder = new TextEncoder();

function base64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64Url(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))),
  );
}

export async function createMetaState(
  data: { tenantId: string; clerkUserId: string },
  secret: string,
): Promise<string> {
  const payload = base64Url(
    encoder.encode(
      JSON.stringify({
        ...data,
        nonce: crypto.randomUUID(),
        expiresAt: Date.now() + 10 * 60 * 1000,
      }),
    ),
  );
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyMetaState(
  state: string,
  secret: string,
): Promise<{ tenantId: string; clerkUserId: string }> {
  const [payload, receivedSignature] = state.split(".");
  if (!payload || !receivedSignature) throw new Error("Estado OAuth inválido.");
  const expected = await signature(payload, secret);
  if (expected !== receivedSignature) throw new Error("Firma OAuth inválida.");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const data = JSON.parse(atob(normalized)) as {
    tenantId?: unknown;
    clerkUserId?: unknown;
    expiresAt?: unknown;
  };
  if (
    typeof data.tenantId !== "string" ||
    typeof data.clerkUserId !== "string" ||
    typeof data.expiresAt !== "number" ||
    data.expiresAt < Date.now()
  ) {
    throw new Error("El estado OAuth expiró o no es válido.");
  }
  return { tenantId: data.tenantId, clerkUserId: data.clerkUserId };
}
