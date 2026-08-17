import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  sql,
} from "drizzle-orm";

export const tenantStatusEnum =
  pgEnum("tenant_status", [
    "pending_payment",
    "provisioning",
    "active",
    "past_due",
    "suspended",
    "canceled",
    "provisioning_failed",
  ]);

export const crmProviderEnum =
  pgEnum("crm_provider", [
    "zoho",
    "postgres",
    "odoo",
  ]);

export const productAccessEnum =
  pgEnum("product_access", [
    "crm",
    "analytics",
    "cloud",
  ]);

export const subscriptionStatusEnum =
  pgEnum("subscription_status", [
    "incomplete",
    "trialing",
    "active",
    "past_due",
    "paused",
    "canceled",
    "unpaid",
  ]);

export const memberStatusEnum =
  pgEnum("member_status", [
    "invited",
    "active",
    "suspended",
    "removed",
  ]);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    clerkOrganizationId: text(
      "clerk_organization_id",
    )
      .notNull()
      .unique(),

    slug: text("slug")
      .notNull()
      .unique(),

    name: text("name").notNull(),

    industry: text(
      "industry",
    ),

    legalName: text("legal_name"),
    taxId: text("tax_id"),

    logoObjectKey: text(
      "logo_object_key",
    ),

    tagline: text("tagline"),

    primaryColor: text(
      "primary_color",
    )
      .notNull()
      .default("#2563EB"),

    secondaryColor: text(
      "secondary_color",
    )
      .notNull()
      .default("#06B6D4"),

    faviconObjectKey: text(
      "favicon_object_key",
    ),

    welcomeImageObjectKey: text(
      "welcome_image_object_key",
    ),

    country: text("country")
      .notNull()
      .default("MX"),

    timezone: text("timezone")
      .notNull()
      .default(
        "America/Mexico_City",
      ),

    status: tenantStatusEnum("status")
      .notNull()
      .default("provisioning"),

    crmProvider:
      crmProviderEnum("crm_provider")
        .notNull()
        .default("zoho"),

    zohoOrganizationId: text(
      "zoho_organization_id",
    ),

    zohoApiDomain: text(
      "zoho_api_domain",
    ),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tenants_status_idx").on(
      table.status,
    ),

    index(
      "tenants_crm_provider_idx",
    ).on(table.crmProvider),
  ],
);

export const tenantRegions =
  pgTable(
    "tenant_regions",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      name: text("name")
        .notNull(),

      code: text("code")
        .notNull(),

      description: text(
        "description",
      ),

      active: boolean("active")
        .notNull()
        .default(true),

      metadata: jsonb("metadata")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "tenant_regions_tenant_code_unique",
      ).on(
        table.tenantId,
        table.code,
      ),

      index(
        "tenant_regions_tenant_idx",
      ).on(table.tenantId),

      index(
        "tenant_regions_active_idx",
      ).on(
        table.tenantId,
        table.active,
      ),
    ],
  );

export const tenantBranches =
  pgTable(
    "tenant_branches",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      regionId: uuid("region_id")
        .references(
          () => tenantRegions.id,
          {
            onDelete: "set null",
          },
        ),

      name: text("name")
        .notNull(),

      code: text("code")
        .notNull(),

      folioPrefix: text(
        "folio_prefix",
      ),

      phone: text("phone"),

      email: text("email"),

      timezone: text("timezone"),

      address: jsonb("address")
        .$type<{
          country?: string;
          state?: string;
          city?: string;
          postalCode?: string;
          street?: string;
          exteriorNumber?: string;
          interiorNumber?: string;
          neighborhood?: string;
          reference?: string;
        }>()
        .notNull()
        .default({}),

      active: boolean("active")
        .notNull()
        .default(true),

      metadata: jsonb("metadata")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "tenant_branches_tenant_code_unique",
      ).on(
        table.tenantId,
        table.code,
      ),

      index(
        "tenant_branches_tenant_idx",
      ).on(table.tenantId),

      index(
        "tenant_branches_region_idx",
      ).on(table.regionId),

      index(
        "tenant_branches_active_idx",
      ).on(
        table.tenantId,
        table.active,
      ),
    ],
  );

export const crmProducts = pgTable(
  "crm_products",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    code: text("code"),

    description: text("description"),

    imageObjectKey: text(
      "image_object_key",
    ),

    category: text("category"),

    unitPrice: numeric(
      "unit_price",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    currency: text("currency")
      .notNull()
      .default("mxn"),

    active: boolean("active")
      .notNull()
      .default(true),

    sourceExternalId: text(
      "source_external_id",
    ),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex(
      "crm_products_tenant_code_unique",
    ).on(
      table.tenantId,
      table.code,
    ),

    uniqueIndex(
      "crm_products_tenant_external_unique",
    ).on(
      table.tenantId,
      table.sourceExternalId,
    ),

    index(
      "crm_products_tenant_active_idx",
    ).on(
      table.tenantId,
      table.active,
    ),

    index(
      "crm_products_tenant_name_idx",
    ).on(
      table.tenantId,
      table.name,
    ),
  ],
);

export const inventoryLocations =
  pgTable(
    "inventory_locations",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      /*
       * Es opcional porque una ubicación
       * puede ser una bodega independiente.
       */
      branchId: uuid("branch_id")
        .references(
          () => tenantBranches.id,
          {
            onDelete: "set null",
          },
        ),

      name: text("name")
        .notNull(),

      code: text("code"),

      type: text("type")
        .notNull()
        .default("Bodega"),

      active: boolean("active")
        .notNull()
        .default(true),

      isDefault: boolean(
        "is_default",
      )
        .notNull()
        .default(false),

      addressLine: text(
        "address_line",
      ),

      city: text("city"),

      state: text("state"),

      postalCode: text(
        "postal_code",
      ),

      country: text("country")
        .notNull()
        .default("MX"),

      metadata: jsonb("metadata")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "inventory_locations_tenant_code_unique",
      ).on(
        table.tenantId,
        table.code,
      ),

      index(
        "inventory_locations_tenant_active_idx",
      ).on(
        table.tenantId,
        table.active,
      ),

      index(
        "inventory_locations_tenant_branch_idx",
      ).on(
        table.tenantId,
        table.branchId,
      ),
    ],
  );

export const inventoryStocks =
  pgTable(
    "inventory_stocks",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      branchId: uuid("branch_id")
        .references(
          () => tenantBranches.id,
          {
            onDelete: "cascade",
          },
        ),

      locationId: uuid(
        "location_id",
      )
        .notNull()
        .references(
          () => inventoryLocations.id,
          {
            onDelete: "restrict",
          },
        ),

      productId: uuid("product_id")
        .notNull()
        .references(
          () => crmProducts.id,
          {
            onDelete: "cascade",
          },
        ),

      quantity: integer("quantity")
        .notNull()
        .default(0),

      reservedQuantity: integer(
        "reserved_quantity",
      )
        .notNull()
        .default(0),

      minimumQuantity: integer(
        "minimum_quantity",
      )
        .notNull()
        .default(0),

            maximumQuantity: integer(
        "maximum_quantity",
      ),

      reorderPoint: integer(
        "reorder_point",
      ),

      averageUnitCost: numeric(
        "average_unit_cost",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      lastUnitCost: numeric(
        "last_unit_cost",
        {
          precision: 14,
          scale: 2,
        },
      ),

      location: text("location"),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      check(
        "inventory_stocks_quantity_nonnegative",
        sql`${table.quantity} >= 0`,
      ),

      check(
        "inventory_stocks_reserved_nonnegative",
        sql`${table.reservedQuantity} >= 0`,
      ),

      check(
        "inventory_stocks_reserved_lte_quantity",
        sql`${table.reservedQuantity} <= ${table.quantity}`,
      ),

      uniqueIndex(
        "inventory_stocks_tenant_location_product_unique",
      ).on(
        table.tenantId,
        table.locationId,
        table.productId,
      ),

      index(
        "inventory_stocks_tenant_branch_idx",
      ).on(
        table.tenantId,
        table.branchId,
      ),

      index(
        "inventory_stocks_tenant_location_idx",
      ).on(
        table.tenantId,
        table.locationId,
      ),

      index(
        "inventory_stocks_tenant_product_idx",
      ).on(
        table.tenantId,
        table.productId,
      ),
    ],
  );

  export const inventoryMovements =
  pgTable(
    "inventory_movements",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      branchId: uuid("branch_id")
        .references(
          () => tenantBranches.id,
          {
            onDelete: "cascade",
          },
        ),

      locationId: uuid(
        "location_id",
      )
        .notNull()
        .references(
          () => inventoryLocations.id,
          {
            onDelete: "restrict",
          },
        ),

      productId: uuid("product_id")
        .notNull()
        .references(
          () => crmProducts.id,
          {
            onDelete: "cascade",
          },
        ),

      stockId: uuid("stock_id")
        .notNull()
        .references(
          () => inventoryStocks.id,
          {
            onDelete: "cascade",
          },
        ),

      type: text("type")
        .notNull(),

      quantity: integer("quantity")
        .notNull(),

      previousQuantity: integer(
        "previous_quantity",
      )
        .notNull(),

      resultingQuantity: integer(
        "resulting_quantity",
      )
        .notNull(),

            unitCost: numeric(
        "unit_cost",
        {
          precision: 14,
          scale: 2,
        },
      ),

      totalCost: numeric(
        "total_cost",
        {
          precision: 16,
          scale: 2,
        },
      ),

      resultingAverageCost: numeric(
        "resulting_average_cost",
        {
          precision: 14,
          scale: 2,
        },
      ),

      reason: text("reason"),

      reference: text(
        "reference",
      ),

      performedByClerkUserId: text(
        "performed_by_clerk_user_id",
      )
        .notNull(),

      performedByName: text(
        "performed_by_name",
      ),

      metadata: jsonb("metadata")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "inventory_movements_tenant_branch_idx",
      ).on(
        table.tenantId,
        table.branchId,
        table.createdAt,
      ),

            index(
        "inventory_movements_tenant_location_idx",
      ).on(
        table.tenantId,
        table.locationId,
        table.createdAt,
      ),

      index(
        "inventory_movements_tenant_product_idx",
      ).on(
        table.tenantId,
        table.productId,
        table.createdAt,
      ),

      index(
        "inventory_movements_stock_idx",
      ).on(
        table.stockId,
        table.createdAt,
      ),
    ],
  );

