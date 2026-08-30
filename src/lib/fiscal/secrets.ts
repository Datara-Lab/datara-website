import { getCloudflareContext } from "@opennextjs/cloudflare";

import type {
  FiscalCredentialsReference,
} from "@/lib/fiscal/types";

export type FinkokCredentials = {
  username: string;
  password: string;
  taxpayerId: string;
  certificateSerial: string;
};

const SAFE_SECRET_REFERENCE = /^[A-Z][A-Z0-9_]{2,127}$/;

function required(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} no está configurado.`);
  }

  return value.trim();
}

function parseFinkokCredentials(raw: string): FinkokCredentials {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(
      "El secreto de Finkok debe contener un objeto JSON válido.",
    );
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("El secreto de Finkok no tiene el formato esperado.");
  }

  const record = value as Record<string, unknown>;

  return {
    username: required(record.username, "El usuario de Finkok"),
    password: required(record.password, "La contraseña de Finkok"),
    taxpayerId: required(record.taxpayerId, "El RFC emisor de Finkok")
      .toUpperCase(),
    certificateSerial: required(
      record.certificateSerial,
      "El número de certificado de Finkok",
    ),
  };
}

export async function resolveFinkokCredentials(
  reference: FiscalCredentialsReference,
): Promise<FinkokCredentials> {
  if (reference.provider !== "finkok") {
    throw new Error(`El proveedor fiscal ${reference.provider} no es Finkok.`);
  }

  const secretReference = reference.secretReference.trim();

  if (!SAFE_SECRET_REFERENCE.test(secretReference)) {
    throw new Error("La referencia del secreto fiscal no es válida.");
  }

  const cloudflare = await getCloudflareContext({ async: true });
  const environment = cloudflare.env as unknown as Record<string, unknown>;
  const cloudflareValue = environment[secretReference];
  const localValue = process.env[secretReference];
  const raw =
    typeof cloudflareValue === "string" ? cloudflareValue : localValue;

  return parseFinkokCredentials(
    required(raw, `El secreto ${secretReference}`),
  );
}
