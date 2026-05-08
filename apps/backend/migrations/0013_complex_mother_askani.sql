CREATE TABLE "strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"min_score" numeric(5, 4) NOT NULL,
	"max_score" numeric(5, 4),
	"allowed_rule_ids" jsonb,
	"allowed_categories" jsonb,
	"direction_mode" varchar(20) NOT NULL,
	"entry_mode" varchar(20) DEFAULT 'next_open' NOT NULL,
	"hold_period" integer NOT NULL,
	"stop_loss_pct" numeric(5, 4),
	"take_profit_pct" numeric(5, 4),
	"max_signals_per_day" integer,
	"max_positions" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strategies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "strategies_enabled_idx" ON "strategies" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "strategies_direction_mode_idx" ON "strategies" USING btree ("direction_mode");--> statement-breakpoint
CREATE INDEX "strategies_created_at_idx" ON "strategies" USING btree ("created_at");