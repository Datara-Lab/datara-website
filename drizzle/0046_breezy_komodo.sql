CREATE TABLE "ai_rate_limit_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"subject_key" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_rate_limit_windows" ADD CONSTRAINT "ai_rate_limit_windows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_rate_limit_windows_subject_unique" ON "ai_rate_limit_windows" USING btree ("tenant_id","scope","subject_key","window_started_at");--> statement-breakpoint
CREATE INDEX "ai_rate_limit_windows_cleanup_idx" ON "ai_rate_limit_windows" USING btree ("window_started_at");