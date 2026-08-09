/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 * Hallmark · genre: modern-minimal · macrostructure: Workbench · designed-as-app
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreate, useDelete, useList, useUpdate } from '@refinedev/core';
import {
  Archive,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Grid2X2,
  List,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorAlert } from '@/components/public/UIStates';

type ProgramStatus = 'draft' | 'published' | 'archived';
type StatusFilter = 'all' | ProgramStatus;
type SortOption = 'updated-desc' | 'title-asc' | 'title-desc' | 'status';
type ViewMode = 'grid' | 'list';

interface ProgramItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: ProgramStatus;
  createdAt?: string;
  updatedAt?: string;
}

interface ProgramFormData {
  title: string;
  slug: string;
  description: string;
  status: ProgramStatus;
}

const EMPTY_FORM: ProgramFormData = {
  title: '',
  slug: '',
  description: '',
  status: 'draft',
};

const STATUS_META: Record<ProgramStatus, { label: string; description: string }> = {
  published: { label: 'Terbit', description: 'Tampil di portal publik' },
  draft: { label: 'Draft', description: 'Hanya terlihat oleh tim' },
  archived: { label: 'Arsip', description: 'Disimpan dan tidak aktif' },
};

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return fallback;
};

const formatDate = (value?: string) => {
  if (!value) return 'Belum tercatat';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum tercatat';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

function StatusBadge({ status }: { status: ProgramStatus }) {
  const variant = status === 'published' ? 'success' : status === 'archived' ? 'destructive' : 'warning';
  return (
    <Badge variant={variant} dot className="shrink-0 normal-case tracking-normal">
      {STATUS_META[status].label}
    </Badge>
  );
}

export function AdminProgramsPage() {
  const navigate = useNavigate();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramItem | null>(null);
  const [programToDelete, setProgramToDelete] = useState<ProgramItem | null>(null);
  const [formData, setFormData] = useState<ProgramFormData>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null);
  const [copiedProgramId, setCopiedProgramId] = useState<string | null>(null);

  const { query: listQuery, result: listResult } = useList<ProgramItem>({
    resource: 'programs',
  });

  const programsList = useMemo(() => listResult?.data || [], [listResult?.data]);
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const refetch = listQuery.refetch;

  const { mutate: createProgram, mutation: createMutation } = useCreate();
  const { mutate: updateProgram, mutation: updateMutation } = useUpdate();
  const { mutate: deleteProgram, mutation: deleteMutation } = useDelete();

  const isSaving = Boolean(createMutation?.isPending || updateMutation?.isPending);
  const isDeleting = Boolean(deleteMutation?.isPending);

  const statusCounts = useMemo(
    () => ({
      all: programsList.length,
      published: programsList.filter((program) => program.status === 'published').length,
      draft: programsList.filter((program) => program.status === 'draft').length,
      archived: programsList.filter((program) => program.status === 'archived').length,
    }),
    [programsList]
  );

  const filteredPrograms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = programsList.filter((program) => {
      const matchesStatus = statusFilter === 'all' || program.status === statusFilter;
      const matchesQuery =
        !query ||
        program.title.toLowerCase().includes(query) ||
        program.slug.toLowerCase().includes(query) ||
        program.description?.toLowerCase().includes(query);
      return matchesStatus && Boolean(matchesQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title, 'id');
      if (sortBy === 'title-desc') return b.title.localeCompare(a.title, 'id');
      if (sortBy === 'status') return a.status.localeCompare(b.status, 'id');
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
  }, [programsList, searchQuery, sortBy, statusFilter]);

  useEffect(() => {
    if (!isModalOpen && !programToDelete) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (programToDelete && !isDeleting) setProgramToDelete(null);
      if (isModalOpen && !isSaving) setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDeleting, isModalOpen, isSaving, programToDelete]);

  useEffect(() => {
    if (isModalOpen) requestAnimationFrame(() => titleInputRef.current?.focus());
  }, [isModalOpen]);

  useEffect(() => {
    if (programToDelete) requestAnimationFrame(() => deleteButtonRef.current?.focus());
  }, [programToDelete]);

  const resetFeedback = () => setFeedback(null);

  const handleOpenCreateModal = () => {
    resetFeedback();
    setEditingProgram(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (program: ProgramItem) => {
    resetFeedback();
    setEditingProgram(program);
    setFormData({
      title: program.title,
      slug: program.slug,
      description: program.description || '',
      status: program.status,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();
    const values = {
      ...formData,
      title: formData.title.trim(),
      slug: normalizeSlug(formData.slug),
      description: formData.description.trim(),
    };

    if (editingProgram) {
      updateProgram(
        { resource: 'programs', id: editingProgram.id, values },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setFeedback({ type: 'success', message: `Perubahan “${values.title}” berhasil disimpan.` });
            refetch();
          },
          onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error, 'Program gagal diperbarui.') }),
        }
      );
      return;
    }

    createProgram(
      { resource: 'programs', values },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setFeedback({ type: 'success', message: `Program “${values.title}” berhasil dibuat.` });
          refetch();
        },
        onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error, 'Program gagal dibuat.') }),
      }
    );
  };

  const handleDelete = () => {
    if (!programToDelete) return;
    resetFeedback();
    deleteProgram(
      { resource: 'programs', id: programToDelete.id },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', message: `Program “${programToDelete.title}” berhasil dihapus.` });
          setProgramToDelete(null);
          refetch();
        },
        onError: (error) => {
          setFeedback({ type: 'error', message: getErrorMessage(error, 'Program gagal dihapus.') });
          setProgramToDelete(null);
        },
      }
    );
  };

  const handleChangeStatus = (program: ProgramItem) => {
    const nextStatus: ProgramStatus = program.status === 'published' ? 'draft' : 'published';
    resetFeedback();
    setPendingProgramId(program.id);
    updateProgram(
      { resource: 'programs', id: program.id, values: { status: nextStatus } },
      {
        onSuccess: () => {
          setFeedback({
            type: 'success',
            message: nextStatus === 'published' ? `“${program.title}” kini tampil di portal publik.` : `“${program.title}” dikembalikan ke draft.`,
          });
          setPendingProgramId(null);
          refetch();
        },
        onError: (error) => {
          setFeedback({ type: 'error', message: getErrorMessage(error, 'Status program gagal diubah.') });
          setPendingProgramId(null);
        },
      }
    );
  };

  const handleCopyPublicLink = async (program: ProgramItem) => {
    const publicUrl = `${window.location.origin}/programs/${program.slug}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedProgramId(program.id);
      window.setTimeout(() => setCopiedProgramId(null), 1800);
    } catch {
      setFeedback({ type: 'error', message: 'Tautan belum dapat disalin. Silakan salin dari portal publik.' });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <section className="border-b border-slate-200 pb-6" aria-labelledby="programs-title">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Ruang kerja program
            </div>
            <h1 id="programs-title" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Pengelolaan Program Kajian
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Atur informasi program, status publikasi, kurikulum, dan akses ke portal dari satu tempat.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/programs')}
              className="border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-200 hover:text-slate-900"
            >
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Lihat portal program
            </Button>
            <Button type="button" onClick={handleOpenCreateModal} className="bg-emerald-600 text-slate-900 hover:bg-emerald-500">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Tambah program
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Ringkasan status program" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
        {([
          ['all', 'Semua program'],
          ['published', 'Sudah terbit'],
          ['draft', 'Masih draft'],
          ['archived', 'Diarsipkan'],
        ] as const).map(([status, label]) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            aria-pressed={statusFilter === status}
            className={`min-h-24 bg-white px-4 py-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${
              statusFilter === status ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
            }`}
          >
            <span className="block text-2xl font-bold text-slate-900">{statusCounts[status]}</span>
            <span className={`mt-1 block text-xs font-medium ${statusFilter === status ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</span>
          </button>
        ))}
      </section>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-rose-900/70 bg-rose-50/40 text-rose-200'
              : 'border-emerald-900/70 bg-emerald-50/40 text-emerald-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <X className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={resetFeedback} aria-label="Tutup notifikasi" className="rounded p-1 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="space-y-4" aria-labelledby="program-list-title">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari judul, slug, atau deskripsi…"
              aria-label="Cari program"
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative">
              <span className="sr-only">Urutkan program</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="min-h-11 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-9 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 sm:w-auto">
                <option value="updated-desc">Terakhir diperbarui</option>
                <option value="title-asc">Judul A–Z</option>
                <option value="title-desc">Judul Z–A</option>
                <option value="status">Status</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </label>

            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label="Pilihan tampilan">
              <button type="button" onClick={() => setViewMode('grid')} aria-label="Tampilan kartu" aria-pressed={viewMode === 'grid'} className={`flex min-h-9 min-w-10 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${viewMode === 'grid' ? 'bg-slate-700 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                <Grid2X2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setViewMode('list')} aria-label="Tampilan daftar" aria-pressed={viewMode === 'list'} className={`flex min-h-9 min-w-10 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${viewMode === 'list' ? 'bg-slate-700 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={() => refetch()} disabled={listQuery.isFetching} className="text-slate-700 hover:bg-slate-200 hover:text-slate-900" aria-label="Muat ulang daftar program">
              <RefreshCw className={`mr-2 h-4 w-4 ${listQuery.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
              Muat ulang
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="program-list-title" className="text-sm font-semibold text-slate-800">Daftar program</h2>
            <p className="mt-1 text-xs text-slate-500">Menampilkan {filteredPrograms.length} dari {programsList.length} program</p>
          </div>
          {(searchQuery || statusFilter !== 'all') && (
            <button type="button" onClick={clearFilters} className="shrink-0 text-xs font-semibold text-emerald-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Reset filter</button>
          )}
        </div>

        {isLoading ? (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : ''}`} aria-label="Memuat program">
            {[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-50 motion-reduce:animate-none" />)}
          </div>
        ) : isError ? (
          <ErrorAlert message="Gagal mengambil data program dari server." onRetry={() => refetch()} />
        ) : programsList.length === 0 ? (
          <EmptyState title="Belum ada program" description="Buat program pertama untuk mulai menyusun kurikulum dan materi kajian." actionText="Tambah program" onAction={handleOpenCreateModal} />
        ) : filteredPrograms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
            <Search className="mx-auto h-6 w-6 text-slate-500" aria-hidden="true" />
            <h3 className="mt-4 text-base font-semibold text-slate-900">Program tidak ditemukan</h3>
            <p className="mt-2 text-sm text-slate-500">Coba kata kunci lain atau reset filter yang aktif.</p>
            <Button type="button" variant="outline" size="sm" onClick={clearFilters} className="mt-5 border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-200 hover:text-slate-900">Reset filter</Button>
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
            {filteredPrograms.map((program) => (
              <article key={program.id} className={`group min-w-0 rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-200 ${viewMode === 'list' ? 'lg:flex lg:items-center' : 'flex flex-col'}`}>
                <div className={`min-w-0 flex-1 ${viewMode === 'list' ? 'p-4 lg:p-5' : 'p-5'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <StatusBadge status={program.status} />
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleCopyPublicLink(program)} aria-label={`Salin tautan publik ${program.title}`} title="Salin tautan publik" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                        {copiedProgramId === program.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => handleOpenEditModal(program)} aria-label={`Edit ${program.title}`} title="Edit program" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => setProgramToDelete(program)} aria-label={`Hapus ${program.title}`} title="Hapus program" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50/60 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className={viewMode === 'list' ? 'mt-3 lg:mt-2' : 'mt-5'}>
                    <h3 className="min-w-0 break-words text-lg font-bold leading-6 text-slate-900">{program.title}</h3>
                    <p className="mt-1 truncate font-mono text-xs text-slate-500">/programs/{program.slug}</p>
                    <p className={`mt-3 text-sm leading-6 text-slate-500 ${viewMode === 'grid' ? 'line-clamp-3 min-h-[4.5rem]' : 'line-clamp-2'}`}>
                      {program.description || 'Belum ada deskripsi. Lengkapi konteks program agar mudah dipahami peserta.'}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Diperbarui {formatDate(program.updatedAt || program.createdAt)}</span>
                    <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" aria-hidden="true" /> {STATUS_META[program.status].description}</span>
                  </div>
                </div>

                <div className={`flex flex-col gap-2 border-t border-slate-200 bg-slate-50 hover:bg-slate-100 p-4 sm:flex-row ${viewMode === 'list' ? 'lg:w-[23rem] lg:shrink-0 lg:border-l lg:border-t-0' : ''}`}>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleChangeStatus(program)} disabled={pendingProgramId === program.id} className="flex-1 text-slate-700 hover:bg-slate-200 hover:text-slate-900">
                    {pendingProgramId === program.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : program.status === 'published' ? <Archive className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {program.status === 'published' ? 'Jadikan draft' : 'Publikasikan'}
                  </Button>
                  <Button type="button" size="sm" onClick={() => navigate(`/admin/programs/${program.id}`)} className="flex-1 bg-emerald-600 text-slate-900 hover:bg-emerald-500">
                    Kelola program <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-white/85 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) handleCloseModal(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="program-form-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 id="program-form-title" className="text-lg font-bold text-slate-900">{editingProgram ? 'Edit program' : 'Tambah program baru'}</h2>
                <p className="mt-1 text-xs text-slate-500">Kolom bertanda bintang wajib diisi.</p>
              </div>
              <button type="button" onClick={handleCloseModal} disabled={isSaving} aria-label="Tutup formulir" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-800">Judul program <span className="text-rose-400">*</span></span>
                <input ref={titleInputRef} type="text" required maxLength={160} value={formData.title} onChange={(event) => { const title = event.target.value; setFormData((previous) => ({ ...previous, title, slug: editingProgram ? previous.slug : normalizeSlug(title) })); }} placeholder="Contoh: Syarah Kitab At-Tauhid" className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30" />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-800">URL slug <span className="text-rose-400">*</span></span>
                <div className="flex min-h-11 min-w-0 items-center rounded-lg border border-slate-200 bg-slate-50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/30">
                  <span className="shrink-0 pl-3.5 text-xs text-slate-500">/programs/</span>
                  <input type="text" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={formData.slug} onChange={(event) => setFormData((previous) => ({ ...previous, slug: normalizeSlug(event.target.value) }))} placeholder="syarah-kitab-at-tauhid" className="min-w-0 flex-1 bg-transparent px-1 py-2.5 pr-3 font-mono text-xs text-slate-800 outline-none" />
                </div>
                <span className="block text-xs text-slate-500">Gunakan huruf kecil, angka, dan tanda hubung. Slug menjadi alamat publik program.</span>
              </label>

              <label className="block space-y-2">
                <span className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800"><span>Deskripsi singkat</span><span className="text-xs font-normal text-slate-500">{formData.description.length}/500</span></span>
                <textarea rows={4} maxLength={500} value={formData.description} onChange={(event) => setFormData((previous) => ({ ...previous, description: event.target.value }))} placeholder="Jelaskan cakupan dan tujuan program kajian…" className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30" />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-slate-800">Status publikasi</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(STATUS_META) as ProgramStatus[]).map((status) => (
                    <label key={status} className={`cursor-pointer rounded-lg border p-3 transition-colors ${formData.status === status ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-200 bg-slate-50 hover:border-slate-600'}`}>
                      <input type="radio" name="status" value={status} checked={formData.status === status} onChange={() => setFormData((previous) => ({ ...previous, status }))} className="sr-only" />
                      <span className="block text-sm font-semibold text-slate-900">{STATUS_META[status].label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{STATUS_META[status].description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={handleCloseModal} disabled={isSaving} className="text-slate-700 hover:bg-slate-200 hover:text-slate-900">Batal</Button>
                <Button type="submit" disabled={isSaving || !formData.title.trim() || !formData.slug} className="bg-emerald-600 px-5 text-slate-900 hover:bg-emerald-500">
                  {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                  {editingProgram ? 'Simpan perubahan' : 'Buat program'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {programToDelete && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-white/85 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setProgramToDelete(null); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-program-title" aria-describedby="delete-program-description" className="w-full rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-300"><Trash2 className="h-5 w-5" aria-hidden="true" /></div>
            <h2 id="delete-program-title" className="mt-4 text-lg font-bold text-slate-900">Hapus program?</h2>
            <p id="delete-program-description" className="mt-2 text-sm leading-6 text-slate-500">“{programToDelete.title}” akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setProgramToDelete(null)} disabled={isDeleting} className="text-slate-700 hover:bg-slate-200 hover:text-slate-900">Batal</Button>
              <Button ref={deleteButtonRef} type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting} className="bg-rose-600 text-slate-900 hover:bg-rose-500">
                {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                Hapus permanen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
