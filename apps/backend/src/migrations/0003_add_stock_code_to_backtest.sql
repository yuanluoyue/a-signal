ALTER TABLE "backtest_records" ADD COLUMN "stock_code" varchar(20);--> statement-breakpoint
CREATE INDEX "backtest_records_stock_code_idx" ON "backtest_records" USING btree ("stock_code");