CREATE TABLE "member_product_roles" (
	"tenant_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"product" "product_access" NOT NULL,
	"role_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_product_roles_pk" PRIMARY KEY("member_id","product")
);
--> statement-breakpoint
ALTER TABLE "member_product_roles" ADD CONSTRAINT "member_product_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_product_roles" ADD CONSTRAINT "member_product_roles_member_id_tenant_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."tenant_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_product_roles" ADD CONSTRAINT "member_product_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_product_roles_tenant_idx" ON "member_product_roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "member_product_roles_role_idx" ON "member_product_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "member_product_roles_product_idx" ON "member_product_roles" USING btree ("tenant_id","product","enabled");