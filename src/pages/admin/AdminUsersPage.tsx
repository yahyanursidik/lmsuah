import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { BookOpen, KeyRound, Mail, RefreshCw, Search, ShieldCheck, Upload, UserCheck, UserPlus, Users, Edit, Eye } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { fetchWrapper } from '@/providers/dataProvider';
import { AdminParticipantAddModal } from './components/AdminParticipantAddModal';
import { AdminParticipantDetailDrawer } from './components/AdminParticipantDetailDrawer';
import { AdminParticipantImportModal, type ImportedParticipant } from './components/AdminParticipantImportModal';
import { AdminParticipantPasswordModal } from './components/AdminParticipantPasswordModal';
import { AdminParticipantEditModal, type EditParticipantFormData } from './components/AdminParticipantEditModal';

type EnrollmentItem = {
  id: string;
  userId: string;
  programId: string;
  status: string;
  enrolledAt: string;
  userName?: string;
  userEmail?: string;
};

type ProgramItem = {
  id: string;
  title: string;
  status?: string;
};

type RoleItem = {
  id: string;
  name: string;
  description?: string;
};

type UserRoleItem = {
  userId: string;
  name?: string;
  email?: string;
  roleId?: string | null;
  assignedAt?: string | null;
};

type AdminRolesPayload = {
  roles: RoleItem[];
  userRoles: UserRoleItem[];
};

type ApiEnvelope<T> = T | { data?: T };

const statusLabel: Record<string, string> = {
  active: 'Aktif',
  completed: 'Selesai',
  dropped: 'Berhenti',
};

const roleLabel: Record<string, string> = {
  super_administrator: 'Super Admin',
  administrator: 'Administrator',
  participant: 'Peserta',
};

function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate' }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    slate: 'border-slate-200 bg-slate-100 text-slate-600',
  };

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

async function readJsonPayload<T extends object>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(fallbackMessage);
  }

  const body = await response.json() as ApiEnvelope<T>;
  return 'data' in body && body.data !== undefined ? body.data : body as T;
}

