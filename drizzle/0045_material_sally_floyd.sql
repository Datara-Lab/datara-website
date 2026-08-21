CREATE TABLE "crm_product_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"inventory_tracked" boolean DEFAULT false NOT NULL,
	"technical_profile" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_clerk_user_id" text,
	"updated_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_product_categories" ADD COLUMN "product_type_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_products" ADD COLUMN "product_type_id" uuid;--> statement-breakpoint

WITH requested_types AS (
    SELECT
        "id" AS "tenant_id",
        'product'::text AS "key"
    FROM "tenants"

    UNION

    SELECT
        "id" AS "tenant_id",
        'service'::text AS "key"
    FROM "tenants"

    UNION

    SELECT
        "id" AS "tenant_id",
        'model'::text AS "key"
    FROM "tenants"
    WHERE
        "industry" =
        'motorcycle_dealership'

    UNION

    SELECT
        "tenant_id",
        "item_type" AS "key"
    FROM "crm_products"

    UNION

    SELECT
        "tenant_id",
        "item_type" AS "key"
    FROM "crm_product_categories"
)
INSERT INTO "crm_product_types" (
    "tenant_id",
    "key",
    "name",
    "inventory_tracked",
    "technical_profile",
    "active",
    "sort_order"
)
SELECT
    requested_types."tenant_id",
    requested_types."key",

    CASE
        WHEN requested_types."key" =
            'model'
        THEN 'Modelo'

        WHEN requested_types."key" =
            'service'
        THEN 'Servicio'

        ELSE 'Producto'
    END,

    requested_types."key"
        <> 'service',

    CASE
        WHEN
            requested_types."key" =
                'model'
            AND tenants."industry" =
                'motorcycle_dealership'
        THEN 'motorcycle_model'

        ELSE NULL
    END,

    true,

    CASE
        WHEN requested_types."key" =
            'model'
        THEN 10

        WHEN requested_types."key" =
            'product'
        THEN 20

        ELSE 30
    END
FROM requested_types
INNER JOIN "tenants"
    ON tenants."id" =
        requested_types."tenant_id";--> statement-breakpoint

UPDATE "crm_products"
SET "product_type_id" =
    product_types."id"
FROM "crm_product_types"
    AS product_types
WHERE
    product_types."tenant_id" =
        "crm_products"."tenant_id"
    AND
    product_types."key" =
        "crm_products"."item_type";--> statement-breakpoint

UPDATE "crm_product_categories"
SET "product_type_id" =
    product_types."id"
FROM "crm_product_types"
    AS product_types
WHERE
    product_types."tenant_id" =
        "crm_product_categories"."tenant_id"
    AND
    product_types."key" =
        "crm_product_categories"."item_type";--> statement-breakpoint

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "crm_products"
        WHERE
            "product_type_id"
            IS NULL
    ) THEN
        RAISE EXCEPTION
            'Existen elementos de catálogo sin tipo relacionado.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "crm_product_categories"
        WHERE
            "product_type_id"
            IS NULL
    ) THEN
        RAISE EXCEPTION
            'Existen categorías sin tipo relacionado.';
    END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "crm_product_types" ADD CONSTRAINT "crm_product_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_product_types_tenant_key_unique" ON "crm_product_types" USING btree ("tenant_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_product_types_tenant_name_unique" ON "crm_product_types" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "crm_product_types_tenant_active_idx" ON "crm_product_types" USING btree ("tenant_id","active","sort_order");--> statement-breakpoint
CREATE INDEX "crm_product_types_tenant_inventory_idx" ON "crm_product_types" USING btree ("tenant_id","inventory_tracked","active");--> statement-breakpoint
ALTER TABLE "crm_product_categories" ADD CONSTRAINT "crm_product_categories_product_type_id_crm_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."crm_product_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_products" ADD CONSTRAINT "crm_products_product_type_id_crm_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."crm_product_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_product_categories_tenant_product_type_name_unique" ON "crm_product_categories" USING btree ("tenant_id","product_type_id","name");--> statement-breakpoint
CREATE INDEX "crm_products_tenant_product_type_active_idx" ON "crm_products" USING btree ("tenant_id","product_type_id","active");