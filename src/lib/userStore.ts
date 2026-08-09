import { EnrollmentItem, LessonProgressItem, UserNoteItem, BookmarkItem } from '../types';

const ENROLLMENTS_KEY = 'uah_lms_enrollments';
const LESSON_PROGRESS_KEY = 'uah_lms_lesson_progress';
const USER_NOTES_KEY = 'uah_lms_user_notes';
const BOOKMARKS_KEY = 'uah_lms_bookmarks';

// Safe localStorage getters/setters
function getItem<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
    return defaultVal;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setItem<T>(key: string, val: T): void {
  if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore storage errors
  }
}

// ----------------------------------------------------
// 1. ENROLLMENTS (Ikuti Kajian)
// ----------------------------------------------------
export function getUserEnrollments(userId: string): EnrollmentItem[] {
  if (!userId) return [];
  const all = getItem<EnrollmentItem[]>(ENROLLMENTS_KEY, [
    // Pre-enrolled demo data for demo participant
    {
      id: 'enr-1',
      userId: 'demo-peserta-1',
      programId: 'syarah-kitab-at-tauhid-sample',
      status: 'active',
      enrolledAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'enr-2',
      userId: 'demo-peserta-1',
      programId: 'kitab-tauhid',
      status: 'active',
      enrolledAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ]);
  return all.filter((e) => e.userId === userId);
}

export function isEnrolled(userId: string, programId: string): boolean {
  if (!userId || !programId) return false;
  const enrollments = getUserEnrollments(userId);
  return enrollments.some((e) => e.programId === programId && e.status === 'active');
}

export function toggleEnrollment(userId: string, programId: string): boolean {
  if (!userId || !programId) return false;
  const all = getItem<EnrollmentItem[]>(ENROLLMENTS_KEY, []);
  const index = all.findIndex((e) => e.userId === userId && e.programId === programId);

  if (index >= 0) {
    // Unenroll / drop
    all.splice(index, 1);
    setItem(ENROLLMENTS_KEY, all);
    return false;
  } else {
    // Enroll
    const newEnr: EnrollmentItem = {
      id: `enr-${Date.now()}`,
      userId,
      programId,
      status: 'active',
      enrolledAt: new Date().toISOString(),
    };
    all.push(newEnr);
    setItem(ENROLLMENTS_KEY, all);
    return true;
  }
}

// ----------------------------------------------------
// 2. LESSON PROGRESS (Progres Pertemuan)
// ----------------------------------------------------
export function getUserLessonProgress(userId: string): LessonProgressItem[] {
  if (!userId) return [];
  const all = getItem<LessonProgressItem[]>(LESSON_PROGRESS_KEY, [
    // Initial demo progress
    {
      id: 'prog-1',
      userId: 'demo-peserta-1',
      lessonId: 'les-lum-1',
      lastPositionSeconds: 450,
      isCompleted: true,
      completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ]);
  return all.filter((p) => p.userId === userId);
}

export function getSingleLessonProgress(userId: string, lessonId: string): LessonProgressItem | undefined {
  if (!userId || !lessonId) return undefined;
  const all = getUserLessonProgress(userId);
  return all.find((p) => p.lessonId === lessonId);
}

export function saveLastPosition(userId: string, lessonId: string, seconds: number): void {
  if (!userId || !lessonId) return;
  const all = getItem<LessonProgressItem[]>(LESSON_PROGRESS_KEY, []);
  const index = all.findIndex((p) => p.userId === userId && p.lessonId === lessonId);

  if (index >= 0 && all[index]) {
    const existing = all[index]!;
    all[index] = {
      id: existing.id,
      userId: existing.userId,
      lessonId: existing.lessonId,
      isCompleted: existing.isCompleted,
      completedAt: existing.completedAt,
      lastPositionSeconds: Math.max(0, Math.floor(seconds)),
      updatedAt: new Date().toISOString(),
    };
  } else {
    all.push({
      id: `lp-${Date.now()}`,
      userId,
      lessonId,
      lastPositionSeconds: Math.max(0, Math.floor(seconds)),
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    });
  }
  setItem(LESSON_PROGRESS_KEY, all);
}

export function toggleLessonCompletion(userId: string, lessonId: string): boolean {
  if (!userId || !lessonId) return false;
  const all = getItem<LessonProgressItem[]>(LESSON_PROGRESS_KEY, []);
  const index = all.findIndex((p) => p.userId === userId && p.lessonId === lessonId);

  let newState = true;
  if (index >= 0 && all[index]) {
    const existing = all[index]!;
    newState = !existing.isCompleted;
    all[index] = {
      id: existing.id,
      userId: existing.userId,
      lessonId: existing.lessonId,
      lastPositionSeconds: existing.lastPositionSeconds,
      isCompleted: newState,
      completedAt: newState ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
  } else {
    all.push({
      id: `lp-${Date.now()}`,
      userId,
      lessonId,
      lastPositionSeconds: 0,
      isCompleted: true,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  setItem(LESSON_PROGRESS_KEY, all);
  return newState;
}

export function getProgramProgress(
  userId: string,
  programLessons: { id: string }[]
): { completedCount: number; totalCount: number; percentage: number } {
  if (!userId || !programLessons || programLessons.length === 0) {
    return { completedCount: 0, totalCount: 0, percentage: 0 };
  }

  const userProg = getUserLessonProgress(userId);
  const completedCount = programLessons.filter((les) =>
    userProg.some((p) => p.lessonId === les.id && p.isCompleted)
  ).length;

  const totalCount = programLessons.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return { completedCount, totalCount, percentage };
}

// ----------------------------------------------------
// 3. USER NOTES (Catatan Privat Peserta)
// ----------------------------------------------------
export function getUserNotes(userId: string, lessonId?: string): UserNoteItem[] {
  if (!userId) return [];
  const all = getItem<UserNoteItem[]>(USER_NOTES_KEY, [
    {
      id: 'note-1',
      userId: 'demo-peserta-1',
      lessonId: 'les-lum-1',
      timestampSeconds: 180,
      content: 'Penjelasan mengenai pentingnya memahami asma wa sifat Allah tanpa ta\'thil dan tamtsil.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);
  const userFiltered = all.filter((n) => n.userId === userId);
  if (lessonId) {
    return userFiltered.filter((n) => n.lessonId === lessonId);
  }
  return userFiltered;
}

export function addNote(
  userId: string,
  lessonId: string,
  content: string,
  timestampSeconds?: number | null
): UserNoteItem {
  const all = getItem<UserNoteItem[]>(USER_NOTES_KEY, []);
  const newNote: UserNoteItem = {
    id: `note-${Date.now()}`,
    userId,
    lessonId,
    timestampSeconds: timestampSeconds ?? null,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(newNote);
  setItem(USER_NOTES_KEY, all);
  return newNote;
}

export function deleteNote(userId: string, noteId: string): void {
  const all = getItem<UserNoteItem[]>(USER_NOTES_KEY, []);
  const filtered = all.filter((n) => !(n.id === noteId && n.userId === userId));
  setItem(USER_NOTES_KEY, filtered);
}

// ----------------------------------------------------
// 4. BOOKMARKS (Markah Buku Privat)
// ----------------------------------------------------
export function getUserBookmarks(userId: string, resourceType?: 'program' | 'lesson'): BookmarkItem[] {
  if (!userId) return [];
  const all = getItem<BookmarkItem[]>(BOOKMARKS_KEY, [
    {
      id: 'bm-1',
      userId: 'demo-peserta-1',
      resourceType: 'program',
      resourceId: 'prog-aqidah-lum-at',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ]);
  const userFiltered = all.filter((b) => b.userId === userId);
  if (resourceType) {
    return userFiltered.filter((b) => b.resourceType === resourceType);
  }
  return userFiltered;
}

export function isBookmarked(userId: string, resourceType: 'program' | 'lesson', resourceId: string): boolean {
  if (!userId || !resourceId) return false;
  const userBookmarks = getUserBookmarks(userId, resourceType);
  return userBookmarks.some((b) => b.resourceId === resourceId);
}

export function toggleBookmark(userId: string, resourceType: 'program' | 'lesson', resourceId: string): boolean {
  if (!userId || !resourceId) return false;
  const all = getItem<BookmarkItem[]>(BOOKMARKS_KEY, []);
  const index = all.findIndex((b) => b.userId === userId && b.resourceType === resourceType && b.resourceId === resourceId);

  if (index >= 0) {
    all.splice(index, 1);
    setItem(BOOKMARKS_KEY, all);
    return false;
  } else {
    all.push({
      id: `bm-${Date.now()}`,
      userId,
      resourceType,
      resourceId,
      createdAt: new Date().toISOString(),
    });
    setItem(BOOKMARKS_KEY, all);
    return true;
  }
}

// ----------------------------------------------------
// 5. REGISTERED PARTICIPANTS STORE (Manajemen & Pendaftaran Peserta)
// ----------------------------------------------------
const REGISTERED_USERS_KEY = 'uah_lms_registered_participants';

export interface ParticipantUserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'participant' | 'admin';
  createdAt: string;
  password?: string;
  status?: 'active' | 'inactive';
}

const INITIAL_DEMO_USERS: ParticipantUserRecord[] = [
  {
    id: 'demo-peserta-1',
    name: 'Jamaah Penuntut Ilmu',
    email: 'peserta@abutaidar.id',
    phone: '081234567890',
    role: 'participant',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    status: 'active',
  },
  {
    id: 'demo-admin-1',
    name: 'Administrator UAH',
    email: 'admin@abutaidar.id',
    phone: '081987654321',
    role: 'admin',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    status: 'active',
  },
];

export function getRegisteredParticipants(): ParticipantUserRecord[] {
  return getItem<ParticipantUserRecord[]>(REGISTERED_USERS_KEY, INITIAL_DEMO_USERS);
}

export function registerParticipant(data: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}): { success: boolean; user?: ParticipantUserRecord; message?: string } {
  const normalizedEmail = data.email.trim().toLowerCase();
  const all = getRegisteredParticipants();

  if (all.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return {
      success: false,
      message: 'Email sudah terdaftar. Silakan gunakan email lain atau langsung masuk.',
    };
  }

  const newUser: ParticipantUserRecord = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name.trim(),
    email: normalizedEmail,
    phone: data.phone?.trim() || '',
    role: 'participant',
    createdAt: new Date().toISOString(),
    password: data.password || '12345678',
    status: 'active',
  };

  all.push(newUser);
  setItem(REGISTERED_USERS_KEY, all);

  return {
    success: true,
    user: newUser,
    message: 'Pendaftaran berhasil.',
  };
}

export function addParticipantManual(data: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}): { success: boolean; user?: ParticipantUserRecord; message?: string } {
  return registerParticipant(data);
}

export function importParticipantsBatch(
  items: Array<{ name: string; email: string; phone?: string; password?: string }>
): { inserted: number; failed: number; errors: Array<{ email: string; reason: string }> } {
  const all = getRegisteredParticipants();
  let inserted = 0;
  let failed = 0;
  const errors: Array<{ email: string; reason: string }> = [];

  for (const item of items) {
    const emailNorm = item.email.trim().toLowerCase();
    if (all.some((u) => u.email.toLowerCase() === emailNorm)) {
      failed++;
      errors.push({ email: emailNorm, reason: 'Email sudah terdaftar' });
      continue;
    }

    const newUser: ParticipantUserRecord = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: item.name.trim(),
      email: emailNorm,
      phone: item.phone?.trim() || '',
      role: 'participant',
      createdAt: new Date().toISOString(),
      password: item.password || '12345678',
      status: 'active',
    };

    all.push(newUser);
    inserted++;
  }

  setItem(REGISTERED_USERS_KEY, all);

  return { inserted, failed, errors };
}

export function resetParticipantPassword(userId: string, newPassword: string): boolean {
  const all = getRegisteredParticipants();
  const target = all.find((u) => u.id === userId);
  if (!target) return false;

  target.password = newPassword;
  setItem(REGISTERED_USERS_KEY, all);
  return true;
}

export function updateParticipantProfile(
  userId: string,
  data: { name?: string; email?: string; phone?: string; status?: 'active' | 'inactive' }
): boolean {
  const all = getRegisteredParticipants();
  const target = all.find((u) => u.id === userId);
  if (!target) return false;

  if (data.name) target.name = data.name.trim();
  if (data.email) target.email = data.email.trim().toLowerCase();
  if (data.phone !== undefined) target.phone = data.phone.trim();
  if (data.status) target.status = data.status;

  setItem(REGISTERED_USERS_KEY, all);
  return true;
}

