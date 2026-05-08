CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"news_id" uuid,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"category" varchar(20) NOT NULL,
	"subcategory" varchar(50) NOT NULL,
	"subjects" jsonb NOT NULL,
	"sentiment_direction" integer NOT NULL,
	"sentiment_confidence" numeric(5, 4) NOT NULL,
	"sentiment_rationale" varchar(50) NOT NULL,
	"importance_score" numeric(5, 4) NOT NULL,
	"importance_benchmark" varchar(30),
	"surprise_score" numeric(5, 4),
	"surprise_baseline" varchar(100),
	"effective_period_start" timestamp with time zone NOT NULL,
	"effective_period_end" timestamp with time zone,
	"effective_decay_type" varchar(20) NOT NULL,
	"metrics" jsonb,
	"source_url" text,
	"source_title" varchar(500) NOT NULL,
	"source_summary" text NOT NULL,
	"source_publisher" varchar(100) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_category_idx" ON "events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "events_subcategory_idx" ON "events" USING btree ("subcategory");--> statement-breakpoint
CREATE INDEX "events_occurred_at_idx" ON "events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "events_processed_idx" ON "events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "events_news_id_idx" ON "events" USING btree ("news_id");--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "signals_event_id_idx" ON "signals" USING btree ("event_id");