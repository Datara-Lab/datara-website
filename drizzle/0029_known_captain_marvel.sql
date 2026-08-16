CREATE TABLE "crm_service_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"customer_id" uuid,
	"deal_id" uuid,
	"sales_order_id" uuid,
	"reference" text NOT NULL,
	"status" text DEFAULT 'Borrador' NOT NULL,
	"priority" text DEFAULT 'Normal' NOT NULL,
	"service_type" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"unit_model" text NOT NULL,
	"unit_plate" text,
	"unit_identifier" text,
	"reported_problem" text NOT NULL,
	"diagnosis" text,
	"result" text,
	"owner_clerk_user_id" text,
	"owner_name" text,
	"owner_email" text,
	"scheduled_at" timestamp with time zone,
	"commitment_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"notes" text,
	"created_by_clerk_user_id" text NOT NULL,
	"created_by_name" text,
	"updated_by_clerk_user_id" text,
	"updated_by_name" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD CONSTRAINT "crm_service_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD CONSTRAINT "crm_service_orders_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD CONSTRAINT "crm_service_orders_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD CONSTRAINT "crm_service_orders_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_orders" ADD CONSTRAINT "crm_service_orders_sales_order_id_crm_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."crm_sales_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_service_orders_tenant_reference_unique" ON "crm_service_orders" USING btree ("tenant_id","reference");--> statement-breakpoint
CREATE INDEX "crm_service_orders_tenant_status_idx" ON "crm_service_orders" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "crm_service_orders_tenant_branch_idx" ON "crm_service_orders" USING btree ("tenant_id","branch_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_service_orders_tenant_customer_idx" ON "crm_service_orders" USING btree ("tenant_id","customer_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_service_orders_tenant_owner_idx" ON "crm_service_orders" USING btree ("tenant_id","owner_clerk_user_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_service_orders_tenant_schedule_idx" ON "crm_service_orders" USING btree ("tenant_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "crm_service_orders_tenant_deal_idx" ON "crm_service_orders" USING btree ("tenant_id","deal_id");--> statement-breakpoint
CREATE INDEX "crm_service_orders_tenant_sales_order_idx" ON "crm_service_orders" USING btree ("tenant_id","sales_order_id");