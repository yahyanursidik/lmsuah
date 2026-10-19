CREATE TABLE "transcript_version_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transcript_version_events" ADD CONSTRAINT "transcript_version_events_version_id_transcript_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."transcript_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_version_events" ADD CONSTRAINT "transcript_version_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcript_version_events_version_idx" ON "transcript_version_events" USING btree ("version_id");