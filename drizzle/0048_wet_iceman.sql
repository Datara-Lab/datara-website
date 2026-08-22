DROP INDEX "crm_customers_tenant_email_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "crm_customers_tenant_email_unique" ON "crm_customers" USING btree ("tenant_id","email");