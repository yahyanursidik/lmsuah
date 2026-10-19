<!-- Hallmark · pre-emit critique: P4 H5 E4 S5 R5 V4 -->
# Audit Program Kajian / Pengelolaan Program

Tanggal: 18 Oktober 2026. Status: **audit selesai; perbaikan belum diterapkan**.

## 1. Kesimpulan

**Belum semua fitur lengkap, tersambung, aman, dan mudah dikelola.** Fondasi CRUD serta navigasi program sudah tersedia. Namun, modul masih memiliki celah keamanan, integrasi pendaftaran yang terputus, pengambilan data terpotong, dan alur publikasi yang belum terlindungi dengan baik.

**Wizard belum ada.** Yang tersedia adalah beberapa formulir/modal terpisah: program → pertemuan → materi → kuis. Belum ada stepper, checklist kesiapan, validasi lintas langkah, simpan-lanjutkan, atau review akhir sebelum terbit.

Prioritas bukan menambah banyak tab terlebih dahulu: tutup celah keamanan dan integritas data, sambungkan pendaftaran/progres, kemudian rapikan wizard dan navigasi.

## 2. Metode dan batas pengujian

- Membaca routing, halaman admin/publik/peserta, data provider, endpoint program/modul/pertemuan/kuis/enrollment, schema dan migration terkait.
- Membandingkan implementasi dengan `lms-kajian-yts-docs/MVP_SCOPE.md`, `FEATURES.md`, `EDITORIAL_WORKFLOW.md`, `PERMISSIONS.md`, `ACCEPTANCE_CRITERIA.md`, dan `design.md`.
- Menjalankan aplikasi lokal pada port 4180, menggunakan mode demo development yang sudah disediakan aplikasi.
- Melakukan pemeriksaan browser dan request **GET saja** terhadap API yang terhubung. Tidak membuat, mengubah, memublikasikan, menghapus, atau mengerjakan kuis pada data tersimpan.
- Membuka formulir pertemuan tanpa menyimpannya; menguji perpindahan fokus keyboard.
- Mengukur layout daftar program, kurikulum, dan formulir pertemuan pada viewport iframe 320, 375, 414, 768, dan 1440 px. Ini pemeriksaan layout browser, **bukan pengujian perangkat fisik/mobile keyboard**.
- Menjalankan Lighthouse pada daftar program lokal. Skor ini bukan skor keseluruhan aplikasi.
- Pemeriksaan keamanan kuis dan operasi tulis bersumber dari kode/schema; tidak dieksploitasi pada database. Data sampel yang diperiksa tidak memiliki kuis, sehingga kebocoran jawaban belum direproduksi terhadap kuis tersimpan.
- Tidak mengaudit konfigurasi RLS, privilege database, backup, deployment produksi, seluruh jenis berkas eksternal, atau seluruh kombinasi role melalui sesi produksi.

