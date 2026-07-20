import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

config({
  path: ".env.local",
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