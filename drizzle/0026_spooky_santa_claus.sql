CREATE TABLE "inventory_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"location_id" uuid,
	"product_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"reason" text,
	"actor_clerk_user_id" text NOT NULL,
	"actor_name" text,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_audit_logs" ADD CONSTRAINT "inventory_audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audit_logs" ADD CONSTRAINT "inventory_audit_logs_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audit_logs" ADD CONSTRAINT "inventory_audit_logs_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audit_logs" ADD CONSTRAINT "inventory_audit_logs_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_audit_logs_tenant_created_idx" ON "inventory_audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_audit_logs_tenant_entity_idx" ON "inventory_audit_logs" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "inventory_audit_logs_tenant_branch_idx" ON "inventory_audit_logs" USING btree ("tenant_id","branch_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_audit_logs_tenant_product_idx" ON "inventory_audit_logs" USING btree ("tenant_id","product_id","created_at");