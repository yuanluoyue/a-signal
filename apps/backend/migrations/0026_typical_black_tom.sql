CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"created_by_id" uuid,
	"used_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_used_by_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invite_codes_code_idx" ON "invite_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "invite_codes_status_idx" ON "invite_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invite_codes_created_by_id_idx" ON "invite_codes" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "invite_codes_expires_at_idx" ON "invite_codes" USING btree ("expires_at");