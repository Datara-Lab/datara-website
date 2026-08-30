ALTER TABLE "crm_products" ADD COLUMN "transferred_tax_code" text;--> statement-breakpoint
ALTER TABLE "crm_products" ADD COLUMN "transferred_factor_type" text;--> statement-breakpoint
ALTER TABLE "crm_products" ADD CONSTRAINT "crm_products_tax_object_check" CHECK (
        "crm_products"."tax_object" IS NULL OR
        "crm_products"."tax_object" IN ('01', '02', '03', '04', '05', '06', '07', '08')
      );--> statement-breakpoint
ALTER TABLE "crm_products" ADD CONSTRAINT "crm_products_transferred_factor_check" CHECK (
        "crm_products"."transferred_factor_type" IS NULL OR
        "crm_products"."transferred_factor_type" IN ('Tasa', 'Cuota', 'Exento')
      );--> statement-breakpoint
ALTER TABLE "crm_products" ADD CONSTRAINT "crm_products_transferred_rate_check" CHECK (
        "crm_products"."transferred_tax_rate" IS NULL OR
        "crm_products"."transferred_tax_rate" >= 0
      );