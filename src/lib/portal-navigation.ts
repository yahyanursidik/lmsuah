import { Bookmark, BookOpen, CalendarDays, CircleUserRound, Gauge, MapPin, Megaphone, Settings, TrendingUp, UsersRound, type LucideIcon } from 'lucide-react';

export type Portal = 'admin' | 'participant';
export type PortalNavItem = { label: string; href: string; icon: LucideIcon; keywords?: string };
export type PortalNavGroup = { label: string; items: PortalNavItem[] };
export type PortalCrumb = { label: string; href: string };

export const portalNavigation: Record<Portal, PortalNavGroup[]> = {
  admin: [
    { label: 'Utama', items: [
      { label: 'Dashboard', href: '/admin', icon: Gauge },
      { label: 'Program Kajian', href: '/admin/programs', icon: BookOpen, keywords: 'pertemuan materi kuis kurikulum' },
    ] },
    { label: 'Penyelenggaraan', items: [
      { label: 'Peserta & Pengguna', href: '/admin/users', icon: UsersRound, keywords: 'akun jamaah' },
      { label: 'Lokasi Majelis', href: '/admin/venues', icon: MapPin, keywords: 'masjid alamat' },
      { label: 'Jadwal & Agenda', href: '/admin/schedules', icon: CalendarDays },
      { label: 'Pengumuman', href: '/admin/announcements', icon: Megaphone },
    ] },
    { label: 'Sistem', items: [{ label: 'Pengaturan Sistem', href: '/admin/settings', icon: Settings }] },
  ],
  participant: [
    { label: 'Utama', items: [{ label: 'Ringkasan', href: '/dashboard', icon: Gauge }] },
    { label: 'Belajar', items: [
      { label: 'Kajian Saya', href: '/belajar', icon: BookOpen, keywords: 'pertemuan materi kuis' },
      { label: 'Katalog Kajian', href: '/belajar/katalog', icon: BookOpen, keywords: 'program tersedia' },
      { label: 'Progres Belajar', href: '/belajar/progres', icon: TrendingUp },
      { label: 'Jadwal Kajian', href: '/belajar/jadwal', icon: CalendarDays },
      { label: 'Lokasi Majelis', href: '/belajar/lokasi', icon: MapPin, keywords: 'masjid alamat' },
    ] },
    { label: 'Koleksi & akun', items: [
      { label: 'Tersimpan & Catatan', href: '/tersimpan', icon: Bookmark },
      { label: 'Profil & Preferensi', href: '/akun', icon: CircleUserRound },
    ] },
  ],
};

export function filterPortalNavigation(portal: Portal, search: string) {
  const words = search.toLocaleLowerCase('id-ID').trim().split(/\s+/).filter(Boolean);
  return portalNavigation[portal].map(group => ({ ...group, items: group.items.filter(item => words.every(word => `${item.label} ${item.keywords || ''} ${group.label}`.toLocaleLowerCase('id-ID').includes(word))) })).filter(group => group.items.length > 0);
}

export function getPortalTrail(portal: Portal, pathname: string): PortalCrumb[] {
  const root = portalNavigation[portal][0]!.items[0]!;
  const trail: PortalCrumb[] = [{ label: root.label, href: root.href }];
  const match = portalNavigation[portal].flatMap(group => group.items).filter(item => item.href !== root.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))).sort((a, b) => b.href.length - a.href.length)[0];
  if (match) trail.push({ label: match.label, href: match.href });
  if (portal === 'admin' && /^\/admin\/programs\/[^/]+/.test(pathname)) {
    const parent = pathname.split('/').slice(0, 4).join('/');
    trail.push({ label: 'Detail program', href: parent });
    if (pathname.endsWith('/curriculum')) trail.push({ label: 'Kurikulum', href: pathname });
    else if (pathname.endsWith('/participants')) trail.push({ label: 'Peserta program', href: pathname });
  } else if (portal === 'participant') {
    if (/^\/belajar\/lessons?\//.test(pathname)) trail.push({ label: 'Pertemuan', href: pathname });
    else if (pathname.startsWith('/belajar/program/')) trail.push({ label: 'Detail kajian', href: pathname });
    else if (pathname.startsWith('/belajar/katalog/')) trail.push({ label: 'Detail program', href: pathname });
    else if (pathname.startsWith('/belajar/lokasi/')) trail.push({ label: 'Detail lokasi', href: pathname });
  }
  return trail;
}

export function isPortalItemActive(portal: Portal, item: PortalNavItem, pathname: string) {
  const trail = getPortalTrail(portal, pathname);
  return trail.some(crumb => crumb.href === item.href) && (item.href !== portalNavigation[portal][0]!.items[0]!.href || pathname === item.href);
}
