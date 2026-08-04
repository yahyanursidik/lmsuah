import { SEOHead } from '../../components/public/SEOHead';

export function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-8">
      <SEOHead
        title="Kebijakan Privasi"
        description="Kebijakan privasi dan perlindungan data pribadi pengguna LMS Kajian YTS."
      />

      <div className="border-b border-stone-200 pb-6 space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-950 sm:text-4xl">
          Kebijakan Privasi (Privacy Policy)
        </h1>
        <p className="text-xs text-slate-500">Terakhir diperbarui: 04 Agustus 2026</p>
      </div>

      <div className="rounded-2xl bg-white p-8 border border-stone-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Pendahuluan</h2>
          <p>
            Yayasan Tarbiyah Sunnah (YTS) berkomitmen penuh untuk melindungi data pribadi dan privasi para peserta penuntut ilmu yang menggunakan LMS Kajian YTS. Kebijakan ini menjelaskan bagaimana data Anda dikumpulkan, digunakan, dan dilindungi.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Informasi yang Kami Kumpulkan</h2>
          <p>Kami hanya mengumpulkan informasi dasar yang diperlukan untuk keperluan otentikasi dan pencatatan progres belajar, antara lain:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nama lengkap dan alamat email (melalui registrasi langsung atau Google OAuth).</li>
            <li>Riwayat pencapaian materi, transkrip PDF yang diunduh, dan nilai kuis.</li>
            <li>Alamat IP dan data teknis terbatas saat persetujuan TOS dicatat (Consent Audit).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Penggunaan Informasi</h2>
          <p>Data pribadi Anda digunakan semata-mata untuk:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Menyediakan akses ke modul kajian, materi kuis, dan transkrip PDF.</li>
            <li>Memverifikasi identitas dan role hak akses pengguna dalam sistem.</li>
            <li>Peningkatan kualitas platform dan statistik agregat tanpa mengekspos identitas pribadi.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Kerahasiaan & Keamanan Data</h2>
          <p>
            Kami menggunakan enkripsi standar industri dan kredensial aman (Better Auth dengan HttpOnly Secure Cookie) pada server-side. Kami tidak pernah menjual atau membagikan informasi pribadi Anda kepada pihak ketiga manapun untuk tujuan komersial.
          </p>
        </section>
      </div>
    </div>
  );
}