export const inventoryReservations =
  pgTable(
    "inventory_reservations",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid(
        "tenant_id",
      )
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      branchId: uuid(
        "branch_id",
      ).references(
        () => tenantBranches.id,
        {
          onDelete: "set null",
        },
      ),

      locationId: uuid(
        "location_id",
      )
        .notNull()
        .references(
          () =>
            inventoryLocations.id,
          {
            onDelete: "restrict",
          },
        ),

      productId: uuid(
        "product_id",
      )
        .notNull()
        .references(
          () => crmProducts.id,
          {
            onDelete: "restrict",
          },
        ),

      stockId: uuid(
        "stock_id",
      )
        .notNull()
        .references(
          () => inventoryStocks.id,
          {
            onDelete: "restrict",
          },
        ),

      sourceType: text(
        "source_type",
      ).notNull(),

      sourceId: uuid(
        "source_id",
      ),

      sourceReference: text(
        "source_reference",
      ),

      quantity: integer(
        "quantity",
      ).notNull(),

      status: text("status")
        .notNull()
        .default("Activa"),

      customerName: text(
        "customer_name",
      ),

      notes: text("notes"),

      expiresAt: timestamp(
        "expires_at",
        {
          withTimezone: true,
        },
      ),

      createdByClerkUserId:
        text(
          "created_by_clerk_user_id",
        ).notNull(),

      createdByName: text(
        "created_by_name",
      ),

      releasedByClerkUserId:
        text(
          "released_by_clerk_user_id",
        ),

      releasedByName: text(
        "released_by_name",
      ),

      releasedAt: timestamp(
        "released_at",
        {
          withTimezone: true,
        },
      ),

      releaseReason: text(
        "release_reason",
      ),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "inventory_reservations_tenant_status_idx",
      ).on(
        table.tenantId,
        table.status,
      ),

      index(
        "inventory_reservations_tenant_location_idx",
      ).on(
        table.tenantId,
        table.locationId,
        table.status,
      ),

      index(
        "inventory_reservations_tenant_product_idx",
      ).on(
        table.tenantId,
        table.productId,
        table.status,
      ),

      index(
        "inventory_reservations_source_idx",
      ).on(
        table.tenantId,
        table.sourceType,
        table.sourceId,
      ),

      uniqueIndex(
        "inventory_reservations_source_stock_unique",
      ).on(
        table.tenantId,
        table.sourceType,
        table.sourceId,
        table.stockId,
      ),
    ],
  );

export const inventoryCounts =
  pgTable(
    "inventory_counts",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid(
        "tenant_id",
      )
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      branchId: uuid(
        "branch_id",
      ).references(
        () => tenantBranches.id,
        {
          onDelete: "set null",
        },
      ),

      locationId: uuid(
        "location_id",
      )
        .notNull()
        .references(
          () =>
            inventoryLocations.id,
          {
            onDelete: "restrict",
          },
        ),

      reference: text(
        "reference",
      ).notNull(),

      status: text("status")
        .notNull()
        .default("Borrador"),

      notes: text("notes"),

      createdByClerkUserId:
        text(
          "created_by_clerk_user_id",
        ).notNull(),

      createdByName: text(
        "created_by_name",
      ),

      submittedByClerkUserId:
        text(
          "submitted_by_clerk_user_id",
        ),

      submittedByName: text(
        "submitted_by_name",
      ),

      submittedAt: timestamp(
        "submitted_at",
        {
          withTimezone: true,
        },
      ),

      approvedByClerkUserId:
        text(
          "approved_by_clerk_user_id",
        ),

      approvedByName: text(
        "approved_by_name",
      ),

      approvedAt: timestamp(
        "approved_at",
        {
          withTimezone: true,
        },
      ),

      cancelledByClerkUserId:
        text(
          "cancelled_by_clerk_user_id",
        ),

      cancelledByName: text(
        "cancelled_by_name",
      ),

      cancelledAt: timestamp(
        "cancelled_at",
        {
          withTimezone: true,
        },
      ),

      cancellationReason: text(
        "cancellation_reason",
      ),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "inventory_counts_tenant_reference_unique",
      ).on(
        table.tenantId,
        table.reference,
      ),

      index(
        "inventory_counts_tenant_status_idx",
      ).on(
        table.tenantId,
        table.status,
      ),

      index(
        "inventory_counts_tenant_location_idx",
      ).on(
        table.tenantId,
        table.locationId,
        table.createdAt,
      ),
    ],
  );

export const inventoryCountItems =
  pgTable(
    "inventory_count_items",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid(
        "tenant_id",
      )
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      countId: uuid(
        "count_id",
      )
        .notNull()
        .references(
          () => inventoryCounts.id,
          {
            onDelete: "cascade",
          },
        ),

      stockId: uuid(
        "stock_id",
      )
        .notNull()
        .references(
          () => inventoryStocks.id,
          {
            onDelete: "restrict",
          },
        ),

      productId: uuid(
        "product_id",
      )
        .notNull()
        .references(
          () => crmProducts.id,
          {
            onDelete: "restrict",
          },
        ),

      expectedQuantity: integer(
        "expected_quantity",
      ).notNull(),

      countedQuantity: integer(
        "counted_quantity",
      ),

      difference: integer(
        "difference",
      ),

      notes: text("notes"),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "inventory_count_items_count_stock_unique",
      ).on(
        table.countId,
        table.stockId,
      ),

      index(
        "inventory_count_items_tenant_count_idx",
      ).on(
        table.tenantId,
        table.countId,
      ),

      index(
        "inventory_count_items_tenant_product_idx",
      ).on(
        table.tenantId,
        table.productId,
      ),
    ],
  );

export const inventoryAuditLogs =
  pgTable(
    "inventory_audit_logs",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid(
        "tenant_id",
      )
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      branchId: uuid(
        "branch_id",
      ).references(
        () => tenantBranches.id,
        {
          onDelete: "set null",
        },
      ),

      locationId: uuid(
        "location_id",
      ).references(
        () =>
          inventoryLocations.id,
        {
          onDelete: "set null",
        },
      ),

      productId: uuid(
        "product_id",
      ).references(
        () => crmProducts.id,
        {
          onDelete: "set null",
        },
      ),

      entityType: text(
        "entity_type",
      ).notNull(),

      entityId: text(
        "entity_id",
      ).notNull(),

      action: text(
        "action",
      ).notNull(),

      summary: text(
        "summary",
      ).notNull(),

      reason: text("reason"),

      actorClerkUserId: text(
        "actor_clerk_user_id",
      ).notNull(),

      actorName: text(
        "actor_name",
      ),

      before: jsonb("before")
        .$type<
          Record<string, unknown>
        >(),

      after: jsonb("after")
        .$type<
          Record<string, unknown>
        >(),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "inventory_audit_logs_tenant_created_idx",
      ).on(
        table.tenantId,
        table.createdAt,
      ),

      index(
        "inventory_audit_logs_tenant_entity_idx",
      ).on(
        table.tenantId,
        table.entityType,
        table.entityId,
      ),

      index(
        "inventory_audit_logs_tenant_branch_idx",
      ).on(
        table.tenantId,
        table.branchId,
        table.createdAt,
      ),

      index(
        "inventory_audit_logs_tenant_product_idx",
      ).on(
        table.tenantId,
        table.productId,
        table.createdAt,
      ),
    ],
  );

export const inventoryReplenishmentRequests =
  pgTable(
    "inventory_replenishment_requests",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid(
        "tenant_id",
      )
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      branchId: uuid(
        "branch_id",
      ).references(
        () => tenantBranches.id,
        {
          onDelete: "set null",
        },
      ),

      reference: text(
        "reference",
      ).notNull(),

      status: text("status")
        .notNull()
        .default("Borrador"),

      supplierName: text(
        "supplier_name",
      ),

      supplierReference: text(
        "supplier_reference",
      ),

      currency: text("currency")
        .notNull()
        .default("mxn"),

      notes: text("notes"),

      externalSystem: text(
        "external_system",
      ),

      externalId: text(
        "external_id",
      ),

      externalReference: text(
        "external_reference",
      ),

      syncStatus: text(
        "sync_status",
      )
        .notNull()
        .default("Pendiente"),

      syncError: text(
        "sync_error",
      ),

      requestedByClerkUserId:
        text(
          "requested_by_clerk_user_id",
        ).notNull(),

      requestedByName: text(
        "requested_by_name",
      ),

      requestedAt: timestamp(
        "requested_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      sentAt: timestamp(
        "sent_at",
        {
          withTimezone: true,
        },
      ),

      confirmedAt: timestamp(
        "confirmed_at",
        {
          withTimezone: true,
        },
      ),

      receivedAt: timestamp(
        "received_at",
        {
          withTimezone: true,
        },
      ),

      cancelledAt: timestamp(
        "cancelled_at",
        {
          withTimezone: true,
        },
      ),

      cancellationReason: text(
        "cancellation_reason",
      ),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "inventory_replenishment_requests_tenant_reference_unique",
      ).on(
        table.tenantId,
        table.reference,
      ),

      index(
        "inventory_replenishment_requests_tenant_status_idx",
      ).on(
        table.tenantId,
        table.status,
        table.createdAt,
      ),

      index(
        "inventory_replenishment_requests_tenant_branch_idx",
      ).on(
        table.tenantId,
        table.branchId,
        table.createdAt,
      ),

      index(
        "inventory_replenishment_requests_external_idx",
      ).on(
        table.tenantId,
        table.externalSystem,
        table.externalId,
      ),
    ],
  );

export const inventoryReplenishmentRequestItems =
  pgTable(
    "inventory_replenishment_request_items",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid(
        "tenant_id",
      )
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      requestId: uuid(
        "request_id",
      )
        .notNull()
        .references(
          () =>
            inventoryReplenishmentRequests
              .id,
          {
            onDelete: "cascade",
          },
        ),

      branchId: uuid(
        "branch_id",
      ).references(
        () => tenantBranches.id,
        {
          onDelete: "set null",
        },
      ),

      locationId: uuid(
        "location_id",
      )
        .notNull()
        .references(
          () =>
            inventoryLocations.id,
          {
            onDelete: "restrict",
          },
        ),

      productId: uuid(
        "product_id",
      )
        .notNull()
        .references(
          () => crmProducts.id,
          {
            onDelete: "restrict",
          },
        ),

      stockId: uuid(
        "stock_id",
      )
        .notNull()
        .references(
          () => inventoryStocks.id,
          {
            onDelete: "restrict",
          },
        ),

      requestedQuantity: integer(
        "requested_quantity",
      ).notNull(),

      receivedQuantity: integer(
        "received_quantity",
      )
        .notNull()
        .default(0),

      unitCost: numeric(
        "unit_cost",
        {
          precision: 14,
          scale: 2,
        },
      ),

      totalCost: numeric(
        "total_cost",
        {
          precision: 14,
          scale: 2,
        },
      ),

      notes: text("notes"),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "inventory_replenishment_request_items_request_stock_unique",
      ).on(
        table.requestId,
        table.stockId,
      ),

      index(
        "inventory_replenishment_request_items_tenant_request_idx",
      ).on(
        table.tenantId,
        table.requestId,
      ),

      index(
        "inventory_replenishment_request_items_tenant_product_idx",
      ).on(
        table.tenantId,
        table.productId,
      ),

      index(
        "inventory_replenishment_request_items_tenant_location_idx",
      ).on(
        table.tenantId,
        table.locationId,
      ),
    ],
  );

export const crmLeads = pgTable(
  "crm_leads",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

        branchId: uuid(
      "branch_id",
    ).references(
      () => tenantBranches.id,
      {
        onDelete: "set null",
      },
    ),

    firstName: text(
      "first_name",
    ).notNull(),

    lastName: text("last_name"),

    email: text("email"),

    phone: text("phone"),

    mobile: text("mobile"),

    company: text("company"),

    source: text("source"),

    status: text("status")
      .notNull()
      .default("Nuevo"),

    productId: uuid("product_id")
      .references(
        () => crmProducts.id,
        {
          onDelete: "set null",
        },
      ),

    ownerClerkUserId: text(
      "owner_clerk_user_id",
    ),

    ownerName: text(
      "owner_name",
    ),

    ownerEmail: text(
      "owner_email",
    ),

    commercialConsent: boolean(
      "commercial_consent",
    )
      .notNull()
      .default(false),

    notes: text("notes"),

    metadata: jsonb("metadata")
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index(
      "crm_leads_tenant_branch_idx",
    ).on(
      table.tenantId,
      table.branchId,
    ),

    index(
      "crm_leads_tenant_status_idx",
    ).on(
      table.tenantId,
      table.status,
    ),

    index(
      "crm_leads_tenant_owner_idx",
    ).on(
      table.tenantId,
      table.ownerClerkUserId,
    ),

    index(
      "crm_leads_tenant_email_idx",
    ).on(
      table.tenantId,
      table.email,
    ),

    index(
      "crm_leads_tenant_phone_idx",
    ).on(
      table.tenantId,
      table.phone,
    ),

    index(
      "crm_leads_tenant_created_idx",
    ).on(
      table.tenantId,
      table.createdAt,
    ),
  ],
);

