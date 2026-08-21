import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const environmentFile =
  process.env
    .DATARA_ENV_FILE
    ?.trim() ||
  ".env.development.local";

config({
  path: environmentFile,
  override: true,
});

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "La variable DATABASE_URL no está configurada.",
  );
}

const expectedDatabaseHost =
  process.env
    .DATARA_EXPECTED_DATABASE_HOST
    ?.trim() ||
  "ep-aged-wildflower-audj25dr-pooler.c-10.us-east-1.aws.neon.tech";

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
      "Acceso de Drizzle bloqueado.",
      `Endpoint recibido: ${databaseHost}`,
      `Endpoint permitido: ${expectedDatabaseHost}`,
    ].join(
      " ",
    ),
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",

  dbCredentials: {
    url: databaseUrl,
  },

  strict: true,
  verbose: true,
});