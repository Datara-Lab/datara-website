CREATE TABLE "tenant_module_entitlements" (
	"tenant_id" uuid NOT NULL,
	"product" "product_access" NOT NULL,
	"module_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "tenant_module_entitlements_pk" PRIMARY KEY("tenant_id","product","module_id")
);
--> statement-breakpoint
ALTER TABLE "tenant_module_entitlements" ADD CONSTRAINT "tenant_module_entitlements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_module_entitlements_enabled_idx" ON "tenant_module_entitlements" USING btree ("tenant_id","product","enabled");--> statement-breakpoint
CREATE INDEX "tenant_module_entitlements_expiration_idx" ON "tenant_module_entitlements" USING btree ("expires_at");