export const crmCustomers = pgTable(
  "crm_customers",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

        branchId: uuid(
      "branch_id",
    ).references(
      () => tenantBranches.id,
      {
        onDelete: "set null",
      },
    ),

    customerType: text(
      "customer_type",
    )
      .notNull()
      .default("Persona"),

    name: text("name").notNull(),

    lastName: text("last_name"),

    companyName: text(
      "company_name",
    ),

    legalName: text("legal_name"),

    taxId: text("tax_id"),

    email: text("email"),

    phone: text("phone"),

    mobile: text("mobile"),

    status: text("status")
      .notNull()
      .default("Activo"),

    sourceLeadId: uuid(
      "source_lead_id",
    ).references(() => crmLeads.id, {
      onDelete: "set null",
    }),

    productId: uuid(
      "product_id",
    ).references(() => crmProducts.id, {
      onDelete: "set null",
    }),

    ownerClerkUserId: text(
      "owner_clerk_user_id",
    ),

    ownerName: text("owner_name"),

    ownerEmail: text("owner_email"),

    addressLine: text(
      "address_line",
    ),

    city: text("city"),

    state: text("state"),

    postalCode: text(
      "postal_code",
    ),

    country: text("country")
      .notNull()
      .default("MX"),

    commercialConsent: boolean(
      "commercial_consent",
    )
      .notNull()
      .default(false),

    notes: text("notes"),

    metadata: jsonb("metadata")
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index(
      "crm_customers_tenant_branch_idx",
    ).on(
      table.tenantId,
      table.branchId,
    ),

    uniqueIndex(
      "crm_customers_tenant_tax_id_unique",
    ).on(
      table.tenantId,
      table.taxId,
    ),

    index(
      "crm_customers_tenant_status_idx",
    ).on(
      table.tenantId,
      table.status,
    ),

    index(
      "crm_customers_tenant_type_idx",
    ).on(
      table.tenantId,
      table.customerType,
    ),

    index(
      "crm_customers_tenant_name_idx",
    ).on(
      table.tenantId,
      table.name,
    ),

    index(
      "crm_customers_tenant_email_idx",
    ).on(
      table.tenantId,
      table.email,
    ),

    index(
      "crm_customers_tenant_phone_idx",
    ).on(
      table.tenantId,
      table.phone,
    ),

    index(
      "crm_customers_tenant_owner_idx",
    ).on(
      table.tenantId,
      table.ownerClerkUserId,
    ),

    index(
      "crm_customers_tenant_created_idx",
    ).on(
      table.tenantId,
      table.createdAt,
    ),
  ],
);

export const crmDeals = pgTable(
  "crm_deals",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

        branchId: uuid(
      "branch_id",
    ).references(
      () => tenantBranches.id,
      {
        onDelete: "set null",
      },
    ),

    name: text("name").notNull(),

    customerId: uuid(
      "customer_id",
    ).references(
      () => crmCustomers.id,
      {
        onDelete: "set null",
      },
    ),

    sourceLeadId: uuid(
      "source_lead_id",
    ).references(
      () => crmLeads.id,
      {
        onDelete: "set null",
      },
    ),

    ownerClerkUserId: text(
      "owner_clerk_user_id",
    ),

    ownerName: text("owner_name"),

    ownerEmail: text("owner_email"),

    stage: text("stage")
      .notNull()
      .default("Nueva"),

    status: text("status")
      .notNull()
      .default("Abierta"),

    acquisitionChannel: text(
      "acquisition_channel",
    ),

    currency: text("currency")
      .notNull()
      .default("mxn"),

    baseAmount: numeric(
      "base_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    discountAmount: numeric(
      "discount_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    totalAmount: numeric(
      "total_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    paymentMethod: text(
      "payment_method",
    ),

    minimumDownPayment: numeric(
      "minimum_down_payment",
      {
        precision: 14,
        scale: 2,
      },
    ),

    customerDownPayment: numeric(
      "customer_down_payment",
      {
        precision: 14,
        scale: 2,
      },
    ),

    financedAmount: numeric(
      "financed_amount",
      {
        precision: 14,
        scale: 2,
      },
    ),

    financingMonths: integer(
      "financing_months",
    ),

    estimatedPayment: numeric(
      "estimated_payment",
      {
        precision: 14,
        scale: 2,
      },
    ),

    probability: integer(
      "probability",
    ),

    expectedCloseAt: timestamp(
      "expected_close_at",
      {
        withTimezone: true,
      },
    ),

    closedAt: timestamp(
      "closed_at",
      {
        withTimezone: true,
      },
    ),

    nextStep: text("next_step"),

    notes: text("notes"),

    calculationSnapshot: jsonb(
      "calculation_snapshot",
    )
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    metadata: jsonb("metadata")
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index(
      "crm_deals_tenant_branch_idx",
    ).on(
      table.tenantId,
      table.branchId,
    ),

    index(
      "crm_deals_tenant_stage_idx",
    ).on(
      table.tenantId,
      table.stage,
    ),

    index(
      "crm_deals_tenant_status_idx",
    ).on(
      table.tenantId,
      table.status,
    ),

    index(
      "crm_deals_tenant_customer_idx",
    ).on(
      table.tenantId,
      table.customerId,
    ),

    index(
      "crm_deals_tenant_lead_idx",
    ).on(
      table.tenantId,
      table.sourceLeadId,
    ),

    index(
      "crm_deals_tenant_owner_idx",
    ).on(
      table.tenantId,
      table.ownerClerkUserId,
    ),

    index(
      "crm_deals_tenant_close_idx",
    ).on(
      table.tenantId,
      table.expectedCloseAt,
    ),

    index(
      "crm_deals_tenant_created_idx",
    ).on(
      table.tenantId,
      table.createdAt,
    ),
  ],
);

export const crmDealItems = pgTable(
  "crm_deal_items",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    dealId: uuid("deal_id")
      .notNull()
      .references(() => crmDeals.id, {
        onDelete: "cascade",
      }),

    productId: uuid(
      "product_id",
    ).references(
      () => crmProducts.id,
      {
        onDelete: "set null",
      },
    ),

    name: text("name").notNull(),

    description: text("description"),

    quantity: numeric(
      "quantity",
      {
        precision: 14,
        scale: 3,
      },
    )
      .notNull()
      .default("1"),

    unitPrice: numeric(
      "unit_price",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    discountAmount: numeric(
      "discount_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    totalAmount: numeric(
      "total_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

        paymentMethod: text(
      "payment_method",
    ),

    minimumDownPayment: numeric(
      "minimum_down_payment",
      {
        precision: 14,
        scale: 2,
      },
    ),

    customerDownPayment: numeric(
      "customer_down_payment",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    financedAmount: numeric(
      "financed_amount",
      {
        precision: 14,
        scale: 2,
      },
    ),

    financingMonths: integer(
      "financing_months",
    ),

    estimatedPayment: numeric(
      "estimated_payment",
      {
        precision: 14,
        scale: 2,
      },
    ),

    calculationSnapshot: jsonb(
      "calculation_snapshot",
    )
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    position: integer("position")
      .notNull()
      .default(0),

    metadata: jsonb("metadata")
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index(
      "crm_deal_items_tenant_deal_idx",
    ).on(
      table.tenantId,
      table.dealId,
    ),

    index(
      "crm_deal_items_tenant_product_idx",
    ).on(
      table.tenantId,
      table.productId,
    ),

    index(
      "crm_deal_items_deal_position_idx",
    ).on(
      table.dealId,
      table.position,
    ),
  ],
);

export const crmQuotes = pgTable(
  "crm_quotes",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

        branchId: uuid(
      "branch_id",
    ).references(
      () => tenantBranches.id,
      {
        onDelete: "set null",
      },
    ),

    quoteNumber: text(
      "quote_number",
    ).notNull(),

    subject: text("subject")
      .notNull(),

    status: text("status")
      .notNull()
      .default("Borrador"),

    customerId: uuid(
      "customer_id",
    ).references(
      () => crmCustomers.id,
      {
        onDelete: "set null",
      },
    ),

    sourceLeadId: uuid(
      "source_lead_id",
    ).references(
      () => crmLeads.id,
      {
        onDelete: "set null",
      },
    ),

    dealId: uuid(
      "deal_id",
    ).references(
      () => crmDeals.id,
      {
        onDelete: "set null",
      },
    ),

    ownerClerkUserId: text(
      "owner_clerk_user_id",
    ).notNull(),

    ownerName: text(
      "owner_name",
    ),

    ownerEmail: text(
      "owner_email",
    ),

    currency: text("currency")
      .notNull()
      .default("mxn"),

    validUntil: timestamp(
      "valid_until",
      {
        withTimezone: true,
      },
    ),

    baseAmount: numeric(
      "base_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    discountAmount: numeric(
      "discount_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    taxAmount: numeric(
      "tax_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    adjustmentAmount: numeric(
      "adjustment_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    totalAmount: numeric(
      "total_amount",
      {
        precision: 14,
        scale: 2,
      },
    )
      .notNull()
      .default("0"),

    paymentMethod: text(
      "payment_method",
    ),

    minimumDownPayment: numeric(
      "minimum_down_payment",
      {
        precision: 14,
        scale: 2,
      },
    ),

    customerDownPayment: numeric(
      "customer_down_payment",
      {
        precision: 14,
        scale: 2,
      },
    ),

    financedAmount: numeric(
      "financed_amount",
      {
        precision: 14,
        scale: 2,
      },
    ),

    financingMonths: integer(
      "financing_months",
    ),

    estimatedPayment: numeric(
      "estimated_payment",
      {
        precision: 14,
        scale: 2,
      },
    ),

    billingAddress: jsonb(
      "billing_address",
    )
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    shippingAddress: jsonb(
      "shipping_address",
    )
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    commercialSummary: text(
      "commercial_summary",
    ),

    termsAndConditions: text(
      "terms_and_conditions",
    ),

    description: text(
      "description",
    ),

    calculationSnapshot: jsonb(
      "calculation_snapshot",
    )
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    metadata: jsonb("metadata")
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    sentAt: timestamp(
      "sent_at",
      {
        withTimezone: true,
      },
    ),

    acceptedAt: timestamp(
      "accepted_at",
      {
        withTimezone: true,
      },
    ),

    rejectedAt: timestamp(
      "rejected_at",
      {
        withTimezone: true,
      },
    ),

    convertedAt: timestamp(
      "converted_at",
      {
        withTimezone: true,
      },
    ),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index(
      "crm_quotes_tenant_branch_idx",
    ).on(
      table.tenantId,
      table.branchId,
    ),

    uniqueIndex(
      "crm_quotes_tenant_number_unique",
    ).on(
      table.tenantId,
      table.quoteNumber,
    ),

    index(
      "crm_quotes_tenant_status_idx",
    ).on(
      table.tenantId,
      table.status,
    ),

    index(
      "crm_quotes_tenant_customer_idx",
    ).on(
      table.tenantId,
      table.customerId,
    ),

    index(
      "crm_quotes_tenant_lead_idx",
    ).on(
      table.tenantId,
      table.sourceLeadId,
    ),

    index(
      "crm_quotes_tenant_deal_idx",
    ).on(
      table.tenantId,
      table.dealId,
    ),

    index(
      "crm_quotes_tenant_owner_idx",
    ).on(
      table.tenantId,
      table.ownerClerkUserId,
    ),

    index(
      "crm_quotes_tenant_validity_idx",
    ).on(
      table.tenantId,
      table.validUntil,
    ),

    index(
      "crm_quotes_tenant_created_idx",
    ).on(
      table.tenantId,
      table.createdAt,
    ),
  ],
);

export const crmQuoteItems =
  pgTable(
    "crm_quote_items",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      quoteId: uuid("quote_id")
        .notNull()
        .references(
          () => crmQuotes.id,
          {
            onDelete: "cascade",
          },
        ),

      productId: uuid(
        "product_id",
      ).references(
        () => crmProducts.id,
        {
          onDelete: "set null",
        },
      ),

      name: text("name")
        .notNull(),

      description: text(
        "description",
      ),

      quantity: numeric(
        "quantity",
        {
          precision: 14,
          scale: 3,
        },
      )
        .notNull()
        .default("1"),

      unitPrice: numeric(
        "unit_price",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      baseAmount: numeric(
        "base_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      discountAmount: numeric(
        "discount_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      taxRate: numeric(
        "tax_rate",
        {
          precision: 7,
          scale: 4,
        },
      )
        .notNull()
        .default("0"),

      taxAmount: numeric(
        "tax_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      totalAmount: numeric(
        "total_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      paymentMethod: text(
        "payment_method",
      ),

      minimumDownPayment:
        numeric(
          "minimum_down_payment",
          {
            precision: 14,
            scale: 2,
          },
        ),

      customerDownPayment:
        numeric(
          "customer_down_payment",
          {
            precision: 14,
            scale: 2,
          },
        )
          .notNull()
          .default("0"),

      financedAmount: numeric(
        "financed_amount",
        {
          precision: 14,
          scale: 2,
        },
      ),

      financingMonths: integer(
        "financing_months",
      ),

      estimatedPayment: numeric(
        "estimated_payment",
        {
          precision: 14,
          scale: 2,
        },
      ),

      calculationSnapshot:
        jsonb(
          "calculation_snapshot",
        )
          .$type<
            Record<
              string,
              unknown
            >
          >()
          .notNull()
          .default({}),

      position: integer(
        "position",
      )
        .notNull()
        .default(0),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "crm_quote_items_tenant_quote_idx",
      ).on(
        table.tenantId,
        table.quoteId,
      ),

      index(
        "crm_quote_items_tenant_product_idx",
      ).on(
        table.tenantId,
        table.productId,
      ),

      index(
        "crm_quote_items_quote_position_idx",
      ).on(
        table.quoteId,
        table.position,
      ),
    ],
  );

