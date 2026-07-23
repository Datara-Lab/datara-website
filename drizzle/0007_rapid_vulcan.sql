CREATE TABLE "crm_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'No iniciada' NOT NULL,
	"priority" text DEFAULT 'Normal' NOT NULL,
	"owner_clerk_user_id" text NOT NULL,
	"owner_name" text,
	"owner_email" text,
	"lead_id" uuid,
	"customer_id" uuid,
	"deal_id" uuid,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"all_day" boolean DEFAULT false NOT NULL,
	"timezone" text DEFAULT 'America/Mexico_City' NOT NULL,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	"reminder_minutes_before" integer,
	"recurrence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"call_mode" text,
	"call_direction" text,
	"call_purpose" text,
	"call_result" text,
	"call_duration_seconds" integer,
	"recording_url" text,
	"meeting_location_type" text,
	"location" text,
	"meeting_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_activity_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"participant_type" text DEFAULT 'external' NOT NULL,
	"reference_id" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"response_status" text DEFAULT 'Pendiente' NOT NULL,
	"reminder_minutes_before" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activity_participants" ADD CONSTRAINT "crm_activity_participants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activity_participants" ADD CONSTRAINT "crm_activity_participants_activity_id_crm_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."crm_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_activities_tenant_type_idx" ON "crm_activities" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "crm_activities_tenant_status_idx" ON "crm_activities" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "crm_activities_tenant_owner_idx" ON "crm_activities" USING btree ("tenant_id","owner_clerk_user_id");--> statement-breakpoint
CREATE INDEX "crm_activities_tenant_start_idx" ON "crm_activities" USING btree ("tenant_id","start_at");--> statement-breakpoint
CREATE INDEX "crm_activities_tenant_due_idx" ON "crm_activities" USING btree ("tenant_id","due_at");--> statement-breakpoint
CREATE INDEX "crm_activities_tenant_lead_idx" ON "crm_activities" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE INDEX "crm_activities_tenant_customer_idx" ON "crm_activities" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_activities_tenant_deal_idx" ON "crm_activities" USING btree ("tenant_id","deal_id");--> statement-breakpoint
CREATE INDEX "crm_activity_participants_activity_idx" ON "crm_activity_participants" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "crm_activity_participants_tenant_email_idx" ON "crm_activity_participants" USING btree ("tenant_id","email");