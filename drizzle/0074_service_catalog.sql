CREATE TABLE "service_catalog_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_item_id" uuid,
	"action" text NOT NULL,
	"previous_values" jsonb,
	"next_values" jsonb,
	"changed_by_clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"item_key" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text NOT NULL,
	"description" text,
	"one_time_price" numeric(12, 2),
	"price_prefix" text,
	"monthly_price" numeric(12, 2),
	"monthly_label" text,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"icon" text DEFAULT 'globe' NOT NULL,
	"badge" text,
	"recommended" boolean DEFAULT false NOT NULL,
	"requires_quote" boolean DEFAULT false NOT NULL,
	"cta_label" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_by_clerk_user_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_catalog_items_price_check" CHECK ("service_catalog_items"."one_time_price" >= 0 AND "service_catalog_items"."monthly_price" >= 0),
	CONSTRAINT "service_catalog_items_quote_price_check" CHECK ("service_catalog_items"."requires_quote" OR "service_catalog_items"."one_time_price" IS NOT NULL),
	CONSTRAINT "service_catalog_items_order_check" CHECK ("service_catalog_items"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "service_catalog_audit_logs" ADD CONSTRAINT "service_catalog_audit_logs_catalog_item_id_service_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."service_catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_catalog_audit_item_idx" ON "service_catalog_audit_logs" USING btree ("catalog_item_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_catalog_items_category_key_unique" ON "service_catalog_items" USING btree ("category","item_key");--> statement-breakpoint
CREATE INDEX "service_catalog_items_category_active_order_idx" ON "service_catalog_items" USING btree ("category","active","sort_order");