CREATE UNIQUE INDEX "enrollments_user_program_unique" ON "enrollments" USING btree ("user_id","program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_progress_user_lesson_unique" ON "lesson_progress" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_progress_user_updated_idx" ON "lesson_progress" USING btree ("user_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "question_options_question_idx" ON "question_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "questions_quiz_idx" ON "questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_answers_attempt_idx" ON "quiz_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_quiz_status_idx" ON "quiz_attempts" USING btree ("user_id","quiz_id","status");--> statement-breakpoint
CREATE INDEX "quizzes_lesson_idx" ON "quizzes" USING btree ("lesson_id");