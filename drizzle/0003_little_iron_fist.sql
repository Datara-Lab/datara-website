CREATE TABLE "crm_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text,
	"mobile" text,
	"company" text,
	"source" text,
	"status" text DEFAULT 'Nuevo' NOT NULL,
	"product_id" uuid,
	"owner_clerk_user_id" text,
	"owner_name" text,
	"owner_email" text,
	"commercial_consent" boolean DEFAULT false NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_leads_tenant_status_idx" ON "crm_leads" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "crm_leads_tenant_owner_idx" ON "crm_leads" USING btree ("tenant_id","owner_clerk_user_id");--> statement-breakpoint
CREATE INDEX "crm_leads_tenant_email_idx" ON "crm_leads" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "crm_leads_tenant_phone_idx" ON "crm_leads" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "crm_leads_tenant_created_idx" ON "crm_leads" USING btree ("tenant_id","created_at");