export function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'enrollments'>('users');
  const [query, setQuery] = useState('');
  const [rolesPayload, setRolesPayload] = useState<AdminRolesPayload>({ roles: [], userRoles: [] });
  const [rolesError, setRolesError] = useState('');
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [assigningKey, setAssigningKey] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [passwordModalData, setPasswordModalData] = useState<{ isOpen: boolean; userId: string | null; userName: string }>({ isOpen: false, userId: null, userName: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [editModalData, setEditModalData] = useState<{ isOpen: boolean; userId: string | null; initialData: EditParticipantFormData | null }>({ isOpen: false, userId: null, initialData: null });
  const [isEditing, setIsEditing] = useState(false);

  // Manage roles popover state
  const [roleMenuUserId, setRoleMenuUserId] = useState<string | null>(null);

  const enrollments = useList<EnrollmentItem>({
    resource: 'enrollments',
    pagination: { mode: 'off' },
  });
  const programs = useList<ProgramItem>({
    resource: 'programs',
    pagination: { mode: 'off' },
  });

  const refreshRoles = async () => {
    setIsLoadingRoles(true);
    setRolesError('');
    try {
      const response = await fetchWrapper('/api/admin/roles');
      const body = await readJsonPayload<AdminRolesPayload>(response, 'Endpoint pengguna mengembalikan halaman HTML. Periksa routing API admin roles.');
      setRolesPayload({ roles: body.roles || [], userRoles: body.userRoles || [] });
    } catch (error) {
      setRolesError(error instanceof Error ? error.message : 'Data pengguna belum dapat dimuat.');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    void refreshRoles();
  }, []);

  const programById = useMemo(() => new Map((programs.result.data || []).map((program) => [program.id, program])), [programs.result.data]);
  const enrollmentsData = useMemo(() => enrollments.result.data || [], [enrollments.result.data]);

  const groupedUsers = useMemo(() => {
    const map = new Map<string, { userId: string; name: string; email: string; roles: string[]; latestAssignedAt?: string | null; enrollments: EnrollmentItem[] }>();

    rolesPayload.userRoles.forEach((item) => {
      const existing = map.get(item.userId) || {
        userId: item.userId,
        name: item.name || 'Tanpa nama',
        email: item.email || '-',
        roles: [],
        latestAssignedAt: item.assignedAt,
        enrollments: [],
      };
      if (item.roleId && !existing.roles.includes(item.roleId)) existing.roles.push(item.roleId);
      if (item.assignedAt) existing.latestAssignedAt = item.assignedAt;
      map.set(item.userId, existing);
    });

    enrollmentsData.forEach((item) => {
      const existing = map.get(item.userId) || {
        userId: item.userId,
        name: item.userName || 'Tanpa nama',
        email: item.userEmail || '-',
        roles: [],
        latestAssignedAt: null,
        enrollments: [],
      };
      existing.enrollments.push(item);
      if (item.userName) existing.name = item.userName;
      if (item.userEmail) existing.email = item.userEmail;
      map.set(item.userId, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [enrollmentsData, rolesPayload.userRoles]);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groupedUsers;
    return groupedUsers.filter((item) => [item.name, item.email, item.userId, item.roles.join(' ')].join(' ').toLowerCase().includes(needle));
  }, [groupedUsers, query]);

  const filteredEnrollments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return enrollmentsData;
    return enrollmentsData.filter((item) => {
      const program = programById.get(item.programId);
      return [item.userName, item.userEmail, item.status, program?.title].join(' ').toLowerCase().includes(needle);
    });
  }, [enrollmentsData, programById, query]);

  const activeEnrollments = enrollmentsData.filter((item) => item.status === 'active').length;
  const participantUsers = groupedUsers.filter((item) => item.roles.includes('participant') || item.enrollments.length > 0).length;
  const adminUsers = groupedUsers.filter((item) => item.roles.includes('administrator') || item.roles.includes('super_administrator')).length;

  const assignRole = async (targetUserId: string, roleId: string) => {
    const key = `${targetUserId}:${roleId}`;
    setAssigningKey(key);
    setRolesError('');
    try {
      await fetchWrapper('/api/admin/roles/assign', {
        method: 'POST',
        body: JSON.stringify({ targetUserId, roleId }),
      });
      await refreshRoles();
    } catch (error) {
      setRolesError(error instanceof Error ? error.message : 'Role belum dapat diberikan.');
    } finally {
      setAssigningKey('');
    }
  };

  const handleAddParticipant = async (data: any) => {
    setIsAdding(true);
    try {
      const res = await fetchWrapper('/api/admin/participants', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', ...data }),
      });
      if (!res.ok) {
        const err = await res.json();
        const payload = err.data || err;
        throw new Error(payload.error?.message || 'Gagal menambahkan peserta');
      }
      await refreshRoles();
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleImportParticipants = async (participants: ImportedParticipant[]) => {
    setIsImporting(true);
    try {
      const res = await fetchWrapper('/api/admin/participants', {
        method: 'POST',
        body: JSON.stringify({ action: 'import', participants }),
      });
      const data = await res.json();
      const payload = data.data || data;
      if (!res.ok) {
        throw new Error(payload.error?.message || 'Gagal mengimpor peserta');
      }
      alert(payload.message);
      await refreshRoles();
      setIsImportModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    setIsChangingPassword(true);
    try {
      const res = await fetchWrapper('/api/admin/participants', {
        method: 'PUT',
        body: JSON.stringify({ action: 'reset-password', userId, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        const payload = err.data || err;
        throw new Error(payload.error?.message || 'Gagal mengubah password');
      }
      alert('Password berhasil diubah!');
      setPasswordModalData({ isOpen: false, userId: null, userName: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEditParticipant = async (userId: string, data: EditParticipantFormData) => {
    setIsEditing(true);
    try {
      const res = await fetchWrapper('/api/admin/participants', {
        method: 'PUT',
        body: JSON.stringify({ action: 'update', userId, ...data }),
      });
      if (!res.ok) {
        const err = await res.json();
        const payload = err.data || err;
        throw new Error(payload.error?.message || 'Gagal mengupdate peserta');
      }
      await refreshRoles();
      setEditModalData({ isOpen: false, userId: null, initialData: null });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsEditing(false);
    }
  };

  // Close role menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setRoleMenuUserId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Administrasi akun</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Pengelolaan Pengguna</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola pengguna secara menyeluruh, perbarui data profil, dan atur peran sistem.</p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <button 
              type="button" 
              onClick={() => setIsImportModalOpen(true)} 
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Upload className="h-4 w-4" /> Import Massal
            </button>
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(true)} 
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <UserPlus className="h-4 w-4" /> Tambah Peserta
            </button>
            <button 
              type="button" 
              onClick={() => void refreshRoles()} 
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingRoles ? 'animate-spin' : ''}`} /> Segarkan
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200/80 bg-white text-slate-900 shadow-xs"><CardHeader className="pb-2"><CardDescription className="text-slate-500">Total pengguna terdaftar</CardDescription><CardTitle className="text-3xl font-bold text-slate-900">{groupedUsers.length}</CardTitle></CardHeader></Card>
        <Card className="border-slate-200/80 bg-white text-slate-900 shadow-xs"><CardHeader className="pb-2"><CardDescription className="text-slate-500">Peserta unik / Aktif pendaftaran</CardDescription><CardTitle className="text-3xl font-bold text-slate-900">{participantUsers} / {activeEnrollments}</CardTitle></CardHeader></Card>
        <Card className="border-slate-200/80 bg-white text-slate-900 shadow-xs"><CardHeader className="pb-2"><CardDescription className="text-slate-500">Akun pengelola (Admin)</CardDescription><CardTitle className="text-3xl font-bold text-slate-900">{adminUsers}</CardTitle></CardHeader></Card>
      </div>

      {rolesError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{rolesError}</div>}

      {/* Tabs and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-lg border border-slate-200/80 bg-slate-100/70 p-1 sm:w-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex min-w-[130px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'users' ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" /> Semua Pengguna
          </button>
          <button
            onClick={() => setActiveTab('enrollments')}
            className={`flex min-w-[130px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'enrollments' ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Data Pendaftaran
          </button>
        </div>
        
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input 
            value={query} 
            onChange={(event) => setQuery(event.target.value)} 
            placeholder="Cari berdasarkan nama, email..." 
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" 
          />
        </div>
      </div>

      {/* Main Content Area */}
      <Card className="border-slate-200/80 bg-white text-slate-900 shadow-xs overflow-hidden">
        {activeTab === 'users' ? (
          <div className="w-full overflow-x-auto">
            {isLoadingRoles && groupedUsers.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">Memuat pengguna...</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Nama Pengguna</th>
                    <th className="px-6 py-3.5">Kontak</th>
                    <th className="px-6 py-3.5">Peran & Akses</th>
                    <th className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((item) => (
                    <tr key={item.userId} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold uppercase ring-1 ring-slate-200 shadow-2xs">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors cursor-pointer" onClick={() => setSelectedUserId(item.userId)}>{item.name}</div>
                            <div className="text-xs text-slate-400">{item.enrollments.length} program diikuti</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                          <Mail className="h-3.5 w-3.5 text-slate-400" /> {item.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.roles.length === 0 && <Pill tone="slate">Belum ada role</Pill>}
                          {item.roles.map((role) => <Pill key={role} tone={role.includes('admin') ? 'amber' : 'emerald'}>{roleLabel[role] || role}</Pill>)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Lihat Detail Profil"
                            onClick={() => setSelectedUserId(item.userId)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Edit Profil"
                            onClick={() => setEditModalData({ isOpen: true, userId: item.userId, initialData: { name: item.name, phone: '' } })}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Ganti Password"
                            onClick={() => setPasswordModalData({ isOpen: true, userId: item.userId, userName: item.name })}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          
                          {/* Manage Role Button & Dropdown */}
                          <div className="relative">
                            <button
                              title="Kelola Role Akses"
                              onClick={(e) => { e.stopPropagation(); setRoleMenuUserId(roleMenuUserId === item.userId ? null : item.userId); }}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                                roleMenuUserId === item.userId 
                                  ? 'border-sky-300 bg-sky-50 text-sky-700' 
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700'
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </button>
                            
                            {roleMenuUserId === item.userId && (
                              <div 
                                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="mb-1.5 px-2 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">Tetapkan Peran</div>
                                <div className="flex flex-col gap-0.5">
                                  {rolesPayload.roles.map((role) => {
                                    const isOwned = item.roles.includes(role.id);
                                    const key = `${item.userId}:${role.id}`;
                                    return (
                                      <button 
                                        key={role.id} 
                                        disabled={isOwned || assigningKey === key} 
                                        onClick={() => { void assignRole(item.userId, role.id); setRoleMenuUserId(null); }} 
                                        className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      >
                                        <span>{roleLabel[role.id] || role.name}</span>
                                        {isOwned && <UserCheck className="h-3.5 w-3.5 text-emerald-600" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">Tidak ada pengguna yang cocok dengan pencarian Anda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            {enrollments.query.isLoading ? (
              <div className="py-16 text-center text-sm text-slate-500">Memuat data pendaftaran...</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Peserta</th>
                    <th className="px-6 py-3.5">Program</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEnrollments.map((item) => {
                    const program = programById.get(item.programId);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{item.userName || 'Tanpa nama'}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{item.userEmail || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/admin/programs/${item.programId}/participants`} className="inline-flex items-center gap-2 font-medium text-emerald-600 hover:text-emerald-700">
                            <BookOpen className="h-4 w-4" /> {program?.title || item.programId}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <Pill tone={item.status === 'active' ? 'emerald' : item.status === 'completed' ? 'sky' : 'slate'}>{statusLabel[item.status] || item.status}</Pill>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEnrollments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-400 text-sm">Tidak ada data pendaftaran yang cocok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      <AdminParticipantAddModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={handleAddParticipant} 
        isLoading={isAdding} 
      />

      <AdminParticipantDetailDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />

      <AdminParticipantImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportParticipants}
        isLoading={isImporting}
      />

      <AdminParticipantPasswordModal
        isOpen={passwordModalData.isOpen}
        userId={passwordModalData.userId}
        userName={passwordModalData.userName}
        onClose={() => setPasswordModalData({ isOpen: false, userId: null, userName: '' })}
        onSubmit={handleResetPassword}
        isLoading={isChangingPassword}
      />

      <AdminParticipantEditModal
        isOpen={editModalData.isOpen}
        userId={editModalData.userId}
        initialData={editModalData.initialData}
        onClose={() => setEditModalData({ isOpen: false, userId: null, initialData: null })}
        onSubmit={handleEditParticipant}
        isLoading={isEditing}
      />
    </div>
  );
}
