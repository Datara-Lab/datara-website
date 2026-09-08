import { sql } from "drizzle-orm";

import { db } from "../src/db";

const technicalFields = [
  { key: "packageUnitType", label: "Cada uso descuenta", type: "select", required: true, active: true, sortOrder: 10, options: ["Día", "Noche", "Acceso"] },
  { key: "includedUnits", label: "Cantidad incluida", type: "number", required: true, active: true, sortOrder: 20, placeholder: "10" },
  { key: "validityDays", label: "Vigencia después de la compra (días)", type: "number", required: false, active: true, sortOrder: 30, placeholder: "90" },
  { key: "transferableBetweenPets", label: "¿Se puede compartir?", type: "select", required: true, active: true, sortOrder: 40, options: ["Sí", "No"] },
  { key: "includedHours", label: "Horas incluidas por acceso o día", type: "number", required: false, active: true, sortOrder: 50, placeholder: "5" },
  { key: "toleranceMinutes", label: "Tolerancia (minutos)", type: "number", required: false, active: true, sortOrder: 60, placeholder: "15" },
  { key: "overagePolicy", label: "Al exceder las horas incluidas", type: "select", required: true, active: true, sortOrder: 70, options: ["Descontar otra unidad", "Cobrar el excedente"] },
  { key: "closingTime", label: "Hora de cierre", type: "text", required: false, active: true, sortOrder: 80, placeholder: "20:00" },
  { key: "boardingCheckoutTime", label: "Hora límite de salida de pensión", type: "text", required: false, active: true, sortOrder: 90, placeholder: "12:00" },
];

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) {
    const preview = await db.execute<{ tenantName: string; productTypeId: string }>(sql`
      SELECT tenant.name AS "tenantName", product_type.id AS "productTypeId"
      FROM crm_product_types product_type
      INNER JOIN tenants tenant ON tenant.id = product_type.tenant_id
      WHERE tenant.industry = 'veterinary'
        AND product_type.key = 'stay_package'
      ORDER BY tenant.name
    `);
    console.table(preview.rows);
    console.log("Vista previa. Ejecuta nuevamente con --apply para actualizar estos tipos de producto.");
    return;
  }
  const result = await db.execute<{ tenantName: string; productTypeId: string }>(sql`
    UPDATE crm_product_types product_type
    SET metadata = jsonb_set(
      COALESCE(product_type.metadata, '{}'::jsonb),
      '{technicalFields}',
      ${JSON.stringify(technicalFields)}::jsonb,
      true
    ), updated_at = NOW()
    FROM tenants tenant
    WHERE product_type.tenant_id = tenant.id
      AND tenant.industry = 'veterinary'
      AND product_type.key = 'stay_package'
    RETURNING tenant.name AS "tenantName", product_type.id AS "productTypeId"
  `);
  await db.execute(sql`
    INSERT INTO crm_product_categories (
      id, tenant_id, product_type_id, item_type, name, active, sort_order, metadata, created_at, updated_at
    )
    SELECT gen_random_uuid(), product_type.tenant_id, product_type.id, 'service', category.name, true, category.sort_order,
      '{"provisionedFor":"pet_commercial_packages_v1"}'::jsonb, NOW(), NOW()
    FROM crm_product_types product_type
    INNER JOIN tenants tenant ON tenant.id = product_type.tenant_id
    CROSS JOIN (VALUES ('Guardería', 10), ('Pensión', 20), ('Ambos', 30)) AS category(name, sort_order)
    WHERE tenant.industry = 'veterinary'
      AND product_type.key = 'stay_package'
    ON CONFLICT DO NOTHING
  `);
  await db.execute(sql`
    UPDATE crm_products product
    SET category = CASE product.metadata->'technicalSpecifications'->>'packageServiceType'
        WHEN 'Guardería' THEN 'Guardería'
        WHEN 'Pensión' THEN 'Pensión'
        WHEN 'Ambos' THEN 'Ambos'
        WHEN 'Mixto' THEN 'Ambos'
        ELSE product.category
      END,
      metadata = product.metadata #- '{technicalSpecifications,packageServiceType}',
      updated_at = NOW()
    FROM crm_product_types product_type
    INNER JOIN tenants tenant ON tenant.id = product_type.tenant_id
    WHERE product.product_type_id = product_type.id
      AND product.tenant_id = product_type.tenant_id
      AND tenant.industry = 'veterinary'
      AND product_type.key = 'stay_package'
      AND product.metadata->'technicalSpecifications'->>'packageServiceType' IN ('Guardería', 'Pensión', 'Ambos', 'Mixto')
  `);
  console.table(result.rows);
  console.log(`Tipos de paquete reconciliados: ${result.rows.length}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
