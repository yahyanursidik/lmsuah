import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { Award, BookOpen, Mail, RefreshCw, Search, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { fetchWrapper } from '@/providers/dataProvider';

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
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    slate: 'border-slate-700 bg-slate-800 text-slate-300',
  };

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
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
  const [query, setQuery] = useState('');
  const [rolesPayload, setRolesPayload] = useState<AdminRolesPayload>({ roles: [], userRoles: [] });
  const [rolesError, setRolesError] = useState('');
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [assigningKey, setAssigningKey] = useState('');

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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-400">Administrasi akun</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Pengelolaan Peserta & Pengguna</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Pantau peserta lintas program, lihat role akun, dan berikan akses admin dari satu halaman kerja.</p>
          </div>
          <button type="button" onClick={() => void refreshRoles()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-200 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
            <RefreshCw className={`h-4 w-4 ${isLoadingRoles ? 'animate-spin' : ''}`} /> Segarkan
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-950 text-slate-100"><CardHeader><CardDescription>Total pengguna</CardDescription><CardTitle className="text-3xl text-white">{groupedUsers.length}</CardTitle></CardHeader></Card>
        <Card className="border-slate-800 bg-slate-950 text-slate-100"><CardHeader><CardDescription>Peserta unik / aktif</CardDescription><CardTitle className="text-3xl text-white">{participantUsers} / {activeEnrollments}</CardTitle></CardHeader></Card>
        <Card className="border-slate-800 bg-slate-950 text-slate-100"><CardHeader><CardDescription>Akun pengelola</CardDescription><CardTitle className="text-3xl text-white">{adminUsers}</CardTitle></CardHeader></Card>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, email, role, atau program..." className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" />
      </div>

      {rolesError && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">{rolesError}</div>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <Card className="border-slate-800 bg-slate-950 text-slate-100">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-emerald-400" /> Pengguna & Peran</CardTitle>
            <CardDescription>Daftar akun dari profil dan role RBAC.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingRoles && groupedUsers.length === 0 ? <div className="p-8 text-center text-sm text-slate-400">Memuat pengguna...</div> : (
              <div className="divide-y divide-slate-800">
                {filteredUsers.map((item) => (
                  <article key={item.userId} className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-bold text-white">{item.name}</h2>{item.roles.length === 0 && <Pill>Belum ada role</Pill>}{item.roles.map((role) => <Pill key={role} tone={role.includes('admin') ? 'amber' : 'emerald'}>{roleLabel[role] || role}</Pill>)}</div>
                      <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{item.email}</span></p>
                      <p className="mt-2 text-xs text-slate-500">{item.enrollments.length} program diikuti</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {rolesPayload.roles.map((role) => {
                        const isOwned = item.roles.includes(role.id);
                        const key = `${item.userId}:${role.id}`;
                        return (
                          <button key={role.id} type="button" disabled={isOwned || assigningKey === key} onClick={() => void assignRole(item.userId, role.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-bold text-slate-300 hover:border-emerald-600 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-45">
                            <ShieldCheck className="h-3.5 w-3.5" /> {isOwned ? 'Sudah ' : 'Jadikan '}{roleLabel[role.id] || role.name}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
                {filteredUsers.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Tidak ada pengguna yang cocok.</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950 text-slate-100">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="flex items-center gap-2 text-white"><UserCheck className="h-5 w-5 text-emerald-400" /> Peserta Program</CardTitle>
            <CardDescription>Pendaftaran terbaru dari seluruh program kajian.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {enrollments.query.isLoading ? <div className="p-8 text-center text-sm text-slate-400">Memuat pendaftaran...</div> : (
              <div className="divide-y divide-slate-800">
                {filteredEnrollments.map((item) => {
                  const program = programById.get(item.programId);
                  return (
                    <article key={item.id} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><h3 className="truncate text-sm font-bold text-white">{item.userName || 'Tanpa nama'}</h3><p className="mt-1 truncate text-xs text-slate-500">{item.userEmail || '-'}</p></div>
                        <Pill tone={item.status === 'active' ? 'emerald' : item.status === 'completed' ? 'sky' : 'slate'}>{statusLabel[item.status] || item.status}</Pill>
                      </div>
                      <Link to={`/admin/programs/${item.programId}/participants`} className="mt-3 inline-flex max-w-full items-center gap-2 text-xs font-bold text-emerald-300 hover:text-emerald-200">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{program?.title || item.programId}</span>
                      </Link>
                    </article>
                  );
                })}
                {filteredEnrollments.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Belum ada pendaftaran yang cocok.</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-800 bg-slate-950 text-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white"><Award className="h-5 w-5 text-emerald-400" /> Role tersedia</CardTitle>
          <CardDescription>Role berasal dari konfigurasi RBAC server.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {rolesPayload.roles.map((role) => <Pill key={role.id} tone={role.id.includes('admin') ? 'amber' : 'emerald'}>{roleLabel[role.id] || role.name}</Pill>)}
          {rolesPayload.roles.length === 0 && <span className="text-sm text-slate-500">Role belum dimuat.</span>}
        </CardContent>
      </Card>
    </div>
  );
}