export const crmSalesOrders =
  pgTable(
    "crm_sales_orders",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid(
        "tenant_id",
      )
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      branchId: uuid(
        "branch_id",
      ).references(
        () => tenantBranches.id,
        {
          onDelete: "set null",
        },
      ),

      customerId: uuid(
        "customer_id",
      ).references(
        () => crmCustomers.id,
        {
          onDelete: "set null",
        },
      ),

      dealId: uuid(
        "deal_id",
      ).references(
        () => crmDeals.id,
        {
          onDelete: "set null",
        },
      ),

      quoteId: uuid(
        "quote_id",
      ).references(
        () => crmQuotes.id,
        {
          onDelete: "set null",
        },
      ),

      reference: text(
        "reference",
      ).notNull(),

      status: text("status")
        .notNull()
        .default("Borrador"),

      customerName: text(
        "customer_name",
      ).notNull(),

      customerEmail: text(
        "customer_email",
      ),

      customerPhone: text(
        "customer_phone",
      ),

      ownerClerkUserId: text(
        "owner_clerk_user_id",
      ),

      ownerName: text(
        "owner_name",
      ),

      ownerEmail: text(
        "owner_email",
      ),

      currency: text(
        "currency",
      )
        .notNull()
        .default("mxn"),

      baseAmount: numeric(
        "base_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      discountAmount: numeric(
        "discount_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      totalAmount: numeric(
        "total_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      paymentMethod: text(
        "payment_method",
      ),

      notes: text("notes"),

      createdByClerkUserId:
        text(
          "created_by_clerk_user_id",
        ).notNull(),

      createdByName: text(
        "created_by_name",
      ),

      confirmedByClerkUserId:
        text(
          "confirmed_by_clerk_user_id",
        ),

      confirmedByName: text(
        "confirmed_by_name",
      ),

      confirmedAt: timestamp(
        "confirmed_at",
        {
          withTimezone: true,
        },
      ),

      deliveredByClerkUserId:
        text(
          "delivered_by_clerk_user_id",
        ),

      deliveredByName: text(
        "delivered_by_name",
      ),

      deliveredAt: timestamp(
        "delivered_at",
        {
          withTimezone: true,
        },
      ),

      cancelledByClerkUserId:
        text(
          "cancelled_by_clerk_user_id",
        ),

      cancelledByName: text(
        "cancelled_by_name",
      ),

      cancelledAt: timestamp(
        "cancelled_at",
        {
          withTimezone: true,
        },
      ),

      cancellationReason: text(
        "cancellation_reason",
      ),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "crm_sales_orders_tenant_reference_unique",
      ).on(
        table.tenantId,
        table.reference,
      ),

      uniqueIndex(
        "crm_sales_orders_tenant_deal_unique",
      ).on(
        table.tenantId,
        table.dealId,
      ),

      uniqueIndex(
        "crm_sales_orders_tenant_quote_unique",
      ).on(
        table.tenantId,
        table.quoteId,
      ),

      index(
        "crm_sales_orders_tenant_status_idx",
      ).on(
        table.tenantId,
        table.status,
        table.createdAt,
      ),

      index(
        "crm_sales_orders_tenant_branch_idx",
      ).on(
        table.tenantId,
        table.branchId,
        table.createdAt,
      ),

      index(
        "crm_sales_orders_tenant_customer_idx",
      ).on(
        table.tenantId,
        table.customerId,
        table.createdAt,
      ),

      index(
        "crm_sales_orders_tenant_owner_idx",
      ).on(
        table.tenantId,
        table.ownerClerkUserId,
        table.createdAt,
      ),
    ],
  );

export const crmSalesOrderItems =
  pgTable(
    "crm_sales_order_items",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid(
        "tenant_id",
      )
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      salesOrderId: uuid(
        "sales_order_id",
      )
        .notNull()
        .references(
          () =>
            crmSalesOrders.id,
          {
            onDelete: "cascade",
          },
        ),

      productId: uuid(
        "product_id",
      ).references(
        () => crmProducts.id,
        {
          onDelete: "set null",
        },
      ),

      name: text("name")
        .notNull(),

      description: text(
        "description",
      ),

      quantity: integer(
        "quantity",
      )
        .notNull()
        .default(1),

      unitPrice: numeric(
        "unit_price",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      discountAmount: numeric(
        "discount_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      totalAmount: numeric(
        "total_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      position: integer(
        "position",
      )
        .notNull()
        .default(0),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "crm_sales_order_items_tenant_order_idx",
      ).on(
        table.tenantId,
        table.salesOrderId,
      ),

      index(
        "crm_sales_order_items_tenant_product_idx",
      ).on(
        table.tenantId,
        table.productId,
      ),

      index(
        "crm_sales_order_items_order_position_idx",
      ).on(
        table.salesOrderId,
        table.position,
      ),
    ],
  );

export const crmServiceOrders =
  pgTable(
    "crm_service_orders",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      branchId: uuid(
        "branch_id",
      ).references(
        () => tenantBranches.id,
        {
          onDelete: "set null",
        },
      ),

      customerId: uuid(
        "customer_id",
      ).references(
        () => crmCustomers.id,
        {
          onDelete: "set null",
        },
      ),

      dealId: uuid(
        "deal_id",
      ).references(
        () => crmDeals.id,
        {
          onDelete: "set null",
        },
      ),

      salesOrderId: uuid(
        "sales_order_id",
      ).references(
        () => crmSalesOrders.id,
        {
          onDelete: "set null",
        },
      ),

      reference: text(
        "reference",
      ).notNull(),

      status: text("status")
        .notNull()
        .default("Borrador"),

      priority: text("priority")
        .notNull()
        .default("Normal"),

      serviceType: text(
        "service_type",
      ).notNull(),

      customerName: text(
        "customer_name",
      ).notNull(),

      customerEmail: text(
        "customer_email",
      ),

      customerPhone: text(
        "customer_phone",
      ),

      unitModel: text(
        "unit_model",
      ).notNull(),

      unitPlate: text(
        "unit_plate",
      ),

      unitIdentifier: text(
        "unit_identifier",
      ),

      reportedProblem: text(
        "reported_problem",
      ).notNull(),

      diagnosis: text(
        "diagnosis",
      ),

      result: text("result"),

      authorizationRequestedAt:
        timestamp(
          "authorization_requested_at",
          {
            withTimezone: true,
          },
        ),

      authorizationRequestedByClerkUserId:
        text(
          "authorization_requested_by_clerk_user_id",
        ),

      authorizationRequestedByName:
        text(
          "authorization_requested_by_name",
        ),

      authorizedAt: timestamp(
        "authorized_at",
        {
          withTimezone: true,
        },
      ),

      authorizedByClerkUserId:
        text(
          "authorized_by_clerk_user_id",
        ),

      authorizedByName: text(
        "authorized_by_name",
      ),

      authorizationNotes: text(
        "authorization_notes",
      ),

      workCompletedAt: timestamp(
        "work_completed_at",
        {
          withTimezone: true,
        },
      ),

      workCompletedByClerkUserId:
        text(
          "work_completed_by_clerk_user_id",
        ),

      workCompletedByName: text(
        "work_completed_by_name",
      ),

      returnedAt: timestamp(
        "returned_at",
        {
          withTimezone: true,
        },
      ),

      returnedByClerkUserId:
        text(
          "returned_by_clerk_user_id",
        ),

      returnedByName: text(
        "returned_by_name",
      ),

      returnReason: text(
        "return_reason",
      ),

      ownerClerkUserId: text(
        "owner_clerk_user_id",
      ),

      ownerName: text(
        "owner_name",
      ),

      ownerEmail: text(
        "owner_email",
      ),

      scheduledAt: timestamp(
        "scheduled_at",
        {
          withTimezone: true,
        },
      ),

      commitmentAt: timestamp(
        "commitment_at",
        {
          withTimezone: true,
        },
      ),

      startedAt: timestamp(
        "started_at",
        {
          withTimezone: true,
        },
      ),

      completedAt: timestamp(
        "completed_at",
        {
          withTimezone: true,
        },
      ),

      cancelledAt: timestamp(
        "cancelled_at",
        {
          withTimezone: true,
        },
      ),

      cancellationReason: text(
        "cancellation_reason",
      ),

      notes: text("notes"),

      createdByClerkUserId: text(
        "created_by_clerk_user_id",
      ).notNull(),

      createdByName: text(
        "created_by_name",
      ),

      updatedByClerkUserId: text(
        "updated_by_clerk_user_id",
      ),

      updatedByName: text(
        "updated_by_name",
      ),

      metadata: jsonb("metadata")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "crm_service_orders_tenant_reference_unique",
      ).on(
        table.tenantId,
        table.reference,
      ),

      index(
        "crm_service_orders_tenant_status_idx",
      ).on(
        table.tenantId,
        table.status,
        table.createdAt,
      ),

      index(
        "crm_service_orders_tenant_branch_idx",
      ).on(
        table.tenantId,
        table.branchId,
        table.createdAt,
      ),

      index(
        "crm_service_orders_tenant_customer_idx",
      ).on(
        table.tenantId,
        table.customerId,
        table.createdAt,
      ),

      index(
        "crm_service_orders_tenant_owner_idx",
      ).on(
        table.tenantId,
        table.ownerClerkUserId,
        table.createdAt,
      ),

      index(
        "crm_service_orders_tenant_schedule_idx",
      ).on(
        table.tenantId,
        table.scheduledAt,
      ),

      index(
        "crm_service_orders_tenant_deal_idx",
      ).on(
        table.tenantId,
        table.dealId,
      ),

      index(
        "crm_service_orders_tenant_sales_order_idx",
      ).on(
        table.tenantId,
        table.salesOrderId,
      ),
    ],
  );

