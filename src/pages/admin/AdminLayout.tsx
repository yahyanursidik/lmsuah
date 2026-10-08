/* Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V4
 * genre: modern-minimal · macrostructure: Guided Workbench · design-system: design.md · designed-as-app */
import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { Home, Menu } from 'lucide-react';
import { MobileNavigationDrawer } from '../../components/ui/MobileNavigationDrawer';
import { PortalBreadcrumbs, PortalSidebar } from '../../components/ui/PortalNavigation';
import { getPortalTrail, isPortalItemActive, portalNavigation } from '../../lib/portal-navigation';

type Identity = { id: string; name?: string; email?: string; role?: string; avatar?: string };
const mobileItems = [
  portalNavigation.admin[0]!.items[0]!,
  portalNavigation.admin[0]!.items[1]!,
  portalNavigation.admin[1]!.items[0]!,
  portalNavigation.admin[1]!.items[2]!,
];
const shortLabels = ['Beranda', 'Program', 'Pengguna', 'Jadwal'];

export function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: identity } = useGetIdentity<Identity>();
  const closeMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const title = getPortalTrail('admin', pathname).at(-1)!.label;
  useEffect(() => {
    setIsMobileMenuOpen(false);
    document.title = title + ' | Admin Kajian UAH';
  }, [pathname, title]);
  const sidebar = <PortalSidebar portal="admin" identity={identity} onNavigate={closeMenu} onLogout={() => logout()} isLoggingOut={isLoggingOut} />;
  return <div className="portal-shell">
    <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3">Lewati ke konten utama</a>
    <aside className="portal-desktop-sidebar">{sidebar}</aside>
    <header className="portal-header"><div className="portal-header-title">
      <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Buka menu admin" aria-expanded={isMobileMenuOpen} className="portal-icon-button portal-menu-toggle"><Menu size={20} aria-hidden="true" /></button>
      <div className="min-w-0"><small>Ruang admin</small><strong>{title}</strong></div>
    </div><Link to="/" aria-label="Buka portal publik" className="portal-icon-button"><Home size={20} aria-hidden="true" /></Link></header>
    <main id="admin-content" tabIndex={-1} className="portal-content"><div className="portal-content-inner"><PortalBreadcrumbs portal="admin" /><Outlet /></div></main>
    <nav aria-label="Navigasi admin mobile" className="portal-mobile-nav">{mobileItems.map((item, index) => { const Icon = item.icon; return <Link key={item.href} to={item.href} aria-label={item.label} aria-current={isPortalItemActive('admin', item, pathname) ? 'page' : undefined}><Icon size={20} aria-hidden="true" /><span>{shortLabels[index]}</span></Link>; })}<button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-expanded={isMobileMenuOpen}><Menu size={20} aria-hidden="true" /><span>Lainnya</span></button></nav>
    <MobileNavigationDrawer open={isMobileMenuOpen} onClose={closeMenu} label="Menu admin">{sidebar}</MobileNavigationDrawer>
  </div>;
}
