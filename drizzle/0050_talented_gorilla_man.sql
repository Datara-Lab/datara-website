CREATE TABLE "ai_credit_accounts" (
	"tenant_id" uuid NOT NULL,
	"product" "product_access" NOT NULL,
	"auto_recharge_enabled" boolean DEFAULT false NOT NULL,
	"auto_recharge_threshold_percent" integer DEFAULT 15 NOT NULL,
	"auto_recharge_catalog_item_id" uuid,
	"max_auto_recharges_per_month" integer DEFAULT 1 NOT NULL,
	"max_auto_recharge_spend" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_auto_recharge_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credit_accounts_tenant_id_product_pk" PRIMARY KEY("tenant_id","product"),
	CONSTRAINT "ai_credit_accounts_threshold_check" CHECK (
          "ai_credit_accounts"."auto_recharge_threshold_percent"
            BETWEEN 1 AND 100
        ),
	CONSTRAINT "ai_credit_accounts_recharges_check" CHECK (
          "ai_credit_accounts"."max_auto_recharges_per_month" >= 0
        ),
	CONSTRAINT "ai_credit_accounts_spend_check" CHECK (
          "ai_credit_accounts"."max_auto_recharge_spend" >= 0
        )
);
--> statement-breakpoint
CREATE TABLE "ai_credit_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product" "product_access" NOT NULL,
	"credit_lot_id" uuid,
	"entry_type" text NOT NULL,
	"credit_delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"commercial_purchase_id" uuid,
	"catalog_item_id" uuid,
	"stripe_event_id" text,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credit_ledger_delta_check" CHECK (
          "ai_credit_ledger_entries"."credit_delta" <> 0
        ),
	CONSTRAINT "ai_credit_ledger_balance_check" CHECK (
          "ai_credit_ledger_entries"."balance_after" >= 0
        )
);
--> statement-breakpoint
CREATE TABLE "ai_credit_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product" "product_access" NOT NULL,
	"commercial_purchase_id" uuid,
	"catalog_item_id" uuid,
	"original_credits" integer NOT NULL,
	"remaining_credits" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credit_lots_original_check" CHECK (
          "ai_credit_lots"."original_credits" > 0
        ),
	CONSTRAINT "ai_credit_lots_remaining_check" CHECK (
          "ai_credit_lots"."remaining_credits" >= 0
          AND
          "ai_credit_lots"."remaining_credits"
            <= "ai_credit_lots"."original_credits"
        )
);
--> statement-breakpoint
ALTER TABLE "ai_credit_accounts" ADD CONSTRAINT "ai_credit_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_accounts" ADD CONSTRAINT "ai_credit_accounts_auto_recharge_catalog_item_id_commercial_catalog_items_id_fk" FOREIGN KEY ("auto_recharge_catalog_item_id") REFERENCES "public"."commercial_catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_ledger_entries" ADD CONSTRAINT "ai_credit_ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_ledger_entries" ADD CONSTRAINT "ai_credit_ledger_entries_credit_lot_id_ai_credit_lots_id_fk" FOREIGN KEY ("credit_lot_id") REFERENCES "public"."ai_credit_lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_ledger_entries" ADD CONSTRAINT "ai_credit_ledger_entries_commercial_purchase_id_commercial_purchases_id_fk" FOREIGN KEY ("commercial_purchase_id") REFERENCES "public"."commercial_purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_ledger_entries" ADD CONSTRAINT "ai_credit_ledger_entries_catalog_item_id_commercial_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."commercial_catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_lots" ADD CONSTRAINT "ai_credit_lots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_lots" ADD CONSTRAINT "ai_credit_lots_commercial_purchase_id_commercial_purchases_id_fk" FOREIGN KEY ("commercial_purchase_id") REFERENCES "public"."commercial_purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_lots" ADD CONSTRAINT "ai_credit_lots_catalog_item_id_commercial_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."commercial_catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_credit_ledger_idempotency_unique" ON "ai_credit_ledger_entries" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ai_credit_ledger_tenant_idx" ON "ai_credit_ledger_entries" USING btree ("tenant_id","product","created_at");--> statement-breakpoint
CREATE INDEX "ai_credit_ledger_lot_idx" ON "ai_credit_ledger_entries" USING btree ("credit_lot_id");--> statement-breakpoint
CREATE INDEX "ai_credit_ledger_purchase_idx" ON "ai_credit_ledger_entries" USING btree ("commercial_purchase_id");--> statement-breakpoint
CREATE INDEX "ai_credit_lots_available_idx" ON "ai_credit_lots" USING btree ("tenant_id","product","status","expires_at");--> statement-breakpoint
CREATE INDEX "ai_credit_lots_purchase_idx" ON "ai_credit_lots" USING btree ("commercial_purchase_id");