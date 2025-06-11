CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" text,
	"target_id" text,
	"description" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_integrity" (
	"id" serial PRIMARY KEY NOT NULL,
	"backup_id" varchar(64) NOT NULL,
	"server_id" varchar(32) NOT NULL,
	"server_name" varchar(100) NOT NULL,
	"backup_type" varchar(20) NOT NULL,
	"health_score" integer NOT NULL,
	"integrity_status" varchar(20) NOT NULL,
	"data_completeness" integer NOT NULL,
	"checksum_valid" boolean DEFAULT true,
	"total_elements" integer NOT NULL,
	"valid_elements" integer NOT NULL,
	"corrupted_elements" jsonb,
	"missing_elements" jsonb,
	"validation_errors" jsonb,
	"performance_metrics" jsonb,
	"last_checked" timestamp DEFAULT now() NOT NULL,
	"checked_by" varchar(100),
	"auto_check" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bot_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "candy_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" text,
	"to_user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_id" varchar(64) NOT NULL,
	"user_id" varchar(128),
	"linked_email" varchar(256),
	"discord_user_id" varchar(32) NOT NULL,
	"discord_username" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"last_access_at" timestamp,
	"expires_at" timestamp,
	"revoked_by" varchar(100),
	"revoked_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "dashboard_keys_key_id_unique" UNIQUE("key_id")
);
--> statement-breakpoint
CREATE TABLE "discord_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_id" text NOT NULL,
	"user_id" text,
	"discord_username" text,
	"hwid" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" text,
	CONSTRAINT "discord_keys_key_id_unique" UNIQUE("key_id")
);
--> statement-breakpoint
CREATE TABLE "discord_servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"server_name" text NOT NULL,
	"member_count" integer DEFAULT 0,
	"bot_joined_at" timestamp DEFAULT now() NOT NULL,
	"last_data_sync" timestamp DEFAULT now() NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "discord_servers_server_id_unique" UNIQUE("server_id")
);
--> statement-breakpoint
CREATE TABLE "discord_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"username" text NOT NULL,
	"discriminator" text,
	"avatar_url" text,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"candy_balance" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "discord_users_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"name" varchar,
	"picture" varchar,
	"is_approved" boolean DEFAULT false,
	"role" varchar(50) DEFAULT 'pending',
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");