ALTER TABLE "crm_customers" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_customers_tenant_branch_idx" ON "crm_customers" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "crm_deals_tenant_branch_idx" ON "crm_deals" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "crm_leads_tenant_branch_idx" ON "crm_leads" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "crm_quotes_tenant_branch_idx" ON "crm_quotes" USING btree ("tenant_id","branch_id");