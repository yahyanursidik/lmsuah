
import { useParams, Link } from 'react-router-dom';
import { useOne, useList, useGetIdentity } from '@refinedev/core';
import { BookOpen, CheckCircle2, ChevronRight, Play } from 'lucide-react';
import { getProgramProgress, getUserLessonProgress } from '@/lib/userStore';

export function ParticipantProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id || 'demo-peserta-1';

  const { query: programQuery, result: program } = useOne({
    resource: 'programs',
    id: id || '',
    queryOptions: { enabled: !!id },
  });

  const { query: lessonsQuery, result: lessons } = useList({
    resource: 'lessons',
    pagination: { mode: 'off' },
    filters: [{ field: 'programId', operator: 'eq', value: id }],
    sorters: [{ field: 'sequence', order: 'asc' }],
    queryOptions: { enabled: !!id },
  });

  const programLessons = (lessons?.data || []) as any[];
  const progress = getUserLessonProgress(userId);
  const info = getProgramProgress(userId, programLessons);

  if (programQuery.isLoading || lessonsQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-stone-200 motion-reduce:animate-none" />;
  }

  if (!program) {
    return <div className="py-12 text-center"><p className="text-sm font-semibold text-slate-700">Program tidak ditemukan.</p></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="mb-4 text-sm font-semibold text-slate-500">
        <Link to="/belajar" className="hover:text-emerald-700">Kajian Saya</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{program.title}</span>
      </div>

      <header className="rounded-2xl bg-white p-6 border border-stone-200 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">{program.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{program.description || 'Deskripsi program belum tersedia.'}</p>
        
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Progres Belajar</span>
            <span className="font-bold text-slate-900">{info.completedCount} dari {info.totalCount} pertemuan selesai ({info.percentage}%)</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-emerald-700" style={{ width: `${info.percentage}%` }} />
          </div>
        </div>
      </header>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-950">Daftar Pertemuan</h2>
        </div>
        
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {programLessons.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {programLessons.map((lesson) => {
                const itemProgress = progress.find((entry) => entry.lessonId === lesson.id);
                const isCompleted = itemProgress?.isCompleted;
                const hasStarted = itemProgress && itemProgress.lastPositionSeconds > 0;
                
                return (
                  <li key={lesson.id}>
                    <Link
                      to={`/belajar/lesson/${lesson.id}`}
                      className="flex items-center justify-between gap-4 p-4 hover:bg-stone-50 focus-visible:outline-none focus-visible:bg-stone-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isCompleted ? 'bg-emerald-50 text-emerald-800' : hasStarted ? 'bg-amber-50 text-amber-600' : 'bg-stone-100 text-slate-500'} group-hover:bg-emerald-50 group-hover:text-emerald-800`}>
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : hasStarted ? <Play className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">
                            Pertemuan {lesson.sequence}: {lesson.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {lesson.description || 'Pilih untuk melihat materi dan kuis'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`hidden sm:block text-xs font-semibold ${isCompleted ? 'text-emerald-700' : hasStarted ? 'text-amber-600' : 'text-slate-500'}`}>
                          {isCompleted ? 'Selesai' : hasStarted ? 'Berjalan' : 'Belum mulai'}
                        </span>
                        <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-10 text-center text-sm text-slate-500">
              <BookOpen className="mx-auto h-7 w-7 mb-3 text-slate-300" />
              Belum ada pertemuan untuk program ini.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