export const crmServiceOrderItems =
  pgTable(
    "crm_service_order_items",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(
          () => tenants.id,
          {
            onDelete: "cascade",
          },
        ),

      serviceOrderId: uuid(
        "service_order_id",
      )
        .notNull()
        .references(
          () => crmServiceOrders.id,
          {
            onDelete: "cascade",
          },
        ),

      productId: uuid(
        "product_id",
      ).references(
        () => crmProducts.id,
        {
          onDelete: "set null",
        },
      ),

      itemType: text(
        "item_type",
      ).notNull(),

      name: text("name").notNull(),

      description: text(
        "description",
      ),

      quantity: numeric(
        "quantity",
        {
          precision: 14,
          scale: 3,
        },
      )
        .notNull()
        .default("1"),

      unitPrice: numeric(
        "unit_price",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      totalAmount: numeric(
        "total_amount",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      authorizationStatus: text(
        "authorization_status",
      )
        .notNull()
        .default("Pendiente"),

      authorizedQuantity: numeric(
        "authorized_quantity",
        {
          precision: 14,
          scale: 3,
        },
      ),

      position: integer(
        "position",
      )
        .notNull()
        .default(0),

      metadata: jsonb(
        "metadata",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "crm_service_order_items_tenant_order_idx",
      ).on(
        table.tenantId,
        table.serviceOrderId,
      ),

      index(
        "crm_service_order_items_tenant_product_idx",
      ).on(
        table.tenantId,
        table.productId,
      ),

      index(
        "crm_service_order_items_order_position_idx",
      ).on(
        table.serviceOrderId,
        table.position,
      ),
    ],
  );

export const crmActivities = pgTable(
  "crm_activities",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    type: text("type").notNull(),

    subject: text("subject")
      .notNull(),

    description: text(
      "description",
    ),

    status: text("status")
      .notNull()
      .default("No iniciada"),

    priority: text("priority")
      .notNull()
      .default("Normal"),

    ownerClerkUserId: text(
      "owner_clerk_user_id",
    ).notNull(),

    ownerName: text("owner_name"),

    ownerEmail: text("owner_email"),

    leadId: uuid("lead_id")
      .references(() => crmLeads.id, {
        onDelete: "set null",
      }),

    customerId: uuid("customer_id")
      .references(
        () => crmCustomers.id,
        {
          onDelete: "set null",
        },
      ),

    dealId: uuid("deal_id")
      .references(() => crmDeals.id, {
        onDelete: "set null",
      }),

    startAt: timestamp("start_at", {
      withTimezone: true,
    }),

    endAt: timestamp("end_at", {
      withTimezone: true,
    }),

    dueAt: timestamp("due_at", {
      withTimezone: true,
    }),

    completedAt: timestamp(
      "completed_at",
      {
        withTimezone: true,
      },
    ),

    allDay: boolean("all_day")
      .notNull()
      .default(false),

    timezone: text("timezone")
      .notNull()
      .default(
        "America/Mexico_City",
      ),

    reminderEnabled: boolean(
      "reminder_enabled",
    )
      .notNull()
      .default(false),

    reminderMinutesBefore: integer(
      "reminder_minutes_before",
    ),

    recurrence: jsonb("recurrence")
      .$type<{
        frequency?:
          | "daily"
          | "weekly"
          | "monthly"
          | "yearly";

        interval?: number;

        daysOfWeek?: number[];

        endsAt?: string | null;

        count?: number | null;
      }>()
      .notNull()
      .default({}),

    callMode: text("call_mode"),

    callDirection: text(
      "call_direction",
    ),

    callPurpose: text(
      "call_purpose",
    ),

    callResult: text("call_result"),

    callDurationSeconds: integer(
      "call_duration_seconds",
    ),

    recordingUrl: text(
      "recording_url",
    ),

    meetingLocationType: text(
      "meeting_location_type",
    ),

    location: text("location"),

    meetingUrl: text("meeting_url"),

    metadata: jsonb("metadata")
      .$type<
        Record<string, unknown>
      >()
      .notNull()
      .default({}),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index(
      "crm_activities_tenant_type_idx",
    ).on(
      table.tenantId,
      table.type,
    ),

    index(
      "crm_activities_tenant_status_idx",
    ).on(
      table.tenantId,
      table.status,
    ),

    index(
      "crm_activities_tenant_owner_idx",
    ).on(
      table.tenantId,
      table.ownerClerkUserId,
    ),

    index(
      "crm_activities_tenant_start_idx",
    ).on(
      table.tenantId,
      table.startAt,
    ),

    index(
      "crm_activities_tenant_due_idx",
    ).on(
      table.tenantId,
      table.dueAt,
    ),

    index(
      "crm_activities_tenant_lead_idx",
    ).on(
      table.tenantId,
      table.leadId,
    ),

    index(
      "crm_activities_tenant_customer_idx",
    ).on(
      table.tenantId,
      table.customerId,
    ),

    index(
      "crm_activities_tenant_deal_idx",
    ).on(
      table.tenantId,
      table.dealId,
    ),
  ],
);

export const crmActivityParticipants =
  pgTable(
    "crm_activity_participants",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      activityId: uuid("activity_id")
        .notNull()
        .references(
          () => crmActivities.id,
          {
            onDelete: "cascade",
          },
        ),

      participantType: text(
        "participant_type",
      )
        .notNull()
        .default("external"),

      referenceId: text(
        "reference_id",
      ),

      name: text("name").notNull(),

      email: text("email"),

      phone: text("phone"),

      responseStatus: text(
        "response_status",
      )
        .notNull()
        .default("Pendiente"),

      reminderMinutesBefore: integer(
        "reminder_minutes_before",
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "crm_activity_participants_activity_idx",
      ).on(table.activityId),

      index(
        "crm_activity_participants_tenant_email_idx",
      ).on(
        table.tenantId,
        table.email,
      ),
    ],
  );

export const crmPromotions = pgTable(
  "crm_promotions",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    priority: integer("priority"),

    promotionStart: timestamp(
      "promotion_start",
      {
        withTimezone: true,
      },
    ),

    promotionEnd: timestamp(
      "promotion_end",
      {
        withTimezone: true,
      },
    ),

    benefitType: text(
      "benefit_type",
    ),

    paymentMethod: text(
      "payment_method",
    ),

    promotionGroup: text(
      "promotion_group",
    ),

    availableMonths: jsonb(
      "available_months",
    )
      .$type<string[]>()
      .notNull()
      .default([]),

    channels: jsonb("channels")
      .$type<string[]>()
      .notNull()
      .default([]),

    minimumDownPayment: numeric(
      "minimum_down_payment",
      {
        precision: 14,
        scale: 2,
      },
    ),

    maximumBenefits: integer(
      "maximum_benefits",
    ),

    usedBenefits: integer(
      "used_benefits",
    )
      .notNull()
      .default(0),

    limitPromotion: boolean(
      "limit_promotion",
    )
      .notNull()
      .default(false),

    paused: boolean("paused")
      .notNull()
      .default(false),

    requiresSelection: boolean(
      "requires_selection",
    )
      .notNull()
      .default(false),

    customerType: text(
      "customer_type",
    ),

    value: numeric(
      "value",
      {
        precision: 14,
        scale: 2,
      },
    ),

    commercialMessage: text(
      "commercial_message",
    ),

    conditions: text("conditions"),

    ownerClerkUserId: text(
      "owner_clerk_user_id",
    ),

    ownerName: text("owner_name"),

    ownerEmail: text("owner_email"),

    sourceExternalId: text(
      "source_external_id",
    ),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex(
      "crm_promotions_tenant_external_unique",
    ).on(
      table.tenantId,
      table.sourceExternalId,
    ),

    index(
      "crm_promotions_tenant_priority_idx",
    ).on(
      table.tenantId,
      table.priority,
    ),

    index(
      "crm_promotions_tenant_dates_idx",
    ).on(
      table.tenantId,
      table.promotionStart,
      table.promotionEnd,
    ),

    index(
      "crm_promotions_tenant_paused_idx",
    ).on(
      table.tenantId,
      table.paused,
    ),
  ],
);

