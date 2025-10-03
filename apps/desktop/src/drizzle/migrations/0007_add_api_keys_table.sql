DO $$ BEGIN
 CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'openai', 'google', 'xai');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"nickname" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
