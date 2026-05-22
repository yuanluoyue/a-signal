CREATE TABLE "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" varchar(100) NOT NULL,
	"path" varchar(255),
	"icon" varchar(100),
	"sort" integer DEFAULT 0 NOT NULL,
	"visible_roles" jsonb DEFAULT '["admin","normal"]'::jsonb,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(20) DEFAULT 'normal';--> statement-breakpoint
CREATE INDEX "menus_parent_id_idx" ON "menus" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "menus_status_idx" ON "menus" USING btree ("status");--> statement-breakpoint
CREATE INDEX "menus_sort_idx" ON "menus" USING btree ("sort");