export const crmPromotionProducts =
  pgTable(
    "crm_promotion_products",
    {
      promotionId: uuid(
        "promotion_id",
      )
        .notNull()
        .references(
          () => crmPromotions.id,
          {
            onDelete: "cascade",
          },
        ),

      productId: uuid("product_id")
        .notNull()
        .references(
          () => crmProducts.id,
          {
            onDelete: "cascade",
          },
        ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      primaryKey({
        name: "crm_promotion_products_pk",
        columns: [
          table.promotionId,
          table.productId,
        ],
      }),

      index(
        "crm_promotion_products_product_idx",
      ).on(table.productId),
    ],
  );

export const crmDealPromotions =
  pgTable(
    "crm_deal_promotions",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      dealId: uuid("deal_id")
        .notNull()
        .references(() => crmDeals.id, {
          onDelete: "cascade",
        }),

      dealItemId: uuid(
        "deal_item_id",
      ).references(
        () => crmDealItems.id,
        {
          onDelete: "cascade",
        },
      ),

      promotionId: uuid(
        "promotion_id",
      ).references(
        () => crmPromotions.id,
        {
          onDelete: "set null",
        },
      ),

      scope: text("scope")
        .notNull()
        .default("item"),

      promotionName: text(
        "promotion_name",
      ).notNull(),

      promotionGroup: text(
        "promotion_group",
      ),

      benefitType: text(
        "benefit_type",
      ),

      paymentMethod: text(
        "payment_method",
      ),

      requiresSelection: boolean(
        "requires_selection",
      )
        .notNull()
        .default(false),

      promotionValue: numeric(
        "promotion_value",
        {
          precision: 14,
          scale: 2,
        },
      ),

      calculatedBenefit: numeric(
        "calculated_benefit",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      snapshot: jsonb("snapshot")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      appliedAt: timestamp(
        "applied_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "crm_deal_promotions_tenant_deal_idx",
      ).on(
        table.tenantId,
        table.dealId,
      ),

      index(
        "crm_deal_promotions_item_idx",
      ).on(
        table.dealItemId,
      ),

      index(
        "crm_deal_promotions_promotion_idx",
      ).on(
        table.promotionId,
      ),
    ],
  );

export const crmDocuments =
  pgTable(
    "crm_documents",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      name: text("name")
        .notNull(),

      originalFileName: text(
        "original_file_name",
      ).notNull(),

      description: text(
        "description",
      ),

      category: text("category")
        .notNull()
        .default("Otro"),

      mimeType: text("mime_type")
        .notNull(),

      extension: text("extension"),

      sizeBytes: integer(
        "size_bytes",
      ).notNull(),

      storageProvider: text(
        "storage_provider",
      )
        .notNull()
        .default("r2"),

      storageKey: text(
        "storage_key",
      ).notNull(),

      checksum: text("checksum"),

      status: text("status")
        .notNull()
        .default("active"),

      version: integer("version")
        .notNull()
        .default(1),

      uploadedByClerkUserId: text(
        "uploaded_by_clerk_user_id",
      ).notNull(),

      uploadedByName: text(
        "uploaded_by_name",
      ),

      uploadedByEmail: text(
        "uploaded_by_email",
      ),

      metadata: jsonb("metadata")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      archivedAt: timestamp(
        "archived_at",
        {
          withTimezone: true,
        },
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "crm_documents_storage_key_unique",
      ).on(table.storageKey),

      index(
        "crm_documents_tenant_status_idx",
      ).on(
        table.tenantId,
        table.status,
      ),

      index(
        "crm_documents_tenant_category_idx",
      ).on(
        table.tenantId,
        table.category,
      ),

      index(
        "crm_documents_tenant_uploader_idx",
      ).on(
        table.tenantId,
        table.uploadedByClerkUserId,
      ),

      index(
        "crm_documents_tenant_created_idx",
      ).on(
        table.tenantId,
        table.createdAt,
      ),
    ],
  );

export const crmDocumentRelations =
  pgTable(
    "crm_document_relations",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      documentId: uuid(
        "document_id",
      )
        .notNull()
        .references(
          () => crmDocuments.id,
          {
            onDelete: "cascade",
          },
        ),

      entityType: text(
        "entity_type",
      ).notNull(),

      entityId: text(
        "entity_id",
      ).notNull(),

      entityName: text(
        "entity_name",
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "crm_document_relations_unique",
      ).on(
        table.tenantId,
        table.documentId,
        table.entityType,
        table.entityId,
      ),

      index(
        "crm_document_relations_document_idx",
      ).on(
        table.tenantId,
        table.documentId,
      ),

      index(
        "crm_document_relations_entity_idx",
      ).on(
        table.tenantId,
        table.entityType,
        table.entityId,
      ),
    ],
  );

export const crmQuotePromotions =
  pgTable(
    "crm_quote_promotions",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      quoteId: uuid("quote_id")
        .notNull()
        .references(
          () => crmQuotes.id,
          {
            onDelete: "cascade",
          },
        ),

      quoteItemId: uuid(
        "quote_item_id",
      ).references(
        () => crmQuoteItems.id,
        {
          onDelete: "cascade",
        },
      ),

      promotionId: uuid(
        "promotion_id",
      ).references(
        () => crmPromotions.id,
        {
          onDelete: "set null",
        },
      ),

      scope: text("scope")
        .notNull()
        .default("item"),

      promotionName: text(
        "promotion_name",
      ).notNull(),

      promotionGroup: text(
        "promotion_group",
      ),

      benefitType: text(
        "benefit_type",
      ),

      paymentMethod: text(
        "payment_method",
      ),

      requiresSelection: boolean(
        "requires_selection",
      )
        .notNull()
        .default(false),

      promotionValue: numeric(
        "promotion_value",
        {
          precision: 14,
          scale: 2,
        },
      ),

      calculatedBenefit: numeric(
        "calculated_benefit",
        {
          precision: 14,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      snapshot: jsonb(
        "snapshot",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      appliedAt: timestamp(
        "applied_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "crm_quote_promotions_tenant_quote_idx",
      ).on(
        table.tenantId,
        table.quoteId,
      ),

      index(
        "crm_quote_promotions_item_idx",
      ).on(
        table.quoteItemId,
      ),

      index(
        "crm_quote_promotions_promotion_idx",
      ).on(
        table.promotionId,
      ),
    ],
  );

export const trialRedemptions =
  pgTable(
    "trial_redemptions",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      clerkUserId: text(
        "clerk_user_id",
      )
        .notNull(),

      taxId: text("tax_id")
        .notNull(),

      clerkOrganizationId: text(
        "clerk_organization_id",
      ),

      tenantId: uuid(
        "tenant_id",
      )
        .references(
          () => tenants.id,
          {
            onDelete:
              "set null",
          },
        ),

      industry: text(
        "industry",
      )
        .notNull(),

      ownerEmail: text(
        "owner_email",
      ),

      day12ReminderSentAt:
        timestamp(
          "day_12_reminder_sent_at",
          {
            withTimezone: true,
          },
        ),

      day14ReminderSentAt:
        timestamp(
          "day_14_reminder_sent_at",
          {
            withTimezone: true,
          },
        ),

      status: text("status")
        .notNull()
        .default("reserved"),

      trialStartsAt: timestamp(
        "trial_starts_at",
        {
          withTimezone: true,
        },
      )
        .notNull(),

      trialEndsAt: timestamp(
        "trial_ends_at",
        {
          withTimezone: true,
        },
      )
        .notNull(),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "trial_redemptions_user_unique",
      ).on(
        table.clerkUserId,
      ),

      uniqueIndex(
        "trial_redemptions_tax_id_unique",
      ).on(
        table.taxId,
      ),

      uniqueIndex(
        "trial_redemptions_organization_unique",
      ).on(
        table.clerkOrganizationId,
      ),

      index(
        "trial_redemptions_status_idx",
      ).on(
        table.status,
      ),

      index(
        "trial_redemptions_expiration_idx",
      ).on(
        table.trialEndsAt,
      ),
    ],
  );

export const tenantProducts =
  pgTable(
    "tenant_products",
    {
      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      product:
        productAccessEnum(
          "product",
        ).notNull(),

      enabled: boolean("enabled")
        .notNull()
        .default(true),

      enabledAt: timestamp(
        "enabled_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      disabledAt: timestamp(
        "disabled_at",
        {
          withTimezone: true,
        },
      ),

      configuration: jsonb(
        "configuration",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),
    },
    (table) => [
      primaryKey({
        name: "tenant_products_pk",
        columns: [
          table.tenantId,
          table.product,
        ],
      }),

      index(
        "tenant_products_enabled_idx",
      ).on(
        table.tenantId,
        table.enabled,
      ),
    ],
  );

  export const tenantModuleEntitlements =
  pgTable(
    "tenant_module_entitlements",
    {
      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      product:
        productAccessEnum(
          "product",
        ).notNull(),

      moduleId: text("module_id")
        .notNull(),

      enabled: boolean("enabled")
        .notNull()
        .default(true),

      source: text("source")
        .notNull()
        .default("manual"),

      grantedAt: timestamp(
        "granted_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      expiresAt: timestamp(
        "expires_at",
        {
          withTimezone: true,
        },
      ),

      configuration: jsonb(
        "configuration",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),
    },
    (table) => [
      primaryKey({
        name:
          "tenant_module_entitlements_pk",
        columns: [
          table.tenantId,
          table.product,
          table.moduleId,
        ],
      }),

      index(
        "tenant_module_entitlements_enabled_idx",
      ).on(
        table.tenantId,
        table.product,
        table.enabled,
      ),

      index(
        "tenant_module_entitlements_expiration_idx",
      ).on(
        table.expiresAt,
      ),
    ],
  );

export const commercialCatalogItems =
  pgTable(
    "commercial_catalog_items",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      productKey: text(
        "product_key",
      )
        .notNull(),

      itemKey: text("item_key")
        .notNull(),

      itemType: text("item_type")
        .notNull(),

      name: text("name")
        .notNull(),

      description: text(
        "description",
      ),

      monthlyPrice: numeric(
        "monthly_price",
        {
          precision: 12,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      annualPrice: numeric(
        "annual_price",
        {
          precision: 12,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      annualDiscountPercent:
        integer(
          "annual_discount_percent",
        )
          .notNull()
          .default(0),

      currency: text("currency")
        .notNull()
        .default("mxn"),

      stripeProductId: text(
        "stripe_product_id",
      ),

      stripeMonthlyPriceId: text(
        "stripe_monthly_price_id",
      ),

      stripeAnnualPriceId: text(
        "stripe_annual_price_id",
      ),

      includedUsers: integer(
        "included_users",
      )
        .notNull()
        .default(0),

      includedStorageGb: numeric(
        "included_storage_gb",
        {
          precision: 10,
          scale: 2,
        },
      )
        .notNull()
        .default("0"),

      moduleIds: jsonb(
        "module_ids",
      )
        .$type<string[]>()
        .notNull()
        .default([]),

      features: jsonb("features")
        .$type<string[]>()
        .notNull()
        .default([]),

      required: boolean("required")
        .notNull()
        .default(false),

      recommended: boolean(
        "recommended",
      )
        .notNull()
        .default(false),

      active: boolean("active")
        .notNull()
        .default(true),

      sortOrder: integer(
        "sort_order",
      )
        .notNull()
        .default(0),

      metadata: jsonb("metadata")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      updatedByClerkUserId: text(
        "updated_by_clerk_user_id",
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "commercial_catalog_items_product_key_unique",
      ).on(
        table.productKey,
        table.itemKey,
      ),

      index(
        "commercial_catalog_items_product_active_idx",
      ).on(
        table.productKey,
        table.active,
        table.sortOrder,
      ),

      index(
        "commercial_catalog_items_type_idx",
      ).on(
        table.itemType,
      ),

      check(
        "commercial_catalog_items_monthly_price_check",
        sql`
          ${table.monthlyPrice} >= 0
        `,
      ),

      check(
        "commercial_catalog_items_annual_price_check",
        sql`
          ${table.annualPrice} >= 0
        `,
      ),

      check(
        "commercial_catalog_items_annual_discount_check",
        sql`
          ${table.annualDiscountPercent} >= 0
          AND
          ${table.annualDiscountPercent} <= 100
        `,
      ),

      check(
        "commercial_catalog_items_included_users_check",
        sql`
          ${table.includedUsers} >= 0
        `,
      ),

      check(
        "commercial_catalog_items_storage_check",
        sql`
          ${table.includedStorageGb} >= 0
        `,
      ),
    ],
  );

export const commercialCatalogAuditLogs =
  pgTable(
    "commercial_catalog_audit_logs",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      catalogItemId: uuid(
        "catalog_item_id",
      )
        .references(
          () =>
            commercialCatalogItems.id,
          {
            onDelete:
              "set null",
          },
        ),

      action: text("action")
        .notNull(),

      previousValues: jsonb(
        "previous_values",
      )
        .$type<
          Record<string, unknown>
        >(),

      nextValues: jsonb(
        "next_values",
      )
        .$type<
          Record<string, unknown>
        >(),

      changedByClerkUserId: text(
        "changed_by_clerk_user_id",
      )
        .notNull(),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "commercial_catalog_audit_item_idx",
      ).on(
        table.catalogItemId,
        table.createdAt,
      ),

      index(
        "commercial_catalog_audit_user_idx",
      ).on(
        table.changedByClerkUserId,
        table.createdAt,
      ),
    ],
  );

export const commercialPurchases =
  pgTable(
    "commercial_purchases",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      purchaseType: text(
        "purchase_type",
      )
        .notNull()
        .default("new_customer"),

      productKey: text(
        "product_key",
      )
        .notNull()
        .default("crm"),

      tenantId: uuid("tenant_id")
        .references(() => tenants.id, {
          onDelete: "set null",
        }),

      clerkUserId: text(
        "clerk_user_id",
      ),

      clerkOrganizationId: text(
        "clerk_organization_id",
      ),

      ownerEmail: text(
        "owner_email",
      ),

      companyName: text(
        "company_name",
      ),

      taxId: text("tax_id"),

      industry: text("industry")
        .notNull(),

      billingPeriod: text(
        "billing_period",
      )
        .notNull(),

      catalogItemIds: jsonb(
        "catalog_item_ids",
      )
        .$type<string[]>()
        .notNull()
        .default([]),

      lineItems: jsonb(
        "line_items",
      )
        .$type<
          Array<{
            catalogItemId: string;
            itemKey: string;
            name: string;
            quantity: number;
            unitAmount: number;
          }>
        >()
        .notNull()
        .default([]),

      currency: text("currency")
        .notNull()
        .default("mxn"),

      totalAmount: numeric(
        "total_amount",
        {
          precision: 12,
          scale: 2,
        },
      )
        .notNull(),

      status: text("status")
        .notNull()
        .default(
          "checkout_pending",
        ),

      stripeCheckoutSessionId: text(
        "stripe_checkout_session_id",
      ),

      stripeCustomerId: text(
        "stripe_customer_id",
      ),

      stripeSubscriptionId: text(
        "stripe_subscription_id",
      ),

      paidAt: timestamp(
        "paid_at",
        {
          withTimezone: true,
        },
      ),

      provisionedAt: timestamp(
        "provisioned_at",
        {
          withTimezone: true,
        },
      ),

      expiresAt: timestamp(
        "expires_at",
        {
          withTimezone: true,
        },
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "commercial_purchases_checkout_session_unique",
      ).on(
        table.stripeCheckoutSessionId,
      ),

      uniqueIndex(
        "commercial_purchases_subscription_unique",
      ).on(
        table.stripeSubscriptionId,
      ),

      index(
        "commercial_purchases_status_idx",
      ).on(
        table.status,
        table.createdAt,
      ),

      index(
        "commercial_purchases_tenant_idx",
      ).on(
        table.tenantId,
      ),

      index(
        "commercial_purchases_owner_email_idx",
      ).on(
        table.ownerEmail,
      ),
    ],
  );

