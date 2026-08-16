CREATE TABLE "crm_quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"quantity" numeric(14, 3) DEFAULT '1' NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"base_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(7, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"minimum_down_payment" numeric(14, 2),
	"customer_down_payment" numeric(14, 2) DEFAULT '0' NOT NULL,
	"financed_amount" numeric(14, 2),
	"financing_months" integer,
	"estimated_payment" numeric(14, 2),
	"calculation_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_quote_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"quote_item_id" uuid,
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
CREATE TABLE "crm_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quote_number" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'Borrador' NOT NULL,
	"customer_id" uuid,
	"source_lead_id" uuid,
	"deal_id" uuid,
	"owner_clerk_user_id" text NOT NULL,
	"owner_name" text,
	"owner_email" text,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"valid_until" timestamp with time zone,
	"base_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"adjustment_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"minimum_down_payment" numeric(14, 2),
	"customer_down_payment" numeric(14, 2),
	"financed_amount" numeric(14, 2),
	"financing_months" integer,
	"estimated_payment" numeric(14, 2),
	"billing_address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shipping_address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"commercial_summary" text,
	"terms_and_conditions" text,
	"description" text,
	"calculation_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_quote_items" ADD CONSTRAINT "crm_quote_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quote_items" ADD CONSTRAINT "crm_quote_items_quote_id_crm_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."crm_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quote_items" ADD CONSTRAINT "crm_quote_items_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quote_promotions" ADD CONSTRAINT "crm_quote_promotions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quote_promotions" ADD CONSTRAINT "crm_quote_promotions_quote_id_crm_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."crm_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quote_promotions" ADD CONSTRAINT "crm_quote_promotions_quote_item_id_crm_quote_items_id_fk" FOREIGN KEY ("quote_item_id") REFERENCES "public"."crm_quote_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quote_promotions" ADD CONSTRAINT "crm_quote_promotions_promotion_id_crm_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."crm_promotions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_source_lead_id_crm_leads_id_fk" FOREIGN KEY ("source_lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_quote_items_tenant_quote_idx" ON "crm_quote_items" USING btree ("tenant_id","quote_id");--> statement-breakpoint
CREATE INDEX "crm_quote_items_tenant_product_idx" ON "crm_quote_items" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "crm_quote_items_quote_position_idx" ON "crm_quote_items" USING btree ("quote_id","position");--> statement-breakpoint
CREATE INDEX "crm_quote_promotions_tenant_quote_idx" ON "crm_quote_promotions" USING btree ("tenant_id","quote_id");--> statement-breakpoint
CREATE INDEX "crm_quote_promotions_item_idx" ON "crm_quote_promotions" USING btree ("quote_item_id");--> statement-breakpoint
CREATE INDEX "crm_quote_promotions_promotion_idx" ON "crm_quote_promotions" USING btree ("promotion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_quotes_tenant_number_unique" ON "crm_quotes" USING btree ("tenant_id","quote_number");--> statement-breakpoint
CREATE INDEX "crm_quotes_tenant_status_idx" ON "crm_quotes" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "crm_quotes_tenant_customer_idx" ON "crm_quotes" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_quotes_tenant_lead_idx" ON "crm_quotes" USING btree ("tenant_id","source_lead_id");--> statement-breakpoint
CREATE INDEX "crm_quotes_tenant_deal_idx" ON "crm_quotes" USING btree ("tenant_id","deal_id");--> statement-breakpoint
CREATE INDEX "crm_quotes_tenant_owner_idx" ON "crm_quotes" USING btree ("tenant_id","owner_clerk_user_id");--> statement-breakpoint
CREATE INDEX "crm_quotes_tenant_validity_idx" ON "crm_quotes" USING btree ("tenant_id","valid_until");--> statement-breakpoint
CREATE INDEX "crm_quotes_tenant_created_idx" ON "crm_quotes" USING btree ("tenant_id","created_at");