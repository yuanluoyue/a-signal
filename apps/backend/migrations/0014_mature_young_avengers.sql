CREATE TABLE "backtest_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backtest_id" uuid NOT NULL,
	"strategy_id" uuid NOT NULL,
	"signal_id" uuid,
	"event_id" uuid,
	"symbol" varchar(20) NOT NULL,
	"stock_name" varchar(100),
	"direction" varchar(10) NOT NULL,
	"entry_time" timestamp with time zone NOT NULL,
	"entry_price" numeric(18, 4) NOT NULL,
	"exit_time" timestamp with time zone,
	"exit_price" numeric(18, 4),
	"pnl_pct" numeric(18, 6),
	"pnl_amount" numeric(18, 2),
	"signal_score" numeric(10, 4),
	"signal_rule_id" varchar(100),
	"signal_reason" text,
	"exit_reason" varchar(30),
	"stop_loss_price" numeric(18, 4),
	"take_profit_price" numeric(18, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "min_confidence" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "max_confidence" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "directions" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "stop_loss" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "take_profit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "period" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "period" SET DEFAULT '1d';--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "win_rate" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "win_rate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "total_return" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "max_drawdown" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "avg_return" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ALTER COLUMN "trades" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "name" varchar(200);--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "strategy_id" uuid;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "strategy_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "total_signals" integer;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "filtered_signals" integer;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "total_return_pct" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "avg_return_pct" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "max_drawdown_pct" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "sharpe_ratio" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "profit_factor" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "avg_holding_period" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "equity_curve" jsonb;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "status" varchar(20) DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "error_message" text;--> statement-breakpoint
CREATE INDEX "backtest_trades_backtest_id_idx" ON "backtest_trades" USING btree ("backtest_id");--> statement-breakpoint
CREATE INDEX "backtest_trades_strategy_id_idx" ON "backtest_trades" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX "backtest_trades_direction_idx" ON "backtest_trades" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "backtest_trades_exit_reason_idx" ON "backtest_trades" USING btree ("exit_reason");--> statement-breakpoint
CREATE INDEX "backtest_records_strategy_id_idx" ON "backtest_records" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX "backtest_records_start_time_idx" ON "backtest_records" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "backtest_records_end_time_idx" ON "backtest_records" USING btree ("end_time");