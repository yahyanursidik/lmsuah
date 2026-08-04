import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOne, useGetIdentity } from '@refinedev/core';
import { Bookmark, CheckCircle2, PlayCircle, BookOpen, UserCheck, PlusCircle } from 'lucide-react';
import { MOCK_PROGRAMS, Program } from '../../mock/publicData';
import { SEOHead } from '../../components/public/SEOHead';
import { EmptyState, LoadingSkeleton, ErrorAlert } from '../../components/public/UIStates';
import {
  isEnrolled,
  toggleEnrollment,
  isBookmarked,
  toggleBookmark,
  getProgramProgress,
  getUserLessonProgress,
} from '../../lib/userStore';

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: identity } = useGetIdentity<{ id: string; name: string }>();
  const userId = identity?.id || 'demo-peserta-1'; // Fallback for interactive demo

  const { query: oneQuery, result: refineProgram } = useOne<Program>({
    resource: 'programs',
    id: id || '',
    queryOptions: {
      enabled: !!id,
    },
  });

  const mockItem = MOCK_PROGRAMS.find((p) => p.id === id);
  const displayProgram: Program | undefined = refineProgram || mockItem;
  const isLoading = oneQuery.isLoading;
  const isError = oneQuery.isError;
  const refetch = oneQuery.refetch;

  const [enrolled, setEnrolled] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [progressInfo, setProgressInfo] = useState({ completedCount: 0, totalCount: 0, percentage: 0 });

  useEffect(() => {
    if (displayProgram?.id && userId) {
      setEnrolled(isEnrolled(userId, displayProgram.id));
      setBookmarked(isBookmarked(userId, 'program', displayProgram.id));
      if (displayProgram.lessons) {
        setProgressInfo(getProgramProgress(userId, displayProgram.lessons));
      }
    }
  }, [displayProgram?.id, userId]);

  const handleEnrollToggle = () => {
    if (!displayProgram?.id) return;
    const newState = toggleEnrollment(userId, displayProgram.id);
    setEnrolled(newState);
  };

  const handleBookmarkToggle = () => {
    if (!displayProgram?.id) return;
    const newState = toggleBookmark(userId, 'program', displayProgram.id);
    setBookmarked(newState);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 space-y-8">
        <SEOHead title="Memuat Detail Program..." />
        <LoadingSkeleton count={1} />
      </div>
    );
  }

  if (isError && !displayProgram) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <SEOHead title="Gagal Memuat Program" />
        <ErrorAlert
          message="Gagal memuat detail program dari server."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!displayProgram) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <SEOHead title="Program Tidak Ditemukan" />
        <EmptyState
          title="Program Tidak Ditemukan"
          description="Maaf, program kajian yang Anda cari tidak ada dalam direktori kami."
          actionText="Kembali ke Daftar Program"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  const lessons = displayProgram.lessons || [];
  const userProgressList = getUserLessonProgress(userId);

  return (
    <div className="space-y-12 pb-16">
      <SEOHead
        title={displayProgram.title}
        description={displayProgram.description}
      />

      {/* Program Header */}
      <section className="bg-stone-900 text-white py-12 sm:py-16 border-b border-stone-800">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-emerald-800 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {displayProgram.category || 'Kajian'}
                </span>
                <span className="rounded-md bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-300">
                  {displayProgram.status || 'Berlangsung'}
                </span>
                {enrolled && (
                  <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300 flex items-center gap-1">
                    <UserCheck size={14} /> Terdaftar di Kajian Saya
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl text-stone-100 leading-tight">
                  {displayProgram.title}
                </h1>
                <button
                  type="button"
                  onClick={handleBookmarkToggle}
                  className={`p-3 rounded-2xl border transition-all ${
                    bookmarked
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                  }`}
                  title={bookmarked ? 'Hapus Bookmark' : 'Simpan Bookmark'}
                >
                  <Bookmark size={20} className={bookmarked ? 'fill-black' : ''} />
                </button>
              </div>

              <p className="text-emerald-300 font-medium text-lg">{displayProgram.subtitle || ''}</p>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                {displayProgram.description}
              </p>

              {/* Progress bar if enrolled */}
              {enrolled && lessons.length > 0 && (
                <div className="rounded-2xl bg-stone-800/80 p-4 border border-stone-700 space-y-2 max-w-xl">
                  <div className="flex justify-between text-xs font-semibold text-stone-300">
                    <span>Progres Belajar Anda</span>
                    <span className="text-amber-400 font-bold">
                      {progressInfo.completedCount} / {lessons.length} Pertemuan ({progressInfo.percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-stone-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${progressInfo.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap gap-4 items-center">
                <button
                  type="button"
                  onClick={handleEnrollToggle}
                  className={`rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition-all min-h-[44px] flex items-center gap-2 ${
                    enrolled
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {enrolled ? (
                    <>
                      <UserCheck size={18} />
                      <span>Terdaftar (Klik untuk Batal)</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle size={18} />
                      <span>Ikuti Kajian Ini</span>
                    </>
                  )}
                </button>

                {lessons.length > 0 && lessons[0] && (
                  <Link
                    to={`/lesson/${lessons[0].id}`}
                    className="rounded-xl border border-stone-700 bg-stone-800 px-6 py-3 text-sm font-semibold text-stone-200 hover:bg-stone-700 transition-all min-h-[44px] flex items-center gap-2"
                  >
                    <PlayCircle size={18} className="text-emerald-400" />
                    <span>{enrolled ? 'Lanjutkan Belajar' : 'Mulai Simak Lesson #1'}</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-stone-700 bg-stone-800/90 p-6 space-y-4 shadow-xl">
                <h3 className="font-bold text-stone-100 text-sm border-b border-stone-700 pb-2 flex items-center gap-2">
                  <BookOpen size={16} className="text-emerald-400" /> Informasi Program
                </h3>
                <div className="space-y-3 text-xs text-stone-300">
                  <div>
                    <span className="block text-stone-400">Pemateri:</span>
                    <span className="font-bold text-stone-100 text-sm">{displayProgram.instructor || 'Ustadz Abu Haidar As-Sundawy'}</span>
                  </div>
                  <div>
                    <span className="block text-stone-400">Kitab Rujukan:</span>
                    <span className="font-bold text-stone-100">{displayProgram.bookTitle || '-'}</span>
                    {displayProgram.author && <span className="block text-stone-400 text-[11px]">Karya: {displayProgram.author}</span>}
                  </div>
                  <div>
                    <span className="block text-stone-400">Jadwal Rutin:</span>
                    <span className="font-semibold text-emerald-400">{displayProgram.routineSchedule || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-stone-400">Lokasi Majelis:</span>
                    <span className="font-semibold text-stone-200">{displayProgram.venueName || 'Masjid Umar bin Khattab'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum / Lessons List */}
      <section id="curriculum" className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="border-b border-stone-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-900">Daftar Rekaman & Materi Pertemuan</h2>
          <p className="text-sm text-slate-600 mt-1">Daftar pertemuan yang telah terselenggara dan dipublikasikan.</p>
        </div>

        {lessons.length === 0 ? (
          <EmptyState
            title="Belum Ada Rekaman Pertemuan"
            description="Pertemuan untuk program ini sedang disiapkan dan akan diunggah segera."
          />
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson) => {
              const isComp = userProgressList.some((p) => p.lessonId === lesson.id && p.isCompleted);
              return (
                <div
                  key={lesson.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border p-5 shadow-xs gap-4 transition-all ${
                    isComp ? 'border-emerald-500/40 bg-emerald-50/30' : 'border-stone-200 bg-white hover:border-emerald-900/30'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 font-bold text-slate-800">
                        Pertemuan #{lesson.meetingNumber}
                      </span>
                      <span>• {lesson.date}</span>
                      <span>• {lesson.duration}</span>
                      {isComp && (
                        <span className="rounded-md bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Selesai
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{lesson.title}</h3>
                    <p className="text-xs text-slate-600">{lesson.summary}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/lesson/${lesson.id}`}
                      className="rounded-xl bg-emerald-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-950 transition-colors min-h-[44px] flex items-center gap-2"
                    >
                      <PlayCircle size={16} />
                      <span>{isComp ? 'Simak Ulang' : 'Buka Pertemuan'}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
