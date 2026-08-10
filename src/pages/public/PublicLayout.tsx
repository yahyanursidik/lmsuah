import { Outlet, Link, useLocation } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { isAdminRole } from '../../providers/authProvider';

type Identity = { id: string; name?: string; email?: string; role?: string; avatar?: string };

export function PublicLayout() {
  const location = useLocation();
  const { data: identity } = useGetIdentity<Identity>();
  
  const storedDemo = typeof window !== 'undefined' ? localStorage.getItem('lms_demo_user') : null;
  const demoUser = storedDemo ? JSON.parse(storedDemo) : null;
  const user = identity || demoUser;
  const isAdmin = isAdminRole(user?.role);
  const dashboardLink = isAdmin ? '/admin' : '/dashboard';

  const navLinks = [
    { label: 'Beranda', path: '/' },
    { label: 'Program', path: '/programs' },
    { label: 'Jadwal', path: '/schedules' },
    { label: 'Lokasi', path: '/venues' },
    { label: 'Pemateri', path: '/speaker' },
  ];

  const bottomNavItems = [
    {
      label: 'Beranda',
      path: '/',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Program',
      path: '/programs',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      label: 'Jadwal',
      path: '/schedules',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Lokasi',
      path: '/venues',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: user ? (isAdmin ? 'Admin' : 'Belajar') : 'Masuk',
      path: user ? dashboardLink : '/login',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFCF7] text-slate-900 font-sans pb-16 md:pb-0">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-emerald-900 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Announcement Bar */}
      <div className="bg-emerald-950 px-4 py-2 text-center text-xs font-medium text-emerald-200">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span>Kajian Rutin Pekanan Ustadz Abu Haidar As-Sundawy (hafizhahullah) • Sabtu & Minggu 09:00 WIB</span>
        </span>
      </div>

      {/* Primary Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo-abu-haidar.jpg"
              alt="Logo Ustadz Abu Haidar As-Sundawy"
              className="h-10 w-10 rounded-xl object-cover border border-amber-500/30 shadow-xs"
            />
            <div>
              <span className="block font-bold leading-tight text-slate-900 sm:text-base">
                Kajian Ustadz Abu Haidar
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Portal Pembelajaran Syar'i & Rekaman Kitab
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-emerald-900 font-semibold border-b-2 border-emerald-900 pb-1'
                      : 'text-slate-600 hover:text-emerald-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {user ? (
              <Link
                to={dashboardLink}
                className="flex items-center gap-2 rounded-xl bg-emerald-950 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-900 transition-all border border-emerald-800"
              >
                <img src={user.avatar || '/logo-abu-haidar.jpg'} alt="" className="h-5 w-5 rounded-full object-cover border border-amber-400/60" />
                <span>{isAdmin ? 'Portal Admin' : (user.name || 'Ruang Belajar')}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-950 active:scale-98 transition-all"
              >
                Masuk
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Page Slot */}
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-stone-100 py-12 text-slate-600 text-xs">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="space-y-3 max-w-md">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
              <img
                src="/logo-abu-haidar.jpg"
                alt="Logo Ustadz Abu Haidar As-Sundawy"
                className="h-8 w-8 rounded-lg object-cover border border-amber-500/30"
              />
              Kajian Ustadz Abu Haidar As-Sundawy
            </div>
            <p className="text-slate-500 leading-relaxed">
              Portal majelis ilmu syar'i murni, modul rujukan kitab-kitab induk, transkrip resmi, dan rekaman kajian Ustadz Abu Haidar As-Sundawy (hafizhahullah).
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-3 text-sm">Navigasi Utama</h4>
            <ul className="space-y-2">
              <li><Link to="/programs" className="hover:text-emerald-900">Semua Program Kajian</Link></li>
              <li><Link to="/schedules" className="hover:text-emerald-900">Jadwal Pekanan</Link></li>
              <li><Link to="/venues" className="hover:text-emerald-900">Daftar Lokasi Majelis</Link></li>
              <li><Link to="/speaker" className="hover:text-emerald-900">Biografi Pemateri</Link></li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-stone-200 text-center text-slate-500">
          <p>
            Disusun dan dikembangkan oleh{' '}
            <a
              href="https://yahyanursidik.my.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-900 hover:underline"
            >
              Yahya Nursidik
            </a>
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-stone-200 bg-white/95 backdrop-blur-md md:hidden"
      >
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium min-h-[44px] transition-colors ${
                isActive ? 'text-emerald-900 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
