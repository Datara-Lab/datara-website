ALTER TABLE "cloud_catalog_items" ADD COLUMN "requires_quote" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial_catalog_items" DROP COLUMN "requires_quote";