CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"tool_name" varchar(100),
	"tool_input" jsonb,
	"tool_output" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_messages_user_session_idx" ON "chat_messages" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages" USING btree ("created_at");