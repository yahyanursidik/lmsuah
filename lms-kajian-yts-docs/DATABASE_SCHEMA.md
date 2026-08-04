# Database Schema

## Database
Neon PostgreSQL dengan Drizzle ORM.

## Identity
Neon Auth menyimpan identitas. Tabel `profiles` menyimpan data aplikasi dengan referensi `auth_user_id`.

## Tables
- profiles, roles, permissions, user_roles, role_permissions
- instructors, programs, series, books, series_books, chapters
- venues, schedules, lessons, lesson_videos, lesson_markers
- lesson_transcripts, lesson_attachments
- enrollments, lesson_progress, transcript_reading_progress
- transcript_bookmarks, transcript_notes, user_notes, bookmarks
- quizzes, questions, question_options, quiz_attempts, quiz_answers
- attendance_sessions, attendances
- notifications, notification_preferences, announcements
- review_requests, audit_logs

## File Metadata
`lesson_transcripts` menyimpan blob key, filename, MIME, size, SHA-256, page count, version, status, dan izin unduh. File fisik berada di Netlify Blobs.

## Constraints
- Unique enrollment per user/program
- Satu transkrip published aktif per lesson/bahasa
- Quiz score hanya ditetapkan server
- Audit append-only
