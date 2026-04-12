CREATE TABLE "klines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_code" varchar(20) NOT NULL,
	"period" varchar(10) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"open" numeric(18, 8) NOT NULL,
	"close" numeric(18, 8) NOT NULL,
	"high" numeric(18, 8) NOT NULL,
	"low" numeric(18, 8) NOT NULL,
	"volume" numeric(24, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"source" varchar(100) NOT NULL,
	"analyze_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"vectorize_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"publish_time" timestamp with time zone NOT NULL,
	"original_url" text NOT NULL,
	"unique_key" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_unique_key_unique" UNIQUE("unique_key")
);
--> statement-breakpoint
CREATE TABLE "scheduler_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"cron_expression" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduler_tasks_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"news_id" uuid NOT NULL,
	"stock_code" varchar(20) NOT NULL,
	"stock_name" varchar(100) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"confidence" integer NOT NULL,
	"sentiment" varchar(10) NOT NULL,
	"reasoning" text NOT NULL,
	"key_factors" jsonb NOT NULL,
	"time_window" varchar(20) NOT NULL,
	"signal_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"confidence_threshold" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "klines_stock_period_time_unique_idx" ON "klines" USING btree ("stock_code","period","timestamp");--> statement-breakpoint
CREATE INDEX "klines_stock_code_idx" ON "klines" USING btree ("stock_code");--> statement-breakpoint
CREATE INDEX "klines_period_idx" ON "klines" USING btree ("period");--> statement-breakpoint
CREATE INDEX "klines_timestamp_idx" ON "klines" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "news_analyze_status_idx" ON "news" USING btree ("analyze_status");--> statement-breakpoint
CREATE INDEX "news_vectorize_status_idx" ON "news" USING btree ("vectorize_status");--> statement-breakpoint
CREATE INDEX "news_publish_time_idx" ON "news" USING btree ("publish_time");--> statement-breakpoint
CREATE INDEX "news_source_idx" ON "news" USING btree ("source");--> statement-breakpoint
CREATE INDEX "scheduler_tasks_enabled_idx" ON "scheduler_tasks" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "scheduler_tasks_name_idx" ON "scheduler_tasks" USING btree ("name");--> statement-breakpoint
CREATE INDEX "signals_news_id_idx" ON "signals" USING btree ("news_id");--> statement-breakpoint
CREATE INDEX "signals_stock_code_idx" ON "signals" USING btree ("stock_code");--> statement-breakpoint
CREATE INDEX "signals_direction_idx" ON "signals" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "signals_confidence_idx" ON "signals" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "signals_sentiment_idx" ON "signals" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "signals_signal_time_idx" ON "signals" USING btree ("signal_time");--> statement-breakpoint
CREATE INDEX "webhooks_type_idx" ON "webhooks" USING btree ("type");--> statement-breakpoint
CREATE INDEX "webhooks_enabled_idx" ON "webhooks" USING btree ("enabled");