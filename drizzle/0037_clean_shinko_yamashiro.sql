CREATE TABLE "commercial_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_type" text DEFAULT 'new_customer' NOT NULL,
	"tenant_id" uuid,
	"clerk_user_id" text,
	"clerk_organization_id" text,
	"owner_email" text,
	"company_name" text,
	"tax_id" text,
	"industry" text NOT NULL,
	"billing_period" text NOT NULL,
	"catalog_item_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"currency" text DEFAULT 'mxn' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'checkout_pending' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"paid_at" timestamp with time zone,
	"provisioned_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commercial_purchases" ADD CONSTRAINT "commercial_purchases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_purchases_checkout_session_unique" ON "commercial_purchases" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_purchases_subscription_unique" ON "commercial_purchases" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "commercial_purchases_status_idx" ON "commercial_purchases" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "commercial_purchases_tenant_idx" ON "commercial_purchases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "commercial_purchases_owner_email_idx" ON "commercial_purchases" USING btree ("owner_email");