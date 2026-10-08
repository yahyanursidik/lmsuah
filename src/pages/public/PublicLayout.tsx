/* Hallmark · pre-emit critique: P4 H5 E4 S5 R5 V4 · design-system: design.md */
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { BookOpen, CalendarDays, Home, MapPin, Menu, UserRound, ArrowRight } from 'lucide-react';
import { isAdminRole } from '../../providers/authProvider';

type Identity = { id: string; name?: string; email?: string; role?: string; avatar?: string };
const destinations = [
  { label: 'Beranda', path: '/', icon: Home },
  { label: 'Program', path: '/programs', icon: BookOpen },
  { label: 'Jadwal', path: '/schedules', icon: CalendarDays },
  { label: 'Lokasi', path: '/venues', icon: MapPin },
  { label: 'Pemateri', path: '/speaker', icon: UserRound },
];
const navClass = ({ isActive }: { isActive: boolean }) => `inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${isActive ? 'bg-[var(--color-paper-2)] text-[var(--color-accent)] underline underline-offset-4' : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]'}`;

export function PublicLayout() {
  const location = useLocation();
  const { data: user } = useGetIdentity<Identity>();
  const isAdmin = isAdminRole(user?.role);
  const dashboard = isAdmin ? '/admin' : '/dashboard';
  const accessPage = ['/login', '/register', '/auth/complete'].includes(location.pathname);
  const mobileLinks = [...destinations.slice(0, 4), { label: user ? (isAdmin ? 'Admin' : 'Belajar') : 'Masuk', path: user ? dashboard : '/login', icon: UserRound }];

  return <div className="flex min-h-dvh flex-col bg-[var(--color-paper)] text-[var(--color-ink)] pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-[var(--color-accent)] focus:px-4 focus:py-3 focus:text-[var(--color-accent-ink)]">Lewati ke konten utama</a>
    <header className="sticky top-0 z-30 border-b border-[var(--color-rule)] bg-[var(--color-surface)]">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
          <img src="/logo-abu-haidar.jpg" alt="" width="44" height="44" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
          <span className="min-w-0"><span className="block truncate text-sm font-bold sm:text-base">Kajian Abu Haidar</span><span className="block text-xs text-[var(--color-ink-2)]">Ruang belajar bersama</span></span>
        </Link>
        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
          {destinations.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={navClass}>{item.label}</NavLink>)}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link to={user ? dashboard : accessPage ? (location.pathname === '/register' ? '/login' : '/register') : '/login'} className="hidden min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)] sm:inline-flex">
            {user ? (isAdmin ? 'Portal admin' : 'Ruang belajar') : accessPage ? (location.pathname === '/register' ? 'Masuk' : 'Daftar akun') : 'Masuk'}<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <details key={location.pathname} className="relative lg:hidden">
            <summary aria-label="Buka menu utama" className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-[var(--color-rule)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"><Menu className="h-5 w-5" aria-hidden="true" /></summary>
            <nav aria-label="Menu seluler" className="absolute right-0 top-full mt-2 flex w-52 flex-col rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-2">
              {destinations.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} className={navClass}>{item.label}</NavLink>)}
              <Link to={user ? dashboard : '/login'} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-[var(--color-accent)]">{user ? (isAdmin ? 'Portal admin' : 'Ruang belajar') : 'Masuk ke akun'}</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none"><Outlet /></main>
    <footer className="border-t border-[var(--color-rule)] px-4 py-6 text-sm text-[var(--color-ink-2)] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>Kajian Ustadz Abu Haidar As-Sundawy hafizhahullah</p>
        <nav aria-label="Informasi portal" className="flex flex-wrap gap-x-5">
          <Link to="/privacy" className="inline-flex min-h-11 items-center whitespace-nowrap hover:underline">Privasi</Link>
          <Link to="/terms" className="inline-flex min-h-11 items-center whitespace-nowrap hover:underline">Ketentuan</Link>
          <a href="https://yahyanursidik.my.id/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center whitespace-nowrap hover:underline">Yahya Nursidik</a>
        </nav>
      </div>
    </footer>
    <nav aria-label="Navigasi cepat seluler" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--color-rule)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] lg:hidden">
      {mobileLinks.map(item => { const Icon = item.icon; return <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 whitespace-nowrap text-[11px] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] ${isActive ? 'font-bold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}><Icon className="h-5 w-5" aria-hidden="true" /><span>{item.label}</span></NavLink>; })}
    </nav>
  </div>;
}
