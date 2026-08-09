import { useState } from 'react';
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton, EmptyState, ErrorAlert } from '@/components/public/UIStates';
import { Plus, Edit3, Trash2, Calendar, RefreshCw, X, AlertTriangle, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

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
interface ProgramItem { id: string; title: string; status?: string }
const today = new Date().toISOString().slice(0, 10);

export function AdminSchedulesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ScheduleItem['status']>('all');

  const [formData, setFormData] = useState({
    venueId: '',
    programId: '',
    title: '',
    speaker: 'Ustadz Abu Haidar As-Sundawy',
    category: 'Fiqih',
    type: 'Rutin' as 'Rutin' | 'Tematik' | 'Special',
    day: 'Sabtu',
    date: today,
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
  const { result: programsResult } = useList<ProgramItem>({ resource: 'programs', pagination: { mode: 'off' } });

  const schedulesList = schedulesResult?.data || [];
  const venuesList = venuesResult?.data || [];
  const programsList = programsResult.data || [];
  const filteredSchedules = schedulesList.filter((schedule) => {
    const venueName = venuesList.find((venue) => venue.id === schedule.venueId)?.name || '';
    const matchesQuery = [schedule.title, schedule.speaker, schedule.category, venueName].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase()));
    return matchesQuery && (statusFilter === 'all' || schedule.status === statusFilter);
  });
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
      programId: '',
      title: '',
      speaker: 'Ustadz Abu Haidar As-Sundawy',
      category: 'Fiqih',
      type: 'Rutin',
      day: 'Sabtu',
      date: today,
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
      programId: sch.programId || '',
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Badge variant="emerald">Penyelenggaraan</Badge>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Pengelolaan Jadwal Kajian</h1>
          <p className="text-xs text-slate-500">Hubungkan agenda ke program dan lokasi, lalu publikasikan perubahan ke website serta portal peserta.</p>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-slate-900 min-h-[44px] px-4"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Jadwal Baru
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ['Total agenda', schedulesList.length],
        ['Sesuai jadwal', schedulesList.filter((item) => item.status === 'Rutin').length],
        ['Ada perubahan', schedulesList.filter((item) => item.status !== 'Rutin').length],
        ['Siaran live', schedulesList.filter((item) => item.isLiveStream).length],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{isLoading ? '—' : value}</p></div>)}</div>

      <Card className="bg-white border-slate-200 text-slate-900">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-900 text-base">Daftar Jadwal Kajian</CardTitle>
              <CardDescription className="text-slate-500">Semua perubahan tampil pada kanal publik yang terhubung.</CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="text-slate-500 hover:text-slate-900"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Segarkan
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Cari jadwal</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari agenda, pemateri, atau lokasi…" className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20" /></label><select aria-label="Filter status jadwal" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-400"><option value="all">Semua status</option><option value="Rutin">Sesuai jadwal</option><option value="Diundur">Diundur</option><option value="Pindah Lokasi">Pindah lokasi</option><option value="Dibatalkan">Dibatalkan</option></select><Link to="/schedules" target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-800 hover:bg-slate-200"><ExternalLink className="h-4 w-4" /> Lihat publik</Link></div>
          {isLoading ? (
            <LoadingSkeleton count={3} />
          ) : isError ? (
            <ErrorAlert
              message="Gagal mengambil data jadwal dari server."
              onRetry={() => refetch()}
            />
          ) : filteredSchedules.length === 0 ? (
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
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Judul Kajian</th>
                      <th className="p-3">Hari & Tanggal</th>
                      <th className="p-3">Waktu (WIB)</th>
                      <th className="p-3">Pemateri</th>
                      <th className="p-3">Status Agenda</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredSchedules.map((sch: ScheduleItem) => (
                      <tr key={sch.id} className="hover:bg-slate-50 hover:bg-slate-100">
                        <td className="p-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div>
                              <span>{sch.title}</span>
                              {sch.statusReason && (
                                <p className="text-[11px] font-normal text-amber-700 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>{sch.statusReason}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-700">{sch.day}, {sch.date}</td>
                        <td className="p-3 font-mono text-emerald-600">{sch.startTime} - {sch.endTime} WIB</td>
                        <td className="p-3 text-slate-700">{sch.speaker}</td>
                        <td className="p-3">{getStatusBadge(sch.status)}</td>
                        <td className="p-3 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditModal(sch)}
                            className="border-slate-200 text-slate-700 hover:bg-slate-200"
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
                {filteredSchedules.map((sch: ScheduleItem) => (
                  <div key={sch.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">{sch.title}</h3>
                      {getStatusBadge(sch.status)}
                    </div>
                    <p className="text-xs text-slate-500">{sch.day}, {sch.date} • {sch.startTime}-{sch.endTime} WIB</p>

                    {sch.statusReason && (
                      <div className="rounded-lg bg-amber-50/60 border border-amber-800/80 p-2.5 text-xs text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <span><strong>Alasan Perubahan:</strong> {sch.statusReason}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(sch)}
                        className="border-slate-200 text-slate-700 min-h-[44px]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 sm:p-6 overflow-y-auto backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-auto relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSchedule ? 'Edit Jadwal Kajian' : 'Tambah Jadwal Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6 custom-scrollbar">
              <form id="schedule-form" onSubmit={handleSubmit} className="space-y-8">
                
                {/* Informasi Kajian */}
                <section>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">1</span>
                    Informasi Kajian
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Judul Kajian <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Kajian Rutin Syarah Bulughul Maram"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Tipe Agenda <span className="text-rose-500">*</span></label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as any }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                      >
                        <option value="Rutin">Kajian Rutin</option>
                        <option value="Tematik">Kajian Tematik</option>
                        <option value="Special">Acara Khusus / Tabligh Akbar</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Kategori Topik</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g. Fiqih / Aqidah"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Program Terkait <span className="text-slate-400 font-normal">(opsional)</span></label>
                      <select
                        value={formData.programId}
                        onChange={(event) => setFormData((previous) => ({ ...previous, programId: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                      >
                        <option value="">-- Agenda Umum (Bukan bagian program) --</option>
                        {programsList.map((program) => (
                          <option key={program.id} value={program.id}>{program.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <hr className="border-slate-100" />

                {/* Pelaksanaan */}
                <section>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">2</span>
                    Waktu & Tempat Pelaksanaan
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Tanggal <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => {
                          const dateObj = new Date(e.target.value);
                          const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                          const dayName = (!isNaN(dateObj.getTime()) ? days[dateObj.getDay()] : formData.day) || formData.day;
                          setFormData((prev) => ({ ...prev, date: e.target.value, day: dayName }));
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Hari <span className="text-rose-500">*</span></label>
                      <select
                        required
                        value={formData.day}
                        onChange={(e) => setFormData((prev) => ({ ...prev, day: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                      >
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Waktu Mulai (WIB)</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Waktu Selesai (WIB)</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Lokasi Majelis <span className="text-rose-500">*</span></label>
                      <select
                        required
                        value={formData.venueId}
                        onChange={(e) => setFormData((prev) => ({ ...prev, venueId: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                      >
                        <option value="" disabled>Pilih lokasi majelis...</option>
                        {venuesList.map((v: VenueItem) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 mt-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <div className="flex h-5 items-center">
                          <input
                            type="checkbox"
                            checked={formData.isLiveStream}
                            onChange={(e) => setFormData((prev) => ({ ...prev, isLiveStream: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Siaran Langsung (Live Streaming)</p>
                          <p className="text-xs text-slate-500">Tandai jika kajian ini disiarkan secara online.</p>
                        </div>
                      </label>
                      
                      {formData.isLiveStream && (
                        <div className="mt-3 pl-7">
                          <input
                            type="url"
                            value={formData.streamUrl}
                            onChange={(e) => setFormData((prev) => ({ ...prev, streamUrl: e.target.value }))}
                            placeholder="https://youtube.com/live/..."
                            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <hr className="border-slate-100" />

                {/* Status Keberlangsungan */}
                <section>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">3</span>
                    Status Jadwal
                  </h4>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Status Saat Ini</label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            status: e.target.value as ScheduleItem['status'],
                            statusReason: e.target.value === 'Rutin' ? '' : prev.statusReason
                          }))
                        }
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium focus:ring-1 focus:outline-none transition-shadow ${
                          formData.status === 'Rutin' 
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 focus:border-emerald-500 focus:ring-emerald-500' 
                            : 'border-amber-200 bg-amber-50 text-amber-900 focus:border-amber-500 focus:ring-amber-500'
                        }`}
                      >
                        <option value="Rutin">✅ Berjalan Sesuai Jadwal (Rutin)</option>
                        <option value="Dibatalkan">❌ Dibatalkan (Libur)</option>
                        <option value="Diundur">🕒 Diundur (Perubahan Waktu)</option>
                        <option value="Pindah Lokasi">📍 Pindah Lokasi</option>
                      </select>
                    </div>

                    {formData.status !== 'Rutin' && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          Alasan Perubahan <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={formData.statusReason}
                          onChange={(e) => setFormData((prev) => ({ ...prev, statusReason: e.target.value }))}
                          placeholder="Berikan alasan untuk jamaah (contoh: Ustadz berhalangan hadir...)"
                          className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-shadow"
                        />
                      </div>
                    )}
                  </div>
                </section>
              </form>
            </div>
            
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 shrink-0 bg-slate-50 rounded-b-2xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-700 bg-white hover:bg-slate-50 min-h-[44px]"
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="schedule-form"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-6 font-semibold shadow-sm"
              >
                {isSaving ? 'Menyimpan...' : (editingSchedule ? 'Simpan Perubahan' : 'Buat Jadwal')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
