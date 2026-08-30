CREATE TABLE "fiscal_provider_configurations" (
	"environment" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"provider" text NOT NULL,
	"mode" text DEFAULT 'test' NOT NULL,
	"credential_secret_reference" text,
	"cost_per_stamp" numeric(12, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"changed_by_clerk_user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fiscal_provider_configurations_mode_check" CHECK (
        "fiscal_provider_configurations"."mode" IN ('test', 'live')
      ),
	CONSTRAINT "fiscal_provider_configurations_cost_check" CHECK ("fiscal_provider_configurations"."cost_per_stamp" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fiscal_provider_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid,
	"environment" text NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_request_id" text,
	"fiscal_uuid" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"provider_cost" numeric(14, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"error_code" text,
	"error_message" text,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "fiscal_provider_requests_operation_check" CHECK ("fiscal_provider_requests"."operation" IN ('stamp', 'cancel', 'status', 'xml', 'pdf')),
	CONSTRAINT "fiscal_provider_requests_status_check" CHECK ("fiscal_provider_requests"."status" IN ('pending', 'success', 'error')),
	CONSTRAINT "fiscal_provider_requests_metrics_check" CHECK (
        "fiscal_provider_requests"."duration_ms" >= 0
        AND "fiscal_provider_requests"."provider_cost" >= 0
      )
);
--> statement-breakpoint
CREATE TABLE "fiscal_stamp_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid,
	"entry_type" text NOT NULL,
	"stamp_delta" integer NOT NULL,
	"monthly_remaining_after" integer DEFAULT 0 NOT NULL,
	"top_up_remaining_after" integer DEFAULT 0 NOT NULL,
	"provider_cost" numeric(14, 6) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fiscal_stamp_ledger_delta_check" CHECK ("fiscal_stamp_ledger_entries"."stamp_delta" <> 0),
	CONSTRAINT "fiscal_stamp_ledger_balances_check" CHECK (
        "fiscal_stamp_ledger_entries"."monthly_remaining_after" >= 0
        AND "fiscal_stamp_ledger_entries"."top_up_remaining_after" >= 0
        AND "fiscal_stamp_ledger_entries"."provider_cost" >= 0
      )
);
--> statement-breakpoint
CREATE TABLE "fiscal_tenant_accounts" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"included_monthly_stamps" integer DEFAULT 0 NOT NULL,
	"used_monthly_stamps" integer DEFAULT 0 NOT NULL,
	"top_up_stamp_balance" integer DEFAULT 0 NOT NULL,
	"monthly_window_start" timestamp with time zone,
	"monthly_window_end" timestamp with time zone,
	"max_monthly_spend" numeric(14, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fiscal_tenant_accounts_status_check" CHECK ("fiscal_tenant_accounts"."status" IN ('active', 'paused', 'blocked')),
	CONSTRAINT "fiscal_tenant_accounts_balances_check" CHECK (
        "fiscal_tenant_accounts"."included_monthly_stamps" >= 0
        AND "fiscal_tenant_accounts"."used_monthly_stamps" >= 0
        AND "fiscal_tenant_accounts"."top_up_stamp_balance" >= 0
        AND "fiscal_tenant_accounts"."max_monthly_spend" >= 0
      )
);
--> statement-breakpoint
ALTER TABLE "fiscal_provider_requests" ADD CONSTRAINT "fiscal_provider_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_provider_requests" ADD CONSTRAINT "fiscal_provider_requests_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_stamp_ledger_entries" ADD CONSTRAINT "fiscal_stamp_ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_stamp_ledger_entries" ADD CONSTRAINT "fiscal_stamp_ledger_entries_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_tenant_accounts" ADD CONSTRAINT "fiscal_tenant_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_provider_requests_idempotency_unique" ON "fiscal_provider_requests" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "fiscal_provider_requests_tenant_idx" ON "fiscal_provider_requests" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "fiscal_provider_requests_status_idx" ON "fiscal_provider_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "fiscal_provider_requests_invoice_idx" ON "fiscal_provider_requests" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_stamp_ledger_idempotency_unique" ON "fiscal_stamp_ledger_entries" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "fiscal_stamp_ledger_tenant_idx" ON "fiscal_stamp_ledger_entries" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "fiscal_stamp_ledger_invoice_idx" ON "fiscal_stamp_ledger_entries" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "fiscal_tenant_accounts_status_idx" ON "fiscal_tenant_accounts" USING btree ("status","updated_at");