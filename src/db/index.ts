import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "La variable DATABASE_URL no está configurada.",
  );
}

const dataraEnvironment =
  process.env
    .DATARA_ENVIRONMENT
    ?.trim()
    .toLowerCase();

const expectedDatabaseHost =
  process.env
    .DATARA_EXPECTED_DATABASE_HOST
    ?.trim();

const requiresDatabaseGuard =
  process.env.NODE_ENV ===
    "development" ||
  dataraEnvironment ===
    "demo";

if (
  requiresDatabaseGuard &&
  !expectedDatabaseHost
) {
  throw new Error(
    "DATARA_EXPECTED_DATABASE_HOST es obligatoria en entornos locales y demo.",
  );
}

if (expectedDatabaseHost) {
  let databaseHost: string;

  try {
    databaseHost =
      new URL(
        databaseUrl,
      ).hostname;
  } catch {
    throw new Error(
      "DATABASE_URL no contiene una URL válida.",
    );
  }

  if (
    databaseHost !==
    expectedDatabaseHost
  ) {
    throw new Error(
      [
        "Conexión a base de datos bloqueada.",
        `Entorno: ${dataraEnvironment ?? process.env.NODE_ENV ?? "desconocido"}.`,
        `Endpoint recibido: ${databaseHost}.`,
        `Endpoint permitido: ${expectedDatabaseHost}.`,
      ].join(
        " ",
      ),
    );
  }
}

const sql = neon(databaseUrl);

export const db = drizzle({
  client: sql,
  schema,
});