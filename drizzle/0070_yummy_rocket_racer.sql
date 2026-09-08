ALTER TABLE "pet_package_ledger_entries" DROP CONSTRAINT "pet_package_ledger_type_check";--> statement-breakpoint
ALTER TABLE "pet_reservations" DROP CONSTRAINT "pet_reservations_period_check";--> statement-breakpoint
ALTER TABLE "pet_reservations" ALTER COLUMN "ends_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pet_reservations" ADD COLUMN "origin" text DEFAULT 'reservation' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pet_reservations_open_pet_unique" ON "pet_reservations" USING btree ("tenant_id","pet_id") WHERE "pet_reservations"."status" = 'checked_in';--> statement-breakpoint
ALTER TABLE "pet_package_ledger_entries" ADD CONSTRAINT "pet_package_ledger_type_check" CHECK ("pet_package_ledger_entries"."entry_type" IN ('purchase', 'reserve', 'release', 'consume', 'redeem', 'refund', 'expire', 'adjustment'));--> statement-breakpoint
ALTER TABLE "pet_reservations" ADD CONSTRAINT "pet_reservations_origin_check" CHECK ("pet_reservations"."origin" IN ('reservation', 'walk_in'));--> statement-breakpoint
ALTER TABLE "pet_reservations" ADD CONSTRAINT "pet_reservations_period_check" CHECK ("pet_reservations"."ends_at" IS NULL OR "pet_reservations"."ends_at" > "pet_reservations"."starts_at");