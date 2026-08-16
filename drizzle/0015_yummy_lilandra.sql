CREATE TYPE "public"."workspace_invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clerk_organization_invitation_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"global_role_id" uuid,
	"product_assignments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"message" text,
	"status" "workspace_invitation_status" DEFAULT 'pending' NOT NULL,
	"invited_by_member_id" uuid NOT NULL,
	"accepted_by_member_id" uuid,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invitations_clerk_organization_invitation_id_unique" UNIQUE("clerk_organization_invitation_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_global_role_id_roles_id_fk" FOREIGN KEY ("global_role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_member_id_tenant_members_id_fk" FOREIGN KEY ("invited_by_member_id") REFERENCES "public"."tenant_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_accepted_by_member_id_tenant_members_id_fk" FOREIGN KEY ("accepted_by_member_id") REFERENCES "public"."tenant_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitations_tenant_email_unique" ON "workspace_invitations" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "workspace_invitations_tenant_idx" ON "workspace_invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "workspace_invitations_status_idx" ON "workspace_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_invitations_invited_by_idx" ON "workspace_invitations" USING btree ("invited_by_member_id");