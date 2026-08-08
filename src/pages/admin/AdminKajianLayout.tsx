/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * Hallmark · genre: modern-minimal · macrostructure: Program workspace · design-system: design.md · designed-as-app
 */
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useOne } from '@refinedev/core';
import { ArrowLeft, BookOpenCheck, LayoutDashboard, Users } from 'lucide-react';

interface ProgramHeader { id: string; title: string; status: 'draft' | 'published' | 'archived' }

export function AdminKajianLayout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { query, result: program } = useOne<ProgramHeader>({ resource: 'programs', id: id || '' });
  const menuItems = [
    { label: 'Ringkasan', href: `/admin/programs/${id}`, icon: LayoutDashboard },
    { label: 'Pertemuan & Materi', href: `/admin/programs/${id}/curriculum`, icon: BookOpenCheck },
    { label: 'Peserta', href: `/admin/programs/${id}/participants`, icon: Users },
  ];

  if (query.isLoading) return <div className="h-72 animate-pulse rounded-xl bg-slate-800 motion-reduce:animate-none" />;

  return (
    <div className="mx-auto max-w-[90rem] space-y-6">
      <header className="flex min-w-0 items-start gap-3 border-b border-slate-800 pb-5">
        <button type="button" onClick={() => navigate('/admin/programs')} aria-label="Kembali ke daftar program" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:bg-slate-700"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></button>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{program?.status && <span className="rounded-md bg-slate-800 px-2 py-1 text-[0.65rem] font-bold capitalize text-slate-400">{program.status}</span>}</div><h1 className="mt-1 min-w-0 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">{program?.title || 'Program tidak ditemukan'}</h1></div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav aria-label="Navigasi program" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-2 lg:flex-col">
            {menuItems.map((item) => { const Icon = item.icon; const active = location.pathname === item.href; return <Link key={item.href} to={item.href} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${active ? 'bg-emerald-950 text-emerald-200' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}><Icon className="h-4 w-4" aria-hidden="true" />{item.label}</Link>; })}
          </nav>
        </aside>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
