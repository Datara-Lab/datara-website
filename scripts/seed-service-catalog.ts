import { config } from "dotenv";

async function main() {
  const environment = process.argv[2];
  if (!["development", "demo", "production"].includes(environment)) {
    throw new Error("Selecciona explícitamente el ambiente: npx tsx scripts/seed-service-catalog.ts development|demo|production");
  }
  if (environment === "production" && !process.argv.includes("--confirm-production")) {
    throw new Error("Confirma explícitamente el seed de producción con --confirm-production.");
  }
  const loaded = config({ path: `.env.${environment}.local`, override: true, quiet: true });
  if (loaded.error) throw new Error("No fue posible cargar el archivo del ambiente seleccionado.");
  if (process.env.DATARA_ENVIRONMENT !== environment || !process.env.DATARA_EXPECTED_DATABASE_HOST) {
    throw new Error("Ambiente inconsistente o DATARA_EXPECTED_DATABASE_HOST no configurada.");
  }
  // Use the same guarded connection as the application, after loading the selected environment.
  const { db } = await import("../src/db");
  const { seedServiceCatalog } = await import("../src/db/seeds/service-catalog");
  const inserted = await seedServiceCatalog(db);
  console.log(`Catálogo inicializado en ${environment}: ${inserted.length} productos nuevos. Los existentes se conservaron.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No fue posible inicializar el catálogo.");
  process.exitCode = 1;
});
