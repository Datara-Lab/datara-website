CREATE TABLE "crm_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_type" text DEFAULT 'Persona' NOT NULL,
	"name" text NOT NULL,
	"last_name" text,
	"company_name" text,
	"legal_name" text,
	"tax_id" text,
	"email" text,
	"phone" text,
	"mobile" text,
	"status" text DEFAULT 'Activo' NOT NULL,
	"source_lead_id" uuid,
	"product_id" uuid,
	"owner_clerk_user_id" text,
	"owner_name" text,
	"owner_email" text,
	"address_line" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text DEFAULT 'MX' NOT NULL,
	"commercial_consent" boolean DEFAULT false NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_source_lead_id_crm_leads_id_fk" FOREIGN KEY ("source_lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_customers_tenant_tax_id_unique" ON "crm_customers" USING btree ("tenant_id","tax_id");--> statement-breakpoint
CREATE INDEX "crm_customers_tenant_status_idx" ON "crm_customers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "crm_customers_tenant_type_idx" ON "crm_customers" USING btree ("tenant_id","customer_type");--> statement-breakpoint
CREATE INDEX "crm_customers_tenant_name_idx" ON "crm_customers" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "crm_customers_tenant_email_idx" ON "crm_customers" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "crm_customers_tenant_phone_idx" ON "crm_customers" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "crm_customers_tenant_owner_idx" ON "crm_customers" USING btree ("tenant_id","owner_clerk_user_id");--> statement-breakpoint
CREATE INDEX "crm_customers_tenant_created_idx" ON "crm_customers" USING btree ("tenant_id","created_at");