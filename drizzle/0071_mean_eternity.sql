ALTER TYPE "public"."product_access" ADD VALUE 'pos';--> statement-breakpoint
CREATE TABLE "pos_cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cash_session_id" uuid NOT NULL,
	"transaction_id" uuid,
	"payment_id" uuid,
	"movement_type" text NOT NULL,
	"direction" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"reason" text,
	"performed_by_clerk_user_id" text NOT NULL,
	"performed_by_name" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pos_cash_movements_type_check" CHECK ("pos_cash_movements"."movement_type" IN ('opening', 'sale', 'refund', 'cash_in', 'cash_out', 'closing_adjustment')),
	CONSTRAINT "pos_cash_movements_direction_check" CHECK ("pos_cash_movements"."direction" IN ('in', 'out')),
	CONSTRAINT "pos_cash_movements_amount_check" CHECK ("pos_cash_movements"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "pos_cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"terminal_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_by_clerk_user_id" text NOT NULL,
	"opened_by_name" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opening_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"closed_by_clerk_user_id" text,
	"closed_by_name" text,
	"closed_at" timestamp with time zone,
	"expected_cash_amount" numeric(14, 2),
	"counted_cash_amount" numeric(14, 2),
	"difference_amount" numeric(14, 2),
	"closing_notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pos_cash_sessions_status_check" CHECK ("pos_cash_sessions"."status" IN ('open', 'closed', 'cancelled')),
	CONSTRAINT "pos_cash_sessions_opening_amount_check" CHECK ("pos_cash_sessions"."opening_amount" >= 0),
	CONSTRAINT "pos_cash_sessions_closure_check" CHECK (("pos_cash_sessions"."status" = 'open' AND "pos_cash_sessions"."closed_at" IS NULL) OR ("pos_cash_sessions"."status" <> 'open' AND "pos_cash_sessions"."closed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "pos_terminals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"inventory_location_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"receipt_prefix" text DEFAULT 'POS' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pos_terminals_status_check" CHECK ("pos_terminals"."status" IN ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "pos_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"terminal_id" uuid NOT NULL,
	"cash_session_id" uuid NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"receipt_number" text NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"source_product" text DEFAULT 'pos' NOT NULL,
	"source_type" text DEFAULT 'direct_sale' NOT NULL,
	"source_id" text,
	"subtotal_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"cashier_clerk_user_id" text NOT NULL,
	"cashier_name" text,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pos_transactions_status_check" CHECK ("pos_transactions"."status" IN ('suspended', 'pending_payment', 'paid', 'cancelled', 'refunded')),
	CONSTRAINT "pos_transactions_amounts_check" CHECK ("pos_transactions"."subtotal_amount" >= 0 AND "pos_transactions"."discount_amount" >= 0 AND "pos_transactions"."tax_amount" >= 0 AND "pos_transactions"."total_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_cash_session_id_pos_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."pos_cash_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_transaction_id_pos_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."pos_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_payment_id_commercial_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."commercial_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_sessions" ADD CONSTRAINT "pos_cash_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_sessions" ADD CONSTRAINT "pos_cash_sessions_terminal_id_pos_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_terminals" ADD CONSTRAINT "pos_terminals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_terminals" ADD CONSTRAINT "pos_terminals_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_terminals" ADD CONSTRAINT "pos_terminals_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_terminal_id_pos_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_cash_session_id_pos_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."pos_cash_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_sales_order_id_crm_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."crm_sales_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pos_cash_movements_session_created_idx" ON "pos_cash_movements" USING btree ("cash_session_id","created_at");--> statement-breakpoint
CREATE INDEX "pos_cash_movements_transaction_idx" ON "pos_cash_movements" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_cash_sessions_open_terminal_unique" ON "pos_cash_sessions" USING btree ("tenant_id","terminal_id") WHERE "pos_cash_sessions"."status" = 'open';--> statement-breakpoint
CREATE INDEX "pos_cash_sessions_tenant_opened_idx" ON "pos_cash_sessions" USING btree ("tenant_id","opened_at");--> statement-breakpoint
CREATE INDEX "pos_cash_sessions_cashier_idx" ON "pos_cash_sessions" USING btree ("tenant_id","opened_by_clerk_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_terminals_tenant_code_unique" ON "pos_terminals" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "pos_terminals_tenant_branch_idx" ON "pos_terminals" USING btree ("tenant_id","branch_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_transactions_tenant_receipt_unique" ON "pos_transactions" USING btree ("tenant_id","receipt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_transactions_sales_order_unique" ON "pos_transactions" USING btree ("tenant_id","sales_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_transactions_source_unique" ON "pos_transactions" USING btree ("tenant_id","source_product","source_type","source_id") WHERE "pos_transactions"."source_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "pos_transactions_session_created_idx" ON "pos_transactions" USING btree ("cash_session_id","created_at");--> statement-breakpoint
CREATE INDEX "pos_transactions_tenant_status_idx" ON "pos_transactions" USING btree ("tenant_id","status","created_at");