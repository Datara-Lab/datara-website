CREATE TABLE "commercial_legal_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commercial_purchase_id" uuid NOT NULL,
	"tenant_id" uuid,
	"clerk_user_id" text,
	"clerk_organization_id" text,
	"owner_email" text,
	"legal_bundle_version" text NOT NULL,
	"document_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"documents_accepted" boolean DEFAULT false NOT NULL,
	"recurring_charges_accepted" boolean DEFAULT false NOT NULL,
	"billing_period" text NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commercial_legal_acceptances" ADD CONSTRAINT "commercial_legal_acceptances_commercial_purchase_id_commercial_purchases_id_fk" FOREIGN KEY ("commercial_purchase_id") REFERENCES "public"."commercial_purchases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_legal_acceptances" ADD CONSTRAINT "commercial_legal_acceptances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_legal_acceptances_purchase_unique" ON "commercial_legal_acceptances" USING btree ("commercial_purchase_id");--> statement-breakpoint
CREATE INDEX "commercial_legal_acceptances_tenant_idx" ON "commercial_legal_acceptances" USING btree ("tenant_id","accepted_at");--> statement-breakpoint
CREATE INDEX "commercial_legal_acceptances_user_idx" ON "commercial_legal_acceptances" USING btree ("clerk_user_id","accepted_at");