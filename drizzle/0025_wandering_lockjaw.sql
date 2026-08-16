CREATE TABLE "inventory_count_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"count_id" uuid NOT NULL,
	"stock_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"expected_quantity" integer NOT NULL,
	"counted_quantity" integer,
	"difference" integer,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"location_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"status" text DEFAULT 'Borrador' NOT NULL,
	"notes" text,
	"created_by_clerk_user_id" text NOT NULL,
	"created_by_name" text,
	"submitted_by_clerk_user_id" text,
	"submitted_by_name" text,
	"submitted_at" timestamp with time zone,
	"approved_by_clerk_user_id" text,
	"approved_by_name" text,
	"approved_at" timestamp with time zone,
	"cancelled_by_clerk_user_id" text,
	"cancelled_by_name" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_stock_id_inventory_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."inventory_stocks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_count_items_count_stock_unique" ON "inventory_count_items" USING btree ("count_id","stock_id");--> statement-breakpoint
CREATE INDEX "inventory_count_items_tenant_count_idx" ON "inventory_count_items" USING btree ("tenant_id","count_id");--> statement-breakpoint
CREATE INDEX "inventory_count_items_tenant_product_idx" ON "inventory_count_items" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_counts_tenant_reference_unique" ON "inventory_counts" USING btree ("tenant_id","reference");--> statement-breakpoint
CREATE INDEX "inventory_counts_tenant_status_idx" ON "inventory_counts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "inventory_counts_tenant_location_idx" ON "inventory_counts" USING btree ("tenant_id","location_id","created_at");
--> statement-breakpoint
ALTER TABLE "inventory_count_items"
ADD CONSTRAINT "inventory_count_items_expected_nonnegative"
CHECK ("expected_quantity" >= 0);
--> statement-breakpoint
ALTER TABLE "inventory_count_items"
ADD CONSTRAINT "inventory_count_items_counted_nonnegative"
CHECK (
  "counted_quantity" IS NULL
  OR "counted_quantity" >= 0
);
--> statement-breakpoint
ALTER TABLE "inventory_counts"
ADD CONSTRAINT "inventory_counts_status_valid"
CHECK (
  "status" IN (
    'Borrador',
    'En revisión',
    'Aprobado',
    'Cancelado'
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_counts_location_open_unique"
ON "inventory_counts" (
  "tenant_id",
  "location_id"
)
WHERE "status" IN (
  'Borrador',
  'En revisión'
);