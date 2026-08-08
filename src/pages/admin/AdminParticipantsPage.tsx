import { useParams } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Users } from 'lucide-react';

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

  const { query: enrollmentsQuery, result: enrollmentsResult } = useList<EnrollmentItem>({
    resource: 'enrollments',
    filters: [{ field: 'programId', operator: 'eq', value: id }]
  });

  const isLoadingEnrollments = enrollmentsQuery.isLoading;
  const enrollments = enrollmentsResult?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Data Peserta Terdaftar</h2>
          <p className="text-sm text-slate-400">Daftar peserta yang mengikuti kajian ini.</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-slate-200 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              Total Peserta: {enrollments.length}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingEnrollments ? (
            <div className="p-8 text-center text-slate-400">Memuat daftar peserta...</div>
          ) : enrollments.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Users className="h-12 w-12 text-slate-700 mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-1">Belum Ada Peserta</h3>
              <p className="text-slate-500">Belum ada peserta yang mendaftar di kajian ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nama Peserta</th>
                    <th className="px-6 py-4 font-medium">Kontak</th>
                    <th className="px-6 py-4 font-medium">Tanggal Daftar</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {enrollments.map((enrollment: EnrollmentItem) => (
                    <tr key={enrollment.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-200">
                        {enrollment.userName || 'Tanpa Nama'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-400">
                          <span>{enrollment.userEmail || '-'}</span>
                          <span>{enrollment.profilePhone || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(enrollment.enrolledAt).toLocaleDateString('id-ID', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          enrollment.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                          enrollment.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-slate-500/10 text-slate-400'
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
    </div>
  );
}
