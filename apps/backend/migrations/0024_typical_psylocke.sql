CREATE TABLE "news_filter_agent_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean DEFAULT false,
	"prompt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_filter_agent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"news_id" uuid,
	"news_title" text,
	"decision" varchar(20),
	"reasoning" text,
	"confidence" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "news_filter_agent_logs" ADD CONSTRAINT "news_filter_agent_logs_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_filter_agent_logs_news_id_idx" ON "news_filter_agent_logs" USING btree ("news_id");--> statement-breakpoint
CREATE INDEX "news_filter_agent_logs_created_at_idx" ON "news_filter_agent_logs" USING btree ("created_at");