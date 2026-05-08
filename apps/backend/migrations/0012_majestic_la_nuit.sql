ALTER TABLE "webhooks" ALTER COLUMN "min_confidence" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "max_confidence" DROP NOT NULL;--> statement-breakpoint
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhooks' AND column_name = 'min_score') THEN 
    ALTER TABLE "webhooks" ADD COLUMN "min_score" numeric(4, 3) DEFAULT '0'; 
  END IF; 
END $$;--> statement-breakpoint
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhooks' AND column_name = 'max_score') THEN 
    ALTER TABLE "webhooks" ADD COLUMN "max_score" numeric(4, 3) DEFAULT '1'; 
  END IF; 
END $$;