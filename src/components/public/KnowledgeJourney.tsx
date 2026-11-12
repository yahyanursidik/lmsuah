import { ArrowRight, BookOpen, Bookmark, CalendarDays, ChartNoAxesColumnIncreasing, UserRoundPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function KnowledgeJourney({ catalog, isParticipant, isAdmin }: { catalog: string; isParticipant: boolean; isAdmin: boolean }) {
  const shortcuts = [
    { title: 'Pilih program', description: 'Lihat kitab dan kurikulum.', href: catalog, icon: BookOpen },
    ...(isParticipant ? [
      { title: 'Materi & catatan tersimpan', description: 'Buka kembali koleksi Anda.', href: '/tersimpan', icon: Bookmark },
      { title: 'Progres & hasil kuis', description: 'Pantau yang sudah dipelajari.', href: '/belajar/progres', icon: ChartNoAxesColumnIncreasing },
    ] : [
      { title: 'Lihat jadwal', description: 'Temukan waktu dan lokasi kajian.', href: '/schedules', icon: CalendarDays },
      ...(isAdmin ? [] : [{ title: 'Daftar sebagai peserta', description: 'Ikuti program dan simpan progres.', href: '/register', icon: UserRoundPlus }]),
    ]),
  ];

  return <section className="home-shortcuts" aria-labelledby="home-shortcuts-title">
    <h2 id="home-shortcuts-title">Ruang belajar</h2>
    <ul>
      {shortcuts.map(({ title, description, href, icon: Icon }) => <li key={title}>
        <Link to={href}>
          <Icon size={21} aria-hidden="true" />
          <span><strong>{title}</strong><span className="home-meta">{description}</span></span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </li>)}
    </ul>
  </section>;
}
