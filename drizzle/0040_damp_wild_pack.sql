ALTER TABLE "subscriptions" ADD COLUMN "provider_schedule_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "product_key" text DEFAULT 'crm' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_period" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "catalog_item_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pending_billing_period" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pending_catalog_item_ids" jsonb;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pending_change_at" timestamp with time zone;