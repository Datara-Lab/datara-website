CREATE TABLE "commercial_catalog_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_item_id" uuid,
	"action" text NOT NULL,
	"previous_values" jsonb,
	"next_values" jsonb,
	"changed_by_clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_key" text NOT NULL,
	"item_key" text NOT NULL,
	"item_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"monthly_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"annual_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"included_users" integer DEFAULT 0 NOT NULL,
	"included_storage_gb" numeric(10, 2) DEFAULT '0' NOT NULL,
	"module_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"recommended" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_catalog_items_monthly_price_check" CHECK (
          "commercial_catalog_items"."monthly_price" >= 0
        ),
	CONSTRAINT "commercial_catalog_items_annual_price_check" CHECK (
          "commercial_catalog_items"."annual_price" >= 0
        ),
	CONSTRAINT "commercial_catalog_items_included_users_check" CHECK (
          "commercial_catalog_items"."included_users" >= 0
        ),
	CONSTRAINT "commercial_catalog_items_storage_check" CHECK (
          "commercial_catalog_items"."included_storage_gb" >= 0
        )
);
--> statement-breakpoint
ALTER TABLE "commercial_catalog_audit_logs" ADD CONSTRAINT "commercial_catalog_audit_logs_catalog_item_id_commercial_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."commercial_catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commercial_catalog_audit_item_idx" ON "commercial_catalog_audit_logs" USING btree ("catalog_item_id","created_at");--> statement-breakpoint
CREATE INDEX "commercial_catalog_audit_user_idx" ON "commercial_catalog_audit_logs" USING btree ("changed_by_clerk_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_catalog_items_product_key_unique" ON "commercial_catalog_items" USING btree ("product_key","item_key");--> statement-breakpoint
CREATE INDEX "commercial_catalog_items_product_active_idx" ON "commercial_catalog_items" USING btree ("product_key","active","sort_order");--> statement-breakpoint
CREATE INDEX "commercial_catalog_items_type_idx" ON "commercial_catalog_items" USING btree ("item_type");