CREATE TABLE "crm_pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"breed" text,
	"sex" text,
	"birth_date" date,
	"color" text,
	"weight_kg" numeric(8, 3),
	"microchip_number" text,
	"status" text DEFAULT 'active' NOT NULL,
	"allergies" text,
	"medical_conditions" text,
	"medications" text,
	"feeding_instructions" text,
	"care_notes" text,
	"photo_object_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_pets_status_check" CHECK ("crm_pets"."status" IN ('active', 'inactive', 'deceased')),
	CONSTRAINT "crm_pets_sex_check" CHECK ("crm_pets"."sex" IS NULL OR "crm_pets"."sex" IN ('female', 'male', 'unknown')),
	CONSTRAINT "crm_pets_weight_check" CHECK ("crm_pets"."weight_kg" IS NULL OR "crm_pets"."weight_kg" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pet_package_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"pet_id" uuid,
	"product_id" uuid,
	"name" text NOT NULL,
	"service_type" text NOT NULL,
	"unit_type" text NOT NULL,
	"purchased_units" integer NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"transferable_between_pets" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pet_package_accounts_units_check" CHECK ("pet_package_accounts"."purchased_units" > 0),
	CONSTRAINT "pet_package_accounts_service_check" CHECK ("pet_package_accounts"."service_type" IN ('daycare', 'boarding', 'grooming', 'mixed')),
	CONSTRAINT "pet_package_accounts_unit_check" CHECK ("pet_package_accounts"."unit_type" IN ('day', 'night', 'access')),
	CONSTRAINT "pet_package_accounts_status_check" CHECK ("pet_package_accounts"."status" IN ('active', 'exhausted', 'expired', 'cancelled')),
	CONSTRAINT "pet_package_accounts_validity_check" CHECK ("pet_package_accounts"."valid_until" IS NULL OR "pet_package_accounts"."valid_until" >= "pet_package_accounts"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "pet_package_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"package_account_id" uuid NOT NULL,
	"reservation_id" uuid,
	"entry_type" text NOT NULL,
	"available_delta" integer DEFAULT 0 NOT NULL,
	"reserved_delta" integer DEFAULT 0 NOT NULL,
	"consumed_delta" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pet_package_ledger_type_check" CHECK ("pet_package_ledger_entries"."entry_type" IN ('purchase', 'reserve', 'release', 'consume', 'refund', 'expire', 'adjustment')),
	CONSTRAINT "pet_package_ledger_delta_check" CHECK ("pet_package_ledger_entries"."available_delta" <> 0 OR "pet_package_ledger_entries"."reserved_delta" <> 0 OR "pet_package_ledger_entries"."consumed_delta" <> 0)
);
--> statement-breakpoint
CREATE TABLE "pet_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"pet_id" uuid NOT NULL,
	"branch_id" uuid,
	"product_id" uuid,
	"package_account_id" uuid,
	"service_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reserved_units" integer DEFAULT 1 NOT NULL,
	"checked_in_at" timestamp with time zone,
	"checked_out_at" timestamp with time zone,
	"cancellation_reason" text,
	"care_instructions" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pet_reservations_service_check" CHECK ("pet_reservations"."service_type" IN ('veterinary', 'grooming', 'daycare', 'boarding')),
	CONSTRAINT "pet_reservations_status_check" CHECK ("pet_reservations"."status" IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
	CONSTRAINT "pet_reservations_period_check" CHECK ("pet_reservations"."ends_at" > "pet_reservations"."starts_at"),
	CONSTRAINT "pet_reservations_units_check" CHECK ("pet_reservations"."reserved_units" > 0),
	CONSTRAINT "pet_reservations_checkout_check" CHECK ("pet_reservations"."checked_out_at" IS NULL OR "pet_reservations"."checked_in_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "crm_pets" ADD CONSTRAINT "crm_pets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pets" ADD CONSTRAINT "crm_pets_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_package_accounts" ADD CONSTRAINT "pet_package_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_package_accounts" ADD CONSTRAINT "pet_package_accounts_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_package_accounts" ADD CONSTRAINT "pet_package_accounts_pet_id_crm_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."crm_pets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_package_accounts" ADD CONSTRAINT "pet_package_accounts_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_package_ledger_entries" ADD CONSTRAINT "pet_package_ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_package_ledger_entries" ADD CONSTRAINT "pet_package_ledger_entries_package_account_id_pet_package_accounts_id_fk" FOREIGN KEY ("package_account_id") REFERENCES "public"."pet_package_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_package_ledger_entries" ADD CONSTRAINT "pet_package_ledger_entries_reservation_id_pet_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."pet_reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_reservations" ADD CONSTRAINT "pet_reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_reservations" ADD CONSTRAINT "pet_reservations_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_reservations" ADD CONSTRAINT "pet_reservations_pet_id_crm_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."crm_pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_reservations" ADD CONSTRAINT "pet_reservations_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_reservations" ADD CONSTRAINT "pet_reservations_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_reservations" ADD CONSTRAINT "pet_reservations_package_account_id_pet_package_accounts_id_fk" FOREIGN KEY ("package_account_id") REFERENCES "public"."pet_package_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_pets_tenant_customer_idx" ON "crm_pets" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_pets_tenant_status_idx" ON "crm_pets" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_pets_tenant_microchip_unique" ON "crm_pets" USING btree ("tenant_id","microchip_number") WHERE "crm_pets"."microchip_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "pet_package_accounts_tenant_customer_idx" ON "pet_package_accounts" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "pet_package_accounts_tenant_pet_idx" ON "pet_package_accounts" USING btree ("tenant_id","pet_id");--> statement-breakpoint
CREATE INDEX "pet_package_accounts_status_validity_idx" ON "pet_package_accounts" USING btree ("tenant_id","status","valid_until");--> statement-breakpoint
CREATE UNIQUE INDEX "pet_package_ledger_idempotency_unique" ON "pet_package_ledger_entries" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "pet_package_ledger_account_idx" ON "pet_package_ledger_entries" USING btree ("package_account_id","created_at");--> statement-breakpoint
CREATE INDEX "pet_package_ledger_reservation_idx" ON "pet_package_ledger_entries" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "pet_reservations_tenant_schedule_idx" ON "pet_reservations" USING btree ("tenant_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "pet_reservations_tenant_pet_idx" ON "pet_reservations" USING btree ("tenant_id","pet_id","starts_at");--> statement-breakpoint
CREATE INDEX "pet_reservations_tenant_status_idx" ON "pet_reservations" USING btree ("tenant_id","status","starts_at");