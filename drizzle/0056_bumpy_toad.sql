ALTER TABLE "inventory_locations" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
WITH "ranked_branch_locations" AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "tenant_id", "branch_id"
      ORDER BY "is_default" DESC, "created_at" ASC
    ) AS "position"
  FROM "inventory_locations"
  WHERE
    "branch_id" IS NOT NULL
    AND lower("type") = lower('Sucursal')
)
UPDATE "inventory_locations"
SET "source" = 'branch'
FROM "ranked_branch_locations"
WHERE
  "inventory_locations"."id" = "ranked_branch_locations"."id"
  AND "ranked_branch_locations"."position" = 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_locations_tenant_branch_source_unique" ON "inventory_locations" USING btree ("tenant_id","branch_id") WHERE "inventory_locations"."source" = 'branch';
