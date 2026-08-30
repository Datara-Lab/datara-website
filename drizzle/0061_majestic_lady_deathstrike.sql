CREATE TABLE "commercial_operation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"summary" text NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"actor_clerk_user_id" text,
	"actor_name" text,
	"idempotency_key" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"deal_id" uuid NOT NULL,
	"customer_id" uuid,
	"quote_id" uuid,
	"sales_order_id" uuid,
	"financing_application_id" uuid,
	"payment_type" text DEFAULT 'down_payment' NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"payment_method" text,
	"reference" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"received_by_clerk_user_id" text NOT NULL,
	"external_system" text,
	"external_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_payments_amount_check" CHECK ("commercial_payments"."amount" > 0),
	CONSTRAINT "commercial_payments_type_check" CHECK (
        "commercial_payments"."payment_type" IN
          ('down_payment', 'payment', 'refund', 'adjustment')
      ),
	CONSTRAINT "commercial_payments_status_check" CHECK (
        "commercial_payments"."status" IN ('pending', 'received', 'cancelled', 'refunded')
      )
);
--> statement-breakpoint
CREATE TABLE "commercial_pipeline_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"operation_type" text,
	"active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_pipeline_definitions_operation_type_check" CHECK (
        "commercial_pipeline_definitions"."operation_type" IS NULL OR
        "commercial_pipeline_definitions"."operation_type" IN ('cash', 'financed', 'mixed')
      )
);
--> statement-breakpoint
CREATE TABLE "commercial_pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pipeline_definition_id" uuid NOT NULL,
	"stage_key" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'open' NOT NULL,
	"position" integer NOT NULL,
	"probability" integer,
	"terminal" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_pipeline_stages_category_check" CHECK (
        "commercial_pipeline_stages"."category" IN ('open', 'won', 'lost', 'cancelled')
      ),
	CONSTRAINT "commercial_pipeline_stages_position_check" CHECK ("commercial_pipeline_stages"."position" >= 0),
	CONSTRAINT "commercial_pipeline_stages_probability_check" CHECK (
        "commercial_pipeline_stages"."probability" IS NULL OR
        "commercial_pipeline_stages"."probability" BETWEEN 0 AND 100
      )
);
--> statement-breakpoint
CREATE TABLE "commercial_reservation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"operation_type" text,
	"financing_provider_id" uuid,
	"financing_product_id" uuid,
	"minimum_down_payment_percent" numeric(7, 4),
	"minimum_down_payment_amount" numeric(14, 2),
	"financing_approval_required" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_reservation_rules_operation_type_check" CHECK (
        "commercial_reservation_rules"."operation_type" IS NULL OR
        "commercial_reservation_rules"."operation_type" IN ('cash', 'financed', 'mixed')
      ),
	CONSTRAINT "commercial_reservation_rules_percent_check" CHECK (
        "commercial_reservation_rules"."minimum_down_payment_percent" IS NULL OR
        "commercial_reservation_rules"."minimum_down_payment_percent" BETWEEN 0 AND 100
      ),
	CONSTRAINT "commercial_reservation_rules_amount_check" CHECK (
        "commercial_reservation_rules"."minimum_down_payment_amount" IS NULL OR
        "commercial_reservation_rules"."minimum_down_payment_amount" >= 0
      )
);
--> statement-breakpoint
CREATE TABLE "financing_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"deal_id" uuid NOT NULL,
	"customer_id" uuid,
	"quote_id" uuid,
	"provider_id" uuid NOT NULL,
	"product_id" uuid,
	"folio" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"required_down_payment_percent" numeric(7, 4),
	"required_down_payment_amount" numeric(14, 2) NOT NULL,
	"requested_amount" numeric(14, 2) NOT NULL,
	"approved_amount" numeric(14, 2),
	"term_months" integer,
	"monthly_payment" numeric(14, 2),
	"requested_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"cancelled_at" timestamp with time zone,
	"created_by_clerk_user_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financing_applications_status_check" CHECK (
        "financing_applications"."status" IN
          ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled')
      ),
	CONSTRAINT "financing_applications_amounts_check" CHECK (
        "financing_applications"."unit_price" >= 0 AND
        "financing_applications"."required_down_payment_amount" >= 0 AND
        "financing_applications"."requested_amount" >= 0 AND
        ("financing_applications"."approved_amount" IS NULL OR "financing_applications"."approved_amount" >= 0) AND
        ("financing_applications"."monthly_payment" IS NULL OR "financing_applications"."monthly_payment" >= 0)
      ),
	CONSTRAINT "financing_applications_percent_check" CHECK (
        "financing_applications"."required_down_payment_percent" IS NULL OR
        "financing_applications"."required_down_payment_percent" BETWEEN 0 AND 100
      ),
	CONSTRAINT "financing_applications_term_check" CHECK ("financing_applications"."term_months" IS NULL OR "financing_applications"."term_months" > 0)
);
--> statement-breakpoint
CREATE TABLE "financing_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"minimum_down_payment_percent" numeric(7, 4),
	"minimum_down_payment_amount" numeric(14, 2),
	"minimum_term_months" integer,
	"maximum_term_months" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financing_products_down_payment_percent_check" CHECK (
        "financing_products"."minimum_down_payment_percent" IS NULL OR
        "financing_products"."minimum_down_payment_percent" BETWEEN 0 AND 100
      ),
	CONSTRAINT "financing_products_down_payment_amount_check" CHECK (
        "financing_products"."minimum_down_payment_amount" IS NULL OR
        "financing_products"."minimum_down_payment_amount" >= 0
      ),
	CONSTRAINT "financing_products_terms_check" CHECK (
        ("financing_products"."minimum_term_months" IS NULL OR "financing_products"."minimum_term_months" > 0) AND
        ("financing_products"."maximum_term_months" IS NULL OR "financing_products"."maximum_term_months" > 0) AND
        ("financing_products"."minimum_term_months" IS NULL OR "financing_products"."maximum_term_months" IS NULL OR
          "financing_products"."minimum_term_months" <= "financing_products"."maximum_term_months")
      )
);
--> statement-breakpoint
CREATE TABLE "financing_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"external_system" text,
	"external_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_unit_reservation_payments" (
	"reservation_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"applied_amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_unit_reservation_payments_reservation_id_payment_id_pk" PRIMARY KEY("reservation_id","payment_id"),
	CONSTRAINT "inventory_unit_reservation_payments_amount_check" CHECK ("inventory_unit_reservation_payments"."applied_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_unit_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"customer_id" uuid,
	"sales_order_id" uuid,
	"inventory_unit_id" uuid NOT NULL,
	"rule_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"required_down_payment_amount" numeric(14, 2) NOT NULL,
	"eligible_payment_amount" numeric(14, 2) NOT NULL,
	"rule_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reserved_by_clerk_user_id" text NOT NULL,
	"reserved_by_name" text,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_by_clerk_user_id" text,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_unit_reservations_status_check" CHECK (
        "inventory_unit_reservations"."status" IN ('active', 'released', 'converted', 'cancelled')
      ),
	CONSTRAINT "inventory_unit_reservations_amounts_check" CHECK (
        "inventory_unit_reservations"."required_down_payment_amount" >= 0 AND
        "inventory_unit_reservations"."eligible_payment_amount" >= 0
      )
);
--> statement-breakpoint
CREATE TABLE "inventory_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"stock_id" uuid NOT NULL,
	"vin" text,
	"serial_number" text,
	"model_year" integer,
	"color" text,
	"status" text DEFAULT 'available' NOT NULL,
	"received_at" timestamp with time zone,
	"unit_cost" numeric(14, 2),
	"list_price" numeric(14, 2),
	"sold_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"external_system" text,
	"external_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_units_status_check" CHECK (
        "inventory_units"."status" IN
          ('available', 'reserved', 'sold', 'delivered', 'unavailable')
      ),
	CONSTRAINT "inventory_units_model_year_check" CHECK (
        "inventory_units"."model_year" IS NULL OR
        "inventory_units"."model_year" BETWEEN 1900 AND 2200
      ),
	CONSTRAINT "inventory_units_cost_check" CHECK ("inventory_units"."unit_cost" IS NULL OR "inventory_units"."unit_cost" >= 0),
	CONSTRAINT "inventory_units_price_check" CHECK ("inventory_units"."list_price" IS NULL OR "inventory_units"."list_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sales_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"sales_order_id" uuid NOT NULL,
	"deal_id" uuid,
	"customer_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"invoice_number" text,
	"invoice_date" timestamp with time zone,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"document_reference" text,
	"external_system" text,
	"external_id" text,
	"external_reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoices_status_check" CHECK (
        "sales_invoices"."status" IN
          ('pending', 'requested', 'issued', 'cancelled', 'error')
      ),
	CONSTRAINT "sales_invoices_amount_check" CHECK ("sales_invoices"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "crm_deals" ADD COLUMN "operation_type" text DEFAULT 'unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD COLUMN "pipeline_definition_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD COLUMN "pipeline_stage_id" uuid;--> statement-breakpoint
ALTER TABLE "commercial_operation_events" ADD CONSTRAINT "commercial_operation_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_operation_events" ADD CONSTRAINT "commercial_operation_events_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_payments" ADD CONSTRAINT "commercial_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_payments" ADD CONSTRAINT "commercial_payments_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_payments" ADD CONSTRAINT "commercial_payments_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_payments" ADD CONSTRAINT "commercial_payments_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_payments" ADD CONSTRAINT "commercial_payments_quote_id_crm_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."crm_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_payments" ADD CONSTRAINT "commercial_payments_sales_order_id_crm_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."crm_sales_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_payments" ADD CONSTRAINT "commercial_payments_financing_application_id_financing_applications_id_fk" FOREIGN KEY ("financing_application_id") REFERENCES "public"."financing_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_pipeline_definitions" ADD CONSTRAINT "commercial_pipeline_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_pipeline_stages" ADD CONSTRAINT "commercial_pipeline_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_pipeline_stages" ADD CONSTRAINT "commercial_pipeline_stages_pipeline_definition_id_commercial_pipeline_definitions_id_fk" FOREIGN KEY ("pipeline_definition_id") REFERENCES "public"."commercial_pipeline_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_reservation_rules" ADD CONSTRAINT "commercial_reservation_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_reservation_rules" ADD CONSTRAINT "commercial_reservation_rules_financing_provider_id_financing_providers_id_fk" FOREIGN KEY ("financing_provider_id") REFERENCES "public"."financing_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_reservation_rules" ADD CONSTRAINT "commercial_reservation_rules_financing_product_id_financing_products_id_fk" FOREIGN KEY ("financing_product_id") REFERENCES "public"."financing_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_quote_id_crm_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."crm_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_provider_id_financing_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."financing_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_product_id_financing_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."financing_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_products" ADD CONSTRAINT "financing_products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_products" ADD CONSTRAINT "financing_products_provider_id_financing_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."financing_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financing_providers" ADD CONSTRAINT "financing_providers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_unit_reservation_payments" ADD CONSTRAINT "inventory_unit_reservation_payments_reservation_id_inventory_unit_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."inventory_unit_reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_unit_reservation_payments" ADD CONSTRAINT "inventory_unit_reservation_payments_payment_id_commercial_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."commercial_payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_unit_reservation_payments" ADD CONSTRAINT "inventory_unit_reservation_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_unit_reservations" ADD CONSTRAINT "inventory_unit_reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_unit_reservations" ADD CONSTRAINT "inventory_unit_reservations_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_unit_reservations" ADD CONSTRAINT "inventory_unit_reservations_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_unit_reservations" ADD CONSTRAINT "inventory_unit_reservations_sales_order_id_crm_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."crm_sales_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_unit_reservations" ADD CONSTRAINT "inventory_unit_reservations_inventory_unit_id_inventory_units_id_fk" FOREIGN KEY ("inventory_unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_unit_reservations" ADD CONSTRAINT "inventory_unit_reservations_rule_id_commercial_reservation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."commercial_reservation_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_stock_id_inventory_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."inventory_stocks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_sales_order_id_crm_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."crm_sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_operation_events_tenant_idempotency_unique" ON "commercial_operation_events" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "commercial_operation_events_tenant_deal_idx" ON "commercial_operation_events" USING btree ("tenant_id","deal_id","occurred_at");--> statement-breakpoint
CREATE INDEX "commercial_operation_events_tenant_entity_idx" ON "commercial_operation_events" USING btree ("tenant_id","entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "commercial_operation_events_tenant_type_idx" ON "commercial_operation_events" USING btree ("tenant_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "commercial_payments_tenant_deal_idx" ON "commercial_payments" USING btree ("tenant_id","deal_id","received_at");--> statement-breakpoint
CREATE INDEX "commercial_payments_tenant_status_idx" ON "commercial_payments" USING btree ("tenant_id","status","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_payments_tenant_external_unique" ON "commercial_payments" USING btree ("tenant_id","external_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_pipeline_definitions_tenant_name_unique" ON "commercial_pipeline_definitions" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "commercial_pipeline_definitions_tenant_active_idx" ON "commercial_pipeline_definitions" USING btree ("tenant_id","active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_pipeline_stages_definition_key_unique" ON "commercial_pipeline_stages" USING btree ("pipeline_definition_id","stage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_pipeline_stages_definition_position_unique" ON "commercial_pipeline_stages" USING btree ("pipeline_definition_id","position");--> statement-breakpoint
CREATE INDEX "commercial_pipeline_stages_tenant_idx" ON "commercial_pipeline_stages" USING btree ("tenant_id","pipeline_definition_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_reservation_rules_tenant_name_unique" ON "commercial_reservation_rules" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "commercial_reservation_rules_tenant_active_idx" ON "commercial_reservation_rules" USING btree ("tenant_id","active","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_applications_tenant_folio_unique" ON "financing_applications" USING btree ("tenant_id","provider_id","folio");--> statement-breakpoint
CREATE INDEX "financing_applications_tenant_deal_idx" ON "financing_applications" USING btree ("tenant_id","deal_id","created_at");--> statement-breakpoint
CREATE INDEX "financing_applications_tenant_status_idx" ON "financing_applications" USING btree ("tenant_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "financing_applications_provider_status_idx" ON "financing_applications" USING btree ("provider_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_products_provider_code_unique" ON "financing_products" USING btree ("provider_id","code");--> statement-breakpoint
CREATE INDEX "financing_products_tenant_active_idx" ON "financing_products" USING btree ("tenant_id","active","name");--> statement-breakpoint
CREATE UNIQUE INDEX "financing_providers_tenant_code_unique" ON "financing_providers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "financing_providers_tenant_active_idx" ON "financing_providers" USING btree ("tenant_id","active","name");--> statement-breakpoint
CREATE INDEX "inventory_unit_reservation_payments_tenant_idx" ON "inventory_unit_reservation_payments" USING btree ("tenant_id","reservation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_unit_reservations_active_unit_unique" ON "inventory_unit_reservations" USING btree ("tenant_id","inventory_unit_id") WHERE "inventory_unit_reservations"."status" = 'active';--> statement-breakpoint
CREATE INDEX "inventory_unit_reservations_tenant_deal_idx" ON "inventory_unit_reservations" USING btree ("tenant_id","deal_id","status");--> statement-breakpoint
CREATE INDEX "inventory_unit_reservations_tenant_status_idx" ON "inventory_unit_reservations" USING btree ("tenant_id","status","reserved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_units_tenant_vin_unique" ON "inventory_units" USING btree ("tenant_id","vin");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_units_tenant_serial_unique" ON "inventory_units" USING btree ("tenant_id","serial_number");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_units_tenant_external_unique" ON "inventory_units" USING btree ("tenant_id","external_system","external_id");--> statement-breakpoint
CREATE INDEX "inventory_units_tenant_status_idx" ON "inventory_units" USING btree ("tenant_id","status","received_at");--> statement-breakpoint
CREATE INDEX "inventory_units_tenant_location_idx" ON "inventory_units" USING btree ("tenant_id","location_id","status");--> statement-breakpoint
CREATE INDEX "inventory_units_tenant_product_idx" ON "inventory_units" USING btree ("tenant_id","product_id","status");--> statement-breakpoint
CREATE INDEX "inventory_units_stock_idx" ON "inventory_units" USING btree ("stock_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_invoices_tenant_number_unique" ON "sales_invoices" USING btree ("tenant_id","invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_invoices_tenant_external_unique" ON "sales_invoices" USING btree ("tenant_id","external_system","external_id");--> statement-breakpoint
CREATE INDEX "sales_invoices_tenant_order_idx" ON "sales_invoices" USING btree ("tenant_id","sales_order_id","created_at");--> statement-breakpoint
CREATE INDEX "sales_invoices_tenant_status_idx" ON "sales_invoices" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_pipeline_definition_id_commercial_pipeline_definitions_id_fk" FOREIGN KEY ("pipeline_definition_id") REFERENCES "public"."commercial_pipeline_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_pipeline_stage_id_commercial_pipeline_stages_id_fk" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."commercial_pipeline_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_pipeline_idx" ON "crm_deals" USING btree ("tenant_id","pipeline_definition_id","pipeline_stage_id");--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_operation_type_idx" ON "crm_deals" USING btree ("tenant_id","operation_type");--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_operation_type_check" CHECK (
        "crm_deals"."operation_type" IN
          ('unspecified', 'cash', 'financed', 'mixed')
      );