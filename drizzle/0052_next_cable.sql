CREATE TABLE "ai_provider_configurations" (
	"environment" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"provider" text DEFAULT 'gemini' NOT NULL,
	"gemini_model" text DEFAULT 'gemini-3.6-flash' NOT NULL,
	"openai_model" text DEFAULT 'gpt-5-mini' NOT NULL,
	"changed_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
