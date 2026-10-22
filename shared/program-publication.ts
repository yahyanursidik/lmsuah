export interface PublicationProgram {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImage?: string | null;
  category?: string;
  instructor?: string;
  bookTitle?: string;
  author?: string;
  routineSchedule?: string;
  venueName?: string;
}
export interface PublicationQuiz {
  id: string;
  lessonId: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number;
  isPublished: boolean;
  questions: Array<{ id: string; text: string; type: string; points: number; explanation: string | null; options: Array<{ id: string; questionId: string; text: string; isCorrect: boolean }> }>;
}
export interface PublicationLesson {
  id: string;
  programId: string;
  chapterId: string | null;
  slug: string;
  title: string;
  sequence: number;
  date: string | null;
  description: string | null;
  status: 'published';
  materials: Array<{ id: string; type: string; url: string; filename?: string; duration?: string | null; isDownloadable?: boolean }>;
  markers: Array<{ id: string; videoId: string; timestamp: number; title: string; description: string | null }>;
  quiz: PublicationQuiz | null;
}
/** Immutable private snapshot. Always project to a reader DTO before responding. */
export interface ProgramPublicationSnapshot {
  schemaVersion: 1;
  program: PublicationProgram;
  chapters: Array<{ id: string; programId: string | null; bookId: string | null; title: string; sequence: number }>;
  series: Array<{ id: string; programId: string; slug: string; title: string; description: string | null; sequence: number; status: string; books: Array<{ id: string; title: string; slug: string; author: string | null; status: string }> }>;
  lessons: PublicationLesson[];
}
