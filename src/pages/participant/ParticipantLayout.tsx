import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Calendar, Bookmark, User, ShieldAlert } from 'lucide-react';
import { Container } from '@/components/ui/Container';

export function ParticipantLayout() {
  const location = useLocation();

  const navItems = [
    { label: 'Beranda', href: '/', icon: Home },
    { label: 'Kajian Saya', href: '/dashboard', icon: BookOpen },
    { label: 'Jadwal', href: '/jadwal', icon: Calendar },
    { label: 'Tersimpan', href: '/tersimpan', icon: Bookmark },
    { label: 'Akun', href: '/login', icon: User },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Top Header - Desktop & Mobile */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <Container clean className="flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/logo-abu-haidar.jpg"
                alt="Logo UAH"
                className="h-9 w-9 rounded-lg object-cover border border-amber-500/40"
              />
              <span className="font-bold text-slate-900 hidden sm:inline-block">Kajian Ustadz Abu Haidar</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`transition-colors hover:text-emerald-700 ${
                      isActive ? 'font-semibold text-emerald-800' : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span>Admin Area</span>
            </Link>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-8">
        <Container className="py-6">
          <Outlet />
        </Container>
      </main>

      {/* Mobile Bottom Navigation (Hidden on Desktop md+) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-lg md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center justify-center py-1 min-w-[56px] min-h-[44px] text-[11px] font-medium transition-colors ${
                  isActive ? 'text-emerald-800' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 mb-0.5 ${isActive ? 'text-emerald-800' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Footer */}
      <footer className="hidden border-t border-slate-200 bg-white py-6 md:block">
        <Container className="text-center text-xs text-slate-500">
          © 2026 Yayasan Tarbiyah Sunnah. LMS Kajian Ustadz Abu Haidar As-Sundawy.
        </Container>
      </footer>
    </div>
  );
}
