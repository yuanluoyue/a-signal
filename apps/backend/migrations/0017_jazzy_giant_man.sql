CREATE TABLE "strategies_runtime" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_id" uuid NOT NULL,
	"webhook_id" uuid,
	"enable_webhook" boolean DEFAULT true NOT NULL,
	"enable_simulation" boolean DEFAULT false NOT NULL,
	"enable_live_trading" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "simulation_positions" ADD COLUMN "strategy_id" uuid;--> statement-breakpoint
ALTER TABLE "simulation_trades" ADD COLUMN "strategy_id" uuid;--> statement-breakpoint
ALTER TABLE "strategies_runtime" ADD CONSTRAINT "strategies_runtime_strategy_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategies_runtime" ADD CONSTRAINT "strategies_runtime_webhook_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "strategies_runtime_strategy_id_unique_idx" ON "strategies_runtime" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX "strategies_runtime_webhook_id_idx" ON "strategies_runtime" USING btree ("webhook_id");--> statement-breakpoint
ALTER TABLE "simulation_positions" ADD CONSTRAINT "simulation_positions_strategy_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_trades" ADD CONSTRAINT "simulation_trades_strategy_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "simulation_positions_strategy_id_idx" ON "simulation_positions" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX "simulation_trades_strategy_id_idx" ON "simulation_trades" USING btree ("strategy_id");