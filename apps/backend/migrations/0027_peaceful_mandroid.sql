CREATE TABLE "trading_memory_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid,
	"action" varchar(50),
	"old_value" jsonb,
	"new_value" jsonb,
	"operator" varchar(50),
	"operator_id" uuid,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trading_memory_logs" ADD CONSTRAINT "trading_memory_logs_memory_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."trading_memories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trading_memory_logs_memory_id_idx" ON "trading_memory_logs" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "trading_memory_logs_action_idx" ON "trading_memory_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "trading_memory_logs_created_at_idx" ON "trading_memory_logs" USING btree ("created_at");