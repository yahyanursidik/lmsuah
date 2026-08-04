import { ABOUT_YTS } from '../../mock/publicData';
import { SEOHead } from '../../components/public/SEOHead';

export function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-10">
      <SEOHead
        title="Tentang Yayasan Tarbiyah Sunnah"
        description="Visi, misi, dan profil Yayasan Tarbiyah Sunnah penyedia LMS Kajian Ilmiah."
      />

      <div className="space-y-4 text-center border-b border-stone-200 pb-8">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
          Profil Lembaga
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          {ABOUT_YTS.title}
        </h1>
        <p className="text-emerald-900 font-medium text-base sm:text-lg max-w-2xl mx-auto">
          {ABOUT_YTS.subtitle}
        </p>
      </div>

      <div className="prose prose-stone max-w-none space-y-6 text-slate-700 leading-relaxed">
        <div className="rounded-2xl bg-white p-8 border border-stone-200 shadow-xs space-y-3">
          <h2 className="text-xl font-bold text-slate-900">Mengenai YTS</h2>
          <p>{ABOUT_YTS.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-stone-900 text-white p-8 space-y-3">
            <h2 className="text-xl font-bold text-emerald-400">Visi Kami</h2>
            <p className="text-stone-300 text-sm leading-relaxed">{ABOUT_YTS.vision}</p>
          </div>

          <div className="rounded-2xl bg-white p-8 border border-stone-200 shadow-xs space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Misi Utama</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {ABOUT_YTS.missions.map((m, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mt-2" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
