ALTER TABLE "strategies" DROP CONSTRAINT "strategies_name_unique";--> statement-breakpoint
DROP INDEX "stock_trackings_stock_unique_idx";--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "backtest_trades" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "simulation_accounts" ADD COLUMN "name" varchar(100);--> statement-breakpoint
ALTER TABLE "stock_trackings" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "strategies_runtime" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtest_records" ADD CONSTRAINT "backtest_records_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backtest_trades" ADD CONSTRAINT "backtest_trades_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_trackings" ADD CONSTRAINT "stock_trackings_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategies_runtime" ADD CONSTRAINT "strategies_runtime_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."simulation_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "backtest_records_user_id_idx" ON "backtest_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "backtest_trades_user_id_idx" ON "backtest_trades" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "simulation_accounts_user_name_unique_idx" ON "simulation_accounts" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "stock_trackings_user_id_idx" ON "stock_trackings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_trackings_user_stock_unique_idx" ON "stock_trackings" USING btree ("user_id","stock_code");--> statement-breakpoint
CREATE UNIQUE INDEX "strategies_user_name_unique_idx" ON "strategies" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "strategies_user_id_idx" ON "strategies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "strategies_runtime_account_id_idx" ON "strategies_runtime" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "webhooks_user_id_idx" ON "webhooks" USING btree ("user_id");