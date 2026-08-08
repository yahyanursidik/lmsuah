ALTER TABLE "chapters" ALTER COLUMN "book_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "program_id" uuid;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;