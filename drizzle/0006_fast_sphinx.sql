ALTER TABLE "crm_deal_items" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "crm_deal_items" ADD COLUMN "minimum_down_payment" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "crm_deal_items" ADD COLUMN "customer_down_payment" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_deal_items" ADD COLUMN "financed_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "crm_deal_items" ADD COLUMN "financing_months" integer;--> statement-breakpoint
ALTER TABLE "crm_deal_items" ADD COLUMN "estimated_payment" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "crm_deal_items" ADD COLUMN "calculation_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;