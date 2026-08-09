import { Link } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { MOCK_SPEAKER, MOCK_PROGRAMS } from '../../mock/publicData';
import { SEOHead } from '../../components/public/SEOHead';

export function SpeakerProfilePage() {
  const { query: programsQuery, result: programsResult } = useList<any>({ resource: 'programs', pagination: { mode: 'off' } });
  const { result: lessonsResult } = useList<any>({ resource: 'lessons', pagination: { mode: 'off' } });

  const apiPrograms = programsResult?.data || [];
  const apiLessons = lessonsResult?.data || [];
  const isFetched = programsQuery.isFetched || apiPrograms.length > 0;
  const programs = isFetched ? (apiPrograms.length > 0 ? apiPrograms : []) : (programsQuery.isError ? MOCK_PROGRAMS : MOCK_PROGRAMS);

  const speaker = {
    ...MOCK_SPEAKER,
    activeProgramsCount: programs.length,
    totalKajiansCount: apiLessons.length > 0 ? apiLessons.length : MOCK_SPEAKER.totalKajiansCount,
  };

  return (
    <div className="space-y-12 pb-16">
      <SEOHead
        title={`Profil Pemateri - ${speaker.name}`}
        description={`Biografi keilmuan ${speaker.name} hafizhahullah, latar belakang pendidikan, dan daftar program kajian.`}
      />

      {/* Speaker Header */}
      <section className="bg-stone-900 text-white py-12 sm:py-16 border-b border-stone-800">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-amber-500/30 bg-black p-4 shadow-2xl flex items-center justify-center">
                <img
                  src={speaker.image}
                  alt={speaker.name}
                  className="h-full w-full object-contain rounded-xl"
                />
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <span className="rounded-md bg-emerald-800 px-3 py-1 text-xs font-semibold text-emerald-200">
                Pemateri Utama
              </span>
              <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl text-stone-100">
                {speaker.name}
              </h1>
              <p className="text-emerald-400 font-semibold">{speaker.title}</p>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                {speaker.bio}
              </p>

              {/* Social Links */}
              <div className="flex flex-wrap gap-3 pt-2">
                {speaker.socials.youtube && (
                  <a
                    href={speaker.socials.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 transition-colors min-h-[44px] flex items-center"
                  >
                    Saluran YouTube Resmi ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Programs */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Program Kajian yang Diampu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((prog: any) => (
              <div key={prog.id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                    {prog.category}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">{prog.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{prog.description}</p>
                </div>
                <Link
                  to={`/programs/${prog.id}`}
                  className="block text-xs font-bold text-emerald-900 hover:underline pt-2 border-t border-stone-100"
                >
                  Lihat Program & Kurikulum →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
