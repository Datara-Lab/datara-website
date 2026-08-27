ALTER TABLE "commercial_catalog_items" ADD COLUMN "included_branches" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial_catalog_items" ADD COLUMN "included_emails_per_month" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial_catalog_items" ADD CONSTRAINT "commercial_catalog_items_included_branches_check" CHECK (
          "commercial_catalog_items"."included_branches" >= 0
        );--> statement-breakpoint
ALTER TABLE "commercial_catalog_items" ADD CONSTRAINT "commercial_catalog_items_included_emails_check" CHECK (
          "commercial_catalog_items"."included_emails_per_month" >= 0
        );