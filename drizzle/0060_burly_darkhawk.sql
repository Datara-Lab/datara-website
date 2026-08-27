CREATE TABLE "meta_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_account_id" text,
	"page_id" text NOT NULL,
	"page_name" text NOT NULL,
	"instagram_business_account_id" text,
	"instagram_username" text,
	"encrypted_page_access_token" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"lead_ads_enabled" boolean DEFAULT true NOT NULL,
	"instagram_messages_enabled" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"connected_by_clerk_user_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"meta_event_id" text NOT NULL,
	"object_type" text NOT NULL,
	"field" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meta_integrations" ADD CONSTRAINT "meta_integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_webhook_events" ADD CONSTRAINT "meta_webhook_events_integration_id_meta_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."meta_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_webhook_events" ADD CONSTRAINT "meta_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meta_integrations_tenant_unique" ON "meta_integrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meta_integrations_page_unique" ON "meta_integrations" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "meta_integrations_instagram_idx" ON "meta_integrations" USING btree ("instagram_business_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meta_webhook_events_event_unique" ON "meta_webhook_events" USING btree ("meta_event_id");--> statement-breakpoint
CREATE INDEX "meta_webhook_events_tenant_idx" ON "meta_webhook_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "meta_webhook_events_status_idx" ON "meta_webhook_events" USING btree ("status","created_at");