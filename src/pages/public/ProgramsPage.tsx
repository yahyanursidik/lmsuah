import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { MOCK_PROGRAMS, Program } from '../../mock/publicData';
import { SEOHead } from '../../components/public/SEOHead';
import { EmptyState, LoadingSkeleton, ErrorAlert } from '../../components/public/UIStates';

export function ProgramsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Semua');
  const location = useLocation();

  const categories = ['Semua', 'Fiqih', 'Aqidah', 'Akhlaq', 'Hadits'];

  const { query: listQuery, result: listResult } = useList<Program>({
    resource: 'programs',
    pagination: { mode: 'off' },
  });

  const apiPrograms = listResult?.data || [];
  const isFetched = listQuery.isFetched || apiPrograms.length > 0;
  const rawPrograms: Program[] = isFetched
    ? apiPrograms
    : (listQuery.isError ? MOCK_PROGRAMS : []);
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const refetch = listQuery.refetch;

  const filteredPrograms = rawPrograms.filter((prog) => {
    const matchesSearch =
      (prog.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (prog.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (prog.bookTitle || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory = category === 'Semua' || prog.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOHead
        title="Program Kajian Kitab"
        description="Daftar seluruh program kajian kitab terstruktur Ustadz Abu Haidar As-Sundawy."
      />

      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Program Kajian Kitab
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Pelajari Islam dari sumbernya secara bertahap melalui pembahasan kitab-kitab ulama Ahlussunnah wal Jama'ah.
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul program, deskripsi, atau nama kitab..."
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-900 min-h-[44px]"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] flex items-center ${
                category === cat
                  ? 'bg-emerald-900 text-white'
                  : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Rendering */}
      {isLoading ? (
        <LoadingSkeleton count={3} />
      ) : isError && rawPrograms.length === 0 ? (
        <ErrorAlert
          message="Gagal memuat data program dari server."
          onRetry={() => refetch()}
        />
      ) : filteredPrograms.length === 0 ? (
        <EmptyState
          title="Tidak Ada Program Ditemukan"
          description="Cobalah mengubah kata kunci pencarian atau memilih kategori yang lain."
          actionText="Reset Filter"
          onAction={() => {
            setSearch('');
            setCategory('Semua');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((prog: Program) => (
            <div
              key={prog.id}
              className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all"
            >
              <div className="relative h-48 overflow-hidden bg-stone-100">
                <img
                  src={prog.coverImage || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&q=80&w=800'}
                  alt={prog.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 rounded-md bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                  {prog.category || 'Kajian'}
                </span>
                <span className="absolute top-3 right-3 rounded-md bg-emerald-900/90 px-2.5 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-xs">
                  {prog.status || 'published'}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                    {prog.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {prog.description}
                  </p>
                </div>
                <div className="border-t border-stone-100 pt-3 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Kitab Rujukan:</span>
                    <span className="font-semibold text-slate-800">{prog.bookTitle || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Jadwal Rutin:</span>
                    <span className="font-semibold text-slate-800">{prog.routineSchedule || '-'}</span>
                  </div>
                </div>
                <Link
                  to={location.pathname.startsWith('/belajar') ? `/belajar/katalog/${prog.id}` : `/programs/${prog.id}`}
                  className="mt-2 block w-full rounded-xl border border-stone-300 py-2.5 text-center text-xs font-bold text-slate-800 hover:bg-emerald-900 hover:text-white hover:border-emerald-900 transition-all min-h-[44px] flex items-center justify-center"
                >
                  Detail Program & Kurikulum
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
