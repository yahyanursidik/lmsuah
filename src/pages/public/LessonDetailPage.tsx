import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOne, useList, useGetIdentity } from '@refinedev/core';
import { SEOHead } from '../../components/public/SEOHead';
import { LoadingSkeleton, ErrorAlert } from '../../components/public/UIStates';
import { QuizComponent } from '../../components/public/QuizComponent';
import { MaterialViewer } from '../../components/material/MaterialViewer';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Video,
  AlertCircle,
  List,
  CheckCircle2,
  Bookmark,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  getSingleLessonProgress,
  saveLastPosition,
  toggleLessonCompletion,
  getUserNotes,
  addNote,
  deleteNote,
  isBookmarked,
  toggleBookmark,
} from '../../lib/userStore';

interface LessonMarker {
  id: string;
  timestamp: number;
  title: string;
  description?: string;
}

interface LessonItem {
  id: string;
  title: string;
  slug: string;
  sequence: number;
  date?: string;
  description?: string;
  status: 'draft' | 'published';
  programId?: string;
  materials?: { id: string; type: string; url: string; filename?: string; duration?: string }[];
  quiz?: { id: string; title: string; description: string; passingScore: number; maxAttempts: number };
  markers?: LessonMarker[];
}

function formatTimestamp(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<{ id: string; name: string }>();
  const userId = identity?.id || 'demo-peserta-1';

  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [isTabActive, setIsTabActive] = useState(0); // 0=Ringkasan, 1=Daftar Isi, 2=Catatan Saya
  const [startAt, setStartAt] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [notes, setNotes] = useState<ReturnType<typeof getUserNotes>>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const { query: lessonQuery, result: lesson } = useOne<LessonItem>({
    resource: 'lessons',
    id: id || '',
    queryOptions: { enabled: !!id },
  });
  const { result: systemSettings } = useOne<{ id: string; allowPdfDownload?: boolean }>({ resource: 'settings', id: 'general' });
  const isLoading = lessonQuery?.isLoading ?? false;
  const isError = lessonQuery?.isError ?? false;
  const refetch = lessonQuery?.refetch ?? (() => {});

  // Load saved lesson progress & notes
  useEffect(() => {
    if (lesson?.id && userId) {
      const prog = getSingleLessonProgress(userId, lesson.id);
      if (prog) {
        setIsCompleted(prog.isCompleted);
        if (prog.lastPositionSeconds > 5) {
          setStartAt(prog.lastPositionSeconds);
        }
      }
      setBookmarked(isBookmarked(userId, 'lesson', lesson.id));
      setNotes(getUserNotes(userId, lesson.id));
    }
  }, [lesson?.id, userId]);

  useEffect(() => {
    const lessonMaterials = lesson?.materials || [];
    if (lessonMaterials.length === 0) {
      setActiveMaterialId(null);
      return;
    }
    const preferred = lessonMaterials.find((material) => material.type === 'youtube') || lessonMaterials[0];
    if (!preferred) return;
    setActiveMaterialId(preferred.id || preferred.url);
  }, [lesson?.id, lesson?.materials]);

  // Track position to save on unmount or marker click
  const mountTimeRef = useRef<number>(Date.now());
  const savedOffsetRef = useRef<number>(startAt);
  useEffect(() => {
    savedOffsetRef.current = startAt;
    mountTimeRef.current = Date.now();
  }, [startAt]);

  useEffect(() => {
    return () => {
      if (lesson?.id && userId) {
        const elapsed = (Date.now() - mountTimeRef.current) / 1000;
        const newPos = savedOffsetRef.current + elapsed;
        saveLastPosition(userId, lesson.id, newPos);
      }
    };
  }, [lesson?.id, userId]);

  // Seek to marker
  const seekTo = useCallback((seconds: number, markerId: string) => {
    setStartAt(seconds);
    setActiveMarker(markerId);
  }, []);

  const handleToggleCompletion = () => {
    if (!lesson?.id || !userId) return;
    const newState = toggleLessonCompletion(userId, lesson.id);
    setIsCompleted(newState);
  };

  const handleToggleBookmark = () => {
    if (!lesson?.id || !userId) return;
    const newState = toggleBookmark(userId, 'lesson', lesson.id);
    setBookmarked(newState);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !lesson?.id || !userId) return;
    addNote(userId, lesson.id, newNoteText, Math.floor(startAt));
    setNewNoteText('');
    setNotes(getUserNotes(userId, lesson.id));
  };

  const handleDeleteNote = (noteId: string) => {
    if (!userId) return;
    deleteNote(userId, noteId);
    if (lesson?.id) {
      setNotes(getUserNotes(userId, lesson.id));
    }
  };

  // Fetch sibling lessons
  const { result: siblingsResult } = useList<LessonItem>({
    resource: 'lessons',
    pagination: { mode: 'off' },
    filters: lesson?.programId ? [{ field: 'programId', operator: 'eq', value: lesson.programId }] : [],
    sorters: [{ field: 'sequence', order: 'asc' }],
    queryOptions: { enabled: !!lesson?.programId },
  });

  const siblings = siblingsResult?.data || [];
  const currentIndex = siblings.findIndex((s: LessonItem) => s.id === lesson?.id);
  const prevLesson = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  // ── Loading / Error / Empty States ──
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12 space-y-6">
        <SEOHead title="Memuat Materi..." />
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (isError && !lesson) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <SEOHead title="Gagal Memuat Materi" />
        <ErrorAlert message="Gagal memuat materi dari server." onRetry={() => refetch()} />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12 text-center">
        <SEOHead title="Materi Tidak Ditemukan" />
        <div className="py-16 space-y-4">
          <div className="text-5xl">📚</div>
          <h1 className="text-2xl font-bold text-slate-900">Materi Tidak Ditemukan</h1>
          <p className="text-slate-600">Materi yang Anda cari tidak tersedia.</p>
          <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-emerald-900 text-white rounded-xl font-semibold">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const materials = lesson.materials || [];
  const youtubeVideo = materials.find(m => m.type === 'youtube');
  const activeMaterial = materials.find((material) => (material.id || material.url) === activeMaterialId) || youtubeVideo || materials[0];
  const markers = lesson.markers || [];
  const video = youtubeVideo ? { youtubeId: youtubeVideo.url.split('v=')[1] || youtubeVideo.url.split('/').pop() || '', duration: youtubeVideo.duration } : null;

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <SEOHead title={lesson.title} description={lesson.description} />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
          <Link to="/programs" className="hover:text-emerald-900 font-medium">Program</Link>
          {lesson.programId && (
            <>
              <span>/</span>
              <Link to={`/programs/${lesson.programId}`} className="hover:text-emerald-900 font-medium">Detail Program</Link>
            </>
          )}
          <span>/</span>
          <span className="text-slate-700 font-semibold truncate max-w-[200px]">{lesson.title}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-slate-800 border border-stone-200">
                Pertemuan #{lesson.sequence}
              </span>
              {lesson.date && (
                <span className="text-xs text-slate-500">📅 {lesson.date}</span>
              )}
              {video?.duration && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={12} />
                  {video.duration}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 leading-tight">
              {lesson.title}
            </h1>
          </div>

          {/* Action Buttons: Mark Complete & Bookmark */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleBookmark}
              aria-label={bookmarked ? 'Hapus bookmark materi' : 'Simpan bookmark materi'}
              className={`p-2.5 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                bookmarked
                  ? 'bg-amber-500 text-black border-amber-400 shadow-xs'
                  : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100'
              }`}
              title={bookmarked ? 'Hapus Bookmark' : 'Simpan Bookmark'}
            >
              <Bookmark size={18} className={bookmarked ? 'fill-black' : ''} />
            </button>

            <button
              type="button"
              onClick={handleToggleCompletion}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                isCompleted
                  ? 'bg-emerald-800 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-slate-700 border-stone-300 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 size={16} className={isCompleted ? 'text-emerald-300' : 'text-stone-400'} />
              <span>{isCompleted ? 'Selesai Disimak' : 'Tandai Selesai'}</span>
            </button>
          </div>
        </div>

        {/* Desktop Layout: Video Left + Markers Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Video Player Column */}
          <div className="lg:col-span-2 space-y-4">

            {/* Primary material viewer */}
            {activeMaterial ? (
              <div ref={viewerRef} className="scroll-mt-24">
                <MaterialViewer material={activeMaterial} startAtSeconds={activeMaterial.type === 'youtube' ? startAt : 0} allowDownload={systemSettings?.allowPdfDownload !== false} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 text-slate-500 py-16 space-y-4">
                <AlertCircle size={48} className="text-slate-400" />
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-slate-700 text-lg">Video Belum Tersedia</h3>
                  <p className="text-sm max-w-xs">
                    Rekaman untuk pertemuan ini sedang diproses atau belum diunggah. Silakan periksa kembali nanti.
                  </p>
                </div>
              </div>
            )}

            {/* Tabs for Summary & Private Notes */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-xs">
              <div className="flex gap-2 overflow-x-auto border-b border-stone-200 pb-2">
                {[
                  { label: 'Ringkasan', icon: BookOpen },
                  { label: `Catatan Saya (${notes.length})`, icon: FileText },
                  { label: 'Daftar Isi Video', icon: List },
                  { label: `Semua Materi (${materials.length})`, icon: Bookmark },
                  ...(lesson.quiz ? [{ label: 'Kuis Evaluasi', icon: AlertCircle }] : []),
                ].map((tab, i) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.label}
                      onClick={() => setIsTabActive(i)}
                      className={`flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                        isTabActive === i
                          ? 'bg-emerald-950 text-emerald-300 font-bold'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab 0: Ringkasan */}
              {isTabActive === 0 && (
                <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                  <p>{lesson.description || 'Belum ada ringkasan tertulis untuk pertemuan ini.'}</p>
                </div>
              )}

              {/* Tab 1: Catatan Privat Peserta */}
              {isTabActive === 1 && (
                <div className="space-y-4">
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Tulis catatan privat Anda untuk materi ini..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 p-3 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-stone-500">
                        🔒 Catatan ini bersifat privat (hanya Anda yang dapat melihat)
                      </span>
                      <button
                        type="submit"
                        className="flex items-center gap-1 bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-950"
                      >
                        <Plus size={14} />
                        Simpan Catatan
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2 pt-2">
                    {notes.length === 0 ? (
                      <div className="text-xs text-stone-400 italic text-center py-4">
                        Belum ada catatan. Tuliskan faedah atau poin penting di atas.
                      </div>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            {note.timestampSeconds != null && (
                              <span className="inline-block bg-stone-200 text-stone-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                                {formatTimestamp(note.timestampSeconds)}
                              </span>
                            )}
                            <p className="text-slate-800 leading-snug">{note.content}</p>
                            <span className="text-[10px] text-stone-400 block">
                              {new Date(note.createdAt).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-stone-400 hover:text-red-600 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Daftar Isi Video */}
              {isTabActive === 2 && (
                <div>
                  {markers.length > 0 ? (
                    <TimestampList markers={markers} activeMarker={activeMarker} onSeek={seekTo} />
                  ) : (
                    <div className="text-xs text-stone-400 italic py-4">Belum ada daftar isi timestamp untuk video ini.</div>
                  )}
                </div>
              )}

              {/* Tab 3: Semua materi */}
              {isTabActive === 3 && (
                <div className="space-y-3">
                  {materials.length > 0 ? (
                    materials.map(mat => {
                      const isActive = (mat.id || mat.url) === (activeMaterial?.id || activeMaterial?.url);
                      return <div
                        key={mat.id}
                        className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${isActive ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200 bg-stone-50'}`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold uppercase text-emerald-700">{mat.type}</div><div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{mat.filename || 'Lampiran Materi'}</p>
                          <p className="truncate text-xs text-slate-500">{mat.url}</p>
                        </div></div>
                        <div className="flex shrink-0 gap-2"><button type="button" onClick={() => { setActiveMaterialId(mat.id || mat.url); window.setTimeout(() => viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }} disabled={isActive} className="inline-flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-800 px-3 text-xs font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 active:bg-emerald-950 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-slate-500 sm:flex-none">{isActive ? 'Sedang dibuka' : 'Baca di sini'}</button><a href={mat.url} target="_blank" rel="noreferrer" aria-label={`Buka ${mat.filename || mat.type} di tab baru`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-slate-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><ExternalLink className="h-4 w-4" /></a></div>
                      </div>;
                    })
                  ) : (
                    <div className="text-xs text-stone-400 italic py-4">Tidak ada materi pendukung tambahan.</div>
                  )}
                </div>
              )}

              {/* Tab 4: Kuis Evaluasi */}
              {isTabActive === 4 && lesson.quiz && (
                <div className="pt-2">
                  <QuizComponent quizId={lesson.quiz.id} />
                </div>
              )}
            </div>
          </div>

          {/* Desktop Sidebar: Markers + Sibling Nav */}
          <div className="hidden lg:flex flex-col gap-4">
            {markers.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <List size={16} />
                  Daftar Isi Video
                </h3>
                <TimestampList markers={markers} activeMarker={activeMarker} onSeek={seekTo} />
              </div>
            )}

            {siblings.length > 1 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Video size={16} />
                  Pertemuan Lainnya
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {siblings.map((s: LessonItem) => (
                    <Link
                      key={s.id}
                      to={`/lesson/${s.id}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        s.id === lesson.id
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'text-slate-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {s.sequence}
                      </span>
                      <span className="line-clamp-2">{s.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prev / Next Navigation */}
        <nav className="flex items-center justify-between gap-4 pt-4 border-t border-stone-200">
          {prevLesson ? (
            <Link
              to={`/lesson/${prevLesson.id}`}
              className="flex max-w-[48%] items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-900/30 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <ChevronLeft size={18} className="shrink-0 text-emerald-900" />
              <div className="min-w-0">
                <div className="text-[10px] text-stone-500 font-normal">Sebelumnya</div>
                <div className="truncate">{prevLesson.title}</div>
              </div>
            </Link>
          ) : <div />}

          {nextLesson ? (
            <Link
              to={`/lesson/${nextLesson.id}`}
              className="ml-auto flex max-w-[48%] items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-right text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-900/30 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <div className="min-w-0">
                <div className="text-[10px] text-stone-500 font-normal">Berikutnya</div>
                <div className="truncate">{nextLesson.title}</div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-emerald-900" />
            </Link>
          ) : <div />}
        </nav>

      </div>
    </div>
  );
}

function TimestampList({
  markers,
  activeMarker,
  onSeek,
}: {
  markers: LessonMarker[];
  activeMarker: string | null;
  onSeek: (seconds: number, id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {markers.map((marker) => (
        <button
          key={marker.id}
          onClick={() => onSeek(marker.timestamp, marker.id)}
          className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
            activeMarker === marker.id
              ? 'bg-emerald-50 text-emerald-900 font-bold'
              : 'hover:bg-stone-50 text-slate-600'
          }`}
        >
          <span
            className={`shrink-0 mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
              activeMarker === marker.id
                ? 'bg-emerald-900 text-white'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {formatTimestamp(marker.timestamp)}
          </span>
          <div className="min-w-0">
            <div className="font-semibold leading-snug">{marker.title}</div>
            {marker.description && (
              <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">{marker.description}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
