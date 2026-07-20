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

const sql = neon(databaseUrl);

export const db = drizzle({
  client: sql,
  schema,
});