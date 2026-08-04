import { useState } from 'react';
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton, EmptyState, ErrorAlert } from '@/components/public/UIStates';
import { Plus, Edit3, Trash2, Calendar, RefreshCw, X, AlertTriangle } from 'lucide-react';

interface ScheduleItem {
  id: string;
  venueId: string;
  programId?: string;
  title: string;
  speaker: string;
  category?: string;
  type: 'Rutin' | 'Tematik' | 'Special';
  day: string;
  date: string;
  startTime?: string;
  endTime?: string;
  timezone: string;
  status: 'Rutin' | 'Dibatalkan' | 'Diundur' | 'Pindah Lokasi';
  statusReason?: string;
  isLiveStream?: boolean;
  streamUrl?: string;
}

interface VenueItem {
  id: string;
  name: string;
}

export function AdminSchedulesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

  const [formData, setFormData] = useState({
    venueId: '',
    title: '',
    speaker: 'Ustadz Abu Haidar As-Sundawy',
    category: 'Fiqih',
    type: 'Rutin' as 'Rutin' | 'Tematik' | 'Special',
    day: 'Sabtu',
    date: '08 Februari 2026',
    startTime: '09:00',
    endTime: '11:30',
    timezone: 'Asia/Jakarta',
    status: 'Rutin' as 'Rutin' | 'Dibatalkan' | 'Diundur' | 'Pindah Lokasi',
    statusReason: '',
    isLiveStream: true,
    streamUrl: 'https://youtube.com/@TarbiyahSunnah',
  });

  const { query: schedulesQuery, result: schedulesResult } = useList<ScheduleItem>({
    resource: 'schedules',
  });

  const { result: venuesResult } = useList<VenueItem>({
    resource: 'venues',
  });

  const schedulesList = schedulesResult?.data || [];
  const venuesList = venuesResult?.data || [];
  const isLoading = schedulesQuery.isLoading;
  const isError = schedulesQuery.isError;
  const refetch = schedulesQuery.refetch;

  const { mutate: createSchedule, mutation: createMutation } = useCreate();
  const { mutate: updateSchedule, mutation: updateMutation } = useUpdate();
  const { mutate: deleteSchedule, mutation: deleteMutation } = useDelete();

  const isSaving = createMutation?.isPending || updateMutation?.isPending || deleteMutation?.isPending || false;

  const handleOpenCreateModal = () => {
    setEditingSchedule(null);
    setFormData({
      venueId: venuesList[0]?.id || '',
      title: '',
      speaker: 'Ustadz Abu Haidar As-Sundawy',
      category: 'Fiqih',
      type: 'Rutin',
      day: 'Sabtu',
      date: '08 Februari 2026',
      startTime: '09:00',
      endTime: '11:30',
      timezone: 'Asia/Jakarta',
      status: 'Rutin',
      statusReason: '',
      isLiveStream: true,
      streamUrl: 'https://youtube.com/@TarbiyahSunnah',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sch: ScheduleItem) => {
    setEditingSchedule(sch);
    setFormData({
      venueId: sch.venueId,
      title: sch.title,
      speaker: sch.speaker,
      category: sch.category || 'Fiqih',
      type: sch.type,
      day: sch.day,
      date: sch.date,
      startTime: sch.startTime || '',
      endTime: sch.endTime || '',
      timezone: sch.timezone || 'Asia/Jakarta',
      status: sch.status,
      statusReason: sch.statusReason || '',
      isLiveStream: sch.isLiveStream ?? true,
      streamUrl: sch.streamUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSchedule) {
      updateSchedule(
        {
          resource: 'schedules',
          id: editingSchedule.id,
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
      createSchedule(
        {
          resource: 'schedules',
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
    if (confirm('Apakah Anda yakin ingin menghapus jadwal kajian ini?')) {
      deleteSchedule(
        {
          resource: 'schedules',
          id,
        },
        {
          onSuccess: () => refetch(),
        }
      );
    }
  };

  const getStatusBadge = (status: ScheduleItem['status']) => {
    switch (status) {
      case 'Dibatalkan':
        return <Badge variant="destructive" dot>Dibatalkan</Badge>;
      case 'Diundur':
        return <Badge variant="warning" dot>Diundur</Badge>;
      case 'Pindah Lokasi':
        return <Badge variant="warning" dot>Pindah Lokasi</Badge>;
      default:
        return <Badge variant="success" dot>Rutin</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Badge variant="emerald">Admin Module</Badge>
          <h1 className="text-2xl font-bold text-white mt-1">Pengelolaan Jadwal Kajian & Perubahan Status</h1>
          <p className="text-xs text-slate-400">Atur jadwal rutin/tematik dan informasikan perubahan (Dibatalkan/Diundur/Pindah Lokasi) dalam zona WIB (Asia/Jakarta).</p>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-4"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Jadwal Baru
        </Button>
      </div>

      <Card className="bg-slate-950 border-slate-800 text-slate-100">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-base">Daftar Jadwal Kajian</CardTitle>
              <CardDescription className="text-slate-400">Total: {schedulesList.length} Agenda Kajian</CardDescription>
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
              message="Gagal mengambil data jadwal dari server."
              onRetry={() => refetch()}
            />
          ) : schedulesList.length === 0 ? (
            <EmptyState
              title="Belum Ada Jadwal Kajian"
              description="Klik 'Tambah Jadwal Baru' untuk menjadwalkan agenda majelis taklim."
              actionText="Tambah Jadwal Baru"
              onAction={handleOpenCreateModal}
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Judul Kajian</th>
                      <th className="p-3">Hari & Tanggal</th>
                      <th className="p-3">Waktu (WIB)</th>
                      <th className="p-3">Pemateri</th>
                      <th className="p-3">Status Agenda</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {schedulesList.map((sch: ScheduleItem) => (
                      <tr key={sch.id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
                            <div>
                              <span>{sch.title}</span>
                              {sch.statusReason && (
                                <p className="text-[11px] font-normal text-amber-300 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>{sch.statusReason}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-300">{sch.day}, {sch.date}</td>
                        <td className="p-3 font-mono text-emerald-400">{sch.startTime} - {sch.endTime} WIB</td>
                        <td className="p-3 text-slate-300">{sch.speaker}</td>
                        <td className="p-3">{getStatusBadge(sch.status)}</td>
                        <td className="p-3 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditModal(sch)}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Status
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(sch.id)}
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
                {schedulesList.map((sch: ScheduleItem) => (
                  <div key={sch.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-white text-sm">{sch.title}</h3>
                      {getStatusBadge(sch.status)}
                    </div>
                    <p className="text-xs text-slate-400">{sch.day}, {sch.date} • {sch.startTime}-{sch.endTime} WIB</p>

                    {sch.statusReason && (
                      <div className="rounded-lg bg-amber-950/60 border border-amber-800/80 p-2.5 text-xs text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                        <span><strong>Alasan Perubahan:</strong> {sch.statusReason}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(sch)}
                        className="border-slate-700 text-slate-300 min-h-[44px]"
                      >
                        Edit Status
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(sch.id)}
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
                {editingSchedule ? 'Edit Status & Informasi Jadwal' : 'Tambah Jadwal Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Judul Kajian *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Kajian Rutin Syarah Bulughul Maram"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Lokasi Majelis *</label>
                <select
                  required
                  value={formData.venueId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, venueId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                >
                  {venuesList.map((v: VenueItem) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Hari *</label>
                  <input
                    type="text"
                    required
                    value={formData.day}
                    onChange={(e) => setFormData((prev) => ({ ...prev, day: e.target.value }))}
                    placeholder="e.g. Sabtu"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Tanggal *</label>
                  <input
                    type="text"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    placeholder="e.g. 08 Februari 2026"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Waktu Mulai (WIB)</label>
                  <input
                    type="text"
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                    placeholder="09:00"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Waktu Selesai (WIB)</label>
                  <input
                    type="text"
                    value={formData.endTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                    placeholder="11:30"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Status Change Selection */}
              <div className="space-y-1 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                <label className="text-xs font-bold text-amber-300 block mb-1">Status Keberlangsungan Jadwal</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as ScheduleItem['status'],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none min-h-[44px]"
                >
                  <option value="Rutin">Rutin (Sesuai Jadwal)</option>
                  <option value="Dibatalkan">Dibatalkan (Pekan Ini Libur)</option>
                  <option value="Diundur">Diundur (Bergeser Waktu)</option>
                  <option value="Pindah Lokasi">Pindah Lokasi Majelis</option>
                </select>

                {formData.status !== 'Rutin' && (
                  <div className="mt-3 space-y-1">
                    <label className="text-xs font-semibold text-amber-200">Catatan / Alasan Perubahan *</label>
                    <textarea
                      rows={2}
                      required
                      value={formData.statusReason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, statusReason: e.target.value }))}
                      placeholder="e.g. Berhubung Ustadz berhalangan hadir / Tempat dipindah ke Masjid Al-Ukhuwah..."
                      className="w-full rounded-xl border border-amber-900/80 bg-slate-950 px-3.5 py-2 text-xs text-amber-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}
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
                  {editingSchedule ? 'Simpan Perubahan' : 'Buat Jadwal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