export const subscriptions =
  pgTable(
    "subscriptions",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      provider: text("provider")
        .notNull()
        .default("stripe"),

      providerCustomerId: text(
        "provider_customer_id",
      ),

      providerSubscriptionId: text(
        "provider_subscription_id",
      ),

      providerScheduleId: text(
        "provider_schedule_id",
      ),

      productKey: text(
        "product_key",
      )
        .notNull()
        .default("crm"),

      planKey: text("plan_key")
        .notNull(),

      billingPeriod: text(
        "billing_period",
      )
        .notNull()
        .default("monthly"),

      catalogItemIds: jsonb(
        "catalog_item_ids",
      )
        .$type<string[]>()
        .notNull()
        .default([]),

      pendingBillingPeriod: text(
        "pending_billing_period",
      ),

      pendingCatalogItemIds: jsonb(
        "pending_catalog_item_ids",
      )
        .$type<string[]>(),

      pendingChangeAt: timestamp(
        "pending_change_at",
        {
          withTimezone: true,
        },
      ),

      status:
        subscriptionStatusEnum(
          "status",
        )
          .notNull()
          .default("incomplete"),

      seats: integer("seats")
        .notNull()
        .default(1),

      currency: text("currency")
        .notNull()
        .default("mxn"),

      currentPeriodStart:
        timestamp(
          "current_period_start",
          {
            withTimezone: true,
          },
        ),

      currentPeriodEnd: timestamp(
        "current_period_end",
        {
          withTimezone: true,
        },
      ),

      cancelAtPeriodEnd: boolean(
        "cancel_at_period_end",
      )
        .notNull()
        .default(false),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "subscriptions_provider_id_unique",
      ).on(
        table.provider,
        table.providerSubscriptionId,
      ),

      index(
        "subscriptions_tenant_idx",
      ).on(table.tenantId),

      index(
        "subscriptions_status_idx",
      ).on(table.status),
    ],
  );

export const roles = pgTable(
  "roles",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),

    key: text("key").notNull(),

    name: text("name").notNull(),

    description: text("description"),

    product: productAccessEnum(
      "product",
    ),

    isSystem: boolean("is_system")
      .notNull()
      .default(false),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),

    updatedAt: timestamp(
      "updated_at",
      {
        withTimezone: true,
      },
    )
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex(
      "roles_tenant_key_unique",
    ).on(
      table.tenantId,
      table.key,
    ),

    index("roles_tenant_idx").on(
      table.tenantId,
    ),
  ],
);

export const tenantMembers =
  pgTable(
    "tenant_members",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      clerkUserId: text(
        "clerk_user_id",
      ).notNull(),

      roleId: uuid("role_id")
        .references(() => roles.id, {
          onDelete: "set null",
        }),

      email: text("email")
        .notNull(),

      firstName: text("first_name"),

      lastName: text("last_name"),

      status:
        memberStatusEnum("status")
          .notNull()
          .default("active"),

      joinedAt: timestamp(
        "joined_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "tenant_members_user_unique",
      ).on(
        table.tenantId,
        table.clerkUserId,
      ),

      index(
        "tenant_members_tenant_idx",
      ).on(table.tenantId),

      index(
        "tenant_members_role_idx",
      ).on(table.roleId),

      index(
        "tenant_members_status_idx",
      ).on(table.status),
    ],
  );

export const workspaceInvitationStatusEnum =
  pgEnum(
    "workspace_invitation_status",
    [
      "pending",
      "accepted",
      "revoked",
      "expired",
    ],
  );

export const workspaceInvitations =
  pgTable(
    "workspace_invitations",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      clerkOrganizationInvitationId:
        text(
          "clerk_organization_invitation_id",
        ).unique(),

      tokenHash: text(
        "token_hash",
      ).unique(),

      email: text("email")
        .notNull(),

      firstName:
        text("first_name"),

      lastName:
        text("last_name"),

      globalRoleId: uuid(
        "global_role_id",
      ).references(() => roles.id, {
        onDelete: "set null",
      }),

      productAssignments: jsonb(
        "product_assignments",
      )
        .$type<
          Array<{
            product:
              | "crm"
              | "analytics"
              | "cloud";
            roleId: string;
          }>
        >()
        .notNull()
        .default([]),

      message: text("message"),

      status:
        workspaceInvitationStatusEnum(
          "status",
        )
          .notNull()
          .default("pending"),

      invitedByMemberId: uuid(
        "invited_by_member_id",
      )
        .notNull()
        .references(
          () => tenantMembers.id,
          {
            onDelete: "restrict",
          },
        ),

      acceptedByMemberId: uuid(
        "accepted_by_member_id",
      ).references(
        () => tenantMembers.id,
        {
          onDelete: "set null",
        },
      ),

      expiresAt: timestamp(
        "expires_at",
        {
          withTimezone: true,
        },
      ),

      acceptedAt: timestamp(
        "accepted_at",
        {
          withTimezone: true,
        },
      ),

      revokedAt: timestamp(
        "revoked_at",
        {
          withTimezone: true,
        },
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "workspace_invitations_tenant_email_unique",
      ).on(
        table.tenantId,
        table.email,
      ),

      index(
        "workspace_invitations_tenant_idx",
      ).on(table.tenantId),

      index(
        "workspace_invitations_status_idx",
      ).on(table.status),

      index(
        "workspace_invitations_invited_by_idx",
      ).on(
        table.invitedByMemberId,
      ),
    ],
  );

export const memberProductRoles =
  pgTable(
    "member_product_roles",
    {
      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      memberId: uuid("member_id")
        .notNull()
        .references(
          () => tenantMembers.id,
          {
            onDelete: "cascade",
          },
        ),

      product:
        productAccessEnum(
          "product",
        ).notNull(),

      roleId: uuid("role_id")
        .notNull()
        .references(() => roles.id, {
          onDelete: "cascade",
        }),

      enabled: boolean("enabled")
        .notNull()
        .default(true),

      allBranches: boolean(
        "all_branches",
      )
        .notNull()
        .default(false),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      primaryKey({
        name: "member_product_roles_pk",
        columns: [
          table.memberId,
          table.product,
        ],
      }),

      index(
        "member_product_roles_tenant_idx",
      ).on(table.tenantId),

      index(
        "member_product_roles_role_idx",
      ).on(table.roleId),

      index(
        "member_product_roles_product_idx",
      ).on(
        table.tenantId,
        table.product,
        table.enabled,
      ),
    ],
  );

