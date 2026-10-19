export interface UserProfile {
  id: string;
  authUserId: string;
  fullName: string;
  email: string;
  role: string;
}

export interface Program {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
}

export interface PublicProgramSummary {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  bookTitle?: string | null;
  coverImage?: string | null;
}

export interface PublicLessonSummary {
  id: string;
  title: string;
  programId?: string | null;
  sequence?: number;
  date?: string | null;
  duration?: string | null;
  description?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  status: 'draft' | 'published';
  imageUrl?: string | null;
  linkUrl?: string | null;
}

export interface EnrollmentItem {
  id: string;
  userId: string;
  programId: string;
  status: 'active' | 'completed' | 'dropped';
  enrolledAt: string;
  completedAt?: string | null;
}

export interface LessonProgressItem {
  id: string;
  userId: string;
  lessonId: string;
  lastPositionSeconds: number;
  isCompleted: boolean;
  completedAt?: string | null;
  updatedAt: string;
}

export interface UserNoteItem {
  id: string;
  userId: string;
  lessonId: string;
  timestampSeconds?: number | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkItem {
  id: string;
  userId: string;
  resourceType: 'program' | 'lesson';
  resourceId: string;
  createdAt: string;
}

