CREATE TABLE "llm_provider_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50),
	"enabled" boolean DEFAULT true,
	"api_key" varchar(500),
	"base_url" varchar(500),
	"default_model" varchar(100),
	"rpm_limit" integer,
	"daily_budget" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "llm_provider_configs_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "llm_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" varchar(50),
	"task" varchar(50),
	"provider" varchar(50),
	"model" varchar(100),
	"user_id" uuid,
	"request_id" varchar(100),
	"trace_id" varchar(100),
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"estimated_cost" numeric(18, 8),
	"latency_ms" integer,
	"success" boolean DEFAULT false,
	"error_message" text,
	"retry_count" integer,
	"cache_hit" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_usage_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp with time zone,
	"module" varchar(50),
	"provider" varchar(50),
	"total_requests" integer,
	"total_tokens" integer,
	"total_cost" numeric(18, 8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llm_requests" ADD CONSTRAINT "llm_requests_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "llm_provider_configs_provider_unique_idx" ON "llm_provider_configs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "llm_provider_configs_enabled_idx" ON "llm_provider_configs" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "llm_requests_module_idx" ON "llm_requests" USING btree ("module");--> statement-breakpoint
CREATE INDEX "llm_requests_provider_idx" ON "llm_requests" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "llm_requests_model_idx" ON "llm_requests" USING btree ("model");--> statement-breakpoint
CREATE INDEX "llm_requests_user_id_idx" ON "llm_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "llm_requests_success_idx" ON "llm_requests" USING btree ("success");--> statement-breakpoint
CREATE INDEX "llm_requests_created_at_idx" ON "llm_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_usage_daily_date_idx" ON "llm_usage_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "llm_usage_daily_module_idx" ON "llm_usage_daily" USING btree ("module");--> statement-breakpoint
CREATE INDEX "llm_usage_daily_provider_idx" ON "llm_usage_daily" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_daily_date_module_provider_unique_idx" ON "llm_usage_daily" USING btree ("date","module","provider");