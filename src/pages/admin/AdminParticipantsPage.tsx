import { useParams } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { ErrorAlert } from '../../components/public/UIStates';

interface EnrollmentItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  profilePhone: string;
  status: string;
  enrolledAt: string;
}

export function AdminParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { query: enrollmentsQuery, result: enrollmentsResult } = useList<EnrollmentItem>({
    resource: 'enrollments',
    filters: [{ field: 'programId', operator: 'eq', value: id }],
    pagination: { mode: 'off' },
  });

  const isLoadingEnrollments = enrollmentsQuery.isLoading;
  const enrollments = enrollmentsResult?.data || [];
  const filtered = enrollments.filter(item => (status === 'all' || item.status === status) && `${item.userName} ${item.userEmail}`.toLowerCase().includes(search.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 25));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * 25, currentPage * 25);
  if (enrollmentsQuery.isError) return <ErrorAlert message="Peserta gagal dimuat. Ini bukan berarti belum ada pendaftaran." onRetry={() => enrollmentsQuery.refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row"><label className="flex-1 text-sm font-semibold">Cari peserta<input value={search} onChange={event => setSearch(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" placeholder="Nama atau email…" /></label><label className="text-sm font-semibold">Status<select value={status} onChange={event => setStatus(event.target.value)} className="mt-2 block min-h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="all">Semua</option><option value="active">Aktif</option><option value="completed">Selesai</option><option value="dropped">Berhenti</option></select></label></div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Data Peserta Terdaftar</h2>
          <p className="text-sm text-slate-500">Daftar peserta yang mengikuti kajian ini.</p>
        </div>
      </div>

      <Card className="bg-slate-50 border-slate-200">
        <CardHeader className="border-b border-slate-200 bg-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-slate-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              Total Peserta: {enrollments.length}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingEnrollments ? (
            <div className="p-8 text-center text-slate-500">Memuat daftar peserta...</div>
          ) : enrollments.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Users className="h-12 w-12 text-slate-700 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-1">Belum Ada Peserta</h3>
              <p className="text-slate-500">Belum ada peserta yang mendaftar di kajian ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="text-xs uppercase bg-white text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nama Peserta</th>
                    <th className="px-6 py-4 font-medium">Kontak</th>
                    <th className="px-6 py-4 font-medium">Tanggal Daftar</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50">
                  {rows.map((enrollment: EnrollmentItem) => (
                    <tr key={enrollment.id} className="hover:bg-slate-200/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {enrollment.userName || 'Tanpa Nama'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-500">
                          <span>{enrollment.userEmail || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(enrollment.enrolledAt).toLocaleDateString('id-ID', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          enrollment.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                          enrollment.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-slate-500/10 text-slate-500'
                        }`}>
                          {enrollment.status === 'active' ? 'Aktif' : enrollment.status === 'completed' ? 'Selesai' : enrollment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {filtered.length === 0 && enrollments.length > 0 && <p role="status" className="text-sm text-slate-600">Tidak ada peserta yang cocok dengan filter.</p>}
      {pageCount > 1 && <nav aria-label="Halaman peserta" className="flex flex-wrap items-center justify-between gap-3 text-sm"><button className="min-h-11 rounded-lg border px-4" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Sebelumnya</button><span>Halaman {currentPage} dari {pageCount} · {filtered.length} peserta</span><button className="min-h-11 rounded-lg border px-4" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Berikutnya</button></nav>}
    </div>
  );
}
