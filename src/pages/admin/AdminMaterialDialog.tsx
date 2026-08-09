import { useEffect, useState } from 'react';
import { useOne, useUpdate } from '@refinedev/core';
import { AlertCircle, FilePlus2, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react';
import { useFieldArray, useForm, type SubmitHandler } from 'react-hook-form';

export type MaterialType = 'youtube' | 'PDF' | 'audio' | 'drive' | 'DOCX' | 'link';
export interface LessonMaterial { id?: string; type: MaterialType; url: string; filename?: string; duration?: string }
interface LessonContentRecord { id: string; title: string; materials?: LessonMaterial[] }
interface MaterialFormData { materials: LessonMaterial[] }

const blankMaterial = (): LessonMaterial => ({ type: 'youtube', url: '', filename: '', duration: '' });
const getError = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Materi belum dapat disimpan.';

export function AdminMaterialDialog({ lessonId, onClose, onSuccess }: { lessonId: string; onClose: () => void; onSuccess: () => void }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const lessonQuery = useOne<LessonContentRecord>({ resource: 'lessons', id: lessonId });
  const { mutate: updateLesson, mutation } = useUpdate();
  const { register, control, handleSubmit, reset, watch } = useForm<MaterialFormData>({ defaultValues: { materials: [] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'materials' });
  const materials = watch('materials');

  useEffect(() => { if (lessonQuery.result) reset({ materials: lessonQuery.result.materials || [] }); }, [lessonQuery.result, reset]);
  useEffect(() => {
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !mutation.isPending) onClose(); };
    document.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); };
  }, [mutation.isPending, onClose]);

  const submit: SubmitHandler<MaterialFormData> = ({ materials: values }) => {
    setFeedback(null);
    updateLesson({ resource: 'lessons', id: lessonId, values: { materials: values } }, {
      onSuccess: () => { onSuccess(); onClose(); }, onError: (error) => setFeedback(getError(error)),
    });
  };

  return <div className="fixed inset-0 z-[130] flex items-end justify-center bg-white/85 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="material-dialog-title">
    <div className="flex max-h-[94dvh] w-full flex-col rounded-t-2xl border border-slate-700 bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">Multi-sumber</p><h2 id="material-dialog-title" className="mt-1 text-lg font-bold text-slate-900">Tambah atau kelola materi</h2><p className="mt-1 text-xs text-slate-500">{lessonQuery.result?.title || 'Memuat pertemuan…'} · YouTube, PDF, audio, Drive, DOCX, atau tautan.</p></div><button type="button" onClick={onClose} disabled={mutation.isPending} aria-label="Tutup" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"><X className="h-4 w-4" /></button></header>
      <form onSubmit={handleSubmit(submit)} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {feedback && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{feedback}</div>}
        {lessonQuery.query.isLoading ? <div className="h-48 animate-pulse rounded-xl bg-slate-50 motion-reduce:animate-none" /> : <div className="space-y-3">
          {fields.map((field, index) => <article key={field.id} className="rounded-xl border border-slate-700 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-900">Materi {index + 1}</h3><button type="button" onClick={() => remove(index)} aria-label={`Hapus materi ${index + 1}`} className="flex h-10 w-10 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><Trash2 className="h-4 w-4" /></button></div>
            <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]"><label className="space-y-2"><span className="text-xs font-semibold text-slate-500">Jenis sumber</span><select {...register(`materials.${index}.type`)} className="min-h-11 w-full rounded-lg border border-slate-700 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-400"><option value="youtube">YouTube</option><option value="PDF">PDF</option><option value="audio">Audio</option><option value="drive">Google Drive</option><option value="DOCX">DOCX</option><option value="link">Tautan</option></select></label><label className="space-y-2"><span className="text-xs font-semibold text-slate-500">URL *</span><input type="url" required {...register(`materials.${index}.url`)} placeholder="https://…" className="min-h-11 w-full rounded-lg border border-slate-700 bg-white px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-600 focus:border-emerald-400" /></label></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-semibold text-slate-500">Nama tampilan</span><input {...register(`materials.${index}.filename`)} placeholder="Contoh: Modul pertemuan 1" className="min-h-11 w-full rounded-lg border border-slate-700 bg-white px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-600 focus:border-emerald-400" /></label>{materials?.[index]?.type === 'youtube' && <label className="space-y-2"><span className="text-xs font-semibold text-slate-500">Durasi</span><input {...register(`materials.${index}.duration`)} placeholder="01:20:00" className="min-h-11 w-full rounded-lg border border-slate-700 bg-white px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-600 focus:border-emerald-400" /></label>}</div>
          </article>)}
          {fields.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 px-5 py-10 text-center"><FilePlus2 className="mx-auto h-6 w-6 text-slate-500" /><p className="mt-3 text-sm font-semibold text-slate-700">Belum ada materi</p><p className="mt-1 text-xs text-slate-500">Tambahkan satu atau beberapa sumber sekaligus.</p></div>}
          <button type="button" onClick={() => append(blankMaterial())} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-700 px-4 text-sm font-bold text-emerald-300 hover:bg-emerald-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><Plus className="h-4 w-4" /> Tambah materi</button>
        </div>}
        <footer className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={mutation.isPending} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50">Batal</button><button type="submit" disabled={mutation.isPending || lessonQuery.query.isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-slate-900 hover:bg-emerald-500 disabled:opacity-50">{mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan {fields.length} materi</button></footer>
      </form>
    </div>
  </div>;
}
