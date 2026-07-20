import {
  boolean,
  index,
  integer,
  jsonb,
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