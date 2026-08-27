const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptMetaToken(
  token: string,
  secret: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getKey(secret),
    encoder.encode(token),
  );
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}

export async function decryptMetaToken(
  value: string,
  secret: string,
): Promise<string> {
  const [version, iv, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !encrypted) {
    throw new Error("El token cifrado de Meta no tiene un formato válido.");
  }
  const ivBytes = fromBase64(iv);
  const encryptedBytes = fromBase64(encrypted);
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBytes.buffer.slice(
        ivBytes.byteOffset,
        ivBytes.byteOffset + ivBytes.byteLength,
      ) as ArrayBuffer,
    },
    await getKey(secret),
    encryptedBytes.buffer.slice(
      encryptedBytes.byteOffset,
      encryptedBytes.byteOffset + encryptedBytes.byteLength,
    ) as ArrayBuffer,
  );
  return decoder.decode(plain);
}
