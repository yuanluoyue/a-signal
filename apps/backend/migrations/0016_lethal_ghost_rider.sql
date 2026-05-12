CREATE TABLE "simulation_equity_curve" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"total_equity" numeric(18, 2) NOT NULL,
	"available_cash" numeric(18, 2) NOT NULL,
	"position_value" numeric(18, 2) NOT NULL,
	"total_profit" numeric(18, 2) NOT NULL,
	"total_return" numeric(18, 4) NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "simulation_positions" ADD COLUMN "take_profit_price" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "simulation_positions" ADD COLUMN "stop_loss_price" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "simulation_positions" ADD COLUMN "trade_source" varchar(20) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "simulation_trades" ADD COLUMN "close_reason" varchar(20);--> statement-breakpoint
ALTER TABLE "simulation_trades" ADD COLUMN "trade_source" varchar(20) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "simulation_equity_curve" ADD CONSTRAINT "simulation_equity_curve_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."simulation_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "simulation_equity_curve_account_id_idx" ON "simulation_equity_curve" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "simulation_equity_curve_recorded_at_idx" ON "simulation_equity_curve" USING btree ("recorded_at");