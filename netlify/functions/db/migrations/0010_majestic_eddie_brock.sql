CREATE TABLE "lesson_quiz_drafts" (
	"lesson_id" uuid PRIMARY KEY NOT NULL,
	"quiz_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_publications" (
	"program_id" uuid PRIMARY KEY NOT NULL,
	"revision_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"published_by" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_revision_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"change_note" text NOT NULL,
	"submitted_by" text,
	"reviewed_by" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	CONSTRAINT "program_revisions_status_check" CHECK ("program_revisions"."status" in ('capturing', 'draft', 'submitted', 'approved', 'revision_requested', 'published', 'superseded', 'cancelled')),
	CONSTRAINT "program_revisions_version_check" CHECK ("program_revisions"."version" > 0),
	CONSTRAINT "program_revisions_hash_check" CHECK ("program_revisions"."content_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "transcript_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"blob_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text DEFAULT 'application/pdf' NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_downloadable" boolean DEFAULT false NOT NULL,
	"uploaded_by" text,
	"reviewed_by" text,
	"review_note" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "transcript_versions_status_check" CHECK ("transcript_versions"."status" in ('draft', 'submitted', 'approved', 'published', 'revision_requested', 'archived')),
	CONSTRAINT "transcript_versions_size_check" CHECK ("transcript_versions"."size_bytes" > 0 and "transcript_versions"."size_bytes" <= 4194304),
	CONSTRAINT "transcript_versions_version_check" CHECK ("transcript_versions"."version" > 0),
	CONSTRAINT "transcript_versions_mime_check" CHECK ("transcript_versions"."mime" = 'application/pdf'),
	CONSTRAINT "transcript_versions_hash_check" CHECK ("transcript_versions"."sha256" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "lesson_quiz_drafts" ADD CONSTRAINT "lesson_quiz_drafts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_quiz_drafts" ADD CONSTRAINT "lesson_quiz_drafts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_publications" ADD CONSTRAINT "program_publications_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_publications" ADD CONSTRAINT "program_publications_published_by_user_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "program_revisions_program_id_unique" ON "program_revisions" USING btree ("program_id","id");--> statement-breakpoint
ALTER TABLE "program_publications" ADD CONSTRAINT "program_publications_revision_program_fk" FOREIGN KEY ("program_id","revision_id") REFERENCES "public"."program_revisions"("program_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_revision_events" ADD CONSTRAINT "program_revision_events_revision_id_program_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."program_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_revision_events" ADD CONSTRAINT "program_revision_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_documents" ADD CONSTRAINT "transcript_documents_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_documents" ADD CONSTRAINT "transcript_documents_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_versions" ADD CONSTRAINT "transcript_versions_document_id_transcript_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."transcript_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_versions" ADD CONSTRAINT "transcript_versions_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_versions" ADD CONSTRAINT "transcript_versions_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_revision_events_revision_idx" ON "program_revision_events" USING btree ("revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_revisions_program_version_unique" ON "program_revisions" USING btree ("program_id","version");--> statement-breakpoint
CREATE INDEX "program_revisions_program_status_idx" ON "program_revisions" USING btree ("program_id","status");--> statement-breakpoint
CREATE INDEX "transcript_documents_lesson_idx" ON "transcript_documents" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_versions_document_version_unique" ON "transcript_versions" USING btree ("document_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_versions_blob_key_unique" ON "transcript_versions" USING btree ("blob_key");--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_versions_one_published_unique" ON "transcript_versions" USING btree ("document_id") WHERE "transcript_versions"."status" = 'published';--> statement-breakpoint
CREATE INDEX "transcript_versions_document_status_idx" ON "transcript_versions" USING btree ("document_id","status");
--> statement-breakpoint
CREATE FUNCTION "lms_guard_program_revision"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('capturing', 'draft') THEN RAISE EXCEPTION 'Revisions must start as draft' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.program_id IS DISTINCT FROM OLD.program_id OR NEW.version IS DISTINCT FROM OLD.version OR NEW.base_revision_id IS DISTINCT FROM OLD.base_revision_id OR (OLD.status NOT IN ('capturing', 'draft') AND NEW.submitted_by IS DISTINCT FROM OLD.submitted_by) THEN
    RAISE EXCEPTION 'Revision identity cannot change' USING ERRCODE = '23514';
  END IF;
  IF OLD.status NOT IN ('capturing', 'draft') AND (NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.content_hash IS DISTINCT FROM OLD.content_hash OR NEW.change_note IS DISTINCT FROM OLD.change_note) THEN
    RAISE EXCEPTION 'Submitted revision content is immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'capturing' AND NEW.status IN ('draft', 'cancelled')) OR
    (OLD.status = 'draft' AND NEW.status IN ('submitted', 'cancelled')) OR
    (OLD.status = 'submitted' AND NEW.status IN ('approved', 'revision_requested', 'cancelled')) OR
    (OLD.status = 'approved' AND NEW.status IN ('published', 'revision_requested', 'cancelled')) OR
    (OLD.status = 'published' AND NEW.status = 'superseded')
  ) THEN
    RAISE EXCEPTION 'Invalid program revision transition' USING ERRCODE = '23514';
  END IF;
  IF NEW.status IN ('approved', 'published') AND (NEW.reviewed_by IS NULL OR NEW.reviewed_by = NEW.submitted_by) THEN
    RAISE EXCEPTION 'Independent reviewer required' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER "program_revision_immutable_guard" BEFORE INSERT OR UPDATE ON "program_revisions" FOR EACH ROW EXECUTE FUNCTION "lms_guard_program_revision"();
--> statement-breakpoint
CREATE FUNCTION "lms_guard_program_publication"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.program_revisions r WHERE r.id = NEW.revision_id AND r.program_id = NEW.program_id AND r.status IN ('approved', 'published') AND r.snapshot = NEW.snapshot) THEN
    RAISE EXCEPTION 'Publication must use the exact approved immutable revision' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER "program_publication_approved_guard" BEFORE INSERT OR UPDATE ON "program_publications" FOR EACH ROW EXECUTE FUNCTION "lms_guard_program_publication"();
--> statement-breakpoint
CREATE FUNCTION "lms_guard_transcript_version"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'PDF versions must start as draft' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;
  IF (NEW.document_id, NEW.version, NEW.blob_key, NEW.filename, NEW.mime, NEW.size_bytes, NEW.sha256, NEW.uploaded_by) IS DISTINCT FROM (OLD.document_id, OLD.version, OLD.blob_key, OLD.filename, OLD.mime, OLD.size_bytes, OLD.sha256, OLD.uploaded_by) THEN
    RAISE EXCEPTION 'Uploaded PDF versions are immutable; upload a new version' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'approved' AND (NEW.reviewed_by IS NULL OR NEW.reviewed_by = NEW.uploaded_by) THEN
    RAISE EXCEPTION 'Independent PDF reviewer required' USING ERRCODE = '23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('submitted', 'archived')) OR
    (OLD.status = 'revision_requested' AND NEW.status IN ('submitted', 'archived')) OR
    (OLD.status = 'submitted' AND NEW.status IN ('approved', 'revision_requested', 'archived')) OR
    (OLD.status = 'approved' AND NEW.status IN ('published', 'revision_requested', 'archived')) OR
    (OLD.status = 'published' AND NEW.status = 'archived')
  ) THEN RAISE EXCEPTION 'Invalid PDF version transition' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER "transcript_version_immutable_guard" BEFORE INSERT OR UPDATE ON "transcript_versions" FOR EACH ROW EXECUTE FUNCTION "lms_guard_transcript_version"();
