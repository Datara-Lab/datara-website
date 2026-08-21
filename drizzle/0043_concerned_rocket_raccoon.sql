ALTER TABLE "commercial_catalog_items" ADD COLUMN "installments_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial_catalog_items" ADD COLUMN "installments_discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial_catalog_items" ADD COLUMN "annual_installments_price" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial_catalog_items" ADD COLUMN "stripe_annual_installments_price_id" text;