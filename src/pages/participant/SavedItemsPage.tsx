import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { Bookmark, FileText, Trash2, ExternalLink, BookOpen, Video } from 'lucide-react';
import { SEOHead } from '@/components/public/SEOHead';
import { MOCK_PROGRAMS } from '@/mock/publicData';
import {
  getUserBookmarks,
  getUserNotes,
  deleteNote,
  toggleBookmark,
} from '@/lib/userStore';

export function SavedItemsPage() {
  const { data: identity } = useGetIdentity<{ id: string; name: string }>();
  const userId = identity?.id || 'demo-peserta-1';

  const [activeTab, setActiveTab] = useState<'bookmarks' | 'notes'>('bookmarks');
  const [bookmarks, setBookmarks] = useState<ReturnType<typeof getUserBookmarks>>([]);
  const [notes, setNotes] = useState<ReturnType<typeof getUserNotes>>([]);

  useEffect(() => {
    if (userId) {
      setBookmarks(getUserBookmarks(userId));
      setNotes(getUserNotes(userId));
    }
  }, [userId]);

  const handleDeleteNote = (noteId: string) => {
    deleteNote(userId, noteId);
    setNotes(getUserNotes(userId));
  };

  const handleRemoveBookmark = (resourceType: 'program' | 'lesson', resourceId: string) => {
    toggleBookmark(userId, resourceType, resourceId);
    setBookmarks(getUserBookmarks(userId));
  };

  return (
    <div className="space-y-6 pb-12">
      <SEOHead title="Tersimpan & Catatan Saya" />

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900">Tersimpan & Catatan Saya</h1>
        <p className="text-xs text-slate-600">
          Kumpulan markah buku (bookmark) dan catatan privat kajian Anda.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all rounded-t-xl ${
            activeTab === 'bookmarks'
              ? 'bg-emerald-950 text-amber-300 border-b-2 border-amber-400'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Bookmark size={16} />
          <span>Bookmark Tersimpan ({bookmarks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all rounded-t-xl ${
            activeTab === 'notes'
              ? 'bg-emerald-950 text-amber-300 border-b-2 border-amber-400'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <FileText size={16} />
          <span>Catatan Privat ({notes.length})</span>
        </button>
      </div>

      {/* Tab Content: Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-4">
          {bookmarks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500 space-y-2">
              <Bookmark className="mx-auto h-8 w-8 text-stone-400" />
              <p className="font-semibold text-slate-700">Belum Ada Bookmark</p>
              <p>Klik ikon pita bookmark pada detail program atau lesson untuk menyimpannya ke daftar ini.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {bookmarks.map((bm) => {
                const program = MOCK_PROGRAMS.find((p) => p.id === bm.resourceId);
                return (
                  <div
                    key={bm.id}
                    className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs hover:border-emerald-700/40 transition-all space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                          {bm.resourceType === 'program' ? <BookOpen size={12} /> : <Video size={12} />}
                          {bm.resourceType === 'program' ? 'Program Kajian' : 'Pertemuan'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBookmark(bm.resourceType, bm.resourceId)}
                          className="text-stone-400 hover:text-red-600 p-1"
                          title="Hapus Bookmark"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {program ? program.title : `Resource ID: ${bm.resourceId}`}
                      </h3>
                      {program && <p className="text-xs text-slate-600">{program.instructor}</p>}
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
                      <span className="text-[10px] text-stone-400">
                        Disimpan: {new Date(bm.createdAt).toLocaleDateString('id-ID')}
                      </span>
                      <Link
                        to={bm.resourceType === 'program' ? `/programs/${bm.resourceId}` : `/lesson/${bm.resourceId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900 hover:underline"
                      >
                        <span>Buka</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: User Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500 space-y-2">
              <FileText className="mx-auto h-8 w-8 text-stone-400" />
              <p className="font-semibold text-slate-700">Belum Ada Catatan Privat</p>
              <p>Anda dapat menuliskan faedah dan rincian catatan pada halaman materi pelajaran mana pun.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-2 flex justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-900">
                      ID Materi: {note.lessonId}
                    </span>
                    {note.timestampSeconds != null && (
                      <span className="bg-stone-200 text-stone-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                        {Math.floor(note.timestampSeconds / 60)}m {note.timestampSeconds % 60}s
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">{note.content}</p>
                  <span className="text-[10px] text-stone-400 block">
                    Dibuat: {new Date(note.createdAt).toLocaleString('id-ID')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-stone-400 hover:text-red-600 p-1 shrink-0"
                  title="Hapus Catatan"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
