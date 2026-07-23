CREATE TABLE "crm_document_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'Otro' NOT NULL,
	"mime_type" text NOT NULL,
	"extension" text,
	"size_bytes" integer NOT NULL,
	"storage_provider" text DEFAULT 'r2' NOT NULL,
	"storage_key" text NOT NULL,
	"checksum" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"uploaded_by_clerk_user_id" text NOT NULL,
	"uploaded_by_name" text,
	"uploaded_by_email" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_document_relations" ADD CONSTRAINT "crm_document_relations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_document_relations" ADD CONSTRAINT "crm_document_relations_document_id_crm_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."crm_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_documents" ADD CONSTRAINT "crm_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_document_relations_unique" ON "crm_document_relations" USING btree ("tenant_id","document_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "crm_document_relations_document_idx" ON "crm_document_relations" USING btree ("tenant_id","document_id");--> statement-breakpoint
CREATE INDEX "crm_document_relations_entity_idx" ON "crm_document_relations" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_documents_storage_key_unique" ON "crm_documents" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "crm_documents_tenant_status_idx" ON "crm_documents" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "crm_documents_tenant_category_idx" ON "crm_documents" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "crm_documents_tenant_uploader_idx" ON "crm_documents" USING btree ("tenant_id","uploaded_by_clerk_user_id");--> statement-breakpoint
CREATE INDEX "crm_documents_tenant_created_idx" ON "crm_documents" USING btree ("tenant_id","created_at");