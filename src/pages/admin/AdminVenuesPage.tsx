import { useState } from 'react';
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton, EmptyState, ErrorAlert } from '@/components/public/UIStates';
import { Plus, Edit3, Trash2, MapPin, RefreshCw, X, ExternalLink, Search } from 'lucide-react';

interface VenueItem {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  district?: string;
  province?: string;
  googleMapsUrl?: string;
  capacity?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

export function AdminVenuesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueItem | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VenueItem['status']>('all');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    city: 'Kota Bandung',
    district: '',
    googleMapsUrl: '',
    capacity: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
  });

  const { query: listQuery, result: listResult } = useList<VenueItem>({
    resource: 'venues',
  });

  const venuesList = listResult?.data || [];
  const filteredVenues = venuesList.filter((venue) => {
    const matchesQuery = [venue.name, venue.address, venue.city, venue.district].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase()));
    return matchesQuery && (statusFilter === 'all' || venue.status === statusFilter);
  });
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const refetch = listQuery.refetch;

  const { mutate: createVenue, mutation: createMutation } = useCreate();
  const { mutate: updateVenue, mutation: updateMutation } = useUpdate();
  const { mutate: deleteVenue, mutation: deleteMutation } = useDelete();

  const isSaving = createMutation?.isPending || updateMutation?.isPending || deleteMutation?.isPending || false;

  const handleOpenCreateModal = () => {
    setEditingVenue(null);
    setFormData({
      name: '',
      slug: '',
      address: '',
      city: 'Kota Bandung',
      district: '',
      googleMapsUrl: '',
      capacity: '',
      phone: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: VenueItem) => {
    setEditingVenue(v);
    setFormData({
      name: v.name,
      slug: v.slug,
      address: v.address,
      city: v.city,
      district: v.district || '',
      googleMapsUrl: v.googleMapsUrl || '',
      capacity: v.capacity || '',
      phone: v.phone || '',
      status: v.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingVenue) {
      updateVenue(
        {
          resource: 'venues',
          id: editingVenue.id,
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
      createVenue(
        {
          resource: 'venues',
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
    if (confirm('Apakah Anda yakin ingin menghapus lokasi majelis ini?')) {
      deleteVenue(
        {
          resource: 'venues',
          id,
        },
        {
          onSuccess: () => refetch(),
        }
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Badge variant="emerald">Penyelenggaraan</Badge>
          <h1 className="mt-1 text-2xl font-bold text-white">Pengelolaan Lokasi Majelis</h1>
          <p className="text-xs text-slate-400">Satu data lokasi untuk jadwal admin, website utama, dan portal peserta.</p>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-4"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Lokasi Baru
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">{[
        ['Total lokasi', venuesList.length],
        ['Aktif', venuesList.filter((venue) => venue.status === 'active').length],
        ['Nonaktif', venuesList.filter((venue) => venue.status === 'inactive').length],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-700 bg-slate-950 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-white">{isLoading ? '—' : value}</p></div>)}</div>

      <Card className="bg-slate-950 border-slate-800 text-slate-100">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-base">Daftar Lokasi Majelis</CardTitle>
              <CardDescription className="text-slate-400">Cari, periksa status, lalu buka tampilan publik.</CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Segarkan
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Cari lokasi</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, alamat, atau kota…" className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 pl-10 pr-3 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" /></label><select aria-label="Filter status lokasi" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-emerald-500"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div>
          {isLoading ? (
            <LoadingSkeleton count={2} />
          ) : isError ? (
            <ErrorAlert
              message="Gagal mengambil data lokasi dari server."
              onRetry={() => refetch()}
            />
          ) : filteredVenues.length === 0 ? (
            <EmptyState
              title="Belum Ada Lokasi Majelis"
              description="Klik 'Tambah Lokasi Baru' untuk memasukkan lokasi majelis masjid."
              actionText="Tambah Lokasi Baru"
              onAction={handleOpenCreateModal}
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Nama Masjid/Lokasi</th>
                      <th className="p-3">Alamat</th>
                      <th className="p-3">Kota</th>
                      <th className="p-3">Google Maps</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredVenues.map((v: VenueItem) => (
                      <tr key={v.id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-400" />
                            <span>{v.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-400 max-w-xs truncate">{v.address}</td>
                        <td className="p-3 text-slate-300">{v.city}</td>
                        <td className="p-3">
                          {v.googleMapsUrl ? (
                            <a
                              href={v.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              Peta <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant={v.status === 'active' ? 'success' : 'warning'} dot>
                            {v.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditModal(v)}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(v.id)}
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

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {filteredVenues.map((v: VenueItem) => (
                  <div key={v.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                        <h3 className="font-bold text-white text-sm">{v.name}</h3>
                      </div>
                      <Badge variant={v.status === 'active' ? 'success' : 'warning'} dot>
                        {v.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">{v.address}, {v.city}</p>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(v)}
                        className="border-slate-700 text-slate-300 min-h-[44px]"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(v.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingVenue ? 'Edit Lokasi Majelis' : 'Tambah Lokasi Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nama Masjid / Majelis *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setFormData((prev) => ({
                      ...prev,
                      name,
                      slug: editingVenue ? prev.slug : slug,
                    }));
                  }}
                  placeholder="e.g. Masjid Umar bin Khattab"
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
                  placeholder="e.g. masjid-umar-bin-khattab"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Alamat Lengkap *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Jl. Selat Karimata No. 12, Komplek Radio Rodja Bandung..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Kecamatan</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                    placeholder="e.g. Ujungberung"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Kota / Kabupaten *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g. Kota Bandung"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Tautan Google Maps</label>
                <input
                  type="url"
                  value={formData.googleMapsUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, googleMapsUrl: e.target.value }))}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Kapasitas Jamaah</label>
                  <input
                    type="text"
                    value={formData.capacity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                    placeholder="e.g. 1.500 Jamaah"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nomor Telepon / WA</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 0811-2233-4455"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                  />
                </div>
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
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-5"
                >
                  {editingVenue ? 'Simpan Perubahan' : 'Buat Lokasi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
