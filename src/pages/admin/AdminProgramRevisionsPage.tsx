/* Hallmark · genre: modern-minimal · macrostructure: Version review workbench · design-system: design.md */
import { useEffect, useRef, useState } from 'react';
import { useGetIdentity, useInvalidate, useList, useOne } from '@refinedev/core';
import { useParams, useSearchParams } from 'react-router-dom';
import type { ProgramPublicationSnapshot } from '../../../shared/program-publication';
import { ErrorAlert } from '../../components/public/UIStates';
import { fetchWrapper } from '../../providers/dataProvider';
import { cacheRevisionDraft, getCachedRevisionDraft, removeCachedRevisionDraft } from '../../lib/revision-draft-cache';
import { AdminTranscriptDialog } from './AdminTranscriptDialog';
import { RevisionSnapshotEditor, type RevisionAbilities, type RevisionBook } from './RevisionSnapshotEditor';

interface Capabilities extends RevisionAbilities { programRevisions: boolean; programRevisionsReason?: string; canReviewPrograms?: boolean; canPublishPrograms?: boolean; canReviewLessons?: boolean; canPublishLessons?: boolean; canReviewQuizzes?: boolean; canPublishQuizzes?: boolean }
interface Revision { id: string; programId: string; version: number; status: string; contentHash: string; changeNote: string; submittedBy: string | null; reviewedBy: string | null; reviewNote?: string; isCurrentPublication: boolean; programStatus?: string; snapshot: ProgramPublicationSnapshot; events?: Array<{ id: string; actorId: string | null; actorName: string | null; action: string; note: string; createdAt: string }> }
const statusLabels: Record<string, string> = { capturing: 'Menyiapkan snapshot', draft: 'Draft revisi', submitted: 'Menunggu review', approved: 'Disetujui', revision_requested: 'Perlu revisi baru', published: 'Pernah diterbitkan', superseded: 'Digantikan versi baru', cancelled: 'Dibatalkan' };
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50';
const field = 'mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900';
const message = (cause: unknown) => cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Operasi revisi belum berhasil. Coba lagi.';

