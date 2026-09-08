import { existsSync } from "node:fs";

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const supportedEnvironments = [
  "development",
  "demo",
  "production",
] as const;

type DataraEnvironment =
  (typeof supportedEnvironments)[number];

const environmentFiles: Record<
  DataraEnvironment,
  string
> = {
  development:
    ".env.development.local",
  demo:
    ".env.demo.local",
  production:
    ".env.production.local",
};

function getSelectedEnvironment(): DataraEnvironment {
  const candidate =
    process.argv[2]?.trim();

  if (
    !supportedEnvironments.includes(
      candidate as DataraEnvironment,
    )
  ) {
    throw new Error(
      [
        "Selecciona explícitamente el ambiente.",
        "Usa uno de estos comandos:",
        "npm run db:migrate:development",
        "npm run db:migrate:demo",
        "npm run db:migrate:production -- --confirm-production",
      ].join("\n"),
    );
  }

  return candidate as DataraEnvironment;
}

function loadEnvironment(
  environment: DataraEnvironment,
): void {
  const environmentFile =
    environmentFiles[environment];

  if (!existsSync(environmentFile)) {
    throw new Error(
      `No existe el archivo ${environmentFile}.`,
    );
  }

  const result = config({
    path: environmentFile,
    override: true,
  });

  if (result.error) {
    throw result.error;
  }

  const declaredEnvironment =
    process.env
      .DATARA_ENVIRONMENT
      ?.trim();

  if (
    declaredEnvironment !==
    environment
  ) {
    throw new Error(
      [
        "Migración bloqueada por ambiente inconsistente.",
        `Ambiente solicitado: ${environment}`,
        `DATARA_ENVIRONMENT recibido: ${declaredEnvironment || "vacío"}`,
        `Archivo cargado: ${environmentFile}`,
      ].join(" "),
    );
  }

  if (
    environment === "production" &&
    !process.argv.includes(
      "--confirm-production",
    )
  ) {
    throw new Error(
      [
        "Migración de producción bloqueada.",
        "Confirma de forma explícita con:",
        "npm run db:migrate:production -- --confirm-production",
      ].join("\n"),
    );
  }
}

function getDatabaseConnection(): {
  databaseUrl: string;
  databaseHost: string;
  databaseName: string;
} {
  const databaseUrl =
    process.env
      .DATABASE_URL
      ?.trim();

  if (!databaseUrl) {
    throw new Error(
      "La variable DATABASE_URL no está configurada.",
    );
  }

  const expectedDatabaseHost =
    process.env
      .DATARA_EXPECTED_DATABASE_HOST
      ?.trim();

  if (!expectedDatabaseHost) {
    throw new Error(
      "DATARA_EXPECTED_DATABASE_HOST no está configurada.",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error(
      "DATABASE_URL no contiene una URL válida.",
    );
  }

  if (
    parsedUrl.protocol !== "postgres:" &&
    parsedUrl.protocol !== "postgresql:"
  ) {
    throw new Error(
      "DATABASE_URL no utiliza el protocolo PostgreSQL.",
    );
  }

  if (
    parsedUrl.hostname !==
    expectedDatabaseHost
  ) {
    throw new Error(
      [
        "Migración bloqueada.",
        `Endpoint recibido: ${parsedUrl.hostname}`,
        `Endpoint permitido: ${expectedDatabaseHost}`,
      ].join(" "),
    );
  }

  return {
    databaseUrl,
    databaseHost:
      parsedUrl.hostname,
    databaseName:
      parsedUrl.pathname.replace(/^\//, "") ||
      "desconocida",
  };
}

async function runMigrations() {
  const environment =
    getSelectedEnvironment();

  loadEnvironment(environment);

  const {
    databaseUrl,
    databaseHost,
    databaseName,
  } = getDatabaseConnection();

  console.log({
    environment,
    databaseHost,
    databaseName,
  });

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log(
    "Aplicando migraciones...",
  );

  await migrate(db, {
    migrationsFolder: "drizzle",
  });

  console.log(
    "Migraciones aplicadas correctamente.",
  );
}

runMigrations().catch(
  (error: unknown) => {
    console.error(
      "No fue posible aplicar las migraciones.",
    );

    console.error(error);
    process.exitCode = 1;
  },
);
