CREATE TABLE "crm_product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_clerk_user_id" text,
	"updated_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_products" ADD COLUMN "item_type" text DEFAULT 'product' NOT NULL;--> statement-breakpoint

UPDATE "crm_products"
SET "item_type" =
    CASE
        WHEN
            lower(
                coalesce(
                    "category",
                    ''
                )
            ) LIKE '%servicio%'
            OR
            lower("name") LIKE '%servicio%'
            OR
            lower(
                coalesce(
                    "code",
                    ''
                )
            ) LIKE '%service%'
        THEN 'service'

        WHEN
            lower(
                coalesce(
                    "category",
                    ''
                )
            ) LIKE '%motocicleta%'
            OR
            lower(
                coalesce(
                    "category",
                    ''
                )
            ) LIKE '%scooter%'
            OR
            lower(
                coalesce(
                    "code",
                    ''
                )
            ) LIKE '%moto%'
        THEN 'model'

        ELSE 'product'
    END;--> statement-breakpoint
ALTER TABLE "crm_product_categories" ADD CONSTRAINT "crm_product_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_product_categories_tenant_type_name_unique" ON "crm_product_categories" USING btree ("tenant_id","item_type","name");--> statement-breakpoint
CREATE INDEX "crm_product_categories_tenant_type_active_idx" ON "crm_product_categories" USING btree ("tenant_id","item_type","active","sort_order");--> statement-breakpoint
CREATE INDEX "crm_products_tenant_type_active_idx" ON "crm_products" USING btree ("tenant_id","item_type","active");
--> statement-breakpoint

INSERT INTO "crm_product_categories" (
    "tenant_id",
    "item_type",
    "name",
    "active",
    "sort_order"
)
SELECT DISTINCT
    "tenant_id",
    "item_type",
    trim("category"),
    true,
    0
FROM "crm_products"
WHERE
    "category" IS NOT NULL
    AND trim("category") <> ''
ON CONFLICT (
    "tenant_id",
    "item_type",
    "name"
)
DO NOTHING;--> statement-breakpoint

INSERT INTO "crm_product_categories" (
    "tenant_id",
    "item_type",
    "name",
    "active",
    "sort_order"
)
SELECT
    tenant_defaults."tenant_id",
    category_defaults."item_type",
    category_defaults."name",
    true,
    category_defaults."sort_order"
FROM (
    SELECT "id" AS "tenant_id"
    FROM "tenants"
    WHERE
        "industry" =
        'motorcycle_dealership'
) AS tenant_defaults
CROSS JOIN (
    VALUES
        ('model', 'Motocicleta urbana', 10),
        ('model', 'Motocicleta de trabajo', 20),
        ('model', 'Motocicleta deportiva', 30),
        ('model', 'Scooter', 40),
        ('model', 'Doble propósito', 50),

        ('product', 'Cascos', 10),
        ('product', 'Guantes', 20),
        ('product', 'Chamarras y protección', 30),
        ('product', 'Refacciones', 40),
        ('product', 'Accesorios', 50),
        ('product', 'Llantas', 60),
        ('product', 'Lubricantes', 70),

        ('service', 'Mantenimiento preventivo', 10),
        ('service', 'Reparación', 20),
        ('service', 'Diagnóstico', 30),
        ('service', 'Instalación de accesorios', 40),
        ('service', 'Garantía', 50)
) AS category_defaults(
    "item_type",
    "name",
    "sort_order"
)
ON CONFLICT (
    "tenant_id",
    "item_type",
    "name"
)
DO NOTHING;
