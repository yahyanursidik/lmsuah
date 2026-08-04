import { pgTable, text, timestamp, boolean, uuid, integer } from 'drizzle-orm/pg-core';

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id').notNull().references(()=> user.id)
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id').notNull().references(()=> user.id),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

// Profil tambahan aplikasi
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  authUserId: text('auth_user_id').notNull().unique().references(() => user.id),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RBAC: Roles
export const roles = pgTable('roles', {
  id: text('id').primaryKey(), // e.g. 'admin', 'participant'
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RBAC: Permissions
export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(), // e.g. 'program.create'
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RBAC: User Roles (Many-to-Many)
export const userRoles = pgTable('user_roles', {
  userId: text('user_id').notNull().references(() => user.id),
  roleId: text('role_id').notNull().references(() => roles.id),
  assignedBy: text('assigned_by').references(() => user.id), // Null berarti oleh sistem
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
}, (t) => [
  { pk: { columns: [t.userId, t.roleId] } }
]);

// RBAC: Role Permissions (Many-to-Many)
export const rolePermissions = pgTable('role_permissions', {
  roleId: text('role_id').notNull().references(() => roles.id),
  permissionId: text('permission_id').notNull().references(() => permissions.id),
  assignedBy: text('assigned_by').references(() => user.id),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
}, (t) => [
  { pk: { columns: [t.roleId, t.permissionId] } }
]);

// Privacy Consents
export const privacyConsents = pgTable('privacy_consents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  consentType: text('consent_type').notNull(), // e.g. 'TOS', 'PRIVACY_POLICY'
  version: text('version').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  consentedAt: timestamp('consented_at').defaultNow().notNull(),
});

// Konten: Instructors
export const instructors = pgTable('instructors', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  bio: text('bio'),
  status: text('status').default('active').notNull(), // 'active', 'inactive'
  createdBy: text('created_by').references(() => user.id),
  updatedBy: text('updated_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Konten: Programs
export const programs = pgTable('programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('draft').notNull(), // 'draft', 'published', 'archived' dll
  createdBy: text('created_by').references(() => user.id),
  updatedBy: text('updated_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Konten: Series
export const series = pgTable('series', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: uuid('program_id').notNull().references(() => programs.id),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  sequence: integer('sequence').notNull(),
  status: text('status').default('draft').notNull(),
  createdBy: text('created_by').references(() => user.id),
  updatedBy: text('updated_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Konten: Books
export const books = pgTable('books', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  author: text('author'),
  description: text('description'),
  status: text('status').default('draft').notNull(),
  createdBy: text('created_by').references(() => user.id),
  updatedBy: text('updated_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Konten: Series Books (Many-to-Many)
export const seriesBooks = pgTable('series_books', {
  seriesId: uuid('series_id').notNull().references(() => series.id),
  bookId: uuid('book_id').notNull().references(() => books.id),
  sequence: integer('sequence').notNull(),
}, (t) => [
  { pk: { columns: [t.seriesId, t.bookId] } }
]);

// Konten: Chapters
export const chapters = pgTable('chapters', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookId: uuid('book_id').notNull().references(() => books.id),
  title: text('title').notNull(),
  sequence: integer('sequence').notNull(),
  createdBy: text('created_by').references(() => user.id),
  updatedBy: text('updated_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Lokasi Majelis (Venues)
export const venues = pgTable('venues', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  district: text('district'),
  city: text('city').notNull(),
  province: text('province'),
  postalCode: text('postal_code'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  googleMapsUrl: text('google_maps_url'),
  description: text('description'),
  capacity: text('capacity'),
  phone: text('phone'),
  image: text('image'),
  status: text('status').default('active').notNull(), // 'active', 'inactive'
  createdBy: text('created_by').references(() => user.id),
  updatedBy: text('updated_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Jadwal Kajian (Schedules)
export const schedules = pgTable('schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: uuid('program_id').references(() => programs.id),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  title: text('title').notNull(),
  speaker: text('speaker').notNull(),
  category: text('category'), // e.g. 'Fiqih', 'Aqidah', 'Akhlaq', 'Tematik'
  type: text('type').default('Rutin').notNull(), // 'Rutin', 'Tematik', 'Special'
  day: text('day').notNull(), // e.g. 'Sabtu', 'Minggu'
  date: text('date').notNull(), // format YYYY-MM-DD or readable string
  startTime: text('start_time'), // e.g. '09:00'
  endTime: text('end_time'), // e.g. '11:30'
  timezone: text('timezone').default('Asia/Jakarta').notNull(), // WIB
  status: text('status').default('Rutin').notNull(), // 'Rutin', 'Dibatalkan', 'Diundur', 'Pindah Lokasi'
  statusReason: text('status_reason'), // Catatan jika dibatalkan/diundur/pindah
  isLiveStream: boolean('is_live_stream').default(false).notNull(),
  streamUrl: text('stream_url'),
  createdBy: text('created_by').references(() => user.id),
  updatedBy: text('updated_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Pembelajaran: Lessons
export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: uuid('program_id').references(() => programs.id),
  chapterId: uuid('chapter_id').references(() => chapters.id),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  sequence: integer('sequence').notNull(),
  date: text('date'), // YYYY-MM-DD
  description: text('description'),
  status: text('status').default('draft').notNull(), // 'draft', 'published'
  createdBy: text('created_by').references(() => user.id),
  updatedBy: text('updated_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Pembelajaran: Lesson Videos
export const lessonVideos = pgTable('lesson_videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id),
  youtubeId: text('youtube_id').notNull(),
  duration: text('duration'), // e.g. '01:30:00'
  status: text('status').default('active').notNull(), // 'active', 'unavailable'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Pembelajaran: Lesson Markers (Timestamp/Chapters)
export const lessonMarkers = pgTable('lesson_markers', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => lessonVideos.id),
  timestamp: integer('timestamp').notNull(), // dalam detik
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Pembelajaran: Lesson Attachments
export const lessonAttachments = pgTable('lesson_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id),
  filename: text('filename').notNull(),
  url: text('url').notNull(), // URL external atau storage
  type: text('type').default('PDF').notNull(), // 'PDF', 'DOCX', dll
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Peserta: Enrollments (Pendaftaran Program Kajian)
export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  programId: uuid('program_id').notNull().references(() => programs.id),
  status: text('status').default('active').notNull(), // 'active', 'completed', 'dropped'
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (t) => [
  { uniqueUserProgram: { columns: [t.userId, t.programId] } }
]);

// Peserta: Lesson Progress (Progres Setiap Pelajaran)
export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id),
  lastPositionSeconds: integer('last_position_seconds').default(0).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  { uniqueUserLessonProgress: { columns: [t.userId, t.lessonId] } }
]);

// Peserta: User Notes (Catatan Privat Peserta)
export const userNotes = pgTable('user_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id),
  timestampSeconds: integer('timestamp_seconds'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Peserta: Bookmarks (Markah Buku Privat)
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  resourceType: text('resource_type').notNull(), // 'program', 'lesson'
  resourceId: text('resource_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  { uniqueUserBookmark: { columns: [t.userId, t.resourceType, t.resourceId] } }
]);

// ----------------------------------------------------
// QUIZ & ASSESSMENTS
// ----------------------------------------------------

export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id),
  title: text('title').notNull(),
  description: text('description'),
  passingScore: integer('passing_score').default(70).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id),
  type: text('type').notNull(), // 'single_choice' | 'true_false'
  text: text('text').notNull(),
  explanation: text('explanation'),
  points: integer('points').default(10).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questionOptions = pgTable('question_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  text: text('text').notNull(),
  isCorrect: boolean('is_correct').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id),
  userId: text('user_id').notNull().references(() => user.id),
  status: text('status').default('in_progress').notNull(), // 'in_progress', 'submitted'
  score: integer('score'),
  passed: boolean('passed'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
});

export const quizAnswers = pgTable('quiz_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').notNull().references(() => quizAttempts.id),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  optionId: uuid('option_id').references(() => questionOptions.id), // Can be null if unanswered
  isCorrectSnapshot: boolean('is_correct_snapshot'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
