import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useLogout } from '@refinedev/core';
import {
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  PlayCircle,
  Calendar,
  MapPin,
  FileText,
  HelpCircle,
  Users,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';

export function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { mutate: logout } = useLogout();

  const menuItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Program Kajian', href: '/admin/programs', icon: BookOpen },
    { label: 'Materi (Lessons)', href: '/admin/lessons', icon: PlayCircle },
    { label: 'Lokasi Majelis', href: '/admin/venues', icon: MapPin },
    { label: 'Jadwal & Agenda', href: '/admin/schedules', icon: Calendar },
    { label: 'Transkrip PDF', href: '/admin/pdf', icon: FileText },
    { label: 'Bank Kuis', href: '/admin/kuis', icon: HelpCircle },
    { label: 'Pengguna & Peran', href: '/admin/users', icon: Users },
    { label: 'Pengaturan', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Admin Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-slate-800 bg-slate-950">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
          <img src="/logo-abu-haidar.jpg" alt="Logo" className="h-8 w-8 rounded-lg object-cover border border-amber-500/40" />
          <span className="text-sm font-bold text-amber-400">Admin Kajian UAH</span>
        </div>
        <div className="flex flex-1 flex-col justify-between p-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-950 text-emerald-300 border-l-2 border-emerald-500'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 pt-4 space-y-2">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Lihat Portal Publik</span>
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/50 text-left"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Admin Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative flex w-4/5 max-w-xs flex-1 flex-col bg-slate-950 p-4 border-r border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 px-2">
              <span className="text-lg font-bold text-emerald-400">Admin Panel</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-950 text-emerald-300'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-800 pt-4 space-y-2">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Lihat Portal Publik</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-sm font-semibold text-slate-200">Refine Workspace</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline-block">Admin (Super Administrator)</span>
            <div className="h-8 w-8 rounded-full bg-emerald-900 text-emerald-200 flex items-center justify-center text-xs font-bold border border-emerald-700">
              AD
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