export function AdminProgramRevisionsPage() {
  const { id: programId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('revision') || '';
  const capabilities = useOne<Capabilities>({ resource: 'program-capabilities', id: 'general' });
  const enabled = capabilities.result?.programRevisions === true;
  const revisions = useList<Revision>({ resource: 'program-revisions', filters: [{ field: 'programId', operator: 'eq', value: programId }], pagination: { mode: 'off' }, queryOptions: { enabled } });
  const detail = useOne<Revision>({ resource: 'program-revisions', id: selectedId, queryOptions: { enabled: enabled && !!selectedId } });
  const catalog = useList<RevisionBook>({ resource: 'books', pagination: { mode: 'off' }, queryOptions: { enabled } });
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id || '';
  const invalidate = useInvalidate();
  const [snapshot, setSnapshot] = useState<ProgramPublicationSnapshot | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [createNote, setCreateNote] = useState('');
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [pdfLesson, setPdfLesson] = useState<string | null>(null);
  const [assetRevision, setAssetRevision] = useState(0);
  const baseHash = useRef('');
  const loaded = useRef('');
  const current = useRef({ dirty, pending, actionNote }); current.current = { dirty, pending, actionNote };
  const scope = useRef({ live: true, programId, selectedId, userId }); scope.current.programId = programId; scope.current.selectedId = selectedId; scope.current.userId = userId;
  const heading = useRef<HTMLHeadingElement>(null);
  const record = detail.result?.id === selectedId && detail.result.programId === programId ? detail.result : undefined;
  useEffect(() => {
    const result = detail.result;
    if (!result || result.id !== selectedId || result.programId !== programId || !userId) return;
    if (loaded.current !== `${userId}:${result.id}`) {
      const cached = getCachedRevisionDraft(userId, result.id);
      loaded.current = `${userId}:${result.id}`;
      baseHash.current = cached?.expectedHash || result.contentHash;
      setSnapshot(cached?.snapshot || structuredClone(result.snapshot));
      setChangeNote(cached?.note || result.changeNote);
      setActionNote(cached?.actionNote || '');
      setDirty(cached ? cached.dirty !== false : false);
      setPending(false);
      setFeedback(cached ? { error: false, message: 'Perubahan yang belum disimpan dipulihkan dari memori tab ini. Simpan draft untuk menyinkronkan ke server.' } : null);
      heading.current?.focus();
    } else if (!current.current.dirty && !current.current.pending && !current.current.actionNote) {
      baseHash.current = result.contentHash; setSnapshot(structuredClone(result.snapshot)); setChangeNote(result.changeNote);
    }
  }, [detail.result, selectedId, userId, programId]);
  useEffect(() => {
    const lifecycle = scope.current;
    lifecycle.live = true;
    const warn = (event: BeforeUnloadEvent) => { if (current.current.dirty || current.current.actionNote.trim()) event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => { lifecycle.live = false; window.removeEventListener('beforeunload', warn); };
  }, []);
  const remember = (value: ProgramPublicationSnapshot, note: string, changed: boolean, reviewNote: string) => {
    if (!userId || !selectedId) return;
    if (changed || reviewNote.trim()) cacheRevisionDraft(userId, selectedId, { snapshot: value, expectedHash: baseHash.current, note, actionNote: reviewNote, dirty: changed });
    else removeCachedRevisionDraft(userId, selectedId);
  };
  const select = (id: string) => {
    if (pending) return;
    if ((dirty || actionNote.trim()) && !window.confirm('Perubahan belum disimpan ke server. Buka revisi lain? Perubahan sementara tetap berada di memori tab ini.')) return;
    setFeedback(null); setParams({ revision: id });
  };
  const refresh = async () => { await Promise.all([revisions.query.refetch(), ...(selectedId ? [detail.query.refetch()] : [])]); };
  const create = async (fromRevisionId?: string) => {
    if (pending || createNote.trim().length < 3) { setFeedback({ error: true, message: 'Isi alasan perubahan minimal tiga karakter sebelum membuat draft.' }); return; }
    if ((dirty || actionNote.trim()) && !window.confirm('Buat revisi baru? Perubahan belum tersimpan pada revisi sekarang tetap berada di memori tab ini.')) return;
    setPending(true); setFeedback(null);
    const origin = { programId, selectedId, userId };
    try {
      const response = await fetchWrapper('/api/program-revisions', { method: 'POST', body: JSON.stringify({ programId, note: createNote.trim(), fromRevisionId, includeDrafts }) });
      const body = await response.json();
      if (!scope.current.live || scope.current.programId !== origin.programId || scope.current.userId !== origin.userId) return;
      if (scope.current.selectedId !== origin.selectedId) { await revisions.query.refetch(); return; }
      setCreateNote(''); setParams({ revision: String(body.data.id) }); await revisions.query.refetch();
    } catch (cause) { if (scope.current.live && scope.current.programId === origin.programId && scope.current.userId === origin.userId) setFeedback({ error: true, message: message(cause) }); }
    finally { if (scope.current.live && scope.current.userId === origin.userId) setPending(false); }
  };
  const act = async (action: string) => {
    if (!record || !snapshot || pending) return;
    const note = action === 'save' ? changeNote.trim() : actionNote.trim() || (action === 'submit' ? changeNote.trim() : '');
    if (note.length < 3) { setFeedback({ error: true, message: 'Isi catatan tindakan minimal tiga karakter.' }); return; }
    if (action !== 'save' && dirty) { setFeedback({ error: true, message: 'Simpan perubahan draft sebelum menjalankan tindakan review/publikasi.' }); return; }
    if (['publish', 'restore', 'cancel'].includes(action) && !window.confirm(action === 'publish' ? 'Terbitkan tepat snapshot yang disetujui ini? Versi publik sebelumnya akan tetap tercatat dalam riwayat.' : action === 'restore' ? 'Tampilkan kembali versi publik saat ini?' : 'Batalkan revisi ini? Snapshot dan riwayat tidak dihapus.')) return;
    setPending(true); setFeedback(null);
    const origin = { programId, revisionId: record.id, userId };
    try {
      const response = await fetchWrapper(`/api/program-revisions/${record.id}`, { method: 'PATCH', body: JSON.stringify({ action, note, expectedHash: baseHash.current, ...(action === 'save' ? { snapshot } : {}) }) });
      const body = await response.json();
      if (!scope.current.live || scope.current.programId !== origin.programId || scope.current.selectedId !== origin.revisionId || scope.current.userId !== origin.userId) return;
      if (action === 'save') {
        baseHash.current = body.data.contentHash; setSnapshot(body.data.snapshot); setDirty(false);
        remember(body.data.snapshot, changeNote, false, actionNote);
      } else { setActionNote(''); removeCachedRevisionDraft(userId, record.id); }
      await refresh();
      if (['publish', 'restore'].includes(action)) await Promise.all(['programs', 'lessons', 'chapters', 'series', 'quizzes', 'transcripts'].map(resource => invalidate({ resource, invalidates: ['all'] })));
      setFeedback({ error: false, message: action === 'save' ? 'Draft revisi tersimpan di server. Versi publik belum berubah.' : action === 'publish' ? 'Snapshot yang disetujui berhasil diterbitkan. Percobaan dan riwayat versi sebelumnya tetap disimpan.' : 'Tindakan revisi berhasil disimpan.' });
    } catch (cause) { if (scope.current.live && scope.current.programId === origin.programId && scope.current.selectedId === origin.revisionId && scope.current.userId === origin.userId) setFeedback({ error: true, message: message(cause) }); }
    finally { if (scope.current.live && scope.current.userId === origin.userId) setPending(false); }
  };
  const abilities = capabilities.result || { programRevisions: false };
  const authors = record?.events?.filter(event => ['create', 'save', 'submit'].includes(event.action)).map(event => event.actorId) || [];
  const ownEdits = authors.includes(userId) || record?.submittedBy === userId;
  const containsQuiz = Boolean(record?.snapshot.lessons.some(lesson => lesson.quiz?.isPublished));
  const canApprove = abilities.canReviewPrograms && abilities.canReviewLessons && (!containsQuiz || abilities.canReviewQuizzes) && !ownEdits;
  const canPublish = abilities.canPublishPrograms && abilities.canPublishLessons && (!containsQuiz || abilities.canPublishQuizzes);
  const isLoaded = Boolean(record && loaded.current === `${userId}:${record.id}`);
  const conflict = Boolean(record && isLoaded && baseHash.current && record.contentHash !== baseHash.current && dirty);
  const editing = record?.status === 'draft' && abilities.canEditPrograms && !pending && !!userId;
  const fallbackBooks = snapshot?.series.flatMap(group => group.books) || [];
  if (capabilities.query.isLoading) return <p role="status">Memeriksa alur revisi program…</p>;
  if (capabilities.query.isError) return <ErrorAlert message="Konfigurasi revisi belum dapat dimuat." onRetry={() => capabilities.query.refetch()} />;
  return <div className="space-y-5">
    <header><h2 ref={heading} tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none">Review & revisi versi program</h2><p className="mt-2 text-sm leading-6 text-slate-600">Versi kerja disimpan terpisah. Pembaca tetap memakai versi publik lama sampai snapshot disetujui dan diterbitkan. Penulis atau penyunting tidak dapat menyetujui revisinya sendiri.</p></header>
    {!enabled ? <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><h3 className="font-bold">{capabilities.result?.programRevisionsReason === 'MIGRATION_REQUIRED' ? 'Migrasi database revisi belum lengkap' : 'Revisi terpisah belum diaktifkan'}</h3><p>Administrator perlu menjalankan pemeriksaan db:preflight, menerapkan migrasi 0010–0012 yang disetujui, memetakan izin penulis/reviewer/publisher, lalu mengaktifkan LMS_PROGRAM_REVISIONS_ENABLED di server. Migrasi tidak dijalankan otomatis oleh halaman ini.</p><p className="mt-2">Program yang sudah ada tetap memakai alur sebelumnya selama fitur ini dinonaktifkan.</p></section> : <>
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${feedback.error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>{feedback.message}</p>}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"><label className="block text-sm font-semibold">Alasan revisi baru<textarea className={`${field} py-2`} rows={2} maxLength={2000} value={createNote} onChange={event => setCreateNote(event.target.value)} placeholder="Contoh: Lengkapi materi pertemuan dan perbarui evaluasi…" /></label><label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={includeDrafts} onChange={event => setIncludeDrafts(event.target.checked)} />Sertakan pertemuan draft saat menyalin sumber awal. Periksa kelengkapannya sebelum diajukan; pilihan ini tidak mengubah salinan versi yang sudah tercatat.</label><button type="button" className={button} disabled={pending || !userId || !abilities.canEditPrograms || createNote.trim().length < 3} onClick={() => void create()}>Buat draft revisi</button><p className="text-xs leading-5 text-slate-600">Untuk memulihkan isi versi lama, gunakan “Salin ke draft baru”, lalu lakukan review ulang. Tidak ada rollback yang menimpa riwayat.</p></section>
      {revisions.query.isLoading && <p role="status">Memuat riwayat revisi…</p>}
      {revisions.query.isError ? <ErrorAlert message="Riwayat revisi gagal dimuat." onRetry={() => revisions.query.refetch()} /> : <section aria-label="Riwayat revisi program" className="grid gap-3 sm:grid-cols-2">{revisions.result.data.map(revision => <article key={revision.id} className={`min-w-0 rounded-lg border p-4 ${revision.id === selectedId ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}`}><h3 className="font-bold">Versi {revision.version}{revision.isCurrentPublication ? ' · versi publik saat ini' : ''}</h3><p className="mt-1 text-sm text-slate-600">{statusLabels[revision.status] || revision.status}</p><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{revision.changeNote}</p><div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={pending} onClick={() => select(revision.id)}>Buka versi</button><button className={button} disabled={pending || !abilities.canEditPrograms || createNote.trim().length < 3 || revision.status === 'capturing'} onClick={() => void create(revision.id)}>Salin ke draft baru</button></div></article>)}{revisions.result.data.length === 0 && !revisions.query.isLoading && <p className="text-sm text-slate-600">Belum ada revisi. Buat snapshot awal dari program yang sudah disiapkan.</p>}</section>}
      {selectedId && (detail.query.isLoading || !record) && !detail.query.isError && <p role="status">Memuat snapshot revisi…</p>}
      {selectedId && detail.query.isError && <ErrorAlert message="Snapshot revisi gagal dimuat atau akses ditolak." onRetry={() => detail.query.refetch()} />}
      {record && snapshot && isLoaded && <section className="space-y-5 border-t border-slate-200 pt-5"><header><h3 className="text-lg font-bold">Versi {record.version} · {statusLabels[record.status] || record.status}</h3><p role="status" className="mt-2 text-sm text-slate-600">{pending ? 'Menyimpan tindakan…' : dirty ? 'Perubahan belum disimpan di server; hanya tersimpan sementara di memori tab ini.' : record.status === 'draft' ? 'Draft server tersimpan. Perubahan belum terlihat di publik.' : 'Snapshot ini hanya dibaca dan tidak dapat diubah setelah pengajuan.'}</p></header>
        {conflict && <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">Draft server berubah sejak Anda mulai menyunting. Draft lokal dipertahankan dan tidak akan menimpa server diam-diam. <button className={`${button} mt-2`} onClick={() => { if (!window.confirm('Abaikan perubahan lokal dan muat isi draft server?')) return; removeCachedRevisionDraft(userId, record.id); baseHash.current = record.contentHash; setSnapshot(structuredClone(record.snapshot)); setChangeNote(record.changeNote); setActionNote(''); setDirty(false); }}>Muat isi server</button></div>}
        <label className="block text-sm font-semibold">Ringkasan perubahan draft<textarea disabled={!editing} className={`${field} py-2`} rows={2} maxLength={2000} value={changeNote} onChange={event => { setChangeNote(event.target.value); setDirty(true); remember(snapshot, event.target.value, true, actionNote); }} /></label>
        {catalog.query.isError && <p role="alert" className="text-sm text-amber-800">Katalog kitab belum dimuat. Rujukan yang tersimpan tetap dipertahankan; muat ulang katalog sebelum menambahkan kitab baru.</p>}
        <RevisionSnapshotEditor value={snapshot} readOnly={!editing} abilities={abilities} catalog={catalog.query.isError ? fallbackBooks : catalog.result.data} persistedLessonIds={record.snapshot.lessons.map(lesson => lesson.id)} assetRevision={assetRevision} onManagePdf={setPdfLesson} onChange={next => { setSnapshot(next); setDirty(true); remember(next, changeNote, true, actionNote); }} />
        {record.status === 'draft' && <button className={`${button} bg-emerald-50`} disabled={pending || !abilities.canEditPrograms || !dirty || changeNote.trim().length < 3 || conflict} onClick={() => void act('save')}>Simpan draft revisi</button>}
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"><h4 className="font-bold">4. Review & publikasi snapshot</h4><label className="block text-sm font-semibold">Catatan tindakan<textarea rows={3} maxLength={2000} className={`${field} py-2`} value={actionNote} onChange={event => { setActionNote(event.target.value); remember(snapshot, changeNote, dirty, event.target.value); }} placeholder="Catatan pemeriksaan, alasan revisi, atau alasan publikasi…" /></label><div className="flex flex-wrap gap-2">
          {record.status === 'draft' && <button className={button} disabled={pending || dirty || !abilities.canEditPrograms} onClick={() => void act('submit')}>Ajukan review</button>}
          {record.status === 'submitted' && <><button className={button} disabled={pending || !canApprove || actionNote.trim().length < 3} onClick={() => void act('approve')}>Setujui snapshot</button><button className={button} disabled={pending || !abilities.canReviewPrograms || actionNote.trim().length < 3} onClick={() => void act('request_revision')}>Minta revisi baru</button></>}
          {record.status === 'approved' && <button className={`${button} bg-emerald-50`} disabled={pending || !canPublish || actionNote.trim().length < 3} onClick={() => void act('publish')}>Terbitkan snapshot ini</button>}
          {record.isCurrentPublication && <button className={button} disabled={pending || !abilities.canPublishPrograms || actionNote.trim().length < 3} onClick={() => void act('restore')}>Tampilkan versi publik ini</button>}
          {['capturing', 'draft', 'submitted', 'approved'].includes(record.status) && <button className={button} disabled={pending || dirty || !abilities.canEditPrograms || actionNote.trim().length < 3} onClick={() => void act('cancel')}>Batalkan revisi</button>}
        </div>{ownEdits && record.status === 'submitted' && <p className="text-sm text-amber-800">Anda tercatat sebagai penulis/penyunting revisi ini. Persetujuan memerlukan reviewer lain.</p>}<p className="text-xs leading-5 text-slate-600">Review dan publikasi juga memerlukan izin lesson.review/lesson.publish; jika ada kuis terbit, diperlukan quiz.review/quiz.publish. Semua izin dan status diperiksa kembali di server.</p></section>
        <details className="rounded-lg border border-slate-200 bg-white p-4"><summary className="flex min-h-11 cursor-pointer items-center font-semibold">Riwayat tindakan versi ini</summary><ol className="mt-3 space-y-3">{record.events?.map(event => <li key={event.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">{event.actorName || 'Akun tim'} · {event.action}</p><p className="mt-1 whitespace-pre-wrap leading-6">{event.note}</p><p className="mt-1 text-xs text-slate-600">{new Date(event.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p></li>)}</ol></details>
      </section>}
      {pdfLesson && <AdminTranscriptDialog lessonId={pdfLesson} onClose={() => setPdfLesson(null)} onChanged={() => setAssetRevision(value => value + 1)} />}
    </>}
  </div>;
}
