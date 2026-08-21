import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const environmentFile =
  process.env
    .DATARA_ENV_FILE
    ?.trim() ||
  ".env.development.local";

config({
  path: environmentFile,
  override: true,
});

function getDatabaseUrl(): string {
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
        "Migración bloqueada.",
        `Endpoint recibido: ${databaseHost}`,
        `Endpoint permitido: ${expectedDatabaseHost}`,
      ].join(
        " ",
      ),
    );
  }

  return databaseUrl;
}

async function runMigrations() {
  const databaseUrl =
    getDatabaseUrl();

  console.log(
    "Conectando con Neon...",
  );

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
    process.exit(1);
  },
);