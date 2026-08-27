CREATE TABLE "crm_import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"file_name" text NOT NULL,
	"status" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"performed_by_clerk_user_id" text NOT NULL,
	"performed_by_name" text NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_import_jobs_counts_check" CHECK (
          "crm_import_jobs"."total_rows" >= 0
          AND "crm_import_jobs"."valid_rows" >= 0
          AND "crm_import_jobs"."imported_rows" >= 0
          AND "crm_import_jobs"."duplicate_rows" >= 0
          AND "crm_import_jobs"."error_rows" >= 0
        )
);
--> statement-breakpoint
ALTER TABLE "crm_import_jobs" ADD CONSTRAINT "crm_import_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_import_jobs_tenant_created_idx" ON "crm_import_jobs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_import_jobs_tenant_entity_idx" ON "crm_import_jobs" USING btree ("tenant_id","entity_type","created_at");