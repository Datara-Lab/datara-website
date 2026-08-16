CREATE TABLE "crm_sales_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_sales_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"customer_id" uuid,
	"deal_id" uuid,
	"quote_id" uuid,
	"reference" text NOT NULL,
	"status" text DEFAULT 'Borrador' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"owner_clerk_user_id" text,
	"owner_name" text,
	"owner_email" text,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"base_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"notes" text,
	"created_by_clerk_user_id" text NOT NULL,
	"created_by_name" text,
	"confirmed_by_clerk_user_id" text,
	"confirmed_by_name" text,
	"confirmed_at" timestamp with time zone,
	"delivered_by_clerk_user_id" text,
	"delivered_by_name" text,
	"delivered_at" timestamp with time zone,
	"cancelled_by_clerk_user_id" text,
	"cancelled_by_name" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_sales_order_items" ADD CONSTRAINT "crm_sales_order_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sales_order_items" ADD CONSTRAINT "crm_sales_order_items_sales_order_id_crm_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."crm_sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sales_order_items" ADD CONSTRAINT "crm_sales_order_items_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sales_orders" ADD CONSTRAINT "crm_sales_orders_quote_id_crm_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."crm_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_sales_order_items_tenant_order_idx" ON "crm_sales_order_items" USING btree ("tenant_id","sales_order_id");--> statement-breakpoint
CREATE INDEX "crm_sales_order_items_tenant_product_idx" ON "crm_sales_order_items" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "crm_sales_order_items_order_position_idx" ON "crm_sales_order_items" USING btree ("sales_order_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_sales_orders_tenant_reference_unique" ON "crm_sales_orders" USING btree ("tenant_id","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_sales_orders_tenant_deal_unique" ON "crm_sales_orders" USING btree ("tenant_id","deal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_sales_orders_tenant_quote_unique" ON "crm_sales_orders" USING btree ("tenant_id","quote_id");--> statement-breakpoint
CREATE INDEX "crm_sales_orders_tenant_status_idx" ON "crm_sales_orders" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "crm_sales_orders_tenant_branch_idx" ON "crm_sales_orders" USING btree ("tenant_id","branch_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_sales_orders_tenant_customer_idx" ON "crm_sales_orders" USING btree ("tenant_id","customer_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_sales_orders_tenant_owner_idx" ON "crm_sales_orders" USING btree ("tenant_id","owner_clerk_user_id","created_at");