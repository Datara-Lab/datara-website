CREATE TABLE "entity_qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"public_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"display_code" text NOT NULL,
	"symbology" text DEFAULT 'qr' NOT NULL,
	"design_theme" text DEFAULT 'standard' NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"label" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_clerk_user_id" text,
	"revoked_by_clerk_user_id" text,
	"revoked_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_qr_codes_status_check" CHECK ("entity_qr_codes"."status" IN ('active', 'revoked')),
	CONSTRAINT "entity_qr_codes_symbology_check" CHECK ("entity_qr_codes"."symbology" IN ('qr', 'code128')),
	CONSTRAINT "entity_qr_codes_design_theme_check" CHECK ("entity_qr_codes"."design_theme" IN ('standard', 'pet_dog', 'pet_cat', 'pet_paws')),
	CONSTRAINT "entity_qr_codes_revocation_check" CHECK (("entity_qr_codes"."status" = 'active' AND "entity_qr_codes"."revoked_at" IS NULL) OR ("entity_qr_codes"."status" = 'revoked' AND "entity_qr_codes"."revoked_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "entity_qr_scan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"qr_code_id" uuid,
	"public_token" uuid,
	"outcome" text NOT NULL,
	"requested_action" text,
	"resolved_entity_type" text,
	"resolved_entity_id" uuid,
	"branch_id" uuid,
	"scanned_by_clerk_user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_qr_scan_events_outcome_check" CHECK ("entity_qr_scan_events"."outcome" IN ('resolved', 'rejected', 'revoked', 'not_found'))
);
--> statement-breakpoint
ALTER TABLE "entity_qr_codes" ADD CONSTRAINT "entity_qr_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_qr_scan_events" ADD CONSTRAINT "entity_qr_scan_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_qr_scan_events" ADD CONSTRAINT "entity_qr_scan_events_qr_code_id_entity_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."entity_qr_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_qr_scan_events" ADD CONSTRAINT "entity_qr_scan_events_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entity_qr_codes_public_token_unique" ON "entity_qr_codes" USING btree ("public_token");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_qr_codes_display_code_unique" ON "entity_qr_codes" USING btree ("display_code");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_qr_codes_active_entity_unique" ON "entity_qr_codes" USING btree ("tenant_id","entity_type","entity_id") WHERE "entity_qr_codes"."status" = 'active';--> statement-breakpoint
CREATE INDEX "entity_qr_codes_tenant_status_idx" ON "entity_qr_codes" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "entity_qr_scan_events_tenant_scanned_idx" ON "entity_qr_scan_events" USING btree ("tenant_id","scanned_at");--> statement-breakpoint
CREATE INDEX "entity_qr_scan_events_code_scanned_idx" ON "entity_qr_scan_events" USING btree ("qr_code_id","scanned_at");