CREATE TABLE "periodic_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"content" jsonb NOT NULL,
	"summary" text,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "events" jsonb DEFAULT '["signal"]'::jsonb;--> statement-breakpoint
CREATE INDEX "periodic_reports_type_idx" ON "periodic_reports" USING btree ("type");--> statement-breakpoint
CREATE INDEX "periodic_reports_period_start_idx" ON "periodic_reports" USING btree ("period_start");--> statement-breakpoint
CREATE INDEX "periodic_reports_status_idx" ON "periodic_reports" USING btree ("status");