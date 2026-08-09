import { useEffect, useState } from 'react';
import { useOne, useUpdate } from '@refinedev/core';
import { AlertCircle, FileQuestion, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react';
import { useFieldArray, useForm, useWatch, type Control, type SubmitHandler, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';

interface QuizQuestion { type: 'single_choice' | 'true_false'; text: string; explanation: string; points: number; options: Array<{ text: string; isCorrect: boolean }> }
export interface LessonQuiz { title: string; description: string; passingScore: number; maxAttempts: number; isPublished: boolean; questions: QuizQuestion[] }
interface QuizFormData extends LessonQuiz { enabled: boolean }
interface LessonRecord { id: string; title: string; quiz?: LessonQuiz | null }

const defaults = (): QuizFormData => ({ enabled: true, title: 'Kuis Evaluasi', description: '', passingScore: 70, maxAttempts: 3, isPublished: false, questions: [] });
const newQuestion = (): QuizQuestion => ({ type: 'single_choice', text: '', explanation: '', points: 1, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] });
const getError = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Kuis belum dapat disimpan.';

function QuestionCard({ index, control, register, setValue, onRemove }: { index: number; control: Control<QuizFormData>; register: UseFormRegister<QuizFormData>; setValue: UseFormSetValue<QuizFormData>; onRemove: () => void }) {
  const { fields, append, remove } = useFieldArray({ control, name: `questions.${index}.options` });
  const options = useWatch({ control, name: `questions.${index}.options` }) || [];
  const markCorrect = (selected: number) => options.forEach((_, optionIndex) => setValue(`questions.${index}.options.${optionIndex}.isCorrect`, optionIndex === selected, { shouldDirty: true }));
  return <article className="rounded-xl border border-slate-700 bg-slate-50 p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-900">Soal {index + 1}</h3><button type="button" onClick={onRemove} aria-label={`Hapus soal ${index + 1}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><Trash2 className="h-4 w-4" /></button></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]"><label className="space-y-2"><span className="text-xs font-semibold text-slate-500">Pertanyaan *</span><textarea rows={2} required {...register(`questions.${index}.text`)} className="w-full rounded-lg border border-slate-700 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400" /></label><label className="space-y-2"><span className="text-xs font-semibold text-slate-500">Poin</span><input type="number" min="1" max="100" {...register(`questions.${index}.points`, { valueAsNumber: true })} className="min-h-11 w-full rounded-lg border border-slate-700 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-emerald-400" /></label></div>
    <div className="mt-4 space-y-2"><span className="text-xs font-semibold text-slate-500">Pilihan jawaban · tandai satu jawaban benar</span>{fields.map((field, optionIndex) => <div key={field.id} className="flex items-center gap-2"><input type="radio" name={`correct-${index}`} checked={Boolean(options[optionIndex]?.isCorrect)} onChange={() => markCorrect(optionIndex)} aria-label={`Jawaban benar opsi ${optionIndex + 1}`} className="h-4 w-4 accent-emerald-500" /><input required {...register(`questions.${index}.options.${optionIndex}.text`)} placeholder={`Opsi ${optionIndex + 1}`} className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-700 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-600 focus:border-emerald-400" /><button type="button" onClick={() => remove(optionIndex)} disabled={fields.length <= 2} aria-label={`Hapus opsi ${optionIndex + 1}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-rose-400 disabled:opacity-30"><X className="h-4 w-4" /></button></div>)}</div>
    <button type="button" onClick={() => append({ text: '', isCorrect: false })} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-950/40"><Plus className="h-3.5 w-3.5" /> Tambah opsi</button>
    <label className="mt-4 block space-y-2"><span className="text-xs font-semibold text-slate-500">Penjelasan jawaban</span><textarea rows={2} {...register(`questions.${index}.explanation`)} className="w-full rounded-lg border border-slate-700 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400" /></label>
  </article>;
}

export function AdminQuizDialog({ lessonId, onClose, onSuccess }: { lessonId: string; onClose: () => void; onSuccess: () => void }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const lessonQuery = useOne<LessonRecord>({ resource: 'lessons', id: lessonId });
  const { mutate: updateLesson, mutation } = useUpdate();
  const { register, control, handleSubmit, reset, watch, setValue } = useForm<QuizFormData>({ defaultValues: defaults() });
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });
  const enabled = watch('enabled');

  useEffect(() => { if (lessonQuery.result) reset(lessonQuery.result.quiz ? { ...lessonQuery.result.quiz, enabled: true } : defaults()); }, [lessonQuery.result, reset]);
  useEffect(() => {
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !mutation.isPending) onClose(); };
    document.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); };
  }, [mutation.isPending, onClose]);

  const submit: SubmitHandler<QuizFormData> = ({ enabled: isEnabled, ...quiz }) => {
    setFeedback(null);
    updateLesson({ resource: 'lessons', id: lessonId, values: { quiz: isEnabled ? quiz : null } }, { onSuccess: () => { onSuccess(); onClose(); }, onError: (error) => setFeedback(getError(error)) });
  };

  return <div className="fixed inset-0 z-[130] flex items-end justify-center bg-white/85 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="quiz-dialog-title">
    <div className="flex max-h-[94dvh] w-full flex-col rounded-t-2xl border border-slate-700 bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-600">Evaluasi</p><h2 id="quiz-dialog-title" className="mt-1 text-lg font-bold text-slate-900">Tambah atau kelola kuis</h2><p className="mt-1 text-xs text-slate-500">{lessonQuery.result?.title || 'Memuat pertemuan…'} · passing grade, percobaan, dan bank soal.</p></div><button type="button" onClick={onClose} disabled={mutation.isPending} aria-label="Tutup" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50"><X className="h-4 w-4" /></button></header>
      <form onSubmit={handleSubmit(submit)} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {feedback && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{feedback}</div>}
        {lessonQuery.query.isLoading ? <div className="h-64 animate-pulse rounded-xl bg-slate-50" /> : <div className="space-y-5">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-50 px-4 py-3"><span><span className="block text-sm font-bold text-slate-900">Aktifkan kuis</span><span className="mt-1 block text-xs text-slate-500">Nonaktifkan lalu simpan untuk menghapus kuis dari pertemuan.</span></span><input type="checkbox" {...register('enabled')} className="h-5 w-5 accent-amber-500" /></label>
          {enabled && <>
            <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Judul kuis *</span><input required {...register('title')} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-amber-500" /></label><label className="space-y-2"><span className="text-sm font-semibold text-slate-700">Passing grade (%)</span><input type="number" min="0" max="100" {...register('passingScore', { valueAsNumber: true })} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-amber-500" /></label><label className="space-y-2"><span className="text-sm font-semibold text-slate-700">Maksimal percobaan</span><input type="number" min="1" max="20" {...register('maxAttempts', { valueAsNumber: true })} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none focus:border-amber-500" /></label><label className="space-y-2 sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Deskripsi</span><textarea rows={2} {...register('description')} className="w-full rounded-lg border border-slate-700 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-amber-500" /></label></div>
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Bank soal</h3><p className="mt-1 text-xs text-slate-500">Minimal satu soal dengan tepat satu jawaban benar.</p></div><button type="button" onClick={() => append(newQuestion())} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-700 px-3 text-xs font-bold text-amber-300 hover:bg-amber-950/40"><Plus className="h-3.5 w-3.5" /> Tambah soal</button></div>
            {fields.map((field, index) => <QuestionCard key={field.id} index={index} control={control} register={register} setValue={setValue} onRemove={() => remove(index)} />)}
            {fields.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 px-5 py-10 text-center"><FileQuestion className="mx-auto h-6 w-6 text-slate-500" /><p className="mt-3 text-sm font-semibold text-slate-700">Belum ada soal</p><button type="button" onClick={() => append(newQuestion())} className="mt-3 min-h-10 rounded-lg px-3 text-xs font-bold text-amber-300 hover:bg-amber-950/40">Tambah soal pertama</button></div>}
            <label className="flex items-center gap-3 rounded-lg border border-slate-700 px-4 py-3"><input type="checkbox" {...register('isPublished')} className="h-4 w-4 accent-amber-500" /><span className="text-sm font-semibold text-slate-700">Terbitkan kuis untuk peserta</span></label>
          </>}
        </div>}
        <footer className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={mutation.isPending} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50">Batal</button><button type="submit" disabled={mutation.isPending || lessonQuery.query.isLoading || (enabled && fields.length === 0)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50">{mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan kuis</button></footer>
      </form>
    </div>
  </div>;
}
