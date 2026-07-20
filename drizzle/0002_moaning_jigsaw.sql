CREATE TABLE "crm_promotion_products" (
	"promotion_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_promotion_products_pk" PRIMARY KEY("promotion_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "crm_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"priority" integer,
	"promotion_start" timestamp with time zone,
	"promotion_end" timestamp with time zone,
	"benefit_type" text,
	"payment_method" text,
	"promotion_group" text,
	"available_months" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"minimum_down_payment" numeric(14, 2),
	"maximum_benefits" integer,
	"used_benefits" integer DEFAULT 0 NOT NULL,
	"limit_promotion" boolean DEFAULT false NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"requires_selection" boolean DEFAULT false NOT NULL,
	"customer_type" text,
	"value" numeric(14, 2),
	"commercial_message" text,
	"conditions" text,
	"owner_clerk_user_id" text,
	"owner_name" text,
	"owner_email" text,
	"source_external_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_promotion_products" ADD CONSTRAINT "crm_promotion_products_promotion_id_crm_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."crm_promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_promotion_products" ADD CONSTRAINT "crm_promotion_products_product_id_crm_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."crm_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_promotions" ADD CONSTRAINT "crm_promotions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_promotion_products_product_idx" ON "crm_promotion_products" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_promotions_tenant_external_unique" ON "crm_promotions" USING btree ("tenant_id","source_external_id");--> statement-breakpoint
CREATE INDEX "crm_promotions_tenant_priority_idx" ON "crm_promotions" USING btree ("tenant_id","priority");--> statement-breakpoint
CREATE INDEX "crm_promotions_tenant_dates_idx" ON "crm_promotions" USING btree ("tenant_id","promotion_start","promotion_end");--> statement-breakpoint
CREATE INDEX "crm_promotions_tenant_paused_idx" ON "crm_promotions" USING btree ("tenant_id","paused");