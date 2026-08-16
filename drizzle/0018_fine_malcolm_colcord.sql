CREATE TABLE "member_branch_access" (
	"tenant_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"product" "product_access" NOT NULL,
	"branch_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_branch_access_pk" PRIMARY KEY("member_id","product","branch_id")
);
--> statement-breakpoint
CREATE TABLE "member_region_access" (
	"tenant_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"product" "product_access" NOT NULL,
	"region_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_region_access_pk" PRIMARY KEY("member_id","product","region_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"region_id" uuid,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"folio_prefix" text,
	"phone" text,
	"email" text,
	"timezone" text,
	"address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_product_roles" ADD COLUMN "all_branches" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "member_branch_access" ADD CONSTRAINT "member_branch_access_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_branch_access" ADD CONSTRAINT "member_branch_access_member_id_tenant_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."tenant_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_branch_access" ADD CONSTRAINT "member_branch_access_branch_id_tenant_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."tenant_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_region_access" ADD CONSTRAINT "member_region_access_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_region_access" ADD CONSTRAINT "member_region_access_member_id_tenant_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."tenant_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_region_access" ADD CONSTRAINT "member_region_access_region_id_tenant_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."tenant_regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_branches" ADD CONSTRAINT "tenant_branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_branches" ADD CONSTRAINT "tenant_branches_region_id_tenant_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."tenant_regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_regions" ADD CONSTRAINT "tenant_regions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_branch_access_tenant_idx" ON "member_branch_access" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "member_branch_access_branch_idx" ON "member_branch_access" USING btree ("tenant_id","branch_id","product");--> statement-breakpoint
CREATE INDEX "member_branch_access_primary_idx" ON "member_branch_access" USING btree ("member_id","product","is_primary");--> statement-breakpoint
CREATE INDEX "member_region_access_tenant_idx" ON "member_region_access" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "member_region_access_region_idx" ON "member_region_access" USING btree ("tenant_id","region_id","product");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_branches_tenant_code_unique" ON "tenant_branches" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "tenant_branches_tenant_idx" ON "tenant_branches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_branches_region_idx" ON "tenant_branches" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "tenant_branches_active_idx" ON "tenant_branches" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_regions_tenant_code_unique" ON "tenant_regions" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "tenant_regions_tenant_idx" ON "tenant_regions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_regions_active_idx" ON "tenant_regions" USING btree ("tenant_id","active");