CREATE TABLE "signal_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"event_type" varchar(50),
	"enabled" boolean DEFAULT true NOT NULL,
	"multiplier" numeric(5, 4) DEFAULT '1.0' NOT NULL,
	"threshold" numeric(5, 4) DEFAULT '0.2' NOT NULL,
	"enable_surprise" boolean DEFAULT true NOT NULL,
	"enable_confidence" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signal_rules_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "signals" DROP CONSTRAINT "signals_news_id_fk";
--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "news_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "stock_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "stock_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "direction" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "confidence" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "sentiment" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "reasoning" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "key_factors" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "time_window" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "signal_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "symbol" varchar(20);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "action" varchar(10);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "score" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "generated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "valid_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "valid_to" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "rule_id" uuid;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "rule_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "weight" numeric(5, 4);--> statement-breakpoint
CREATE INDEX "signal_rules_type_idx" ON "signal_rules" USING btree ("type");--> statement-breakpoint
CREATE INDEX "signal_rules_event_type_idx" ON "signal_rules" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "signal_rules_enabled_idx" ON "signal_rules" USING btree ("enabled");--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."signal_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "signals_symbol_idx" ON "signals" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "signals_action_idx" ON "signals" USING btree ("action");--> statement-breakpoint
CREATE INDEX "signals_score_idx" ON "signals" USING btree ("score");--> statement-breakpoint
CREATE INDEX "signals_generated_at_idx" ON "signals" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "signals_valid_from_idx" ON "signals" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX "signals_rule_id_idx" ON "signals" USING btree ("rule_id");