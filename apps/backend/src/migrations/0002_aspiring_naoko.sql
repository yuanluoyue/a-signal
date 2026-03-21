CREATE TABLE "backtest_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"min_confidence" integer NOT NULL,
	"max_confidence" integer NOT NULL,
	"directions" jsonb NOT NULL,
	"stop_loss" numeric(18, 4) NOT NULL,
	"take_profit" numeric(18, 4) NOT NULL,
	"period" varchar(10) DEFAULT '4h' NOT NULL,
	"total_trades" integer NOT NULL,
	"winning_trades" integer NOT NULL,
	"losing_trades" integer NOT NULL,
	"win_rate" numeric(18, 4) NOT NULL,
	"total_return" numeric(18, 4) NOT NULL,
	"max_drawdown" numeric(18, 4) NOT NULL,
	"avg_return" numeric(18, 4) NOT NULL,
	"trades" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"initial_capital" numeric(18, 2) NOT NULL,
	"current_capital" numeric(18, 2) NOT NULL,
	"available_cash" numeric(18, 2) NOT NULL,
	"total_profit" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_return" numeric(18, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"stock_code" varchar(20) NOT NULL,
	"stock_name" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"avg_cost" numeric(18, 2) NOT NULL,
	"current_price" numeric(18, 2),
	"market_value" numeric(18, 2),
	"profit" numeric(18, 2) DEFAULT '0' NOT NULL,
	"return" numeric(18, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"stock_code" varchar(20) NOT NULL,
	"stock_name" varchar(100) NOT NULL,
	"type" varchar(10) NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(18, 2) NOT NULL,
	"total_amount" numeric(18, 2) NOT NULL,
	"profit" numeric(18, 2),
	"trade_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_blacklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_code" varchar(20) NOT NULL,
	"stock_name" varchar(100) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_blacklist_stock_code_unique" UNIQUE("stock_code")
);
--> statement-breakpoint
CREATE TABLE "stock_trackings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_code" varchar(20) NOT NULL,
	"stock_name" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_news" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "min_confidence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "max_confidence" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulation_accounts" ADD CONSTRAINT "simulation_accounts_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_positions" ADD CONSTRAINT "simulation_positions_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."simulation_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_trades" ADD CONSTRAINT "simulation_trades_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."simulation_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "backtest_records_created_at_idx" ON "backtest_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "simulation_accounts_user_id_idx" ON "simulation_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "simulation_positions_account_id_idx" ON "simulation_positions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "simulation_positions_stock_code_idx" ON "simulation_positions" USING btree ("stock_code");--> statement-breakpoint
CREATE UNIQUE INDEX "simulation_positions_account_stock_unique_idx" ON "simulation_positions" USING btree ("account_id","stock_code");--> statement-breakpoint
CREATE INDEX "simulation_trades_account_id_idx" ON "simulation_trades" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "simulation_trades_stock_code_idx" ON "simulation_trades" USING btree ("stock_code");--> statement-breakpoint
CREATE INDEX "simulation_trades_trade_time_idx" ON "simulation_trades" USING btree ("trade_time");--> statement-breakpoint
CREATE INDEX "stock_blacklist_stock_code_idx" ON "stock_blacklist" USING btree ("stock_code");--> statement-breakpoint
CREATE INDEX "stock_trackings_stock_code_idx" ON "stock_trackings" USING btree ("stock_code");--> statement-breakpoint
CREATE INDEX "stock_trackings_status_idx" ON "stock_trackings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_trackings_stock_unique_idx" ON "stock_trackings" USING btree ("stock_code");--> statement-breakpoint
ALTER TABLE "webhooks" DROP COLUMN "confidence_threshold";