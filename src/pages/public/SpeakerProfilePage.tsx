import { ArrowRight, CalendarDays, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TARBIYAH_CHANNEL_NAME, TARBIYAH_STREAMS_URL } from '../../../shared/schedule-stream';
import { AppImage } from '../../components/ui/AppImage';
import { DiscoveryEmpty, DiscoveryError, DiscoveryHeader, DiscoveryLoading, ProgramIndexEntry } from '../../components/public/DiscoveryUI';
import { SEOHead } from '../../components/public/SEOHead';
import { isAbuHaidar, usePublishedProgramIndex } from '../../lib/public-discovery';
import { MOCK_SPEAKER } from '../../mock/publicData';

export function SpeakerProfilePage() {
  const { items, query } = usePublishedProgramIndex();
  const attributed = items.filter(program => isAbuHaidar(program.instructor));
  const catalogPreview = attributed.length === 0 && items.length > 0;
  const visible = (catalogPreview ? items : attributed).slice(0, 4);
  const speaker = MOCK_SPEAKER;

  return (
    <div className="public-discovery">
      <SEOHead title={'Profil Pemateri – ' + speaker.name}
        description={'Profil ' + speaker.name + ' hafizhahullah, program kajian kitab, dan jadwal majelis.'} />

      <section className="discovery-profile">
        <DiscoveryHeader title={speaker.name} description={speaker.title} />
        <AppImage src={speaker.image} kind="brand" alt={'Logo ' + speaker.name} loading="eager"
          width={192} height={192} className="discovery-profile-mark" />
        <div className="discovery-profile-copy">
          <p className="discovery-prose">{speaker.bio}</p>
          <div className="discovery-actions">
            <Link className="discovery-action discovery-action--primary" to="/programs">Buka katalog <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="discovery-action" to="/schedules"><CalendarDays size={17} aria-hidden="true" /> Jadwal kajian</Link>
            <a className="discovery-action discovery-action--text" href={TARBIYAH_STREAMS_URL} target="_blank" rel="noopener noreferrer"
              aria-label={TARBIYAH_CHANNEL_NAME + ' (tab baru)'}>
              {TARBIYAH_CHANNEL_NAME} <ExternalLink size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="discovery-section" aria-labelledby="speaker-programs">
        <div className="discovery-section-heading">
          <h2 id="speaker-programs">{catalogPreview ? 'Program kajian di portal' : 'Program yang diampu'}</h2>
          <Link className="discovery-action discovery-action--text" to="/programs">Semua program <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {query.isLoading ? <DiscoveryLoading label="Memuat program kajian…" /> :
          query.isError && !items.length ? (
            <DiscoveryError message="Program kajian belum dapat dimuat." retry={() => void query.refetch()} retrying={query.isFetching} />
          ) : !visible.length ? (
            <DiscoveryEmpty title="Belum ada program yang diterbitkan" />
          ) : (
            <>
              {catalogPreview && <p className="discovery-meta">Belum ada program terbit yang mencantumkan beliau sebagai pemateri.</p>}
              <ul className="discovery-index">
                {visible.map(program => <li key={program.id}><ProgramIndexEntry program={program} directory="/programs" heading="h3" /></li>)}
              </ul>
            </>
          )}
      </section>
    </div>
  );
}
