CREATE TABLE "cloud_catalog_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_item_id" uuid,
	"action" text NOT NULL,
	"previous_values" jsonb,
	"next_values" jsonb,
	"changed_by_clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_key" text NOT NULL,
	"item_type" text NOT NULL,
	"billing_mode" text DEFAULT 'monthly' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"monthly_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"annual_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"one_time_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"provider_name" text,
	"provider_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"provider_cost_currency" text DEFAULT 'usd' NOT NULL,
	"vcpu" integer DEFAULT 0 NOT NULL,
	"ram_gb" numeric(10, 2) DEFAULT '0' NOT NULL,
	"storage_gb" numeric(12, 2) DEFAULT '0' NOT NULL,
	"transfer_tb" numeric(10, 2) DEFAULT '0' NOT NULL,
	"service_category" text,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cloud_catalog_items_monthly_price_check" CHECK (
          "cloud_catalog_items"."monthly_price" >= 0
        ),
	CONSTRAINT "cloud_catalog_items_annual_price_check" CHECK (
          "cloud_catalog_items"."annual_price" >= 0
        ),
	CONSTRAINT "cloud_catalog_items_one_time_price_check" CHECK (
          "cloud_catalog_items"."one_time_price" >= 0
        ),
	CONSTRAINT "cloud_catalog_items_provider_cost_check" CHECK (
          "cloud_catalog_items"."provider_cost" >= 0
        ),
	CONSTRAINT "cloud_catalog_items_vcpu_check" CHECK (
          "cloud_catalog_items"."vcpu" >= 0
        ),
	CONSTRAINT "cloud_catalog_items_ram_check" CHECK (
          "cloud_catalog_items"."ram_gb" >= 0
        ),
	CONSTRAINT "cloud_catalog_items_storage_check" CHECK (
          "cloud_catalog_items"."storage_gb" >= 0
        ),
	CONSTRAINT "cloud_catalog_items_transfer_check" CHECK (
          "cloud_catalog_items"."transfer_tb" >= 0
        )
);
--> statement-breakpoint
CREATE TABLE "commercial_storage_accounts" (
	"tenant_id" uuid NOT NULL,
	"product" "product_access" NOT NULL,
	"used_bytes" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_storage_accounts_tenant_id_product_pk" PRIMARY KEY("tenant_id","product"),
	CONSTRAINT "commercial_storage_accounts_used_check" CHECK ("commercial_storage_accounts"."used_bytes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "crm_products" ADD COLUMN "image_size_bytes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "logo_size_bytes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud_catalog_audit_logs" ADD CONSTRAINT "cloud_catalog_audit_logs_catalog_item_id_cloud_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."cloud_catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_storage_accounts" ADD CONSTRAINT "commercial_storage_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "commercial_storage_accounts" (
  "tenant_id",
  "product",
  "used_bytes"
)
SELECT
  "tenant_id",
  'crm'::"product_access",
  coalesce(sum("size_bytes"), 0)
FROM "crm_documents"
GROUP BY "tenant_id"
ON CONFLICT ("tenant_id", "product")
DO UPDATE SET
  "used_bytes" = EXCLUDED."used_bytes",
  "updated_at" = now();
--> statement-breakpoint
CREATE INDEX "cloud_catalog_audit_item_idx" ON "cloud_catalog_audit_logs" USING btree ("catalog_item_id","created_at");--> statement-breakpoint
CREATE INDEX "cloud_catalog_audit_user_idx" ON "cloud_catalog_audit_logs" USING btree ("changed_by_clerk_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cloud_catalog_items_key_unique" ON "cloud_catalog_items" USING btree ("item_key");--> statement-breakpoint
CREATE INDEX "cloud_catalog_items_type_idx" ON "cloud_catalog_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "cloud_catalog_items_active_idx" ON "cloud_catalog_items" USING btree ("active","sort_order");
