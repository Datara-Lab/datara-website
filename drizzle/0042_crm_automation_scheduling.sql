CREATE TABLE "crm_automation_scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"execution_id" uuid NOT NULL,
	"action_index" integer NOT NULL,
	"action" jsonb NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"actor_clerk_user_id" text NOT NULL,
	"record_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_automation_scheduled_jobs" ADD CONSTRAINT "crm_automation_scheduled_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_scheduled_jobs" ADD CONSTRAINT "crm_automation_scheduled_jobs_rule_id_crm_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."crm_automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_scheduled_jobs" ADD CONSTRAINT "crm_automation_scheduled_jobs_execution_id_crm_automation_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."crm_automation_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_automation_scheduled_jobs_action_unique" ON "crm_automation_scheduled_jobs" USING btree ("tenant_id","execution_id","action_index");--> statement-breakpoint
CREATE INDEX "crm_automation_scheduled_jobs_due_idx" ON "crm_automation_scheduled_jobs" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "crm_automation_scheduled_jobs_rule_idx" ON "crm_automation_scheduled_jobs" USING btree ("rule_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_automation_scheduled_jobs_entity_idx" ON "crm_automation_scheduled_jobs" USING btree ("tenant_id","entity_type","entity_id");