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
  Megaphone,
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
  { label: 'Pengumuman', href: '/admin/announcements', icon: Megaphone },
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
  ['/admin/announcements', 'Pengumuman'],
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
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link 
              key={item.href} 
              to={item.href} 
              aria-current={active ? 'page' : undefined} 
              className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                active 
                  ? 'border-emerald-200/80 bg-emerald-50 text-emerald-700 font-semibold shadow-xs' 
                  : 'border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-5">
        <img src="/logo-abu-haidar.jpg" alt="" className="h-9 w-9 rounded-xl border border-slate-200 object-cover shadow-xs" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">Portal Kajian UAH</p>
          <p className="text-xs text-slate-500">Ruang admin</p>
        </div>
      </div>
      <nav aria-label="Navigasi admin" className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {navSection('Utama', primaryItems)}
        {navSection('Penyelenggaraan', operationItems)}
        {navSection('Sistem', systemItems)}
      </nav>
      <div className="border-t border-slate-200/80 p-4 space-y-1">
        <Link to="/" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /> Lihat portal publik
        </Link>
        <button type="button" onClick={() => logout()} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Keluar
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50/60 text-slate-900">
      <a href="#admin-content" className="sr-only z-[70] rounded-lg bg-white px-4 py-2 text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Lewati ke konten utama</a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200/80 bg-white lg:flex shadow-xs">{sidebarContent}</aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button type="button" aria-label="Tutup menu admin" onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" />
          <aside className="relative flex h-full w-[min(88vw,18rem)] flex-col border-r border-slate-200 bg-white shadow-xl">
            <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Tutup menu admin" className="absolute right-3 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md shadow-xs sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Buka menu admin" aria-expanded={isMobileMenuOpen} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">Admin</p>
              <p className="truncate text-base font-bold text-slate-900">{pageTitle}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-44 truncate text-xs font-semibold text-slate-800">{displayName}</p>
              <p className="text-[0.65rem] capitalize text-slate-400">{identity?.role || 'admin'}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-100 text-xs font-bold text-emerald-700 shadow-xs">
              {identity?.avatar ? <img src={identity.avatar} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
          </div>
        </header>
        <main id="admin-content" tabIndex={-1} className="min-w-0 flex-1 bg-slate-50/60 p-4 focus:outline-none sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
