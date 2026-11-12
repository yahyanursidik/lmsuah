import { CalendarDays, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { programCategoryLabel, programCategoryOptions } from '../../../shared/program-category';
import {
  DiscoveryChoices, DiscoveryEmpty, DiscoveryError, DiscoveryHeader, DiscoveryLoading,
  DiscoveryResults, DiscoverySearch, DiscoverySelect, ProgramIndexEntry,
} from '../../components/public/DiscoveryUI';
import { SEOHead } from '../../components/public/SEOHead';
import { discoveryPaths, matchesDiscoverySearch, useDiscoveryFilters, usePublishedProgramIndex } from '../../lib/public-discovery';

export function ProgramsPage() {
  const location = useLocation();
  const { catalog, schedule } = discoveryPaths(location.pathname);
  const { params, change, search, setSearch, reset } = useDiscoveryFilters();
  const category = params.get('kategori') || '';
  const { items: programs, query } = usePublishedProgramIndex();
  const categories = programCategoryOptions(programs);
  const options = [{ value: '', label: 'Semua' }, ...categories.map(label => ({ value: label, label }))];
  if (category && !categories.includes(category)) options.push({ value: category, label: 'Kategori pilihan' });

  const visible = programs.filter(program => {
    const label = programCategoryLabel(program.category);
    return (!category || category === label) && matchesDiscoverySearch(search, [
      program.title, program.description, program.bookTitle, program.instructor, label,
    ]);
  });
  const filtered = Boolean(search || category);

  return (
    <div className={'public-discovery' + (catalog.startsWith('/belajar/') ? ' public-discovery--embedded' : '')}>
      <SEOHead title="Program Kajian Kitab" description="Pilih program kajian kitab, buka kurikulum, dan simak pertemuan Ustadz Abu Haidar As-Sundawy." />
      <DiscoveryHeader title="Program kajian kitab" description="Temukan kitab atau topik, lalu buka kurikulum untuk mulai belajar."
        actions={<>
          <Link className="discovery-action" to={schedule}><CalendarDays size={17} aria-hidden="true" /> Jadwal kajian</Link>
          <Link className="discovery-action discovery-action--text" to="/speaker"><UserRound size={17} aria-hidden="true" /> Profil pemateri</Link>
        </>} />

      <div className="discovery-toolbar">
        <DiscoverySearch label="Cari program kajian" value={search} onChange={setSearch} placeholder="Judul, kitab, atau topik…" />
        {categories.length > 0 && (categories.length > 8
          ? <DiscoverySelect label="Kategori program" value={category} options={options} onChange={value => change({ kategori: value })} />
          : <DiscoveryChoices label="Kategori program" value={category} options={options} onChange={value => change({ kategori: value })} />)}
      </div>

      {query.isLoading ? <DiscoveryLoading label="Memuat program kajian…" /> :
        query.isError && !programs.length ? (
          <DiscoveryError message="Program kajian belum dapat dimuat." retry={() => void query.refetch()} retrying={query.isFetching} />
        ) : !visible.length ? (
          <DiscoveryEmpty title={filtered ? 'Program tidak ditemukan' : 'Belum ada program yang diterbitkan'}
            description={filtered ? 'Coba judul kitab atau kategori lain.' : undefined}>
            {filtered && <button type="button" className="discovery-action" onClick={reset}>Hapus filter</button>}
          </DiscoveryEmpty>
        ) : (
          <DiscoveryResults items={visible} unit="program" page={params.get('page')} showPage={page => change({ page }, true)}>
            {entries => <ul className="discovery-index">
              {entries.map(program => <li key={program.id}>
                <ProgramIndexEntry program={program} directory={catalog} search={location.search} />
              </li>)}
            </ul>}
          </DiscoveryResults>
        )}
    </div>
  );
}
