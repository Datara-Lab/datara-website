CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product" "product_access" NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"channel" text NOT NULL,
	"clerk_user_id" text,
	"status" text NOT NULL,
	"input_token_count" integer DEFAULT 0 NOT NULL,
	"output_token_count" integer DEFAULT 0 NOT NULL,
	"thinking_token_count" integer DEFAULT 0 NOT NULL,
	"cached_input_token_count" integer DEFAULT 0 NOT NULL,
	"total_token_count" integer DEFAULT 0 NOT NULL,
	"request_duration_ms" integer DEFAULT 0 NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"estimated_input_cost_usd" numeric(16, 8) DEFAULT '0' NOT NULL,
	"estimated_output_cost_usd" numeric(16, 8) DEFAULT '0' NOT NULL,
	"estimated_total_cost_usd" numeric(16, 8) DEFAULT '0' NOT NULL,
	"error_code" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_events_tokens_check" CHECK (
          "ai_usage_events"."input_token_count" >= 0
          AND
          "ai_usage_events"."output_token_count" >= 0
          AND
          "ai_usage_events"."thinking_token_count" >= 0
          AND
          "ai_usage_events"."cached_input_token_count" >= 0
          AND
          "ai_usage_events"."total_token_count" >= 0
        ),
	CONSTRAINT "ai_usage_events_duration_check" CHECK (
          "ai_usage_events"."request_duration_ms" >= 0
          AND
          "ai_usage_events"."attempt_count" > 0
        ),
	CONSTRAINT "ai_usage_events_cost_check" CHECK (
          "ai_usage_events"."estimated_input_cost_usd" >= 0
          AND
          "ai_usage_events"."estimated_output_cost_usd" >= 0
          AND
          "ai_usage_events"."estimated_total_cost_usd" >= 0
        )
);
--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_events_tenant_idx" ON "ai_usage_events" USING btree ("tenant_id","product","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_model_idx" ON "ai_usage_events" USING btree ("provider","model","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_status_idx" ON "ai_usage_events" USING btree ("status","created_at");