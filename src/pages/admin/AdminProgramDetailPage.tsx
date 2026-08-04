import { useParams, useNavigate } from 'react-router-dom';
import { useOne, useList } from '@refinedev/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Users, Mail, Phone, Calendar } from 'lucide-react';

interface ProgramItem {
  id: string;
  title: string;
  status: string;
}

interface EnrollmentItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  profilePhone: string;
  status: string;
  enrolledAt: string;
}

export function AdminProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { query: programQuery, result: programResult } = useOne({
    resource: 'programs',
    id: id || '',
  });

  const { query: enrollmentsQuery, result: enrollmentsResult } = useList({
    resource: 'enrollments',
    filters: [
      {
        field: 'programId',
        operator: 'eq',
        value: id,
      }
    ]
  });

  const isLoadingProgram = programQuery.isLoading;
  const isLoadingEnrollments = enrollmentsQuery.isLoading;

  const program = (programResult?.data as any) as ProgramItem | undefined;
  const enrollments = ((enrollmentsResult?.data as any) || []) as EnrollmentItem[];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/programs')} className="h-10 w-10 shrink-0 rounded-full bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <Badge variant="emerald">Detail Program</Badge>
          <h1 className="text-2xl font-bold text-white mt-1">
            {isLoadingProgram ? 'Memuat...' : program?.title}
          </h1>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-slate-200 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              Daftar Peserta Terdaftar ({enrollments.length})
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
              <p className="text-slate-500">Belum ada peserta yang mendaftar di program ini.</p>
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
                          <span className="flex items-center gap-1.5"><Mail className="w-3 h-3"/> {enrollment.userEmail}</span>
                          {enrollment.profilePhone && (
                            <span className="flex items-center gap-1.5"><Phone className="w-3 h-3"/> {enrollment.profilePhone}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          {new Date(enrollment.enrolledAt).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={enrollment.status === 'active' ? 'emerald' : 'secondary'}>
                          {enrollment.status}
                        </Badge>
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
