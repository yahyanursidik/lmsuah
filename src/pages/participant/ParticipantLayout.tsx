/* Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V4
 * genre: modern-minimal · macrostructure: Guided Workbench · design-system: design.md · designed-as-app */
import { useCallback, useEffect, useState } from 'react';
import { useGetIdentity, useLogout, usePermissions } from '@refinedev/core';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Menu } from 'lucide-react';
import { MobileNavigationDrawer } from '../../components/ui/MobileNavigationDrawer';
import { PortalBreadcrumbs, PortalSidebar } from '../../components/ui/PortalNavigation';
import { getPortalTrail, isPortalItemActive, portalNavigation } from '../../lib/portal-navigation';
import { isAdminRole } from '../../providers/authProvider';

type Identity = { id: string; name?: string; email?: string; role?: string; avatar?: string };
const mobileItems = [
  portalNavigation.participant[0]!.items[0]!,
  portalNavigation.participant[1]!.items[0]!,
  portalNavigation.participant[1]!.items[2]!,
  portalNavigation.participant[2]!.items[0]!,
];
const shortLabels = ['Beranda', 'Kajian', 'Progres', 'Tersimpan'];

export function ParticipantLayout() {
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: identity } = useGetIdentity<Identity>();
  const { data: permissions } = usePermissions<string>({});
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const isAdmin = isAdminRole(permissions) || isAdminRole(identity?.role);
  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);
  const title = getPortalTrail('participant', pathname).at(-1)!.label;
  useEffect(() => {
    setMobileMenuOpen(false);
    document.title = title + ' | Portal Peserta Kajian UAH';
  }, [pathname, title]);
  const sidebar = <PortalSidebar portal="participant" identity={identity} isAdmin={isAdmin} onNavigate={closeMenu} onLogout={() => logout()} isLoggingOut={isLoggingOut} />;
  return <div className="portal-shell">
    <a href="#participant-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3">Lewati ke konten utama</a>
    <aside className="portal-desktop-sidebar">{sidebar}</aside>
    <header className="portal-header"><div className="portal-header-title">
      <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Buka menu peserta" aria-expanded={mobileMenuOpen} className="portal-icon-button portal-menu-toggle"><Menu size={20} aria-hidden="true" /></button>
      <div className="min-w-0"><small>Ruang belajar peserta</small><strong>{title}</strong></div>
    </div><Link to="/" aria-label="Buka portal publik" className="portal-icon-button"><Home size={20} aria-hidden="true" /></Link></header>
    <main tabIndex={-1} id="participant-content" className="portal-content"><div className="portal-content-inner"><PortalBreadcrumbs portal="participant" /><Outlet /></div></main>
    <nav aria-label="Navigasi peserta mobile" className="portal-mobile-nav">{mobileItems.map((item, index) => { const Icon = item.icon; return <Link key={item.href} to={item.href} aria-label={item.label} aria-current={isPortalItemActive('participant', item, pathname) ? 'page' : undefined}><Icon size={20} aria-hidden="true" /><span>{shortLabels[index]}</span></Link>; })}<button type="button" onClick={() => setMobileMenuOpen(true)} aria-expanded={mobileMenuOpen}><Menu size={20} aria-hidden="true" /><span>Lainnya</span></button></nav>
    <MobileNavigationDrawer open={mobileMenuOpen} onClose={closeMenu} label="Menu peserta">{sidebar}</MobileNavigationDrawer>
  </div>;
}
