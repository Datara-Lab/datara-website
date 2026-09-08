CREATE TABLE "pet_clinical_visits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"pet_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"clinician" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"follow_up_date" date,
	"sales_order_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pet_clinical_visits" ADD CONSTRAINT "pet_clinical_visits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_clinical_visits" ADD CONSTRAINT "pet_clinical_visits_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_clinical_visits" ADD CONSTRAINT "pet_clinical_visits_pet_id_crm_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."crm_pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_clinical_visits" ADD CONSTRAINT "pet_clinical_visits_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_clinical_visits" ADD CONSTRAINT "pet_clinical_visits_sales_order_id_crm_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."crm_sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pet_clinical_visits_branch_date_idx" ON "pet_clinical_visits" USING btree ("tenant_id","branch_id","created_at");--> statement-breakpoint
CREATE INDEX "pet_clinical_visits_pet_date_idx" ON "pet_clinical_visits" USING btree ("tenant_id","pet_id","created_at");