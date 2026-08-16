ALTER TABLE "inventory_movements" ALTER COLUMN "branch_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_stocks" ALTER COLUMN "branch_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_stocks" ALTER COLUMN "location_id" SET NOT NULL;