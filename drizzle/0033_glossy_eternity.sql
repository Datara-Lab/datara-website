CREATE TABLE "trial_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"tax_id" text NOT NULL,
	"clerk_organization_id" text,
	"tenant_id" uuid,
	"industry" text NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"trial_starts_at" timestamp with time zone NOT NULL,
	"trial_ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trial_redemptions" ADD CONSTRAINT "trial_redemptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trial_redemptions_user_unique" ON "trial_redemptions" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trial_redemptions_tax_id_unique" ON "trial_redemptions" USING btree ("tax_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trial_redemptions_organization_unique" ON "trial_redemptions" USING btree ("clerk_organization_id");--> statement-breakpoint
CREATE INDEX "trial_redemptions_status_idx" ON "trial_redemptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trial_redemptions_expiration_idx" ON "trial_redemptions" USING btree ("trial_ends_at");