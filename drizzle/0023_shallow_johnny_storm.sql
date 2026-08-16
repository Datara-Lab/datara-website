CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"stock_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"source_reference" text,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'Activa' NOT NULL,
	"customer_name" text,
	"notes" text,
	"expires_at" timestamp with time zone,
	"created_by_clerk_user_id" text NOT NULL,
	"created_by_name" text,
	"released_by_clerk_user_id" text,
	"released_by_name" text,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_stock_id_inventory_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."inventory_stocks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_reservations_tenant_status_idx" ON "inventory_reservations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "inventory_reservations_tenant_location_idx" ON "inventory_reservations" USING btree ("tenant_id","location_id","status");--> statement-breakpoint
CREATE INDEX "inventory_reservations_tenant_product_idx" ON "inventory_reservations" USING btree ("tenant_id","product_id","status");--> statement-breakpoint
CREATE INDEX "inventory_reservations_source_idx" ON "inventory_reservations" USING btree ("tenant_id","source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_reservations_source_stock_unique" ON "inventory_reservations" USING btree ("tenant_id","source_type","source_id","stock_id");