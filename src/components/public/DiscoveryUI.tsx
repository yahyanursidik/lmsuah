import type { ReactNode } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Search, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { programCategoryLabel } from '../../../shared/program-category';
import { detailPath, type DiscoveryProgram } from '../../lib/public-discovery';
import { PUBLIC_SEARCH_LIMIT } from '../../lib/public-home';
import { AppImage } from '../ui/AppImage';
import './discovery.css';

export function DiscoveryHeader({ title, description, actions }: {
  title: string;
  description?: string | null;
  actions?: ReactNode;
}) {
  return <header className="discovery-header">
    <div className="min-w-0">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="discovery-actions">{actions}</div>}
  </header>;
}

export function DiscoverySearch({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder: string; onChange: (value: string) => void;
}) {
  return <label className="discovery-field discovery-field--search">
    <span>{label}</span>
    <span className="discovery-input-wrap">
      <Search size={17} aria-hidden="true" />
      <input type="search" value={value} onChange={event => onChange(event.target.value)}
        maxLength={PUBLIC_SEARCH_LIMIT} placeholder={placeholder} />
    </span>
  </label>;
}

type Choice = { value: string; label: string };

export function DiscoverySelect({ label, value, options, onChange }: {
  label: string; value: string; options: readonly Choice[]; onChange: (value: string) => void;
}) {
  return <label className="discovery-field">
    <span>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

export function DiscoveryChoices({ label, value, options, onChange }: {
  label: string; value: string; options: readonly Choice[]; onChange: (value: string) => void;
}) {
  return <div className="discovery-choices" role="group" aria-label={label}>
    {options.map(option => <button type="button" key={option.value} title={option.label}
      className="discovery-choice" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
      <span>{option.label}</span>
    </button>)}
  </div>;
}

export function DiscoveryLoading({ label }: { label: string }) {
  return <div className="discovery-loading" role="status">
    <p>{label}</p>
    <div aria-hidden="true"><span /><span /></div>
    <div aria-hidden="true"><span /><span /></div>
  </div>;
}

export function DiscoveryEmpty({ title, description, children }: {
  title: string; description?: string; children?: ReactNode;
}) {
  return <div className="discovery-state">
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {children && <div className="discovery-actions">{children}</div>}
  </div>;
}

export function DiscoveryError({ message, retry, retrying }: {
  message: string; retry: () => void; retrying?: boolean;
}) {
  return <div className="discovery-state discovery-state--error" role="alert">
    <div className="discovery-meta"><TriangleAlert size={19} aria-hidden="true" /><h2>{message}</h2></div>
    <p>Periksa koneksi, lalu coba muat ulang.</p>
    <div className="discovery-actions">
      <button type="button" className="discovery-action" aria-disabled={retrying}
        onClick={() => { if (!retrying) retry(); }}>{retrying ? 'Memuat ulang…' : 'Coba lagi'}</button>
    </div>
  </div>;
}

export function DiscoveryResults<T>({ items, unit, page, perPage = 8, showPage, children }: {
  items: T[];
  unit: string;
  page: string | null;
  perPage?: number;
  showPage: (value: string) => void;
  children: (visible: T[]) => ReactNode;
}) {
  const requested = Number(page);
  const current = Number.isSafeInteger(requested) && requested > 1
    ? Math.min(requested, Math.ceil(items.length / perPage)) : 1;
  const visible = items.slice(0, current * perPage);
  const hasMore = visible.length < items.length;
  return <div className="discovery-results">
    <p role="status" className="discovery-count">
      {hasMore ? visible.length + ' dari ' : ''}{items.length} {unit}
    </p>
    {children(visible)}
    {items.length > perPage && <button type="button" className="discovery-action discovery-more"
      aria-disabled={!hasMore} onClick={() => { if (hasMore) showPage(String(current + 1)); }}>
      {hasMore ? <><ArrowDown size={16} aria-hidden="true" /> Tampilkan lagi</> : 'Semua ditampilkan'}
    </button>}
  </div>;
}

function categoryTone(category: string) {
  const name = category.toLocaleLowerCase('id-ID');
  if (name === 'tafsir' || name === 'hadits') return 'indigo';
  if (name === 'aqidah' || name === 'tauhid') return 'gold';
  if (name === 'akhlaq' || name === 'sirah') return 'clay';
  return 'emerald';
}

export function ProgramIndexEntry({ program, directory, search, heading = 'h2' }: {
  program: DiscoveryProgram; directory: string; search?: string; heading?: 'h2' | 'h3';
}) {
  const Heading = heading;
  const category = programCategoryLabel(program.category);
  return <article className="discovery-program" data-tone={categoryTone(category)}>
    <div className="discovery-book-cover">
      <AppImage src={program.coverImage} alt={program.title} kind="program" />
    </div>
    <div className="min-w-0">
      <span className="discovery-tag">{category}</span>
      <Heading className="discovery-item-title">{program.title}</Heading>
      {program.bookTitle && <p className="discovery-meta discovery-book-title"><BookOpen size={15} aria-hidden="true" /> {program.bookTitle}</p>}
      {program.description && <p className="discovery-excerpt">{program.description}</p>}
      <Link className="discovery-action discovery-action--text"
        to={detailPath(directory, program.id)} state={search ? { directory, search } : undefined}
        aria-label={'Lihat kurikulum: ' + program.title}>
        Lihat kurikulum <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  </article>;
}
