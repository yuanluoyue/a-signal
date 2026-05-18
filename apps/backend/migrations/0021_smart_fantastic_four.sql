CREATE TABLE "trading_agent_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"account_id" uuid,
	"signal_id" uuid,
	"decision_type" varchar(30),
	"decision" varchar(20),
	"rationale" text,
	"confidence" numeric(3, 2),
	"risk_level" varchar(20),
	"position_action" jsonb,
	"context_snapshot" jsonb,
	"memory_created" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trading_agent_runtimes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"account_id" uuid,
	"status" varchar(20) DEFAULT 'stopped',
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "trading_agent_decisions" ADD CONSTRAINT "trading_agent_decisions_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_agent_decisions" ADD CONSTRAINT "trading_agent_decisions_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."simulation_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_agent_decisions" ADD CONSTRAINT "trading_agent_decisions_signal_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_agent_runtimes" ADD CONSTRAINT "trading_agent_runtimes_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_agent_runtimes" ADD CONSTRAINT "trading_agent_runtimes_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."simulation_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trading_agent_decisions_user_created_at_idx" ON "trading_agent_decisions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "trading_agent_decisions_signal_id_idx" ON "trading_agent_decisions" USING btree ("signal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trading_agent_runtimes_user_id_unique_idx" ON "trading_agent_runtimes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trading_agent_runtimes_account_id_idx" ON "trading_agent_runtimes" USING btree ("account_id");