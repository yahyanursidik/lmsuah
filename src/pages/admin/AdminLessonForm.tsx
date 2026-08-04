import { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { useCreate, useUpdate, useOne } from '@refinedev/core';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LessonFormData {
  title: string;
  slug: string;
  sequence: number;
  date: string;
  description: string;
  status: 'draft' | 'published';
  materials: {
    type: string;
    url: string;
    filename?: string;
    duration?: string;
  }[];
  quizEnabled: boolean;
  quiz: {
    title: string;
    description: string;
    passingScore: number;
    maxAttempts: number;
    isPublished: boolean;
    questions: {
      type: string;
      text: string;
      explanation: string;
      points: number;
      options: { text: string; isCorrect: boolean }[];
    }[];
  } | null;
}

interface AdminLessonFormProps {
  lessonId: string | null;
  onClose: () => void;
  programId?: string;
}

export function AdminLessonForm({ lessonId, onClose, programId }: AdminLessonFormProps) {
  const isEditing = !!lessonId;
  const { mutate: createLesson, mutation: createMutation } = useCreate();
  const { mutate: updateLesson, mutation: updateMutation } = useUpdate();
  
  const [activeTab, setActiveTab] = useState<'info' | 'materials' | 'quiz'>('info');

  const { result: lessonResult } = useOne({
    resource: 'lessons',
    id: lessonId || '',
    queryOptions: { enabled: isEditing }
  });

  const lessonData = lessonResult?.data as any;

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<LessonFormData>({
    defaultValues: {
      title: '', slug: '', sequence: 1, date: '', description: '', status: 'draft',
      materials: [],
      quizEnabled: false,
      quiz: {
        title: 'Kuis Evaluasi', description: '', passingScore: 70, maxAttempts: 3, isPublished: true,
        questions: []
      }
    }
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control, name: 'materials'
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control, name: 'quiz.questions'
  });

  useEffect(() => {
    if (lessonData) {
      reset({
        title: lessonData.title || '',
        slug: lessonData.slug || '',
        sequence: lessonData.sequence || 1,
        date: lessonData.date || '',
        description: lessonData.description || '',
        status: lessonData.status || 'draft',
        materials: lessonData.materials || [],
        quizEnabled: !!lessonData.quiz,
        quiz: lessonData.quiz || {
          title: 'Kuis Evaluasi', description: '', passingScore: 70, maxAttempts: 3, isPublished: true,
          questions: []
        }
      });
    }
  }, [lessonData, reset]);

  const title = watch('title');
  useEffect(() => {
    if (!isEditing && title) {
      setValue('slug', title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  }, [title, isEditing, setValue]);

  const quizEnabled = watch('quizEnabled');

  const onSubmit: SubmitHandler<LessonFormData> = (data) => {
    const payload = {
      ...data,
      sequence: Number(data.sequence),
      programId: programId,
      quiz: data.quizEnabled ? data.quiz : null,
    };

    if (isEditing) {
      updateLesson({ resource: 'lessons', id: lessonId, values: payload }, { onSuccess: () => onClose() });
    } else {
      createLesson({ resource: 'lessons', values: payload }, { onSuccess: () => onClose() });
    }
  };

  const isLoading = createMutation?.isPending || updateMutation?.isPending || false;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-slate-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">
            {isEditing ? 'Sunting Pertemuan' : 'Tambah Pertemuan Baru'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex px-6 space-x-4 border-b border-slate-800 bg-slate-900/50">
          <button onClick={() => setActiveTab('info')} className={`py-3 text-sm font-medium border-b-2 ${activeTab === 'info' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400'}`}>Info Utama</button>
          <button onClick={() => setActiveTab('materials')} className={`py-3 text-sm font-medium border-b-2 ${activeTab === 'materials' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400'}`}>Multi-Materi</button>
          <button onClick={() => setActiveTab('quiz')} className={`py-3 text-sm font-medium border-b-2 ${activeTab === 'quiz' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400'}`}>Kuis & Evaluasi</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
          <form id="lesson-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* TAB: INFO UTAMA */}
            <div className={activeTab === 'info' ? 'block' : 'hidden'}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Judul Pertemuan *</label>
                  <input {...register('title', { required: true })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-emerald-500" placeholder="Contoh: Pertemuan 1 - Pengantar" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Slug *</label>
                  <input {...register('slug', { required: true })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Urutan *</label>
                    <input type="number" {...register('sequence')} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Tanggal</label>
                    <input type="date" {...register('date')} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white [color-scheme:dark]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <select {...register('status')} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-emerald-500">
                    <option value="draft">Draft (Sembunyikan)</option>
                    <option value="published">Published (Tayangkan)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Deskripsi Ringkas</label>
                  <textarea {...register('description')} rows={4} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:border-emerald-500"></textarea>
                </div>
              </div>
            </div>

            {/* TAB: MATERI */}
            <div className={activeTab === 'materials' ? 'block' : 'hidden'}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-200">Daftar Materi Pendukung</h3>
                  <p className="text-xs text-slate-400">Tambahkan banyak materi seperti video, audio, atau PDF</p>
                </div>
                <Button type="button" size="sm" onClick={() => appendMaterial({ type: 'youtube', url: '', filename: '' })} className="bg-slate-800 text-white hover:bg-slate-700">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Materi
                </Button>
              </div>

              <div className="space-y-4">
                {materialFields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-slate-700 rounded-lg bg-slate-900/50">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Materi #{index + 1}</span>
                      <button type="button" onClick={() => removeMaterial(index)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Tipe Materi</label>
                        <select {...register(`materials.${index}.type` as const)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-emerald-500">
                          <option value="youtube">Video (YouTube)</option>
                          <option value="PDF">Dokumen (PDF)</option>
                          <option value="audio">Audio / Podcast</option>
                          <option value="drive">Google Drive Link</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">URL / Link</label>
                        <input {...register(`materials.${index}.url` as const)} placeholder="https://..." className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Label / Nama File (Opsional)</label>
                        <input {...register(`materials.${index}.filename` as const)} placeholder="Contoh: Slide PDF" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                  </div>
                ))}
                {materialFields.length === 0 && (
                  <div className="p-8 text-center border border-dashed border-slate-700 rounded-lg text-slate-500">
                    Belum ada materi ditambahkan.
                  </div>
                )}
              </div>
            </div>

            {/* TAB: KUIS */}
            <div className={activeTab === 'quiz' ? 'block' : 'hidden'}>
              <div className="flex items-center gap-3 mb-6 p-4 border border-slate-700 rounded-lg bg-slate-900/50">
                <input type="checkbox" id="quizEnabled" {...register('quizEnabled')} className="w-4 h-4 text-emerald-500 bg-slate-950 border-slate-700 rounded focus:ring-emerald-500 focus:ring-2" />
                <label htmlFor="quizEnabled" className="text-sm font-medium text-slate-200">Aktifkan Kuis / Evaluasi untuk Pertemuan Ini</label>
              </div>

              {quizEnabled && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Judul Kuis</label>
                      <input {...register('quiz.title')} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Passing Score (%)</label>
                      <input type="number" {...register('quiz.passingScore', { valueAsNumber: true })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white" />
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-white">Daftar Pertanyaan</h4>
                      <Button type="button" size="sm" onClick={() => appendQuestion({ type: 'single_choice', text: '', explanation: '', points: 10, options: [{text: '', isCorrect: true}, {text: '', isCorrect: false}] })} className="bg-slate-800 text-white hover:bg-slate-700">
                        <Plus className="w-4 h-4 mr-2" /> Tambah Soal
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {questionFields.map((q, qIndex) => (
                        <div key={q.id} className="p-4 border border-slate-700 rounded-lg bg-slate-900">
                          <div className="flex justify-between mb-3">
                            <span className="text-xs font-bold text-emerald-400">Soal {qIndex + 1}</span>
                            <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-400 hover:text-red-300">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-3">
                            <textarea {...register(`quiz.questions.${qIndex}.text` as const)} placeholder="Tulis soal di sini..." rows={2} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white"></textarea>
                            
                            <div className="space-y-2 pl-4 border-l-2 border-slate-700">
                              {/* Simple options render for MVP */}
                              {[0, 1, 2, 3].map((optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <input type="radio" {...register(`quiz.questions.${qIndex}.options.${optIndex}.isCorrect` as const)} value="true" name={`correct-${qIndex}`} className="w-3 h-3 text-emerald-500 bg-slate-950 border-slate-700 focus:ring-emerald-500" />
                                  <input {...register(`quiz.questions.${qIndex}.options.${optIndex}.text` as const)} placeholder={`Opsi ${optIndex + 1}`} className="flex-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white" />
                                </div>
                              ))}
                            </div>
                            <input {...register(`quiz.questions.${qIndex}.explanation` as const)} placeholder="Penjelasan jawaban (opsional)" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300 mt-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Batal
          </Button>
          <Button type="submit" form="lesson-form" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
            {isLoading ? 'Menyimpan...' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
