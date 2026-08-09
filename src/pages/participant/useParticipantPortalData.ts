import { useList } from '@refinedev/core';
import { MOCK_PROGRAMS, MOCK_SCHEDULES, MOCK_VENUES } from '@/mock/publicData';

export interface PortalProgram {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  instructor?: string;
  coverImage?: string;
}

export interface PortalLesson {
  id: string;
  programId?: string;
  title: string;
  sequence: number;
  status: 'draft' | 'published';
  date?: string;
  description?: string;
  materialCount?: number;
  hasQuiz?: boolean;
}

export interface PortalSchedule {
  id: string;
  programId?: string;
  title: string;
  speaker?: string;
  type?: 'Rutin' | 'Tematik' | 'Special';
  category?: string;
  day: string;
  date: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  timezone?: string;
  status?: 'Rutin' | 'Dibatalkan' | 'Diundur' | 'Pindah Lokasi';
  statusReason?: string;
  venueId?: string;
  venueName?: string;
  isLiveStream?: boolean;
  streamUrl?: string;
}

export interface PortalVenue {
  id: string;
  slug?: string;
  name: string;
  address?: string;
  city?: string;
  district?: string;
  googleMapsUrl?: string;
  status?: 'active' | 'inactive';
}

const fallbackPrograms: PortalProgram[] = MOCK_PROGRAMS.map((program) => ({
  id: program.id,
  slug: program.id,
  title: program.title,
  description: program.description,
  status: 'published',
  instructor: program.instructor,
  coverImage: program.coverImage,
}));

const fallbackLessons: PortalLesson[] = MOCK_PROGRAMS.flatMap((program) =>
  program.lessons.map((lesson) => ({
    id: lesson.id,
    programId: program.id,
    title: lesson.title,
    sequence: lesson.meetingNumber,
    status: 'published' as const,
    date: lesson.date,
    description: lesson.summary,
    materialCount: 1 + (lesson.pdfUrl ? 1 : 0),
    hasQuiz: false,
  })),
);

const fallbackSchedules: PortalSchedule[] = MOCK_SCHEDULES.map((schedule) => ({ ...schedule }));
const fallbackVenues: PortalVenue[] = MOCK_VENUES.map((venue) => ({ ...venue, status: 'active' }));

export function useParticipantPortalData() {
  const programsQuery = useList<PortalProgram>({
    resource: 'programs',
    filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    sorters: [{ field: 'updatedAt', order: 'desc' }],
    pagination: { mode: 'off' },
  });
  const lessonsQuery = useList<PortalLesson>({
    resource: 'lessons',
    filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    sorters: [{ field: 'sequence', order: 'asc' }],
    pagination: { mode: 'off' },
  });
  const schedulesQuery = useList<PortalSchedule>({
    resource: 'schedules',
    sorters: [{ field: 'date', order: 'asc' }],
    pagination: { mode: 'off' },
  });
  const venuesQuery = useList<PortalVenue>({
    resource: 'venues',
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    pagination: { mode: 'off' },
  });

  const apiPrograms = programsQuery.result.data || [];
  const apiLessons = lessonsQuery.result.data || [];
  const apiSchedules = schedulesQuery.result.data || [];
  const apiVenues = venuesQuery.result.data || [];

  const isProgramsReady = programsQuery.query.isFetched || apiPrograms.length > 0;
  const isLessonsReady = lessonsQuery.query.isFetched || apiLessons.length > 0;
  const isSchedulesReady = schedulesQuery.query.isFetched || apiSchedules.length > 0;
  const isVenuesReady = venuesQuery.query.isFetched || apiVenues.length > 0;

  const programs = isProgramsReady ? apiPrograms : (programsQuery.query.isError ? fallbackPrograms : []);
  const lessons = isLessonsReady ? apiLessons : (lessonsQuery.query.isError ? fallbackLessons : []);
  const venues = isVenuesReady ? apiVenues : (venuesQuery.query.isError ? fallbackVenues : []);
  const rawSchedules = isSchedulesReady ? apiSchedules : (schedulesQuery.query.isError ? fallbackSchedules : []);

  const schedules = rawSchedules.map((schedule) => ({
    ...schedule,
    venueName: schedule.venueName || venues.find((venue) => venue.id === schedule.venueId)?.name,
  }));

  return {
    programs: programs.length > 0 ? programs : (programsQuery.query.isLoading ? [] : fallbackPrograms),
    lessons: lessons.length > 0 ? lessons : (lessonsQuery.query.isLoading ? [] : fallbackLessons),
    schedules,
    venues,
    isLoading: programsQuery.query.isLoading || lessonsQuery.query.isLoading || schedulesQuery.query.isLoading || venuesQuery.query.isLoading,
    isFallback: isProgramsReady && apiPrograms.length === 0,
    isError: programsQuery.query.isError || lessonsQuery.query.isError || schedulesQuery.query.isError || venuesQuery.query.isError,
    refetch: () => void Promise.all([
      programsQuery.query.refetch(),
      lessonsQuery.query.refetch(),
      schedulesQuery.query.refetch(),
      venuesQuery.query.refetch(),
    ]),
  };
}

export function getLessonsForProgram(lessons: PortalLesson[], programId: string) {
  return lessons.filter((lesson) => lesson.programId === programId).sort((a, b) => a.sequence - b.sequence);
}
