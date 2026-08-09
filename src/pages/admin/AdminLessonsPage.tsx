import { useState } from 'react';
import { useList, useDelete } from '@refinedev/core';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { AdminLessonForm } from './AdminLessonForm';

interface Lesson {
  id: string;
  title: string;
  slug: string;
  programId?: string;
  chapterId?: string;
  sequence: number;
  date?: string;
  description?: string;
  status: 'draft' | 'published';
}

export function AdminLessonsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { query: listQuery, result: listResult } = useList<Lesson>({
    resource: 'lessons',
    pagination: { mode: 'off' },
    sorters: [{ field: 'sequence', order: 'asc' }],
    filters: searchTerm ? [{ field: 'title', operator: 'contains', value: searchTerm }] : [],
  });
  const refetch = listQuery?.refetch;

  const { mutate: deleteLesson } = useDelete();

  const lessons = listResult?.data || [];
  const isLoading = listQuery?.isLoading ?? false;

  const handleDelete = (id: string) => {
    if (window.confirm('Yakin ingin menghapus lesson ini? (Termasuk video dan markers terkait)')) {
      deleteLesson({ resource: 'lessons', id }, { onSuccess: () => refetch() });
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Pengelolaan Materi (Lessons)</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-900 text-slate-900 rounded-lg hover:bg-emerald-800 transition-colors"
        >
          <Plus size={20} />
          <span>Tambah Materi Baru</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder="Cari berdasarkan judul materi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900"
          />
        </div>
      </div>

      {/* Table Desktop */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-600">
            <thead className="bg-stone-50 text-stone-700 border-b border-stone-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Urutan</th>
                <th className="px-6 py-4 font-semibold">Judul Materi</th>
                <th className="px-6 py-4 font-semibold">Slug</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-500">Memuat data...</td>
                </tr>
              ) : lessons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-500">Tidak ada data materi</td>
                </tr>
              ) : (
                lessons.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{lesson.sequence}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{lesson.title}</td>
                    <td className="px-6 py-4">{lesson.slug}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        lesson.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'
                      }`}>
                        {lesson.status === 'published' ? 'Dipublikasi' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(lesson.id)}
                          className="p-2 text-stone-400 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(lesson.id)}
                          className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards Mobile */}
      <div className="grid gap-4 md:hidden">
        {isLoading ? (
          <div className="p-8 text-center text-stone-500 bg-white rounded-xl border border-stone-200">Memuat data...</div>
        ) : lessons.length === 0 ? (
          <div className="p-8 text-center text-stone-500 bg-white rounded-xl border border-stone-200">Tidak ada data materi</div>
        ) : (
          lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-slate-900">{lesson.sequence}. {lesson.title}</h3>
                <span className={`inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  lesson.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'
                }`}>
                  {lesson.status === 'published' ? 'Dipublikasi' : 'Draft'}
                </span>
              </div>
              <div className="text-sm text-stone-500 truncate">{lesson.slug}</div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  onClick={() => handleEdit(lesson.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(lesson.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <AdminLessonForm 
          lessonId={editingId} 
          onClose={() => {
            setIsFormOpen(false);
            setEditingId(null);
            refetch();
          }} 
        />
      )}
    </div>
  );
}
