import {
  boolean,
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

    legalName: text("legal_name"),

    taxId: text("tax_id"),

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

      planKey: text("plan_key")
        .notNull(),

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

export type RolePermission =
  typeof rolePermissions.$inferSelect;
