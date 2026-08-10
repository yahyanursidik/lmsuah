/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * Hallmark · genre: modern-minimal · macrostructure: participant learning workbench · design-system: design.md · designed-as-app
 */
import { useEffect, useState } from 'react';
import { useGetIdentity, useLogout, usePermissions } from '@refinedev/core';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bookmark, BookOpen, CalendarDays, ChevronRight, CircleUserRound, Gauge, Home, LogOut, MapPin, Menu, ShieldCheck, TrendingUp, X } from 'lucide-react';
import { isAdminRole } from '../../providers/authProvider';

type Identity = { id: string; name?: string; email?: string; role?: string; avatar?: string };
type NavItem = { label: string; href: string; icon: typeof Home; end?: boolean };

const groups: Array<{ label: string; items: NavItem[] }> = [
  { label: 'Utama', items: [{ label: 'Ringkasan', href: '/dashboard', icon: Gauge, end: true }] },
  { label: 'Belajar', items: [
    { label: 'Kajian Saya', href: '/belajar', icon: BookOpen, end: true },
    { label: 'Progres Belajar', href: '/belajar/progres', icon: TrendingUp },
    { label: 'Jadwal Kajian', href: '/belajar/jadwal', icon: CalendarDays },
    { label: 'Lokasi Majelis', href: '/belajar/lokasi', icon: MapPin },
  ] },
  { label: 'Koleksi & akun', items: [
    { label: 'Tersimpan & Catatan', href: '/tersimpan', icon: Bookmark },
    { label: 'Profil & Preferensi', href: '/akun', icon: CircleUserRound },
  ] },
];

const mobilePrimary = [
  groups[0]!.items[0]!,
  groups[1]!.items[0]!,
  groups[1]!.items[1]!,
  groups[2]!.items[0]!,
];

function SideLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return <NavLink to={item.href} end={item.end} onClick={onNavigate} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${isActive ? 'bg-emerald-950 text-white' : 'text-slate-600 hover:bg-stone-100 hover:text-slate-950 active:bg-stone-200'}`}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{item.label}</span><ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden="true" /></NavLink>;
}

export function ParticipantLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: identity } = useGetIdentity<Identity>();
  const { data: permissions } = usePermissions<string>({});
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const isAdmin = isAdminRole(permissions) || isAdminRole(identity?.role);

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobileMenuOpen]);

  const currentLabel = groups.flatMap((group) => group.items).find((item) => item.end ? location.pathname === item.href : location.pathname.startsWith(item.href))?.label || 'Portal Peserta';

  const sidebar = (mobile = false) => <div className="flex h-full flex-col bg-white">
    <div className="flex min-h-20 items-center justify-between gap-3 border-b border-stone-200 px-5"><NavLink to="/" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><img src="/logo-abu-haidar.jpg" alt="Logo Kajian UAH" className="h-10 w-10 shrink-0 rounded-lg border border-amber-500/40 object-cover" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-950">Portal Kajian UAH</span><span className="block text-xs text-slate-500">Ruang belajar peserta</span></span></NavLink>{mobile && <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Tutup menu" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><X className="h-5 w-5" /></button>}</div>
    <nav aria-label="Navigasi peserta" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5">{groups.map((group) => <div key={group.label}><p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.label}</p><div className="space-y-1">{group.items.map((item) => <SideLink key={item.href} item={item} onNavigate={mobile ? () => setMobileMenuOpen(false) : undefined} />)}</div></div>)}</nav>
    <div className="border-t border-stone-200 p-4"><div className="flex min-w-0 items-center gap-3 rounded-xl bg-stone-50 p-3"><img src={identity?.avatar || '/logo-abu-haidar.jpg'} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-900">{identity?.name || 'Peserta Kajian'}</p><p className="truncate text-[11px] text-slate-500">{identity?.email || 'Akun peserta'}</p></div></div>{isAdmin && <NavLink to="/admin" className="mt-2 flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-amber-700 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"><ShieldCheck className="h-4 w-4" /> Buka ruang admin</NavLink>}<button type="button" onClick={() => logout()} disabled={isLoggingOut} className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 active:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-55"><LogOut className="h-4 w-4" /> {isLoggingOut ? 'Keluar…' : 'Keluar'}</button></div>
  </div>;

  return <div className="min-h-screen bg-stone-50 text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-stone-200 lg:block">{sidebar()}</aside>
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-sm lg:ml-72"><div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Buka menu peserta" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-stone-200 text-slate-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 lg:hidden"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800">Portal peserta</p><p className="truncate text-sm font-bold text-slate-950">{currentLabel}</p></div></div><NavLink to="/" className="hidden min-h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-stone-200 px-3 text-xs font-bold text-slate-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:inline-flex"><Home className="h-4 w-4" /> Portal publik</NavLink></div></header>
    <main id="participant-content" className="pb-24 lg:ml-72 lg:pb-8"><div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"><Outlet /></div></main>
    <nav aria-label="Navigasi peserta mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"><div className="grid h-17 grid-cols-5 items-stretch">{mobilePrimary.map((item) => { const Icon = item.icon; return <NavLink key={item.href} to={item.href} end={item.end} className={({ isActive }) => `flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 ${isActive ? 'text-emerald-900' : 'text-slate-500'}`}><Icon className="h-5 w-5" /><span className="max-w-full truncate">{item.label.replace(' Belajar', '')}</span></NavLink>; })}<button type="button" onClick={() => setMobileMenuOpen(true)} className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700"><Menu className="h-5 w-5" /><span>Lainnya</span></button></div></nav>
    {mobileMenuOpen && <div className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileMenuOpen(false); }}><aside role="dialog" aria-modal="true" aria-label="Menu peserta" className="h-full w-[min(88vw,20rem)] border-r border-stone-200 bg-white shadow-2xl">{sidebar(true)}</aside></div>}
  </div>;
}
