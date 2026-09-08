import { sql } from "drizzle-orm";

import { db } from "../src/db";

type ColumnRow = {
  table_name: string;
  column_name: string;
  is_nullable: string;
  column_default: string | null;
};

async function main() {
  const result = await db.execute<ColumnRow>(sql`
    SELECT table_name, column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'tenants' AND column_name IN (
          'fiscal_tax_regime', 'fiscal_postal_code'
        ))
        OR
        (table_name = 'crm_customers' AND column_name IN (
          'fiscal_tax_regime', 'cfdi_use'
        ))
        OR
        (table_name = 'crm_products' AND column_name IN (
          'product_service_code', 'unit_code', 'tax_object',
          'transferred_tax_code', 'transferred_factor_type',
          'transferred_tax_rate'
        ))
        OR
        (table_name = 'sales_invoices' AND column_name IN (
          'series', 'folio', 'payment_form', 'payment_method', 'cfdi_type',
          'fiscal_provider', 'fiscal_environment', 'fiscal_uuid',
          'stamped_at', 'cancellation_requested_at', 'cancelled_at',
          'cancellation_reason_code', 'replacement_uuid',
          'xml_object_key', 'pdf_object_key'
        ))
      )
    ORDER BY table_name, ordinal_position
  `);

  const expected = 25;

  console.table(result.rows);

  if (result.rows.length !== expected) {
    throw new Error(
      `Se esperaban ${expected} columnas fiscales y se encontraron ${result.rows.length}.`,
    );
  }

  console.log("DATARA_FISCAL_CFDI_DEVELOPMENT_SCHEMA_VERIFIED=1");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
