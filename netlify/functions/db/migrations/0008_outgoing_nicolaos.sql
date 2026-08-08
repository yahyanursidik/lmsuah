CREATE TABLE "system_settings" (
	"id" text PRIMARY KEY DEFAULT 'general' NOT NULL,
	"site_name" text DEFAULT 'Portal Kajian UAH' NOT NULL,
	"support_email" text,
	"default_timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"allow_registration" boolean DEFAULT true NOT NULL,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"show_public_schedule" boolean DEFAULT true NOT NULL,
	"allow_pdf_download" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;