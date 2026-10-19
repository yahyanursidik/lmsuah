import { useEffect, useRef, useState } from 'react';
import { useCreate, useList, useOne, useUpdate } from '@refinedev/core';
import { useDialog } from '../../components/ui/useDialog';
import { ErrorAlert } from '../../components/public/UIStates';
import { AlertCircle, CalendarDays, LoaderCircle, Save, X } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';

interface MeetingFormData {
  programId: string;
  chapterId: string;
  title: string;
  slug: string;
  sequence: number;
  date: string;
  description: string;
  status: 'draft' | 'published';
}

interface MeetingRecord extends MeetingFormData { id: string; updatedAt?: string }

interface AdminLessonFormProps {
  lessonId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
  programId?: string;
  chapterId?: string;
  nextSequence?: number;
}

const normalizeSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error
  ? String(error.message)
  : 'Pertemuan belum dapat disimpan. Periksa kembali data yang diisi.';

export function AdminLessonForm({ lessonId, onClose: closeParent, onSuccess, programId, chapterId, nextSequence = 1 }: AdminLessonFormProps) {
  const isEditing = Boolean(lessonId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const lessonQuery = useOne<MeetingRecord>({ resource: 'lessons', id: lessonId || '', queryOptions: { enabled: isEditing } });
  const { mutate: createLesson, mutation: createMutation } = useCreate();
  const { mutate: updateLesson, mutation: updateMutation } = useUpdate();
  const [manualSlug, setManualSlug] = useState(false);
  const baseRevision = useRef<string | undefined>(undefined);
  const { register, handleSubmit, reset, watch, setValue, formState: { isDirty, dirtyFields } } = useForm<MeetingFormData>({
    defaultValues: { programId: programId || '', chapterId: chapterId || '', title: '', slug: '', sequence: nextSequence, date: '', description: '', status: 'draft' },
  });
  const isSaving = Boolean(createMutation.isPending || updateMutation.isPending);
  const dialog = useDialog({ onClose: closeParent, pending: isSaving, dirty: isDirty });
  const onClose = dialog.close;
  const selectedProgram = watch('programId');
  const programs = useList<{ id: string; title: string }>({ resource: 'programs', pagination: { mode: 'off' }, queryOptions: { enabled: !programId } });
  const chapters = useList<{ id: string; title: string }>({ resource: 'chapters', filters: [{ field: 'programId', operator: 'eq', value: selectedProgram }], pagination: { mode: 'off' }, queryOptions: { enabled: !!selectedProgram } });
  const meetings = useList<{ id: string; sequence: number }>({ resource: 'lessons', filters: [{ field: 'programId', operator: 'eq', value: selectedProgram }], pagination: { mode: 'off' }, queryOptions: { enabled: !programId && !isEditing && !!selectedProgram } });
  useEffect(() => { if (!programId && !isEditing && selectedProgram && !dirtyFields.sequence) setValue('sequence', Math.max(0, ...(meetings.result.data || []).map(item => item.sequence)) + 1); }, [programId, isEditing, selectedProgram, dirtyFields.sequence, meetings.result.data, setValue]);

  useEffect(() => {
    if (lessonQuery.result && !isDirty) {
      const lesson = lessonQuery.result;
      baseRevision.current = lesson.updatedAt;
      reset({ programId: lesson.programId || programId || '', chapterId: lesson.chapterId || '', title: lesson.title, slug: lesson.slug, sequence: lesson.sequence, date: lesson.date || '', description: lesson.description || '', status: lesson.status });
    }
  }, [lessonQuery.result, reset, isDirty, programId]);

  const title = watch('title');
  useEffect(() => { if (!isEditing && !manualSlug) setValue('slug', normalizeSlug(title)); }, [isEditing, manualSlug, setValue, title]);

  const onSubmit: SubmitHandler<MeetingFormData> = (values) => {
    setFeedback(null);
    if (isEditing && (lessonQuery.query.isError || !lessonQuery.result)) return;
    const options = { onSuccess: () => { onSuccess?.(); closeParent(); }, onError: (error: unknown) => setFeedback(errorMessage(error)) };
    const payload = { ...values, title: values.title.trim(), slug: normalizeSlug(values.slug), chapterId: values.chapterId || null, ...(baseRevision.current ? { expectedUpdatedAt: baseRevision.current } : {}) };
    if (lessonId) updateLesson({ resource: 'lessons', id: lessonId, values: payload }, options);
    else createLesson({ resource: 'lessons', values: payload }, options);
  };

  return (
    <div ref={dialog.ref} tabIndex={-1} className="fixed inset-0 z-[120] flex items-end justify-center bg-white/85 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="meeting-form-title">
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl border border-slate-700 bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">Data pertemuan</p><h2 id="meeting-form-title" className="mt-1 text-lg font-bold text-slate-900">{isEditing ? 'Edit pertemuan' : 'Tambah pertemuan'}</h2><p className="mt-1 text-xs text-slate-500">Materi dan kuis ditambahkan langsung dari kartu pertemuan setelah data ini tersimpan.</p></div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Tutup" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-5 sm:p-6">
          {lessonQuery.query.isError && <ErrorAlert message="Data pertemuan gagal dimuat. Jangan simpan sebelum berhasil dimuat." onRetry={() => lessonQuery.query.refetch()} />}
          <fieldset disabled={isSaving || (isEditing && (lessonQuery.query.isLoading || lessonQuery.query.isError || !lessonQuery.result))} className="contents">
          {!programId && <label className="block text-sm font-semibold text-slate-700">Program *<select required {...register('programId', { onChange: () => setValue('chapterId', '') })} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">Pilih program</option>{programs.result.data.map(program => <option key={program.id} value={program.id}>{program.title}</option>)}</select></label>}
          <label className="block text-sm font-semibold text-slate-700">Modul (opsional)<select {...register('chapterId')} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">Pertemuan langsung</option>{chapters.result.data.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label>
          {feedback && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{feedback}</div>}
          {lessonQuery.query.isLoading ? <div className="h-48 animate-pulse rounded-xl bg-slate-50 motion-reduce:animate-none" /> : <>
            <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Judul pertemuan *</span><input autoFocus required {...register('title')} placeholder="Contoh: Adab menuntut ilmu" className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30" /></label>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Slug *</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" {...register('slug', { onChange: () => setManualSlug(true) })} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30" /></label>
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Urutan *</span><input type="number" min="1" required {...register('sequence', { valueAsNumber: true })} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Tanggal</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" /><input type="date" {...register('date')} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-50 pl-10 pr-3.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30" /></span></label>
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Status</span><select {...register('status')} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"><option value="draft">Draft</option><option value="published">Terbit</option></select></label>
            </div>
            <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Deskripsi</span><textarea rows={4} {...register('description')} placeholder="Ringkasan bahasan pertemuan" className="w-full resize-y rounded-lg border border-slate-700 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30" /></label>
          </>}
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSaving} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50">Batal</button><button type="submit" disabled={isSaving || lessonQuery.query.isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-slate-900 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50">{isSaving ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Save className="h-4 w-4" />} Simpan pertemuan</button></footer>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
