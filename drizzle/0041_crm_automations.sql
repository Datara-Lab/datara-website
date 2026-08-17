CREATE TABLE "crm_automation_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"event_key" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"trigger_type" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"action_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_message" text,
	"triggered_by_clerk_user_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"entity_type" text NOT NULL,
	"trigger_type" text NOT NULL,
	"conditions" jsonb DEFAULT '{"mode":"all","items":[]}'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"stop_on_error" boolean DEFAULT true NOT NULL,
	"created_by_clerk_user_id" text NOT NULL,
	"updated_by_clerk_user_id" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"recipient_clerk_user_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"automation_rule_id" uuid,
	"automation_execution_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_rule_id_crm_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."crm_automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_rules" ADD CONSTRAINT "crm_automation_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_rules" ADD CONSTRAINT "crm_automation_rules_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notifications" ADD CONSTRAINT "crm_notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notifications" ADD CONSTRAINT "crm_notifications_automation_rule_id_crm_automation_rules_id_fk" FOREIGN KEY ("automation_rule_id") REFERENCES "public"."crm_automation_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notifications" ADD CONSTRAINT "crm_notifications_automation_execution_id_crm_automation_executions_id_fk" FOREIGN KEY ("automation_execution_id") REFERENCES "public"."crm_automation_executions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_automation_executions_event_unique" ON "crm_automation_executions" USING btree ("tenant_id","rule_id","event_key");--> statement-breakpoint
CREATE INDEX "crm_automation_executions_rule_idx" ON "crm_automation_executions" USING btree ("rule_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_automation_executions_tenant_status_idx" ON "crm_automation_executions" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "crm_automation_executions_entity_idx" ON "crm_automation_executions" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "crm_automation_rules_tenant_idx" ON "crm_automation_rules" USING btree ("tenant_id","updated_at");--> statement-breakpoint
CREATE INDEX "crm_automation_rules_trigger_idx" ON "crm_automation_rules" USING btree ("tenant_id","entity_type","trigger_type","enabled");--> statement-breakpoint
CREATE INDEX "crm_automation_rules_branch_idx" ON "crm_automation_rules" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "crm_notifications_recipient_idx" ON "crm_notifications" USING btree ("tenant_id","recipient_clerk_user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "crm_notifications_rule_idx" ON "crm_notifications" USING btree ("automation_rule_id","created_at");