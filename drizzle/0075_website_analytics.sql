CREATE TABLE "website_analytics_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"path" text NOT NULL,
	"source" text NOT NULL,
	"device" text NOT NULL,
	"target" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_analytics_events_name_check" CHECK ("website_analytics_events"."event_name" IN ('page_view', 'contact_click', 'quote_click', 'whatsapp_click', 'product_click', 'form_start', 'form_submit'))
);
--> statement-breakpoint
CREATE TABLE "website_analytics_sessions" (
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"event_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_analytics_sessions_tenant_id_session_id_pk" PRIMARY KEY("tenant_id","session_id")
);
--> statement-breakpoint
ALTER TABLE "website_analytics_events" ADD CONSTRAINT "website_analytics_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_analytics_sessions" ADD CONSTRAINT "website_analytics_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "website_analytics_events_tenant_date_idx" ON "website_analytics_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "website_analytics_events_tenant_session_idx" ON "website_analytics_events" USING btree ("tenant_id","session_id");