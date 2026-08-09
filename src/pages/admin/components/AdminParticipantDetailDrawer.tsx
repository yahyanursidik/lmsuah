import { useEffect, useState } from 'react';
import { X, User, Mail, Phone, BookOpen, Clock, Activity } from 'lucide-react';
import { fetchWrapper } from '@/providers/dataProvider';

type ParticipantProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

type Enrollment = {
  id: string;
  programId: string;
  status: string;
  enrolledAt: string;
};

type ParticipantDetailData = {
  participant: ParticipantProfile;
  enrollments: Enrollment[];
};

interface AdminParticipantDetailDrawerProps {
  userId: string | null;
  onClose: () => void;
}

export function AdminParticipantDetailDrawer({ userId, onClose }: AdminParticipantDetailDrawerProps) {
  const [data, setData] = useState<ParticipantDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetchWrapper(`/api/admin/participants?id=${userId}`);
        const result = await response.json();
        const payload = result.data || result;
        if (response.ok && payload.participant) {
          setData(payload);
        } else {
          throw new Error(payload.error || 'Gagal memuat detail peserta');
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat memuat data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Detail Peserta</h2>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="text-sm text-slate-500">Memuat data...</div>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : data ? (
            <div className="space-y-8">
              {/* Profile Section */}
              <section>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-700 border border-slate-200 shadow-2xs">
                    {data.participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{data.participant.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bergabung {new Date(data.participant.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{data.participant.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    {data.participant.phone || <span className="italic text-slate-400">Tidak ada nomor HP</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-slate-500 text-xs font-medium">ID:</span>
                    <span className="font-mono text-xs text-slate-600 truncate">{data.participant.id}</span>
                  </div>
                </div>
              </section>

              {/* Enrollments Section */}
              <section>
                <h4 className="mb-3 flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  Program Diikuti ({data.enrollments.length})
                </h4>
                
                {data.enrollments.length > 0 ? (
                  <div className="space-y-2.5">
                    {data.enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 text-sm">
                            {enrollment.programId}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                            enrollment.status === 'active' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                              : enrollment.status === 'completed'
                              ? 'bg-sky-50 border-sky-200 text-sky-700'
                              : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                            {enrollment.status === 'active' ? 'Aktif' : enrollment.status === 'completed' ? 'Selesai' : enrollment.status}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {new Date(enrollment.enrolledAt).toLocaleDateString('id-ID')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-slate-400" />
                            Progres: N/A
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center">
                    <p className="text-sm text-slate-500">Belum mengikuti program apapun</p>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
