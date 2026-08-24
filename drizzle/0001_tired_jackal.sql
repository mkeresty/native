ALTER TABLE "user" ADD COLUMN "auth_user_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_auth_user_id_unique" UNIQUE("auth_user_id");