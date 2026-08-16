ALTER TABLE "trial_redemptions" ADD COLUMN "owner_email" text;--> statement-breakpoint
ALTER TABLE "trial_redemptions" ADD COLUMN "day_12_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trial_redemptions" ADD COLUMN "day_14_reminder_sent_at" timestamp with time zone;