import { useEffect, useState } from 'react';
import { useCreate, useOne, useUpdate } from '@refinedev/core';
import { AlertCircle, CalendarDays, LoaderCircle, Save, X } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';

interface MeetingFormData {
  title: string;
  slug: string;
  sequence: number;
  date: string;
  description: string;
  status: 'draft' | 'published';
}

interface MeetingRecord extends MeetingFormData { id: string }

interface AdminLessonFormProps {
  lessonId: string | null;
  onClose: () => void;
  programId?: string;
  chapterId?: string;
}

const normalizeSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error
  ? String(error.message)
  : 'Pertemuan belum dapat disimpan. Periksa kembali data yang diisi.';

export function AdminLessonForm({ lessonId, onClose, programId, chapterId }: AdminLessonFormProps) {
  const isEditing = Boolean(lessonId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const lessonQuery = useOne<MeetingRecord>({ resource: 'lessons', id: lessonId || '', queryOptions: { enabled: isEditing } });
  const { mutate: createLesson, mutation: createMutation } = useCreate();
  const { mutate: updateLesson, mutation: updateMutation } = useUpdate();
  const { register, handleSubmit, reset, watch, setValue } = useForm<MeetingFormData>({
    defaultValues: { title: '', slug: '', sequence: 1, date: '', description: '', status: 'draft' },
  });
  const isSaving = Boolean(createMutation.isPending || updateMutation.isPending);

  useEffect(() => {
    if (lessonQuery.result) {
      const lesson = lessonQuery.result;
      reset({ title: lesson.title, slug: lesson.slug, sequence: lesson.sequence, date: lesson.date || '', description: lesson.description || '', status: lesson.status });
    }
  }, [lessonQuery.result, reset]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSaving) onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', closeOnEscape); };
  }, [isSaving, onClose]);

  const title = watch('title');
  const slug = watch('slug');
  useEffect(() => { if (!isEditing && (!slug || slug === normalizeSlug(title.slice(0, -1)))) setValue('slug', normalizeSlug(title)); }, [isEditing, setValue, slug, title]);

  const onSubmit: SubmitHandler<MeetingFormData> = (values) => {
    setFeedback(null);
    const options = { onSuccess: onClose, onError: (error: unknown) => setFeedback(errorMessage(error)) };
    if (lessonId) updateLesson({ resource: 'lessons', id: lessonId, values }, options);
    else createLesson({ resource: 'lessons', values: { ...values, programId, chapterId } }, options);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/85 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="meeting-form-title">
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-950 shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950 px-5 py-4 sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-400">Data pertemuan</p><h2 id="meeting-form-title" className="mt-1 text-lg font-bold text-white">{isEditing ? 'Edit pertemuan' : 'Tambah pertemuan'}</h2><p className="mt-1 text-xs text-slate-500">Materi dan kuis ditambahkan langsung dari kartu pertemuan setelah data ini tersimpan.</p></div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Tutup" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-5 sm:p-6">
          {feedback && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{feedback}</div>}
          {lessonQuery.query.isLoading ? <div className="h-48 animate-pulse rounded-xl bg-slate-900 motion-reduce:animate-none" /> : <>
            <label className="block space-y-2"><span className="text-sm font-semibold text-slate-300">Judul pertemuan *</span><input autoFocus required {...register('title')} placeholder="Contoh: Adab menuntut ilmu" className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" /></label>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-300">Slug *</span><input required {...register('slug')} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" /></label>
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-300">Urutan *</span><input type="number" min="1" required {...register('sequence', { valueAsNumber: true })} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-300">Tanggal</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" /><input type="date" {...register('date')} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 pl-10 pr-3.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" /></span></label>
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-300">Status</span><select {...register('status')} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"><option value="draft">Draft</option><option value="published">Terbit</option></select></label>
            </div>
            <label className="block space-y-2"><span className="text-sm font-semibold text-slate-300">Deskripsi</span><textarea rows={4} {...register('description')} placeholder="Ringkasan bahasan pertemuan" className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" /></label>
          </>}
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSaving} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50">Batal</button><button type="submit" disabled={isSaving || lessonQuery.query.isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50">{isSaving ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Save className="h-4 w-4" />} Simpan pertemuan</button></footer>
        </form>
      </div>
    </div>
  );
}
