ALTER TABLE "commercial_catalog_items" ADD COLUMN "annual_discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial_catalog_items" ADD CONSTRAINT "commercial_catalog_items_annual_discount_check" CHECK (
          "commercial_catalog_items"."annual_discount_percent" >= 0
          AND
          "commercial_catalog_items"."annual_discount_percent" <= 100
        );