### Hasil perintah

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run typecheck` | Exit 0. Script memakai `tsc --noEmit` pada solution config berisi project references; jangan gunakan hasil ini sendirian sebagai jaminan pemeriksaan seluruh project. |
| `npm run build` | Lulus: `tsc -b` dan Vite. Bundle JS 918,26 kB, gzip 253,97 kB; warning chunk >500 kB. |
| `npm test -- --maxWorkers=1 --no-file-parallelism` | **106 tes lulus, 17 file**. Empat tes keamanan kuis masih placeholder, lihat temuan 16. |
| `npm run lint` | **Gagal: 30 error, 1 warning** pada repository. Termasuk berkas di luar modul dan dua error pada `scratch/test-drizzle-execute.ts` yang sudah ada. |
| Percobaan awal test/build paralel | Melewati timeout 120 detik; pengulangan di atas selesai. Tidak dianggap kegagalan produk. |

### Bukti runtime utama

1. `GET /api/lessons?programId=<slug-program>` menghasilkan **HTTP 500**; memakai UUID program menghasilkan respons normal. Ini cocok dengan bug tautan publik pada temuan 06.
2. Request daftar program dengan sesi demo peserta mengembalikan program **draft**. Ini mengonfirmasi pemisahan guest/peserta/editor belum benar pada temuan 03.
3. Respons daftar tanpa parameter pagination mengandung `limit: 10`. Dataset yang diperiksa kecil; kehilangan data ke-11 disimpulkan dari kontrak dan kode, bukan dari membuat data tambahan.
4. Pada dialog pertemuan, menekan Tab dari tombol simpan memindahkan fokus ke tautan **Beranda di belakang dialog**.
5. Layout sampel daftar program, kurikulum, dan form pertemuan tidak menunjukkan root horizontal overflow pada lima lebar pengujian. Belum merupakan bukti seluruh dialog/tabel/konten panjang lolos.
6. Lighthouse daftar program: accessibility **96**, best practices **100**. Terdapat kegagalan kontras dan label nama aksesibel. Skor SEO admin tidak dijadikan ukuran usability atau alasan membuat admin terindeks.

## 3. Inventaris menu, tab, form, dan tabel

| Area | Sudah tersedia | Belum lengkap / masalah |
| --- | --- | --- |
| Menu Program Kajian | Terhubung ke `/admin/programs`; breadcrumb; navigasi mobile | Belum dibatasi berdasarkan role/permission pada frontend |
| Daftar program | Tambah, edit, hapus, status, pencarian lokal, filter status, urutan, kartu/daftar, salin tautan, refresh, loading/error/empty state | Tidak ada pagination UI; filter/total hanya dari data termuat; tautan slug bermasalah; tidak ada indikator kesiapan |
| Tambah/edit program | Judul, slug, deskripsi, status | Belum wizard; kategori, kitab, pemateri, gambar dan relasi jadwal tidak dikelola di sini; error tersimpan di belakang modal |
| Ringkasan program | Jumlah pertemuan, materi, kuis, peserta; informasi umum | Jumlah dapat terpotong; gagal request tidak dibedakan; belum ada edit informasi, pratinjau peserta, atau checklist kesiapan langsung dari halaman |
| Pertemuan & Materi | Modul opsional, pertemuan langsung, tambah/edit/hapus, preview materi, tombol materi/kuis terpisah | Belum ada search/filter pertemuan, reorder, pindah modul, status kesiapan, dan error state yang memadai |
| Form modul | Nama modul | Tidak ada pengaturan urutan, ringkasan, pemindahan isi; modal belum konsisten dengan modal lain |
| Form pertemuan | Judul, slug, urutan, tanggal, deskripsi, draft/terbit | Urutan awal selalu 1; tidak bisa memilih/mengubah program atau modul; belum ada validasi kesiapan terbit |
| Dialog materi | Multi-sumber YouTube, PDF, audio, Drive, DOCX, tautan; URL; nama; durasi YouTube | URL saja, bukan upload privat; tanpa urutan tersimpan lintas tipe, validasi akses file, versioning, atau status per materi; nama YouTube tidak disimpan API |
| Dialog kuis | Judul, deskripsi, passing grade, attempts, pilihan jawaban, satu jawaban benar, penjelasan, publikasi | Belum selector benar/salah; bukan bank soal reusable; menonaktifkan berarti menghapus, bukan menyembunyikan |
| Peserta program | Tabel nama, email, tanggal daftar, status | Read-only; data pendaftaran frontend tidak masuk DB; nomor telepon tidak dikirim API; tanpa pencarian, filter, pagination UI, detail progres/nilai |
| Jadwal & lokasi | Modul terpisah; jadwal memiliki `programId` | Tidak ada pintasan/filter jadwal kontekstual dari ruang program; informasi jadwal/lokasi di detail publik belum mengambil relasi ini |
| Pengelolaan materi global | Route `/admin/lessons` masih tersedia | Tidak ada di menu utama; membuat pertemuan tanpa parent; pencariannya tidak dikirim provider |
| Katalog/detail publik | Daftar, kategori, detail, rekaman, ikuti, bookmark | Metadata tidak sesuai model admin; slug/UUID tidak konsisten; filter kategori tidak didukung field program |
| Kajian Saya / progres | Tampilan peserta, completion lokal | Belum tersinkron DB/perangkat; filter Diikuti dapat menampilkan program yang tidak diikuti |

Routing tab program aktual hanya **Ringkasan**, **Pertemuan & Materi**, **Peserta** (`src/App.tsx:109–115`, `src/pages/admin/AdminKajianLayout.tsx:15–19`). Tidak ditemukan tab pengaturan/review/analitik khusus program. Ini gap fungsi, bukan tautan tab yang sengaja dibiarkan rusak.

## 4. Temuan kritis — P0 / critical

### 01. Kunci jawaban bocor melalui endpoint pertemuan

- **Bukti kode:** `netlify/functions/lessons.ts:114–136` mengambil seluruh pertanyaan dan opsi, lalu mengembalikan objek opsi utuh, termasuk `isCorrect` dan penjelasan soal.
- Endpoint `/api/quizzes/:id` memang menghapus field sensitif, tetapi perlindungan itu dilewati melalui `/api/lessons/:id`.
- **Dampak:** peserta, bahkan guest pada pertemuan terbit, dapat memperoleh jawaban sebelum mengerjakan. Kuis draft juga ikut dimuat lewat endpoint ini.
- **Perbaikan:** pisahkan DTO editor dan pembaca; pembaca mendapat metadata kuis terbit saja. Kunci/penjelasan editor wajib permission, hasil peserta wajib kebijakan review yang eksplisit.
- **Status:** terkonfirmasi secara statis; belum diuji pada kuis tersimpan.

### 02. Penilaian kuis tidak memastikan opsi milik pertanyaan

- **Bukti:** `netlify/functions/quizzes.ts:145–159` mencari opsi hanya berdasarkan `optionId` dalam seluruh opsi kuis, tanpa memeriksa `option.questionId === q.id`.
- **Dampak:** opsi benar dari soal lain dapat dihitung benar untuk soal saat ini. Server-side scoring ada, tetapi relasi jawabannya salah.
- **Perbaikan:** validasi question → option → quiz → attempt secara utuh; tolak jawaban asing/duplikat, cocokkan quiz pada URL dengan attempt, serta simpan jawaban dan hasil secara atomik/idempoten.
- **Status:** terkonfirmasi kode; tidak mengirim submission manipulatif ke database.

### 03. Draft/arsip tidak terlindungi untuk peserta; status induk tidak konsisten

- **Bukti:** `utils/contentHelper.ts:16–19` hanya menandai pengguna tanpa sesi/role guest sebagai guest. `programs.ts:41–70` dan `lessons.ts:92–145` membatasi publikasi hanya untuk guest, bukan peserta biasa.
- **Runtime:** sesi demo peserta dapat mengambil program draft melalui daftar API.
- **Tambahan:** lesson publik tidak memeriksa apakah program induknya terbit. `quizzes.ts:41–43` mengizinkan pembaca login melihat kuis belum terbit; start attempt pada `85–114` tidak mengecek `isPublished` atau status lesson/program.
- **Dampak:** teks “Draft — hanya terlihat oleh tim” tidak sesuai perilaku. Mengarsipkan program belum menjamin isi dan kuis tidak bisa diakses langsung.
- **Perbaikan:** tentukan audience policy terpusat: publik/peserta hanya published dan parent yang diizinkan; editor hanya sesuai permission. Terapkan pada list, detail, lampiran, dan attempt, bukan hanya tampilan.

### 04. Permission publikasi dan batas ruang admin dapat dilewati

- **Bukti:** `src/App.tsx:102–121` hanya menggunakan `Authenticated`, tanpa guard role admin/editor. `AdminLayout.tsx` juga tidak memeriksa role; `Refine` tidak memiliki `accessControlProvider`.
- Backend konten memiliki proteksi mutasi dasar, jadi **bukan berarti peserta dapat melakukan semua mutasi**. Namun UI admin masih dapat dirender untuk pengguna login non-admin.
- `utils/contentHelper.ts:53–66` mengabaikan `_currentStatus`. Contributor dapat mengubah isi konten yang sudah terbit tanpa mengirim `status: published`, sehingga perubahan langsung masuk konten publik tanpa review.
- `lessons.ts:277–300` memeriksa status lesson, bukan `quiz.isPublished`. Contributor dapat mengirim publikasi kuis melalui patch quiz tanpa pemeriksaan permission publish kuis.
- **Perbaikan:** guard frontend berdasarkan kemampuan, gunakan permission backend per resource/action, dan tentukan revisi konten published. Role quiz author/reviewer pada dokumen juga perlu dipetakan; helper sekarang mengandalkan daftar role contributor/publisher/admin.
- **Status:** terkonfirmasi kode; tidak mencoba mutasi tidak sah.

## 5. Temuan tinggi — P1 / major

### 05. Daftar, filter, dan statistik diam-diam hanya menggunakan sebagian data

- **Bukti:** `src/providers/dataProvider.ts:121–128` hanya mengirim pagination ketika `mode === 'server'`. Mode `off` tidak meminta semua halaman. Backend `utils/contentHelper.ts:92–106` tetap default 10, maksimal 100.
- `AdminProgramsPage.tsx:119–163` mengambil daftar default lalu menghitung/filter/sort lokal. Kurikulum, ringkasan, peserta, katalog, dropdown program jadwal dan portal peserta juga terdampak.
- **Dampak:** program/pertemuan ke-11 bisa hilang dari layar; total, progres, daftar modul dan deteksi “modul kosong” dapat salah. Urutan lokal “terakhir diperbarui” juga hanya mengurutkan subset yang mula-mula diambil berdasarkan createdAt.
- Provider membaca `pagination.current`, sementara Refine v5 memakai `currentPage`; ini juga perlu diperbaiki saat mengaktifkan navigasi halaman.
- **Perbaikan:** gunakan server pagination/search/sort beserta total sebenarnya; untuk kurikulum ambil semua halaman secara eksplisit atau endpoint agregat. Sekadar `_limit=100` bukan solusi lengkap.

### 06. Tautan publik slug memuat program tetapi gagal memuat pertemuan

- **Bukti:** admin menyalin `/programs/${program.slug}` (`AdminProgramsPage.tsx:295–300`). Detail program publik mengirim route param langsung sebagai `programId` (`ProgramDetailPage.tsx:22–35`), sedangkan kolom `lessons.programId` adalah UUID.
- **Runtime:** filter `programId=<slug>` menghasilkan HTTP 500. Detail program sendiri mendukung slug, sehingga halaman bisa menampilkan program sambil terlihat tidak memiliki rekaman.
- **Perbaikan:** selesaikan query program dulu; request lessons menggunakan `refineProgram.id`; beri enabled hanya setelah ID tersedia. Validasi UUID filter API dan tampilkan error lessons, bukan kosong palsu.

### 07. Enrollment dan progres belum menghubungkan peserta dengan pengelola

- **Bukti:** `ProgramDetailPage.tsx:60–79`, `MyProgramsPage.tsx:31–35`, dan `src/lib/userStore.ts:3–5,35–86,91–193` memakai localStorage. `netlify/functions/enrollments.ts` hanya menyediakan GET.
- **Dampak:** tombol “Ikuti Kajian” berhasil lokal tetapi peserta baru tidak muncul di tabel admin; pindah perangkat kehilangan enrollment/progres; penghapusan storage bisa menghapus informasi belajar. Pengunjung tanpa identitas memakai fallback akun demo.
- **Perbaikan:** API join/drop program idempoten dan API progress dengan sesi pemilik, DB sebagai sumber utama; cache lokal hanya optimisasi. Guest diarahkan login dengan tujuan kembali. Definisikan migrasi data lokal dan jangan mengklaim sukses jika penyimpanan gagal.

### 08. Mengedit kuis menghapus dan membuat ulang seluruh struktur

- **Bukti:** `lessons.ts:201–243` menghapus opsi, soal, kuis, lalu membuat ID baru, walaupun payload boleh mengandung ID.
- `quiz_answers` mereferensikan opsi/soal dan `quiz_attempts` mereferensikan kuis dengan `ON DELETE no action` (`db/migrations/0006_melodic_micromacro.sql:94–101`).
- **Dampak:** edit kuis yang sudah dikerjakan dapat gagal foreign key. Jika belum ada jawaban tetapi ada attempt, soal/opsi dapat terhapus lebih dulu sebelum penghapusan kuis gagal. Riwayat tidak boleh diselesaikan dengan cascade delete sembarang.
- **Perbaikan:** pertahankan ID untuk perubahan aman; gunakan versi kuis immutable setelah ada attempt dan snapshot pertanyaan/jawaban. Bedakan nonaktif, arsip, dan hapus permanen.

### 09. Penyimpanan konten tidak atomik dan mudah menimpa perubahan lain

- **Bukti:** `lessons.ts:182–199,245–302` mengupdate lesson, menghapus materi lama, memasukkan materi baru, kemudian menyinkron kuis melalui banyak query terpisah.
- **Dampak:** gagal di tengah operasi meninggalkan perubahan parsial. Dua editor menyimpan seluruh array materi/soal dapat saling menimpa. Materi lintas tipe juga dikembalikan video terlebih dahulu, bukan urutan masukan (`109–112`).
- Nama tampilan YouTube dari form tidak tersimpan: insert video hanya menyimpan youtubeId/duration (`188–194`), GET tidak mengembalikan filename video.
- **Perbaikan:** operasi atomik yang kompatibel dengan Neon HTTP/batch atau koneksi transaksi yang sesuai; jangan berasumsi interactive transaction tersedia pada driver saat ini. Gunakan update berdasarkan ID, revision/updatedAt check, dan field sequence materi yang konsisten.

### 10. Hapus program/pertemuan dan ganti materi tidak memperhitungkan dependensi

- **Bukti:** `programs.ts:184–202` langsung delete program. Relasi series, chapters, lessons, schedules dan enrollments menggunakan FK no action.
- `lessons.ts:305–316` menghapus materi/kuis lebih dulu, baru lesson; tidak menangani lesson progress, catatan, dan markers. `syncMaterials` juga menghapus video tanpa menangani markers yang mereferensikannya.
- **Dampak:** program terisi tidak bisa dihapus dengan pesan generik 500; hapus lesson dapat meninggalkan konten terhapus sebagian sebelum FK terakhir menolak. Mengedit materi video yang punya marker dapat gagal.
- **Perbaikan:** dependency preflight di server, 409 yang menjelaskan data terkait, arsip sebagai pilihan utama, dan operasi atomik. Konfirmasi UI wajib menyebut dampak terhadap peserta/riwayat; kebijakan retensi harus diputuskan sebelum migration.
- **Status:** konsekuensi handler dan migration; penghapusan tidak diuji langsung.

### 11. Gagal memuat data sering dianggap kosong dan editor tetap dapat menyimpan

- **Bukti:** `AdminProgramDetailPage.tsx:18–39`, `AdminCurriculumPage.tsx:40–44,59–79`, `AdminParticipantsPage.tsx:24–53` tidak menyediakan cabang error request utama yang setara daftar program.
- `AdminMaterialDialog.tsx:18–22,42–51` memakai default array kosong; jika load gagal, tombol simpan tidak dinonaktifkan berdasarkan `isError`. Pola serupa ada pada editor pertemuan/kuis.
- **Dampak:** error jaringan dapat ditampilkan sebagai “belum ada materi/peserta”; mengklik simpan setelah gagal load berpotensi mengirim array kosong/default dan menimpa konten yang tidak terbaca. Program yang gagal dimuat tetap menampilkan navigasi dan Outlet.
- **Perbaikan:** bedakan loading/error/not-found/empty/ready, blokir mutasi sampai data siap, tampilkan retry di tempatnya. Jangan reset form kotor saat background refetch mengembalikan result baru tanpa konfirmasi.

### 12. Pertemuan tanpa program dan relasi lintas program dapat terbentuk

- **Bukti:** `AdminLessonsPage.tsx:175–184` membuka form tanpa programId/chapterId. Form tidak menyediakan pemilih parent (`AdminLessonForm.tsx:6–22,59–64`). Backend `lessons.ts:65–77` membolehkan kedua parent absen dan tidak memeriksa chapter milik program yang sama.
- **Dampak:** materi dibuat dari route global tetapi tidak terlihat dalam kurikulum program. Lesson dengan chapter dari program lain tidak masuk kelompok yang ditampilkan (`AdminCurriculumPage.tsx:59,72–74`). Edit lesson juga tidak dapat memperbaiki parent lewat UI sekarang.
- Pencarian route global menggunakan operator `contains` (`AdminLessonsPage.tsx:27`), sementara provider hanya meneruskan `eq` (`dataProvider.ts:102–110`), sehingga pencarian tidak benar-benar memfilter di server.
- **Perbaikan:** jadikan route global indeks lintas program dengan pemilih parent dan tautan workspace, atau arahkan pembuatan melalui konteks program. Tegakkan invariant parent di backend; bila lesson mandiri memang dibolehkan, sediakan tujuan dan akses yang jelas.

### 13. Informasi publik meminta data yang tidak bisa dikelola admin program

- **Bukti:** schema program hanya slug/title/description/status (`db/schema/index.ts:138–148`). Katalog memiliki filter kategori (`ProgramsPage.tsx:13,29–37`), tetapi program tidak memiliki kategori. Detail meminta instructor/bookTitle/routineSchedule/venueName (`ProgramDetailPage.tsx:227–244`).
- API program mengembalikan baris program tanpa agregasi relasi kitab/jadwal/lokasi. Detail publik memakai fallback nama pemateri/lokasi tertentu, bukan data relasi sebenarnya.
- **Dampak:** kategori dapat selalu kosong untuk data nyata; detail kitab/jadwal selalu “-”; lokasi/pemateri default berisiko memberi informasi yang tidak benar. Operator tidak menemukan form untuk memperbaikinya dari program.
- **Perbaikan:** sepakati model kanonik program → kitab/seri dan program → jadwal → venue/pemateri, lalu sajikan DTO publik yang cocok. Tampilkan “belum diatur” jika belum ada data, bukan informasi faktual buatan.

### 14. PDF masih berupa URL eksternal, belum lifecycle privat sesuai spesifikasi

- **Bukti:** `AdminMaterialDialog.tsx:43–49` hanya input URL; `lessons.ts:194` menyimpan URL. `MaterialViewer.tsx:79–94` memakai URL langsung pada iframe dan tautan.
- Spesifikasi MVP meminta upload PDF, private Netlify Blobs, authenticated file endpoint, review/publish dan kebijakan unduh. Tidak ditemukan jalur upload/file delivery tersebut pada endpoint yang tersedia.
- **Dampak:** belum ada validasi isi MIME/ukuran/versi PDF atau akses draft per berkas. `allowDownload=false` hanya menyembunyikan tombol aplikasi; toolbar PDF tetap memakai `toolbar=1`, ada tautan buka langsung, dan URL tersedia dalam response.
- **Perbaikan:** implementasi storage privat + metadata/version/status + endpoint file dengan session/permission dan kebijakan kedaluwarsa. Jelaskan bahwa file yang sudah dikirim ke browser tidak dapat dijamin mustahil disalin; pembatasan tombol bukan DRM.

### 15. Attempt terakhir yang belum selesai tidak dapat dilanjutkan

- **Bukti:** `quizzes.ts:94–106` mengecek `previousAttempts.length >= maxAttempts` **sebelum** mengembalikan attempt `in_progress`.
- **Dampak:** pada attempt terakhir, reload kemudian start lagi dapat ditolak meskipun pengerjaan belum submitted. Tidak ada proteksi atomik untuk start bersamaan; dua request dapat membaca jumlah lama lalu sama-sama insert.
- `QuizComponent.tsx:45–78,112–114` tidak memulihkan state attempt/jawaban setelah reload; error menggantikan seluruh UI tanpa retry. Raw fetch juga melewati wrapper demo/network aplikasi, sehingga pengalaman kuis demo tidak konsisten dengan modul lain.
- **Perbaikan:** cari attempt aktif lebih dulu, lanjutkan secara idempoten, kemudian validasi kuota dalam operasi terlindungi concurrency. Sediakan resume/draft jawaban, retry, dan ringkasan sisa percobaan.

### 16. Tes keamanan kuis hijau tetapi tidak menguji handler

- **Bukti:** `tests/quiz-security.test.ts:30–63` berisi empat `expect(true).toBe(true)` untuk leakage, manipulasi nilai, max attempts dan ownership. Request/response handler yang seharusnya diuji hanya komentar.
- **Dampak:** angka 106 passing tidak dapat dipakai sebagai bukti empat kontrol ini bekerja. Tes integrasi UI lainnya banyak memakai hook mock, bukan kontrak endpoint penuh.
- **Perbaikan:** ganti placeholder dengan pengujian handler dan relasi data; cakup kebocoran melalui **semua endpoint**, opsi milik soal lain, draft/archived, publisher permission, attempt resume/race, edit kuis bersejarah dan rollback. Gunakan fixture DB terisolasi/branch uji untuk pengujian tulis, bukan data pengguna aktif.

## 6. Temuan UX dan kelengkapan — P2 / major

### 17. Wizard terpandu belum dikembangkan

- **Bukti:** `AdminProgramsPage.tsx:240–247,509–564` menutup modal setelah create dan kembali ke daftar. Kelanjutan memerlukan klik Kelola → Pertemuan & Materi → tambah pertemuan → buka lagi dialog materi/kuis.
- **Dampak:** pengguna baru harus menyimpulkan urutan sendiri; program/pertemuan bisa langsung terbit sebelum konten siap. Tidak ada review akhir/checklist, langkah berikutnya, atau resume onboarding program.
- **Perbaikan:** gunakan guided setup opsional berbasis data server, bukan memaksa seluruh pengelolaan harian lewat wizard; rancangan di bagian 8.

### 18. Review, revisi, dan audit belum menjadi alur pengelolaan

- **Bukti:** program hanya draft/published/archived; lesson draft/published. Dokumen editorial meminta review/approval/revision/scheduled. `logMutationAudit` hanya menulis log (`utils/contentHelper.ts:131–146`), belum tampilan riwayat program.
- **Dampak:** penanggung jawab tidak bisa mengirim review, memberi catatan revisi, membandingkan versi atau melihat siapa mengubah apa dari workspace. Form detail program tidak menyediakan edit/pratinjau kontekstual.
- **Perbaikan:** minimal draft → review → approved → published/archived, actor/timestamp/catatan, serta action Edit informasi, Pratinjau, dan Riwayat. Scheduled publishing dapat tahap berikutnya setelah kebutuhan dipastikan.

### 19. Error simpan program/modul muncul di belakang modal

- **Bukti:** `AdminProgramsPage.tsx:234,248,368–385` menyimpan feedback di halaman utama, bukan di form modal. `AdminCurriculumPage.tsx:63,71,75` memakai pola serupa untuk modul.
- **Dampak:** slug duplikat atau penolakan akses bisa terlihat seperti tombol tidak bekerja. Fokus tidak diarahkan ke masalah; radio status program yang disembunyikan juga tidak memiliki indikator fokus label.
- **Perbaikan:** letakkan error di dalam dialog dan pada field terkait, hubungkan `aria-describedby`/`aria-invalid`, scroll/fokus ke error pertama. Feedback halaman cukup untuk sukses setelah dialog ditutup.

### 20. Penyuntingan slug mengganggu input dan alamat lama tidak terlindungi

- **Bukti:** `AdminProgramsPage.tsx:525,532` menormalisasi setiap perubahan dan membuang tanda hubung di akhir; saat mengetik manual `kajian-`, tanda hubung langsung hilang. Mengubah judul program baru juga selalu menimpa slug manual.
- Form pertemuan menggunakan heuristik judul sebelumnya dari `title.slice(0,-1)` (`AdminLessonForm.tsx:55–57`), tidak andal untuk paste, hapus, dan replace judul.
- **Dampak:** alamat sulit diedit; judul berubah bisa membatalkan pilihan slug pengguna. Mengganti slug program terbit tidak menyimpan redirect alamat lama.
- **Perbaikan:** simpan raw input, normalisasi pada blur/submit; pisahkan `slugManuallyEdited`; preview URL dan validasi duplikat; konfirmasi perubahan URL published dan buat alias/redirect bila perlu.

### 21. Nomor urut, pindah modul, dan penyusunan ulang belum aman

- **Bukti:** form pertemuan default `sequence:1` (`AdminLessonForm.tsx:35–36`), pembuatan modul `chapters.length+1` (`AdminCurriculumPage.tsx:63`); tidak ada uniqueness sequence dalam konteks program atau tie-breaker sorting.
- **Dampak:** setiap lesson baru bisa bernomor 1; setelah penghapusan/gap urutan, nomor modul dapat bertabrakan. Tidak ada move up/down atau pindah chapter; menyusun program panjang menjadi pekerjaan manual.
- **Perbaikan:** tetapkan arti urutan global/per modul, hitung next dari server, sediakan reorder yang bisa dipakai keyboard dan pindah modul; server memvalidasi dan menyimpan perubahan atomik.

### 22. Modal belum aman untuk keyboard dan perubahan belum tersimpan

- **Bukti runtime:** Tab dari Simpan pertemuan berpindah ke navigasi Beranda di luar dialog. Kode dialog program/pertemuan/materi/kuis tidak memasang focus trap/inert background atau restore focus yang konsisten.
- Modal modul tidak memiliki penanganan Escape/body scroll lock yang setara; tombol Batal modul tetap aktif saat simpan (`AdminCurriculumPage.tsx:75`).
- **Dampak:** pengguna keyboard/screen reader dapat berinteraksi dengan belakang dialog. Escape/Batal/backdrop dapat membuang perubahan tanpa peringatan. Sebagian kontrol ikon memakai target 32–40px, lebih kecil dari 44px pada `design.md`.
- **Perbaikan:** komponen dialog bersama dengan focus containment/restore, background inert, Escape yang konsisten, dirty-form confirmation, disable semua close saat pending, dan target sentuh sesuai sistem desain.

### 23. Kontras warna tidak konsisten dengan permukaan terang

- **Bukti Lighthouse:** label “Ruang kerja program” memiliki rasio **3,43:1**, sementara teks kecil memerlukan 4,5:1. Beberapa teks slate-500 di atas paper sekitar **4,48:1**.
- **Bukti kode tambahan:** feedback memakai emerald/rose-200 pada background terang (`AdminProgramsPage.tsx:371–375`); pilihan grid aktif slate-900 pada slate-700 (`420–424`); tombol/label materi dan kuis memakai emerald/amber-200/300 pada permukaan terang (`AdminCurriculumPage.tsx:42,46,71`, dialog materi/kuis).
- **Dampak:** label aksi atau feedback terlihat pudar; ikon mode aktif sulit dibaca. Stamp komentar “contrast pass” bukan bukti hasil render.
- **Perbaikan:** gunakan token warna teks/status yang cocok untuk light surface dan audit default/hover/focus/disabled/error/success. Pertahankan desain workbench yang ada, tidak perlu mengganti tema seluruh aplikasi.

### 24. Tabel peserta belum menjadi alat pengelolaan program

- **Bukti:** `AdminParticipantsPage.tsx:19–25,41,55–95` hanya menampilkan data tanpa pencarian/filter/detail/actions, dan total menggunakan panjang array. UI meminta `profilePhone`, tetapi `enrollments.ts:44–52` tidak memilihnya.
- `enrollments.ts:29–34` hanya mengakui administrator/super_administrator untuk melihat semua peserta; alias role `admin` yang diakui di tempat lain malah dibatasi ke enrollment dirinya. Hak operator/publisher perlu kebijakan eksplisit, bukan dibuka otomatis.
- **Perbaikan:** setelah enrollment DB tersambung, tambahkan server search/filter/pagination/total, detail progres/nilai dan tanggal aktivitas. Jika perlu tambah/drop/manual export, lindungi dengan permission dan audit; kontak tampil hanya bila memang dikirim dan diizinkan.

### 25. Timestamp ada di model/peserta, tetapi belum ada alur pengelolaannya

- **Bukti:** tabel `lesson_markers` ada (`db/schema/index.ts:277–286`); `LessonDetailPage.tsx` merender `lesson.markers`. Namun GET lesson hanya mengembalikan materials/quiz, tanpa mengambil markers, dan editor sekarang tidak menyediakan input timestamp.
- **Dampak:** fitur daftar isi video yang tampak tersedia dalam UI/tests tidak tersambung pada data API nyata; mengganti video malah terhalang FK marker (temuan 10).
- **Perbaikan:** CRUD marker per video, validasi detik/urutan, preview seek, DTO markers pada pembaca, serta kebijakan marker saat video diganti. Ini termasuk kebutuhan MVP, bukan sekadar fitur tambahan.

### 26. Seri dan kitab belum terhubung ke pengelolaan program

- **Bukti:** endpoint/schema series/books/chapters ada, tetapi menu dan routes program hanya tiga tab; kurikulum hanya query chapters berdasarkan programId. `lessons` memiliki programId/chapterId tanpa seriesId; seriesBooks belum disajikan sebagai struktur program.
- **Dampak:** spesifikasi program → seri → kitab → bab → pertemuan belum dapat dikelola dari UI. Modul program langsung berguna sebagai penyederhanaan, tetapi belum setara hierarki yang dijanjikan.
- **Perbaikan:** sepakati apakah struktur sederhana menjadi produk resmi atau hierarki MVP tetap wajib. Jika wajib, tentukan ownership bab/kitab/seri dan migrasi relasinya sebelum menambah tab; hindari membangun dua kurikulum paralel.

### 27. Kuis benar/salah dan pembahasan belum lengkap end-to-end

- **Bukti:** schema menerima `true_false`, tetapi `AdminQuizDialog.tsx:12,15–25` selalu membuat `single_choice` tanpa kontrol jenis soal. “Bank soal” adalah array soal di satu lesson, bukan bank reusable.
- Form menyimpan explanation; hasil peserta `QuizComponent.tsx:116–125` hanya skor dan lulus/gagal. Endpoint hasil `quizzes.ts:199–223` mengembalikan answers tetapi tidak menyusun pembahasan yang dijanjikan komentarnya.
- **Perbaikan:** selector jenis soal dengan opsi benar/salah terkontrol, validasi tepat satu benar, serta review hasil terotorisasi sesuai kebijakan retry. Bedakan “Soal kuis” dari “Bank soal” jika reuse belum dikembangkan. Penghapusan opsi benar perlu validasi inline sebelum submit.

### 28. Progres dan tombol lanjut belajar tidak memakai sumber yang tepat

- **Bukti:** detail publik menghitung progress dari `displayProgram.lessons`, bukan hasil lessons API (`ProgramDetailPage.tsx:60–68`), sementara API program tidak menyediakan nested lessons. Tombol “Lanjutkan Belajar” selalu ke lesson pertama (`210–216`).
- `MyProgramsPage.tsx:18–28` mengembalikan semua program pada filter “Diikuti” bila tidak ada enrollment yang cocok. Detail peserta tidak memfilter status lesson secara eksplisit, sementara backend membolehkan draft bagi peserta (temuan 03).
- **Dampak:** pembilang/total bisa tidak sesuai; “Diikuti” berisi yang belum diikuti; lanjut belajar mengulang pertemuan awal; modul/chapter yang disusun admin tidak terlihat sebagai kelompok pada daftar peserta yang datar.
- **Perbaikan:** gunakan dataset lessons published lengkap + progres server; pilih last active atau next incomplete; tampilkan empty state yang jujur pada filter Diikuti; pertahankan struktur kurikulum pada sisi peserta.

## 7. Temuan rendah — P3 / minor

### 29. Istilah dan nama navigasi belum konsisten

- Ringkasan menyebut kurikulum, tab “Pertemuan & Materi”, breadcrumb “Kurikulum”, route global “Materi (Lessons)” padahal formnya “Pertemuan”. “Draft”/“Arsip” tidak konsisten dengan badge raw `archived` di header.
- Lighthouse mendeteksi tautan mobile bertuliskan **Beranda** tetapi `aria-label="Dashboard"` (`AdminLayout.tsx:18,40`). Nama aksesibel sebaiknya mengandung teks terlihat.
- `AdminProgramsPage.tsx:272–277,495–497` memberi aksi draft/publish memakai ikon archive, sedangkan archive yang sebenarnya hanya di form edit. Tidak ada lifecycle status program berlangsung/selesai yang terpisah dari status publikasi.
- **Perbaikan:** gunakan kamus istilah tunggal, nama aksesibel selaras, dan aksi arsip eksplisit. Bedakan status editorial dari status pelaksanaan jika keduanya dibutuhkan.

### 30. Bundle besar meningkatkan biaya membuka ruang program

- **Bukti:** build menghasilkan satu JS utama 918,26 kB; `src/App.tsx:6–43` mengimpor seluruh halaman secara eager.
- **Dampak:** admin/peserta memuat kode portal lain juga. Ini sinyal ukuran bundle, **bukan bukti angka waktu lambat**; tidak dilakukan benchmark performa perangkat.
- **Perbaikan:** lazy route boundary dan pemisahan chunk fitur berat; pastikan loading/error boundary konsisten dan ukur ulang pada jaringan/perangkat target.

**Jumlah temuan: 4 critical · 24 major · 2 minor.** Severity di atas bukan skor kelulusan keseluruhan produk.

## 8. Rancangan wizard yang disarankan

Wizard untuk **pembuatan/persiapan**, workspace untuk **pengelolaan harian**. Keduanya memakai data dan aturan backend yang sama.

### Alur setup

1. **Informasi program**
   - Judul, deskripsi, slug, kategori dan relasi kitab/pemateri sesuai model yang disepakati.
   - Simpan sebagai draft terlebih dahulu. Tampilkan validasi slug dan URL akhir.
2. **Struktur belajar**
   - Pilih pertemuan langsung atau kelompok modul; seri/kitab bila model tersebut dipertahankan.
   - Tambah/pindah/urutkan; tidak perlu membuat modul kosong hanya agar bisa lanjut.
3. **Pertemuan & materi**
   - Data pertemuan, minimal sumber yang diwajibkan kebijakan, ringkasan, marker dan PDF bila diperlukan.
   - Simpan lalu “Tambah materi sekarang”, tanpa harus mencari kartu kembali. Kuis tetap opsional kecuali kebijakan program mewajibkannya.
4. **Evaluasi & penyelenggaraan**
   - Kuis, review konten, serta hubungkan jadwal/lokasi yang sudah ada. Jangan duplikasi form modul jadwal.
   - Langkah opsional ditandai “Opsional / Lewati”, bukan dianggap error.
5. **Review & terbitkan**
   - Pratinjau sebagai peserta dan guest; checklist kesalahan wajib vs rekomendasi.
   - Ringkasan apa yang akan terlihat publik, siapa yang boleh menerbitkan, dan konfirmasi publikasi.

### Perilaku wajib

- Stepper punya nama langkah, status selesai/perlu perhatian, tombol Kembali/Lanjut dan fokus judul langkah.
- “Simpan draft & keluar”, resume dari server setelah reload/perangkat lain, dan konfirmasi meninggalkan perubahan belum tersimpan.
- Validasi field lokal untuk kenyamanan, validasi aturan yang sama pada backend untuk keamanan.
- Kuis, jadwal dan materi tidak saling terhapus saat hanya satu bagian disimpan.
- Langkah selesai diturunkan dari kesiapan data, bukan sekadar pernah diklik.
- Tidak memaksa pengguna mengulang semua langkah untuk edit kecil setelah program berjalan.
- Published parent tidak otomatis menerbitkan seluruh draft child. Unpublish/archive harus memiliki perilaku akses child yang jelas.

### Workspace setelah setup

- **Ringkasan:** kesiapan + angka agregat benar + Edit informasi + Pratinjau + langkah berikutnya.
- **Kurikulum:** pertemuan/modul, pencarian, filter status, reorder, materi dan kuis kontekstual.
- **Peserta:** pendaftaran DB, filter/pagination, progres/nilai sesuai permission.
- **Jadwal & Lokasi:** tampilkan relasi dan pintasan ke modul jadwal yang sudah ada dengan program terpilih.
- **Review & Riwayat:** dapat berupa panel/action kontekstual sebelum layak menjadi tab tersendiri.

Tidak perlu menambah setiap fitur sebagai tab baru. Tujuannya mengurangi perpindahan konteks dan memastikan setiap data punya satu tempat pengelolaan yang jelas.

## 9. Kelengkapan dibanding kebutuhan MVP

| Kebutuhan | Penilaian |
| --- | --- |
| Program CRUD | Ada, belum aman/lengkap untuk lifecycle data terkait |
| Pertemuan/modul langsung | Ada, belum aman untuk urutan/relasi/error/pagination |
| Seri/kitab/bab terintegrasi | Backend parsial; alur UI program belum tersedia |
| Multi-sumber materi | Ada, persistence nama/urutan dan safety edit belum lengkap |
| Timestamp | Schema/komponen ada; pengelolaan dan DTO belum tersambung |
| PDF viewer | Ada; perlu pengujian berkas/sumber/perangkat nyata |
| Upload PDF privat, versi, review | Belum tersedia pada alur modul yang diaudit |
| Kuis pilihan tunggal | Ada, ada masalah keamanan/riwayat/attempt |
| Kuis benar/salah | Backend menerima; authoring UI belum tersedia |
| Pembahasan hasil | Belum lengkap di API/UI peserta |
| Enrollment/progres permanen | Schema/GET ada; interaksi peserta masih lokal |
| Review sederhana/publish | Publish ada; review/approval belum ada |
| Audit publikasi | Log server ada; belum riwayat/review operasional dalam program |
| Analitik dasar program | Ringkasan jumlah ada, bukan analitik hasil belajar yang utuh |
| Wizard | Belum ada |

**Bukan kekurangan MVP yang perlu dipaksakan sekarang:** pembayaran, sertifikat, forum, AI, OCR, native app, WhatsApp, dan sinkronisasi PDF-video; dokumen MVP menempatkannya di luar cakupan.

## 10. Urutan perbaikan

### Gelombang 1 — penghalang keamanan dan kerusakan data

- [ ] Tutup kebocoran jawaban di endpoint lesson.
- [ ] Perbaiki validasi relasi opsi-soal-kuis-attempt dan submission idempoten.
- [ ] Terapkan visibility published/parent pada semua jalur baca dan attempt.
- [ ] Terapkan permission editor/publisher/reviewer dan guard ruang admin.
- [ ] Hentikan delete/recreate kuis bersejarah; tetapkan versioning dan kebijakan hapus.
- [ ] Lindungi operasi tulis atomik serta editor yang gagal load.
- [ ] Ganti placeholder tes keamanan dengan pengujian perilaku nyata.

### Gelombang 2 — sambungkan alur utama

- [ ] Perbaiki slug → UUID, error lessons dan validasi filter API.
- [ ] Pagination/search/sort/total kontraktual, termasuk `currentPage`.
- [ ] Enrollment/progres API dan sinkronisasi tabel peserta.
- [ ] Tegakkan parent pertemuan/modul dan rapikan route materi global.
- [ ] Selaraskan metadata publik dengan form dan relasi data.
- [ ] Perbaiki resume attempt dan pemulihan error.

### Gelombang 3 — pengelolaan dan UX

- [ ] Guided setup + checklist publikasi + draft/resume.
- [ ] Dialog reusable, inline errors, dirty guard, fokus dan kontras.
- [ ] Reorder/pindah modul, detail peserta, jadwal kontekstual.
- [ ] Selesaikan keputusan model seri/kitab, timestamp, PDF privat dan review sesuai prioritas MVP.
- [ ] Lengkapi authoring benar/salah dan pembahasan hasil.
- [ ] Route splitting, label/istilah konsisten, uji seluruh state responsif.

## 11. Acceptance test untuk menyatakan modul selesai

1. **Role:** guest/peserta tidak dapat membaca draft/arsip melalui list/detail/direct URL/lesson/quiz/file; contributor tidak dapat menerbitkan lewat patch tidak langsung; reviewer/publisher/operator mengikuti permission yang disepakati.
2. **Program baru:** simpan draft → struktur → pertemuan → materi → kuis opsional → review → terbit; keluar/reload/masuk lagi dapat melanjutkan tanpa data hilang.
3. **Dataset:** gunakan >10 dan >100 program/pertemuan/peserta; semua dapat dicari/dijangkau; total konsisten dengan DB; halaman kedua benar.
4. **URL:** akses program via UUID dan slug memuat pertemuan identik; slug buruk diberi 400; program hilang 404; slug duplikat 409, bukan 500 generik.
5. **Relasi:** pindah modul, ubah urutan, dan tambah dari route global tidak membuat data yatim/lintas program. Jadwal/venue publik sesuai relasi yang dikelola.
6. **Materi:** edit data pertemuan tidak menghapus materi/kuis; nama dan urutan bertahan setelah reload; video dengan marker bisa diedit sesuai kebijakan; failure di tengah write tidak mengubah sebagian data.
7. **Kuis:** tidak ada kunci jawaban pada response pembaca; opsi soal lain ditolak; published/attempt ownership ditegakkan; attempt terakhir bisa resume; submit ganda dan start bersamaan aman; edit tidak merusak histori nilai.
8. **Peserta:** join/drop dari perangkat A terlihat di admin dan perangkat B; progres/hasil akurat; filter Diikuti tidak mengaku program yang belum diikuti; lanjut belajar menuju pertemuan tepat.
9. **Hapus/arsip:** program terisi memberi penjelasan dependensi; arsip membatasi akses sesuai aturan; tidak ada kehilangan histori/partial delete saat FK menolak.
10. **Error:** network timeout/403/404/409/500 tampil di lokasi yang benar dengan retry; form yang belum load tidak bisa overwrite; input berisi spasi, tanggal buruk, URL non-http(s), urutan invalid dan panjang field ditolak server secara jelas.
11. **Aksesibilitas:** Tab/Shift+Tab tertahan di dialog, fokus kembali, Escape konsisten, perubahan kotor diperingatkan; semua field punya label; kontras dan target sentuh sesuai desain.
12. **Responsif:** seluruh tab/dialog/tabel/preview diuji pada 320/375/414/768/desktop, konten panjang dan keyboard mobile. Scroll tabel lokal diperbolehkan bila jelas; root overflow tidak.
13. **Quality gate:** `tsc -b`, lint, tes perilaku/integrasi, build lulus; tes keamanan tidak placeholder. RLS/privilege/storage/production smoke test diverifikasi terpisah, tidak diasumsikan dari frontend build.

## 12. Penilaian akhir UI/UX

**Yang sudah baik:** navigasi dasar tiga tab jelas, ada jalur kembali, search/filter daftar, state loading/empty/error pada daftar program, pemisahan form pertemuan dari materi/kuis, serta preview multi-sumber. Layout sampel tidak overflow pada lebar uji.

**Yang membuatnya belum layak disebut user-friendly secara menyeluruh:** tidak ada wizard/checklist, error tersembunyi/dianggap kosong, jumlah data berpotensi salah, data peserta tidak tersambung, beberapa aksi/konteks tersembunyi, modal bocor fokus, dan informasi publik berbeda dari yang bisa dikelola admin.

Kesimpulan ini tidak menyatakan semua fitur gagal. **Fondasi ada; kelengkapan dan koneksi end-to-end belum tercapai.** Temuan kode sudah diprioritaskan, tetapi perbaikan perlu diimplementasikan dan diuji kembali sebelum modul dinyatakan selesai.
