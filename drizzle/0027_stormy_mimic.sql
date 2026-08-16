CREATE TABLE "inventory_replenishment_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"branch_id" uuid,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"stock_id" uuid NOT NULL,
	"requested_quantity" integer NOT NULL,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(14, 2),
	"total_cost" numeric(14, 2),
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_replenishment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"reference" text NOT NULL,
	"status" text DEFAULT 'Borrador' NOT NULL,
	"supplier_name" text,
	"supplier_reference" text,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"notes" text,
	"external_system" text,
	"external_id" text,
	"external_reference" text,
	"sync_status" text DEFAULT 'Pendiente' NOT NULL,
	"sync_error" text,
	"requested_by_clerk_user_id" text NOT NULL,
	"requested_by_name" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_replenishment_request_items" ADD CONSTRAINT "inventory_replenishment_request_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_replenishment_request_items" ADD CONSTRAINT "inventory_replenishment_request_items_request_id_inventory_replenishment_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."inventory_replenishment_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_replenishment_request_items" ADD CONSTRAINT "inventory_replenishment_request_items_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_replenishment_request_items" ADD CONSTRAINT "inventory_replenishment_request_items_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_replenishment_request_items" ADD CONSTRAINT "inventory_replenishment_request_items_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_replenishment_request_items" ADD CONSTRAINT "inventory_replenishment_request_items_stock_id_inventory_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."inventory_stocks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_replenishment_requests" ADD CONSTRAINT "inventory_replenishment_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_replenishment_requests" ADD CONSTRAINT "inventory_replenishment_requests_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_replenishment_request_items_request_stock_unique" ON "inventory_replenishment_request_items" USING btree ("request_id","stock_id");--> statement-breakpoint
CREATE INDEX "inventory_replenishment_request_items_tenant_request_idx" ON "inventory_replenishment_request_items" USING btree ("tenant_id","request_id");--> statement-breakpoint
CREATE INDEX "inventory_replenishment_request_items_tenant_product_idx" ON "inventory_replenishment_request_items" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "inventory_replenishment_request_items_tenant_location_idx" ON "inventory_replenishment_request_items" USING btree ("tenant_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_replenishment_requests_tenant_reference_unique" ON "inventory_replenishment_requests" USING btree ("tenant_id","reference");--> statement-breakpoint
CREATE INDEX "inventory_replenishment_requests_tenant_status_idx" ON "inventory_replenishment_requests" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "inventory_replenishment_requests_tenant_branch_idx" ON "inventory_replenishment_requests" USING btree ("tenant_id","branch_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_replenishment_requests_external_idx" ON "inventory_replenishment_requests" USING btree ("tenant_id","external_system","external_id");