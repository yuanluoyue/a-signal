ALTER TABLE "mcp_logs" DROP CONSTRAINT "mcp_logs_api_key_id_fk";
--> statement-breakpoint
ALTER TABLE "mcp_logs" ADD CONSTRAINT "mcp_logs_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;