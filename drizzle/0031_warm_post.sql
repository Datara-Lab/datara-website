CREATE TABLE "crm_service_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_order_id" uuid NOT NULL,
	"product_id" uuid,
	"item_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"quantity" numeric(14, 3) DEFAULT '1' NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"authorization_status" text DEFAULT 'Pendiente' NOT NULL,
	"authorized_quantity" numeric(14, 3),
	"position" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "authorization_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "authorization_requested_by_clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "authorization_requested_by_name" text;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "authorized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "authorized_by_clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "authorized_by_name" text;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "authorization_notes" text;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "work_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "work_completed_by_clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "work_completed_by_name" text;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "returned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "returned_by_clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "returned_by_name" text;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD COLUMN "return_reason" text;--> statement-breakpoint
ALTER TABLE "crm_service_order_items" ADD CONSTRAINT "crm_service_order_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_order_items" ADD CONSTRAINT "crm_service_order_items_service_order_id_crm_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."crm_service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_order_items" ADD CONSTRAINT "crm_service_order_items_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_service_order_items_tenant_order_idx" ON "crm_service_order_items" USING btree ("tenant_id","service_order_id");--> statement-breakpoint
CREATE INDEX "crm_service_order_items_tenant_product_idx" ON "crm_service_order_items" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "crm_service_order_items_order_position_idx" ON "crm_service_order_items" USING btree ("service_order_id","position");