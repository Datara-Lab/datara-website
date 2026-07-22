CREATE TABLE "crm_deal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"quantity" numeric(14, 3) DEFAULT '1' NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_deal_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"deal_item_id" uuid,
	"promotion_id" uuid,
	"scope" text DEFAULT 'item' NOT NULL,
	"promotion_name" text NOT NULL,
	"promotion_group" text,
	"benefit_type" text,
	"payment_method" text,
	"requires_selection" boolean DEFAULT false NOT NULL,
	"promotion_value" numeric(14, 2),
	"calculated_benefit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"customer_id" uuid,
	"source_lead_id" uuid,
	"owner_clerk_user_id" text,
	"owner_name" text,
	"owner_email" text,
	"stage" text DEFAULT 'Nueva' NOT NULL,
	"status" text DEFAULT 'Abierta' NOT NULL,
	"acquisition_channel" text,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"base_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"minimum_down_payment" numeric(14, 2),
	"customer_down_payment" numeric(14, 2),
	"financed_amount" numeric(14, 2),
	"financing_months" integer,
	"estimated_payment" numeric(14, 2),
	"probability" integer,
	"expected_close_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"next_step" text,
	"notes" text,
	"calculation_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_deal_items" ADD CONSTRAINT "crm_deal_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal_items" ADD CONSTRAINT "crm_deal_items_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal_items" ADD CONSTRAINT "crm_deal_items_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal_promotions" ADD CONSTRAINT "crm_deal_promotions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal_promotions" ADD CONSTRAINT "crm_deal_promotions_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal_promotions" ADD CONSTRAINT "crm_deal_promotions_deal_item_id_crm_deal_items_id_fk" FOREIGN KEY ("deal_item_id") REFERENCES "public"."crm_deal_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal_promotions" ADD CONSTRAINT "crm_deal_promotions_promotion_id_crm_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."crm_promotions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_source_lead_id_crm_leads_id_fk" FOREIGN KEY ("source_lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_deal_items_tenant_deal_idx" ON "crm_deal_items" USING btree ("tenant_id","deal_id");--> statement-breakpoint
CREATE INDEX "crm_deal_items_tenant_product_idx" ON "crm_deal_items" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "crm_deal_items_deal_position_idx" ON "crm_deal_items" USING btree ("deal_id","position");--> statement-breakpoint
CREATE INDEX "crm_deal_promotions_tenant_deal_idx" ON "crm_deal_promotions" USING btree ("tenant_id","deal_id");--> statement-breakpoint
CREATE INDEX "crm_deal_promotions_item_idx" ON "crm_deal_promotions" USING btree ("deal_item_id");--> statement-breakpoint
CREATE INDEX "crm_deal_promotions_promotion_idx" ON "crm_deal_promotions" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_stage_idx" ON "crm_deals" USING btree ("tenant_id","stage");--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_status_idx" ON "crm_deals" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_customer_idx" ON "crm_deals" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_lead_idx" ON "crm_deals" USING btree ("tenant_id","source_lead_id");--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_owner_idx" ON "crm_deals" USING btree ("tenant_id","owner_clerk_user_id");--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_close_idx" ON "crm_deals" USING btree ("tenant_id","expected_close_at");--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_created_idx" ON "crm_deals" USING btree ("tenant_id","created_at");