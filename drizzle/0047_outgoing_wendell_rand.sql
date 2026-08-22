ALTER TABLE "commercial_catalog_items" ADD COLUMN "included_ai_messages" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial_catalog_items" ADD CONSTRAINT "commercial_catalog_items_ai_messages_check" CHECK (
          "commercial_catalog_items"."included_ai_messages" >= 0
        );