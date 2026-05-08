ALTER TABLE "webhooks" ALTER COLUMN "min_confidence" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "max_confidence" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "min_score" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "max_score" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "webhook_id" uuid;--> statement-breakpoint
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_webhook_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "strategies_webhook_id_idx" ON "strategies" USING btree ("webhook_id");