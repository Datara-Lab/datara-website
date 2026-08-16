CREATE TABLE "inventory_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"name" text NOT NULL,
	"code" text,
	"type" text DEFAULT 'Bodega' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"address_line" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text DEFAULT 'MX' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "inventory_stocks_tenant_branch_product_unique";--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "unit_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "total_cost" numeric(16, 2);--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "resulting_average_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "inventory_stocks" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_stocks" ADD COLUMN "maximum_quantity" integer;--> statement-breakpoint
ALTER TABLE "inventory_stocks" ADD COLUMN "reorder_point" integer;--> statement-breakpoint
ALTER TABLE "inventory_stocks" ADD COLUMN "average_unit_cost" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_stocks" ADD COLUMN "last_unit_cost" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_locations_tenant_code_unique" ON "inventory_locations" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "inventory_locations_tenant_active_idx" ON "inventory_locations" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE INDEX "inventory_locations_tenant_branch_idx" ON "inventory_locations" USING btree ("tenant_id","branch_id");--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stocks" ADD CONSTRAINT "inventory_stocks_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "inventory_locations" (
        "tenant_id",
        "branch_id",
        "name",
        "code",
        "type",
        "active",
        "is_default"
)
SELECT
        "tenant_id",
        "id",
        "name" || ' - Inventario',
        'LOC-' || upper(substr(replace("id"::text, '-', ''), 1, 12)),
        'Sucursal',
        "active",
        true
FROM "tenant_branches";--> statement-breakpoint

UPDATE "inventory_stocks" AS stock
SET "location_id" = location."id"
FROM "inventory_locations" AS location
WHERE location."tenant_id" = stock."tenant_id"
  AND location."branch_id" = stock."branch_id"
  AND location."is_default" = true;--> statement-breakpoint

UPDATE "inventory_movements" AS movement
SET "location_id" = location."id"
FROM "inventory_locations" AS location
WHERE location."tenant_id" = movement."tenant_id"
  AND location."branch_id" = movement."branch_id"
  AND location."is_default" = true;--> statement-breakpoint
CREATE INDEX "inventory_movements_tenant_location_idx" ON "inventory_movements" USING btree ("tenant_id","location_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_stocks_tenant_location_product_unique" ON "inventory_stocks" USING btree ("tenant_id","location_id","product_id");--> statement-breakpoint
CREATE INDEX "inventory_stocks_tenant_location_idx" ON "inventory_stocks" USING btree ("tenant_id","location_id");