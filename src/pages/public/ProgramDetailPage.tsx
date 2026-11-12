import { useState } from 'react';
import { useGetIdentity, useList, useOne } from '@refinedev/core';
import { ArrowLeft, ArrowRight, Bookmark, CalendarDays, CheckCircle2, PlayCircle, Plus } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { programCategoryLabel } from '../../../shared/program-category';
import { DiscoveryEmpty, DiscoveryError, DiscoveryHeader, DiscoveryLoading } from '../../components/public/DiscoveryUI';
import { SEOHead } from '../../components/public/SEOHead';
import { AppImage } from '../../components/ui/AppImage';
import { LearningSyncNotice } from '../../components/ui/LearningSyncNotice';
import { agendaPath, detailPath, directoryReturnPath, discoveryPaths, discoveryQueryOptions, isAbuHaidar } from '../../lib/public-discovery';
import { useLearningData } from '../../lib/useLearningData';
import { isBookmarked, toggleBookmark } from '../../lib/userStore';
import type { Program } from '../../mock/publicData';

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id || '';
  const learning = useLearningData(userId);
  const navigate = useNavigate();
  const location = useLocation();
  const { catalog, schedule } = discoveryPaths(location.pathname);
  const inPortal = catalog.startsWith('/belajar/');
  const back = directoryReturnPath(catalog, location.state);
  const lessonPrefix = inPortal ? '/belajar/lesson' : '/lesson';
  const [bookmark, setBookmark] = useState<{ account: string; id: string; saved: boolean }>();

  const { query: programQuery, result: record } = useOne<Omit<Program, 'status' | 'lessons'> & { status: string; slug?: string }>({
    resource: 'programs',
    id: id ? encodeURIComponent(id) : '',
    queryOptions: { ...discoveryQueryOptions, enabled: !!id, retry: false },
  });
  const program = record?.status === 'published' && (record.id === id || record.slug === id) ? record : undefined;

  const { query: lessonsQuery, result: lessonResult } = useList<{
    id: string; title: string; sequence: number; date?: string; duration?: string; description?: string; status: string;
  }>({
    resource: 'lessons',
    filters: program ? [{ field: 'programId', operator: 'eq', value: program.id }, { field: 'status', operator: 'eq', value: 'published' }] : [],
    sorters: [{ field: 'sequence', order: 'asc' }],
    pagination: { mode: 'off' },
    queryOptions: { ...discoveryQueryOptions, enabled: !!program },
  });

  const lessons = (lessonResult.data || []).filter(lesson => lesson.status === 'published');
  const completed = new Set(learning.progress.filter(lesson => lesson.isCompleted).map(lesson => lesson.lessonId));
  const completedCount = lessons.filter(lesson => completed.has(lesson.id)).length;
  const next = lessons.find(lesson => !completed.has(lesson.id));
  const resume = next || lessons[0];
  const enrolled = !!program && learning.enrollments.some(entry => entry.programId === program.id && entry.status === 'active');
  const saved = !!(program && userId && (bookmark?.account === userId && bookmark.id === program.id
    ? bookmark.saved : isBookmarked(userId, 'program', program.id)));
  const notFound = [403, 404].includes(programQuery.error?.statusCode || 0);

  function login() {
    navigate('/login?' + new URLSearchParams({ redirect: location.pathname + location.search }));
  }

  return (
    <div className={'public-discovery' + (inPortal ? ' public-discovery--embedded' : '')}>
      <SEOHead title={program?.title || 'Detail Program'} description={program?.description} />
      <Link to={back} className="discovery-action discovery-action--text discovery-back"><ArrowLeft size={16} aria-hidden="true" /> Kembali ke katalog</Link>
      {programQuery.isLoading ? <DiscoveryLoading label="Memuat program kajian…" /> :
        programQuery.isError && !notFound && !program ? (
          <DiscoveryError message="Program kajian belum dapat dimuat." retry={() => void programQuery.refetch()} retrying={programQuery.isFetching} />
        ) : !program ? (
          <DiscoveryEmpty title="Program tidak ditemukan" description="Program mungkin tidak lagi diterbitkan." />
        ) : (
          <>
            <LearningSyncNotice {...learning} />
            <div className="discovery-detail-grid">
              <div className="discovery-section">
                <DiscoveryHeader title={program.title} description={program.subtitle} />
                <div className="discovery-agenda-tags">
                  <span className="discovery-tag">{programCategoryLabel(program.category)}</span>
                  {enrolled && <span className="discovery-tag">Diikuti</span>}
                </div>
                {program.description && <p className="discovery-prose">{program.description}</p>}
                <div className="discovery-actions">
                  {resume && <Link to={detailPath(lessonPrefix, resume.id)} className="discovery-action discovery-action--primary">
                    <PlayCircle size={17} aria-hidden="true" /> {next ? enrolled ? 'Lanjut belajar' : 'Mulai pertemuan' : 'Ulangi pertemuan'}
                  </Link>}
                  <button type="button" disabled={learning.loading || learning.pending}
                    className={'discovery-action' + (!resume && !enrolled ? ' discovery-action--primary' : '')}
                    onClick={() => { if (!userId) login(); else void learning.follow(program.id); }}>
                    {!enrolled && <Plus size={17} aria-hidden="true" />}
                    {learning.pending ? 'Menyimpan…' : learning.loading ? 'Memuat status…' : enrolled ? 'Berhenti mengikuti' : 'Ikuti kajian'}
                  </button>
                  <button type="button" className="discovery-action" aria-pressed={saved}
                    onClick={() => {
                      if (!userId) return login();
                      const value = toggleBookmark(userId, 'program', program.id);
                      setBookmark({ account: userId, id: program.id, saved: value });
                    }}>
                    <Bookmark size={17} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
                    Simpan program
                  </button>
                </div>
                {enrolled && lessons.length > 0 && <div className="discovery-section discovery-progress">
                  <label htmlFor="program-progress" className="discovery-count">{completedCount} dari {lessons.length} pertemuan selesai</label>
                  <progress id="program-progress" value={completedCount} max={lessons.length} />
                </div>}
              </div>
              <aside className="discovery-detail-info" aria-label="Informasi program">
                {program.coverImage && <div className="discovery-venue-image discovery-detail-image mb-4">
                  <AppImage src={program.coverImage} alt={'Sampul ' + program.title} kind="program" loading="eager" />
                </div>}
                <dl>
                  {program.instructor && <div>
                    <dt>Pemateri</dt>
                    <dd>{isAbuHaidar(program.instructor)
                      ? <Link to="/speaker" className="discovery-action discovery-action--text">{program.instructor}</Link>
                      : program.instructor}</dd>
                  </div>}
                  {program.bookTitle && <div><dt>Kitab rujukan</dt><dd>{program.bookTitle}</dd>{program.author && <dd className="discovery-meta">{program.author}</dd>}</div>}
                  {program.venueName && <div><dt>Lokasi tercatat</dt><dd>{program.venueName}</dd></div>}
                </dl>
                <Link to={agendaPath(schedule, { programId: program.id })} className="discovery-action mt-2">
                  <CalendarDays size={16} aria-hidden="true" /> Lihat jadwal program
                </Link>
              </aside>
            </div>

            <section id="curriculum" className="discovery-section" aria-labelledby="curriculum-heading">
              <div className="discovery-section-heading"><h2 id="curriculum-heading">Kurikulum & pertemuan</h2></div>
              {lessonsQuery.isLoading ? <DiscoveryLoading label="Memuat pertemuan…" /> :
                lessonsQuery.isError && !lessons.length ? (
                  <DiscoveryError message="Pertemuan belum dapat dimuat." retry={() => void lessonsQuery.refetch()} retrying={lessonsQuery.isFetching} />
                ) : !lessons.length ? (
                  <DiscoveryEmpty title="Belum ada pertemuan yang diterbitkan" />
                ) : (
                  <ol className="discovery-agenda-list">
                    {lessons.map((lesson, index) => <li key={lesson.id} className="discovery-agenda">
                      <div>
                        <p className="discovery-agenda-time">Pertemuan {lesson.sequence || index + 1}</p>
                        {lesson.duration && <p className="discovery-meta">{lesson.duration}</p>}
                      </div>
                      <div className="min-w-0">
                        {completed.has(lesson.id) && <span className="discovery-tag"><CheckCircle2 className="inline" size={14} aria-hidden="true" /> Selesai</span>}
                        <h3 className="discovery-item-title">{lesson.title}</h3>
                        {lesson.date && <p className="discovery-meta">{lesson.date}</p>}
                        {lesson.description && <p className="discovery-excerpt">{lesson.description}</p>}
                        <Link to={detailPath(lessonPrefix, lesson.id)} className="discovery-action discovery-action--text">
                          {completed.has(lesson.id) ? 'Simak ulang' : 'Buka pertemuan'} <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      </div>
                    </li>)}
                  </ol>
                )}
            </section>
          </>
        )}
    </div>
  );
}
