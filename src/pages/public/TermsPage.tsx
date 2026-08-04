import { SEOHead } from '../../components/public/SEOHead';

export function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-8">
      <SEOHead
        title="Ketentuan Penggunaan"
        description="Syarat dan ketentuan penggunaan platform LMS Kajian Yayasan Tarbiyah Sunnah."
      />

      <div className="border-b border-stone-200 pb-6 space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-950 sm:text-4xl">
          Ketentuan Penggunaan (Terms of Service)
        </h1>
        <p className="text-xs text-slate-500">Terakhir diperbarui: 04 Agustus 2026</p>
      </div>

      <div className="rounded-2xl bg-white p-8 border border-stone-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Ketentuan Umum</h2>
          <p>
            Dengan mendaftar dan menggunakan LMS Kajian YTS, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan layanan yang ditetapkan oleh Yayasan Tarbiyah Sunnah.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Hak Cipta & Penggunaan Materi</h2>
          <p>
            Seluruh rekaman video, materi transkrip PDF, kuis, dan publikasi ilmiah di platform ini dilindungi hak cipta. Pengguna diizinkan mengunduh transkrip PDF untuk kepentingan belajar mandiri, namun dilarang memperjualbelikan atau mengubah isi materi tanpa izin tertulis dari YTS.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Perilaku Pengguna</h2>
          <p>Pengguna diwajibkan untuk:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Menggunakan identitas asli yang valid saat onboarding.</li>
            <li>Menjaga kerahasiaan sesi login dan tidak membagikan kredensial kepada pihak tidak berwenang.</li>
            <li>Tidak melakukan aktivitas yang merusak integritas sistem atau kuis (seperti kecurangan scoring otomatis).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Penutupan & Penangguhan Akun</h2>
          <p>
            Yayasan Tarbiyah Sunnah berhak menangguhkan atau menonaktifkan akun yang terbukti melanggar aturan etik atau melakukan pelanggaran keamanan sistem.
          </p>
        </section>
      </div>
    </div>
  );
}
