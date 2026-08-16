ALTER TABLE "workspace_invitations" ALTER COLUMN "clerk_organization_invitation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_token_hash_unique" UNIQUE("token_hash");