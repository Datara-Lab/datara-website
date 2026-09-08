ALTER TABLE "employee_profiles" DROP CONSTRAINT "employee_profiles_member_id_tenant_members_id_fk";
--> statement-breakpoint
ALTER TABLE "employee_profiles" ALTER COLUMN "member_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_profiles" ALTER COLUMN "public_visibility" SET DEFAULT '{"photo":true,"personCode":true,"jobTitle":true,"department":true,"email":true,"phone":false,"location":false,"linkedIn":false,"professionalBio":false,"hiredAt":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "person_type" text DEFAULT 'employee' NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_member_id_tenant_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."tenant_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_profiles_tenant_status_idx" ON "employee_profiles" USING btree ("tenant_id","status");--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_type_check" CHECK (
        "employee_profiles"."person_type" IN ('employee', 'contractor', 'provider', 'visitor', 'other')
      );--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_status_check" CHECK (
        "employee_profiles"."status" IN ('active', 'inactive')
      );