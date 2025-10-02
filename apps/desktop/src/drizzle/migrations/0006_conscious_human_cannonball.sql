DO $$ BEGIN
 CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'openai', 'google', 'xai');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "public"."database_type" ADD VALUE 'mysql';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"nickname" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "databases" ALTER COLUMN "is_offline" SET DEFAULT null;--> statement-breakpoint
ALTER TABLE "databases" ALTER COLUMN "is_offline" DROP NOT NULL;