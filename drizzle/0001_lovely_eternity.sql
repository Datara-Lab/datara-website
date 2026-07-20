CREATE TABLE "crm_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"category" text,
	"unit_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"source_external_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_products" ADD CONSTRAINT "crm_products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_products_tenant_code_unique" ON "crm_products" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_products_tenant_external_unique" ON "crm_products" USING btree ("tenant_id","source_external_id");--> statement-breakpoint
CREATE INDEX "crm_products_tenant_active_idx" ON "crm_products" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE INDEX "crm_products_tenant_name_idx" ON "crm_products" USING btree ("tenant_id","name");