export const memberRegionAccess =
  pgTable(
    "member_region_access",
    {
      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      memberId: uuid("member_id")
        .notNull()
        .references(
          () => tenantMembers.id,
          {
            onDelete: "cascade",
          },
        ),

      product:
        productAccessEnum(
          "product",
        ).notNull(),

      regionId: uuid("region_id")
        .notNull()
        .references(
          () => tenantRegions.id,
          {
            onDelete: "cascade",
          },
        ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      primaryKey({
        name:
          "member_region_access_pk",
        columns: [
          table.memberId,
          table.product,
          table.regionId,
        ],
      }),

      index(
        "member_region_access_tenant_idx",
      ).on(table.tenantId),

      index(
        "member_region_access_region_idx",
      ).on(
        table.tenantId,
        table.regionId,
        table.product,
      ),
    ],
  );

export const memberBranchAccess =
  pgTable(
    "member_branch_access",
    {
      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      memberId: uuid("member_id")
        .notNull()
        .references(
          () => tenantMembers.id,
          {
            onDelete: "cascade",
          },
        ),

      product:
        productAccessEnum(
          "product",
        ).notNull(),

      branchId: uuid("branch_id")
        .notNull()
        .references(
          () => tenantBranches.id,
          {
            onDelete: "cascade",
          },
        ),

      isPrimary: boolean(
        "is_primary",
      )
        .notNull()
        .default(false),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      primaryKey({
        name:
          "member_branch_access_pk",
        columns: [
          table.memberId,
          table.product,
          table.branchId,
        ],
      }),

      index(
        "member_branch_access_tenant_idx",
      ).on(table.tenantId),

      index(
        "member_branch_access_branch_idx",
      ).on(
        table.tenantId,
        table.branchId,
        table.product,
      ),

      index(
        "member_branch_access_primary_idx",
      ).on(
        table.memberId,
        table.product,
        table.isPrimary,
      ),
    ],
  );

export const rolePermissions =
  pgTable(
    "role_permissions",
    {
      roleId: uuid("role_id")
        .notNull()
        .references(() => roles.id, {
          onDelete: "cascade",
        }),

      moduleId: text("module_id")
        .notNull(),

      canView: boolean("can_view")
        .notNull()
        .default(false),

      canCreate: boolean(
        "can_create",
      )
        .notNull()
        .default(false),

      canEdit: boolean("can_edit")
        .notNull()
        .default(false),

      canDelete: boolean(
        "can_delete",
      )
        .notNull()
        .default(false),

      canManage: boolean(
        "can_manage",
      )
        .notNull()
        .default(false),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      primaryKey({
        name: "role_permissions_pk",
        columns: [
          table.roleId,
          table.moduleId,
        ],
      }),

      index(
        "role_permissions_module_idx",
      ).on(table.moduleId),
    ],
  );

export type CRMAutomationEntityType =
  | "lead"
  | "customer"
  | "deal"
  | "activity"
  | "sales_order";

export type CRMAutomationTriggerType =
  | "record_created"
  | "record_updated"
  | "status_changed";

export type CRMAutomationCondition = {
  field: string;

  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "is_empty"
    | "is_not_empty"
    | "greater_than"
    | "less_than"
    | "changed";

  value?: unknown;
};

export type CRMAutomationDelay = {
  amount: number;

  unit:
    | "minutes"
    | "hours"
    | "days"
    | "months";

  baseField?: string;
};

export type CRMAutomationAction =
  (
    | {
        type: "assign_owner";
        clerkUserId: string;
      }
    | {
        type: "update_field";
        field: string;
        value: unknown;
      }
    | {
        type: "change_status";
        status: string;
      }
    | {
        type: "create_activity";
        activityType: string;
        subject: string;
        description?: string;
        priority?: string;
        dueInMinutes?: number;
        ownerClerkUserId?:
          string;
      }
    | {
        type:
          "create_notification";
        title: string;
        message: string;
        recipientClerkUserId?:
          string;
      }
    | {
        type: "send_email";

        recipientSource:
          | "record"
          | "related_customer"
          | "owner"
          | "fixed";

        recipientEmail?: string;
        subject: string;
        message: string;
        replyTo?: string;
      }
  ) & {
    delay?:
      CRMAutomationDelay;
  };

export const crmAutomationRules =
  pgTable(
    "crm_automation_rules",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      branchId: uuid("branch_id")
        .references(
          () => tenantBranches.id,
          {
            onDelete: "set null",
          },
        ),

      name: text("name")
        .notNull(),

      description: text(
        "description",
      ),

      entityType: text(
        "entity_type",
      )
        .$type<
          CRMAutomationEntityType
        >()
        .notNull(),

      triggerType: text(
        "trigger_type",
      )
        .$type<
          CRMAutomationTriggerType
        >()
        .notNull(),

      conditions: jsonb(
        "conditions",
      )
        .$type<{
          mode: "all" | "any";

          items:
            CRMAutomationCondition[];
        }>()
        .notNull()
        .default({
          mode: "all",
          items: [],
        }),

      actions: jsonb("actions")
        .$type<
          CRMAutomationAction[]
        >()
        .notNull()
        .default([]),

      enabled: boolean("enabled")
        .notNull()
        .default(false),

      stopOnError: boolean(
        "stop_on_error",
      )
        .notNull()
        .default(true),

      createdByClerkUserId: text(
        "created_by_clerk_user_id",
      )
        .notNull(),

      updatedByClerkUserId: text(
        "updated_by_clerk_user_id",
      )
        .notNull(),

      lastRunAt: timestamp(
        "last_run_at",
        {
          withTimezone: true,
        },
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "crm_automation_rules_tenant_idx",
      ).on(
        table.tenantId,
        table.updatedAt,
      ),

      index(
        "crm_automation_rules_trigger_idx",
      ).on(
        table.tenantId,
        table.entityType,
        table.triggerType,
        table.enabled,
      ),

      index(
        "crm_automation_rules_branch_idx",
      ).on(
        table.tenantId,
        table.branchId,
      ),
    ],
  );

export const crmAutomationExecutions =
  pgTable(
    "crm_automation_executions",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      ruleId: uuid("rule_id")
        .notNull()
        .references(
          () => crmAutomationRules.id,
          {
            onDelete: "cascade",
          },
        ),

      eventKey: text("event_key")
        .notNull(),

      entityType: text(
        "entity_type",
      )
        .$type<
          CRMAutomationEntityType
        >()
        .notNull(),

      entityId: text("entity_id")
        .notNull(),

      triggerType: text(
        "trigger_type",
      )
        .$type<
          CRMAutomationTriggerType
        >()
        .notNull(),

      status: text("status")
        .$type<
          | "running"
          | "succeeded"
          | "partially_succeeded"
          | "failed"
          | "skipped"
        >()
        .notNull()
        .default("running"),

      context: jsonb("context")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      actionResults: jsonb(
        "action_results",
      )
        .$type<
          Array<{
            actionIndex: number;
            actionType: string;
            status:
              | "succeeded"
              | "failed"
              | "skipped";
            message?: string;
          }>
        >()
        .notNull()
        .default([]),

      errorMessage: text(
        "error_message",
      ),

      triggeredByClerkUserId:
        text(
          "triggered_by_clerk_user_id",
        ),

      startedAt: timestamp(
        "started_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      completedAt: timestamp(
        "completed_at",
        {
          withTimezone: true,
        },
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "crm_automation_executions_event_unique",
      ).on(
        table.tenantId,
        table.ruleId,
        table.eventKey,
      ),

      index(
        "crm_automation_executions_rule_idx",
      ).on(
        table.ruleId,
        table.createdAt,
      ),

      index(
        "crm_automation_executions_tenant_status_idx",
      ).on(
        table.tenantId,
        table.status,
        table.createdAt,
      ),

      index(
        "crm_automation_executions_entity_idx",
      ).on(
        table.tenantId,
        table.entityType,
        table.entityId,
      ),
    ],
  );

export const crmAutomationScheduledJobs =
  pgTable(
    "crm_automation_scheduled_jobs",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      ruleId: uuid("rule_id")
        .notNull()
        .references(
          () => crmAutomationRules.id,
          {
            onDelete: "cascade",
          },
        ),

      executionId: uuid(
        "execution_id",
      )
        .notNull()
        .references(
          () =>
            crmAutomationExecutions.id,
          {
            onDelete: "cascade",
          },
        ),

      actionIndex: integer(
        "action_index",
      ).notNull(),

      action: jsonb("action")
        .$type<
          CRMAutomationAction
        >()
        .notNull(),

      entityType: text(
        "entity_type",
      )
        .$type<
          CRMAutomationEntityType
        >()
        .notNull(),

      entityId: text("entity_id")
        .notNull(),

      actorClerkUserId: text(
        "actor_clerk_user_id",
      ).notNull(),

      recordSnapshot: jsonb(
        "record_snapshot",
      )
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      scheduledFor: timestamp(
        "scheduled_for",
        {
          withTimezone: true,
        },
      ).notNull(),

      status: text("status")
        .$type<
          | "pending"
          | "processing"
          | "succeeded"
          | "failed"
          | "cancelled"
        >()
        .notNull()
        .default("pending"),

      attempts: integer("attempts")
        .notNull()
        .default(0),

      maxAttempts: integer(
        "max_attempts",
      )
        .notNull()
        .default(3),

      lastAttemptAt: timestamp(
        "last_attempt_at",
        {
          withTimezone: true,
        },
      ),

      completedAt: timestamp(
        "completed_at",
        {
          withTimezone: true,
        },
      ),

      errorMessage: text(
        "error_message",
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),

      updatedAt: timestamp(
        "updated_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex(
        "crm_automation_scheduled_jobs_action_unique",
      ).on(
        table.tenantId,
        table.executionId,
        table.actionIndex,
      ),

      index(
        "crm_automation_scheduled_jobs_due_idx",
      ).on(
        table.status,
        table.scheduledFor,
      ),

      index(
        "crm_automation_scheduled_jobs_rule_idx",
      ).on(
        table.ruleId,
        table.createdAt,
      ),

      index(
        "crm_automation_scheduled_jobs_entity_idx",
      ).on(
        table.tenantId,
        table.entityType,
        table.entityId,
      ),
    ],
  );

export const crmNotifications =
  pgTable(
    "crm_notifications",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      tenantId: uuid("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),

      recipientClerkUserId: text(
        "recipient_clerk_user_id",
      )
        .notNull(),

      title: text("title")
        .notNull(),

      message: text("message")
        .notNull(),

      entityType: text(
        "entity_type",
      ).$type<
        CRMAutomationEntityType
      >(),

      entityId: text("entity_id"),

      automationRuleId: uuid(
        "automation_rule_id",
      ).references(
        () => crmAutomationRules.id,
        {
          onDelete: "set null",
        },
      ),

      automationExecutionId: uuid(
        "automation_execution_id",
      ).references(
        () =>
          crmAutomationExecutions.id,
        {
          onDelete: "set null",
        },
      ),

      metadata: jsonb("metadata")
        .$type<
          Record<string, unknown>
        >()
        .notNull()
        .default({}),

      readAt: timestamp("read_at", {
        withTimezone: true,
      }),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index(
        "crm_notifications_recipient_idx",
      ).on(
        table.tenantId,
        table.recipientClerkUserId,
        table.readAt,
        table.createdAt,
      ),

      index(
        "crm_notifications_rule_idx",
      ).on(
        table.automationRuleId,
        table.createdAt,
      ),
    ],
  );

export type CRMAutomationRule =
  typeof crmAutomationRules
    .$inferSelect;

export type NewCRMAutomationRule =
  typeof crmAutomationRules
    .$inferInsert;

export type CRMAutomationExecution =
  typeof crmAutomationExecutions
    .$inferSelect;

export type CRMNotification =
  typeof crmNotifications
    .$inferSelect;

export type TenantRegion =
  typeof tenantRegions.$inferSelect;

export type NewTenantRegion =
  typeof tenantRegions.$inferInsert;

export type TenantBranch =
  typeof tenantBranches.$inferSelect;

export type NewTenantBranch =
  typeof tenantBranches.$inferInsert;

export type MemberRegionAccess =
  typeof memberRegionAccess.$inferSelect;

export type NewMemberRegionAccess =
  typeof memberRegionAccess.$inferInsert;

export type MemberBranchAccess =
  typeof memberBranchAccess.$inferSelect;

export type NewMemberBranchAccess =
  typeof memberBranchAccess.$inferInsert;

export type Tenant =
  typeof tenants.$inferSelect;

export type NewTenant =
  typeof tenants.$inferInsert;

export type TenantProduct =
  typeof tenantProducts.$inferSelect;

export type Subscription =
  typeof subscriptions.$inferSelect;

export type Role =
  typeof roles.$inferSelect;

export type TenantMember =
  typeof tenantMembers.$inferSelect;

export type MemberProductRole =
  typeof memberProductRoles.$inferSelect;

export type NewMemberProductRole =
  typeof memberProductRoles.$inferInsert;

export type RolePermission =
  typeof rolePermissions.$inferSelect;

export type CRMDocument =
  typeof crmDocuments.$inferSelect;

export type NewCRMDocument =
  typeof crmDocuments.$inferInsert;

export type CRMDocumentRelation =
  typeof crmDocumentRelations.$inferSelect;

export type NewCRMDocumentRelation =
  typeof crmDocumentRelations.$inferInsert;

export type CRMAutomationScheduledJob =
  typeof crmAutomationScheduledJobs.$inferSelect;

export type NewCRMAutomationScheduledJob =
  typeof crmAutomationScheduledJobs.$inferInsert;
