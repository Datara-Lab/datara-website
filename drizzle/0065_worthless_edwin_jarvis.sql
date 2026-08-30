ALTER TABLE "crm_customers" ADD COLUMN "fiscal_tax_regime" text;--> statement-breakpoint
ALTER TABLE "crm_customers" ADD COLUMN "cfdi_use" text;--> statement-breakpoint
ALTER TABLE "crm_products" ADD COLUMN "product_service_code" text;--> statement-breakpoint
ALTER TABLE "crm_products" ADD COLUMN "unit_code" text;--> statement-breakpoint
ALTER TABLE "crm_products" ADD COLUMN "tax_object" text;--> statement-breakpoint
ALTER TABLE "crm_products" ADD COLUMN "transferred_tax_rate" numeric(8, 6);--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "series" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "folio" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "payment_form" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "cfdi_type" text DEFAULT 'I' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "fiscal_provider" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "fiscal_environment" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "fiscal_uuid" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "stamped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "cancellation_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "cancellation_reason_code" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "replacement_uuid" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "xml_object_key" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "pdf_object_key" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fiscal_tax_regime" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fiscal_postal_code" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_invoices_fiscal_uuid_unique" ON "sales_invoices" USING btree ("fiscal_provider","fiscal_environment","fiscal_uuid") WHERE "sales_invoices"."fiscal_uuid" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_fiscal_environment_check" CHECK (
        "sales_invoices"."fiscal_environment" IS NULL OR
        "sales_invoices"."fiscal_environment" IN ('test', 'live')
      );--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cfdi_type_check" CHECK ("sales_invoices"."cfdi_type" IN ('I', 'E', 'T', 'N', 'P'));--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cancellation_reason_check" CHECK (
        "sales_invoices"."cancellation_reason_code" IS NULL OR
        "sales_invoices"."cancellation_reason_code" IN ('01', '02', '03', '04')
      );