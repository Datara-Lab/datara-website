ALTER TABLE "tenants" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "primary_color" text DEFAULT '#2563EB' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "secondary_color" text DEFAULT '#06B6D4' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "favicon_object_key" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "welcome_image_object_key" text;