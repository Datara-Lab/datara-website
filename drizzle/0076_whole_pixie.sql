CREATE TABLE "digital_credential_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_credential_events_type_check" CHECK (
        "digital_credential_events"."event_type" IN ('scan', 'profile_view', 'vcard_download')
      )
);
--> statement-breakpoint
CREATE TABLE "digital_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_profile_id" uuid NOT NULL,
	"public_token" text NOT NULL,
	"credential_type" text DEFAULT 'employee' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_credentials_status_check" CHECK (
        "digital_credentials"."status" IN ('active', 'suspended', 'revoked', 'expired')
      )
);
--> statement-breakpoint
CREATE TABLE "employee_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"employee_code" text NOT NULL,
	"job_title" text,
	"department" text,
	"corporate_phone" text,
	"location" text,
	"linkedin_url" text,
	"professional_bio" text,
	"photo_object_key" text,
	"hired_at" date,
	"public_visibility" jsonb DEFAULT '{"photo":true,"employeeCode":true,"jobTitle":true,"department":true,"email":true,"phone":false,"location":false,"linkedIn":false,"professionalBio":false,"hiredAt":false}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "digital_credential_events" ADD CONSTRAINT "digital_credential_events_credential_id_digital_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."digital_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_credentials" ADD CONSTRAINT "digital_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_credentials" ADD CONSTRAINT "digital_credentials_employee_profile_id_employee_profiles_id_fk" FOREIGN KEY ("employee_profile_id") REFERENCES "public"."employee_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_member_id_tenant_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."tenant_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "digital_credential_events_credential_idx" ON "digital_credential_events" USING btree ("credential_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "digital_credentials_public_token_unique" ON "digital_credentials" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "digital_credentials_tenant_idx" ON "digital_credentials" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "digital_credentials_employee_idx" ON "digital_credentials" USING btree ("employee_profile_id");--> statement-breakpoint
CREATE INDEX "digital_credentials_status_idx" ON "digital_credentials" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_profiles_member_unique" ON "employee_profiles" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_profiles_tenant_code_unique" ON "employee_profiles" USING btree ("tenant_id","employee_code");--> statement-breakpoint
CREATE INDEX "employee_profiles_tenant_idx" ON "employee_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "employee_profiles_tenant_department_idx" ON "employee_profiles" USING btree ("tenant_id","department");