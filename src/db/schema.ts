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

export type CRMDocument =
  typeof crmDocuments.$inferSelect;

export type NewCRMDocument =
  typeof crmDocuments.$inferInsert;

export type CRMDocumentRelation =
  typeof crmDocumentRelations.$inferSelect;

export type NewCRMDocumentRelation =
  typeof crmDocumentRelations.$inferInsert;
