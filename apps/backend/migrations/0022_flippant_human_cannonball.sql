ALTER TABLE "strategies_runtime" ADD COLUMN "enable_agent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trading_agent_decisions" ADD COLUMN "strategy_id" uuid;--> statement-breakpoint
ALTER TABLE "trading_agent_decisions" ADD CONSTRAINT "trading_agent_decisions_strategy_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trading_agent_decisions_strategy_id_idx" ON "trading_agent_decisions" USING btree ("strategy_id");