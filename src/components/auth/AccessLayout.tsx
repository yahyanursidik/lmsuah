/* Hallmark · pre-emit critique: P4 H5 E4 S5 R5 V4 · design-system: design.md */
import type { ReactNode } from 'react';
import { BookOpen, CalendarDays, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './access.css';

export function AccessLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="access-page">
    <div className="access-shell">
      <section className="access-welcome" aria-labelledby="access-welcome-title">
        <p className="access-salutation">Assalamu’alaikum, selamat datang.</p>
        <h1 id="access-welcome-title">{title}</h1>
        <p className="access-description">{description}</p>
        <div className="access-guide">
          <p>Kenali kajian sebelum bergabung</p>
          <Link to="/programs"><BookOpen aria-hidden="true" /><span>Jelajahi program kajian</span><ArrowUpRight aria-hidden="true" /></Link>
          <Link to="/schedules"><CalendarDays aria-hidden="true" /><span>Lihat jadwal majelis</span><ArrowUpRight aria-hidden="true" /></Link>
        </div>
        <p className="access-signature">Kajian Ustadz Abu Haidar As-Sundawy<br /><span>hafizhahullah</span></p>
      </section>
      <section className="access-panel" aria-label="Akses akun portal">{children}</section>
    </div>
  </div>;
}
