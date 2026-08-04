import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton, EmptyState, ErrorAlert } from '@/components/public/UIStates';
import { Plus, Edit3, Trash2, CheckCircle, RefreshCw, X, Users } from 'lucide-react';

interface ProgramItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export function AdminProgramsPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
  });

  const { query: listQuery, result: listResult } = useList<ProgramItem>({
    resource: 'programs',
  });

  const programsList = listResult?.data || [];
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const refetch = listQuery.refetch;

  const { mutate: createProgram, mutation: createMutation } = useCreate();
  const { mutate: updateProgram, mutation: updateMutation } = useUpdate();
  const { mutate: deleteProgram, mutation: deleteMutation } = useDelete();

  const isCreating = createMutation?.isPending || false;
  const isUpdating = updateMutation?.isPending || false;
  const isDeleting = deleteMutation?.isPending || false;

  const handleOpenCreateModal = () => {
    setEditingProgram(null);
    setFormData({
      title: '',
      slug: '',
      description: '',
      status: 'draft',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prog: ProgramItem) => {
    setEditingProgram(prog);
    setFormData({
      title: prog.title,
      slug: prog.slug,
      description: prog.description || '',
      status: prog.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProgram) {
      updateProgram(
        {
          resource: 'programs',
          id: editingProgram.id,
          values: formData,
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            refetch();
          },
        }
      );
    } else {
      createProgram(
        {
          resource: 'programs',
          values: formData,
        },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            refetch();
          },
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus program ini?')) {
      deleteProgram(
        {
          resource: 'programs',
          id,
        },
        {
          onSuccess: () => refetch(),
        }
      );
    }
  };

  const handleTogglePublish = (prog: ProgramItem) => {
    const nextStatus = prog.status === 'published' ? 'draft' : 'published';
    updateProgram(
      {
        resource: 'programs',
        id: prog.id,
        values: { status: nextStatus },
      },
      {
        onSuccess: () => refetch(),
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Badge variant="emerald">Admin CRUD Module</Badge>
          <h1 className="text-2xl font-bold text-white mt-1">Pengelolaan Program Kajian</h1>
          <p className="text-xs text-slate-400">Tambah, sunting, ubah status publikasi, atau hapus program kajian.</p>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-4"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Program Baru
        </Button>
      </div>

      {/* Main Content Area */}
      <Card className="bg-slate-950 border-slate-800 text-slate-100">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-base">Daftar Program</CardTitle>
              <CardDescription className="text-slate-400">Total: {programsList.length} Program</CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <LoadingSkeleton count={3} />
          ) : isError ? (
            <ErrorAlert
              message="Gagal mengambil data program dari server."
              onRetry={() => refetch()}
            />
          ) : programsList.length === 0 ? (
            <EmptyState
              title="Belum Ada Program"
              description="Klik tombol 'Tambah Program Baru' untuk menambahkan program kajian pertama."
              actionText="Tambah Program Baru"
              onAction={handleOpenCreateModal}
            />
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Judul Program</th>
                      <th className="p-3">Slug</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {programsList.map((prog: ProgramItem) => (
                      <tr key={prog.id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-semibold text-white">
                          {prog.title}
                          {prog.description && (
                            <p className="text-[11px] font-normal text-slate-400 line-clamp-1">{prog.description}</p>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-400">{prog.slug}</td>
                        <td className="p-3">
                          <Badge
                            variant={prog.status === 'published' ? 'success' : 'warning'}
                            dot
                          >
                            {prog.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTogglePublish(prog)}
                            className="text-slate-300 hover:text-emerald-400"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            {prog.status === 'published' ? 'Draftkan' : 'Publish'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/programs/${prog.id}`)}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          >
                            <Users className="h-3.5 w-3.5 mr-1" /> Peserta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditModal(prog)}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(prog.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (< 768px) */}
              <div className="block md:hidden space-y-4">
                {programsList.map((prog: ProgramItem) => (
                  <div
                    key={prog.id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm">{prog.title}</h3>
                        <p className="text-xs font-mono text-slate-400">/{prog.slug}</p>
                      </div>
                      <Badge variant={prog.status === 'published' ? 'success' : 'warning'} dot>
                        {prog.status}
                      </Badge>
                    </div>

                    {prog.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{prog.description}</p>
                    )}

                    <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTogglePublish(prog)}
                        className="text-xs text-emerald-400 min-h-[44px]"
                      >
                        {prog.status === 'published' ? 'Draftkan' : 'Publish'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/programs/${prog.id}`)}
                        className="border-slate-700 text-slate-300 min-h-[44px]"
                      >
                        Peserta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(prog)}
                        className="border-slate-700 text-slate-300 min-h-[44px]"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(prog.id)}
                        className="text-red-400 min-h-[44px]"
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Form Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingProgram ? 'Edit Program' : 'Tambah Program Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Judul Program *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setFormData((prev) => ({
                      ...prev,
                      title,
                      slug: editingProgram ? prev.slug : slug,
                    }));
                  }}
                  placeholder="e.g. Syarah Kitab At-Tauhid"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">URL Slug *</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g. syarah-kitab-at-tauhid"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Deskripsi</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ringkasan isi dan tujuan program kajian..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Status Publikasi</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as 'draft' | 'published' | 'archived',
                    }))
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                >
                  <option value="draft">Draft (Hanya Contributor/Admin)</option>
                  <option value="published">Published (Terlihat Publik)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white min-h-[44px]"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || isUpdating || isDeleting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-5"
                >
                  {editingProgram ? 'Simpan Perubahan' : 'Buat Program'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
