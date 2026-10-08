import { useList } from '@refinedev/core';

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

const portalQueryOptions = { staleTime: 30_000, retry: 1 };

export function useParticipantPortalData() {
  const programsQuery = useList<PortalProgram>({
    resource: 'programs',
    filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    sorters: [{ field: 'updatedAt', order: 'desc' }],
    pagination: { mode: 'off' },
    queryOptions: portalQueryOptions,
  });
  const lessonsQuery = useList<PortalLesson>({
    resource: 'lessons',
    filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    sorters: [{ field: 'sequence', order: 'asc' }],
    pagination: { mode: 'off' },
    queryOptions: portalQueryOptions,
  });
  const schedulesQuery = useList<PortalSchedule>({
    resource: 'schedules',
    sorters: [{ field: 'date', order: 'asc' }],
    pagination: { mode: 'off' },
    queryOptions: portalQueryOptions,
  });
  const venuesQuery = useList<PortalVenue>({
    resource: 'venues',
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    pagination: { mode: 'off' },
    queryOptions: portalQueryOptions,
  });
  const venues = venuesQuery.result.data || [];
  const schedules = (schedulesQuery.result.data || []).map(schedule => ({
    ...schedule,
    venueName: schedule.venueName || venues.find(venue => venue.id === schedule.venueId)?.name,
  }));
  const queries = [programsQuery, lessonsQuery, schedulesQuery, venuesQuery];
  return {
    programs: programsQuery.result.data || [],
    lessons: lessonsQuery.result.data || [],
    schedules,
    venues,
    isLoading: queries.some(item => item.query.isLoading),
    isProgramsLoading: programsQuery.query.isLoading,
    isLessonsLoading: lessonsQuery.query.isLoading,
    isSchedulesLoading: schedulesQuery.query.isLoading,
    isRefreshing: queries.some(item => item.query.isFetching),
    isFallback: false,
    isError: queries.some(item => item.query.isError),
    programsError: programsQuery.query.isError,
    lessonsError: lessonsQuery.query.isError,
    schedulesError: schedulesQuery.query.isError,
    refetch: () => Promise.all(queries.map(item => item.query.refetch())),
  };
}

export function getLessonsForProgram(lessons: PortalLesson[], programId: string) {
  return lessons.filter((lesson) => lesson.programId === programId).sort((a, b) => a.sequence - b.sequence);
}
