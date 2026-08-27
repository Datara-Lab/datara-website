CREATE TABLE "commercial_usage_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_usage_windows_count_check" CHECK (
          "commercial_usage_windows"."usage_count" >= 0
        )
);
--> statement-breakpoint
ALTER TABLE "commercial_usage_windows" ADD CONSTRAINT "commercial_usage_windows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_usage_windows_subject_unique" ON "commercial_usage_windows" USING btree ("tenant_id","metric","window_started_at");--> statement-breakpoint
CREATE INDEX "commercial_usage_windows_cleanup_idx" ON "commercial_usage_windows" USING btree ("window_started_at");