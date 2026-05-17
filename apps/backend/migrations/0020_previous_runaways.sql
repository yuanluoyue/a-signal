CREATE TABLE "trading_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50),
	"title" varchar(500),
	"summary" text,
	"rationale" text,
	"tags" jsonb,
	"pattern" jsonb,
	"stats" jsonb,
	"confidence" numeric(5, 4),
	"status" varchar(20),
	"first_observed_at" timestamp with time zone,
	"last_validated_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	"last_computed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "trading_memories_type_idx" ON "trading_memories" USING btree ("type");--> statement-breakpoint
CREATE INDEX "trading_memories_status_idx" ON "trading_memories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trading_memories_confidence_idx" ON "trading_memories" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "trading_memories_created_at_idx" ON "trading_memories" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trading_memories_last_validated_at_idx" ON "trading_memories" USING btree ("last_validated_at");