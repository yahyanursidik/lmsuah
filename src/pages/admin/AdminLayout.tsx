/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * Hallmark · genre: modern-minimal · macrostructure: Workbench shell · design-system: design.md · designed-as-app
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useGetIdentity, useLogout } from '@refinedev/core';
import {
  BookOpen,
  Calendar,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Settings,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';

type Identity = { id: string; name?: string; email?: string; role?: string; avatar?: string };
type NavItem = { label: string; href: string; icon: LucideIcon };

const primaryItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Program Kajian', href: '/admin/programs', icon: BookOpen },
];

const operationItems: NavItem[] = [
  { label: 'Peserta & Pengguna', href: '/admin/users', icon: UsersRound },
  { label: 'Lokasi Majelis', href: '/admin/venues', icon: MapPin },
  { label: 'Jadwal & Agenda', href: '/admin/schedules', icon: Calendar },
];

const systemItems: NavItem[] = [
  { label: 'Pengaturan Sistem', href: '/admin/settings', icon: Settings },
];

const pageTitles: Array<[string, string]> = [
  ['/admin/programs', 'Program Kajian'],
  ['/admin/lessons', 'Program Kajian'],
  ['/admin/users', 'Peserta & Pengguna'],
  ['/admin/venues', 'Lokasi Majelis'],
  ['/admin/schedules', 'Jadwal & Agenda'],
  ['/admin/settings', 'Pengaturan Sistem'],
  ['/admin', 'Dashboard'],
];

export function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<Identity>();

  useEffect(() => setIsMobileMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileMenuOpen]);

  const pageTitle = useMemo(() => pageTitles.find(([path]) => path === '/admin' ? location.pathname === path : location.pathname.startsWith(path))?.[1] ?? 'Admin', [location.pathname]);
  const displayName = identity?.name || identity?.email || 'Administrator';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AD';
  const isActive = (href: string) => href === '/admin' ? location.pathname === href : location.pathname === href || location.pathname.startsWith(`${href}/`);

  const navSection = (title: string, items: NavItem[]) => (
    <div>
      <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-600">{title}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} to={item.href} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${active ? 'border-emerald-800 bg-emerald-950 text-emerald-200' : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-100'}`}>
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-emerald-400' : ''}`} aria-hidden="true" /><span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  const sidebarContent = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5">
        <img src="/logo-abu-haidar.jpg" alt="" className="h-10 w-10 rounded-xl border border-amber-400/30 object-cover" />
        <div className="min-w-0"><p className="truncate text-sm font-bold text-white">Portal Kajian UAH</p><p className="mt-0.5 text-xs text-slate-500">Ruang admin</p></div>
      </div>
      <nav aria-label="Navigasi admin" className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {navSection('Utama', primaryItems)}
        {navSection('Penyelenggaraan', operationItems)}
        {navSection('Sistem', systemItems)}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <Link to="/" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Lihat portal publik</Link>
        <button type="button" onClick={() => logout()} className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Keluar</button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <a href="#admin-content" className="sr-only z-[70] rounded-lg bg-white px-4 py-2 text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Lewati ke konten utama</a>
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-800 bg-slate-950 lg:flex">{sidebarContent}</aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button type="button" aria-label="Tutup menu admin" onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-slate-950/80" />
          <aside className="relative flex h-full w-[min(88vw,20rem)] flex-col border-r border-slate-800 bg-slate-950 shadow-2xl">
            <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Tutup menu admin" className="absolute right-3 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><X className="h-5 w-5" aria-hidden="true" /></button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Buka menu admin" aria-expanded={isMobileMenuOpen} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 lg:hidden"><Menu className="h-5 w-5" aria-hidden="true" /></button>
            <div className="min-w-0"><p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-600">Admin</p><p className="truncate text-sm font-bold text-slate-100 sm:text-base">{pageTitle}</p></div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block"><p className="max-w-44 truncate text-xs font-semibold text-slate-200">{displayName}</p><p className="mt-0.5 text-[0.65rem] capitalize text-slate-500">{identity?.role || 'admin'}</p></div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-700 bg-emerald-950 text-xs font-bold text-emerald-200">
              {identity?.avatar ? <img src={identity.avatar} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
          </div>
        </header>
        <main id="admin-content" tabIndex={-1} className="min-w-0 flex-1 bg-slate-900 p-4 focus:outline-none sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
