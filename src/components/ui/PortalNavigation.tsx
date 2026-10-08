/* Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V4 · design-system: design.md */
import { useId, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, ExternalLink, LogOut, Search, ShieldCheck } from 'lucide-react';
import { filterPortalNavigation, getPortalTrail, isPortalItemActive, type Portal } from '@/lib/portal-navigation';
import './portal.css';

type Identity = { name?: string; email?: string; avatar?: string };
export function PortalSidebar({ portal, identity, isAdmin, onNavigate, onLogout, isLoggingOut }: { portal: Portal; identity?: Identity; isAdmin?: boolean; onNavigate: () => void; onLogout: () => void; isLoggingOut: boolean }) {
  const [search, setSearch] = useState('');
  const searchId = useId();
  const { pathname } = useLocation();
  const groups = filterPortalNavigation(portal, search);
  const navigate = () => { setSearch(''); onNavigate(); };
  return <div className="portal-sidebar">
    <Link to={portal === 'admin' ? '/admin' : '/dashboard'} className="portal-brand" onClick={navigate}>
      <img src="/logo-abu-haidar.jpg" width="40" height="40" alt="" />
      <span><strong>Portal Kajian UAH</strong><small>{portal === 'admin' ? 'Ruang admin' : 'Ruang belajar peserta'}</small></span>
    </Link>
    <div className="portal-menu-search">
      <label className="sr-only" htmlFor={searchId}>Cari menu {portal === 'admin' ? 'admin' : 'peserta'}</label>
      <Search size={16} aria-hidden="true" />
      <input id={searchId} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari menu…" autoComplete="off" />
    </div>
    <nav aria-label={`Navigasi ${portal === 'admin' ? 'admin' : 'peserta'}`} className="portal-menu">
      {groups.map(group => <div key={group.label} className="portal-menu-group"><p>{group.label}</p>{group.items.map(item => {
        const Icon = item.icon;
        return <Link key={item.href} to={item.href} onClick={navigate} aria-current={isPortalItemActive(portal, item, pathname) ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{item.label}</span></Link>;
      })}</div>)}
      {groups.length === 0 && <div className="portal-menu-empty"><p>Tidak ada menu yang cocok.</p><button type="button" onClick={() => setSearch('')}>Tampilkan semua</button></div>}
    </nav>
    <div className="portal-sidebar-footer">
      <div className="portal-account"><strong>{identity?.name || (portal === 'admin' ? 'Administrator' : 'Peserta Kajian')}</strong><small>{identity?.email || 'Akun portal'}</small></div>
      {portal === 'participant' && isAdmin && <Link to="/admin" onClick={navigate}><ShieldCheck size={16} aria-hidden="true" /> Buka ruang admin</Link>}
      <Link to="/" onClick={navigate}><ExternalLink size={16} aria-hidden="true" /> Portal publik</Link>
      <button type="button" onClick={onLogout} disabled={isLoggingOut} className="portal-logout"><LogOut size={16} aria-hidden="true" />{isLoggingOut ? 'Keluar…' : 'Keluar'}</button>
    </div>
  </div>;
}

export function PortalBreadcrumbs({ portal }: { portal: Portal }) {
  const { pathname } = useLocation();
  const trail = getPortalTrail(portal, pathname);
  if (trail.length === 1) return null;
  return <nav className="portal-breadcrumbs" aria-label="Jejak navigasi"><ol>{trail.map((crumb, index) => <li key={crumb.href}>{index > 0 && <ChevronRight size={14} aria-hidden="true" />}{index === trail.length - 1 ? <span aria-current="page">{crumb.label}</span> : <Link to={crumb.href}>{crumb.label}</Link>}</li>)}</ol></nav>;
}

export function PortalPanel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="portal-panel"><div className="portal-section-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}

export function PortalSkeleton({ label }: { label: string }) {
  return <div role="status" className="portal-loading"><p>{label}</p><div aria-hidden="true" className="portal-skeleton" /><div aria-hidden="true" className="portal-skeleton" /></div>;
}
