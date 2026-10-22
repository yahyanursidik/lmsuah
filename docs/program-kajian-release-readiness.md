# Program Kajian lanjutan: kesiapan rilis dan migrasi

Status terkini 22 Oktober 2026: setelah uji salinan baru lulus dan pengguna memberi izin, baseline produksi telah direkonsiliasi dan migrasi 0010–0014 diterapkan atomik. Journal 15 entri, tidak ada schema drift/migrasi tertunda/duplikasi enrollment-progres; tidak ada penulisan baris aplikasi atau perubahan feature flags. Cadangan, bukti dan batas aktivasi terbaru ada di [laporan Contabo/sampul](contabo-uploads.md).

Hotfix deploy v0.3.3 sudah di-merge melalui PR #14. Kandidat unggahan/sampul v0.4.0 masih draft PR #15, menunggu uji bucket nyata dan end-to-end. Kesiapan schema bukan bukti aktivasi PDF privat/revisi atau kebijakan privasi bucket.

## Riwayat pemeriksaan 20 Oktober (bukan status produksi terkini)

Status 20 Oktober 2026: baseline dan migrasi 0010–0013 sudah diterapkan serta diuji **hanya di salinan Neon terisolasi**. Database sumber belum dimigrasi; flag fitur dan Blobs produksi belum diaktifkan. Kode masih lokal, belum push/merge; rilis produksi tetap v0.2.2. Catatan audit 18 Oktober adalah temuan historis, bukan daftar status terbaru. Bukti dan target salinan tersedia di [laporan rekonsiliasi](database-baseline-copy-2026-10-20.md).

## Cakupan yang diselesaikan

- Persiapan program, seri/kitab, modul, pertemuan multi-sumber, timestamp, kuis, dan pratinjau materi. Saat revisi aktif, menu/editor lama mengarahkan perubahan program ke **Review & Revisi**; katalog kitab bersama tetap dapat dikelola.
- Snapshot draft terpisah dari publikasi. Penulis/penyunting tidak dapat menyetujui revisinya sendiri. Isi yang diajukan tidak dapat ditimpa. Penolakan dan pemulihan isi lama menghasilkan draft baru, bukan menghapus riwayat.
- Hash optimistis dan pemeriksaan versi dasar mencegah penimpaan perubahan editor/publisher lain. Draft sementara hanya berada di memori tab, dipisahkan per akun dan dibersihkan saat logout; kunci jawaban tidak disimpan di localStorage.
- Snapshot awal dapat menyertakan pertemuan draft lama melalui pilihan eksplisit. Konten tidak lengkap tidak dapat diajukan. Versi publik lama tetap terbaca sampai penggantinya diterbitkan.
- Enrollment dan progres akun nyata disimpan di server. Update posisi untuk pertemuan yang sama diantrikan di klien; indikator simpan dan pesan gagal tersedia. Akun demo tetap lokal dan tidak diberi akses tulis server.
- Kuis yang berubah mendapat ID penilaian baru. Percobaan, jawaban, nilai, dan progres lama dipertahankan. Pemilik dapat melanjutkan kuis versi lama yang sudah dimulai, tetapi tidak memulai percobaan baru pada versi yang sudah diganti. Submit ulang bersifat idempoten.
- Portal peserta menyediakan daftar kuis berjalan dan hasil sebelumnya di Progres Belajar, dengan route evaluasi mandiri. Ini tetap berfungsi ketika pertemuan/kuis lama tidak lagi berada pada kurikulum versi terbaru. Pembacaan konteks riwayat tetap memeriksa kepemilikan percobaan dan tidak memberikan izin memulai kuis lama atau kunci jawaban lebih awal.
- PDF privat menggunakan Netlify Blobs, bukan URL publik berkas. Upload maksimal 4 MiB; MIME, signature, ukuran, SHA-256, kepemilikan pertemuan, sesi, permission, dan referensi snapshot diperiksa. Mendukung inline/range, private no-store, penamaan aman, review independen, versi pengganti, dan kebijakan unduh.
- PDF yang disetujui dapat diterbitkan **dalam transaksi yang sama** dengan publikasi pertama/revisi program. Publisher membutuhkan `transcript.publish`. Snapshot lama tetap dapat merujuk PDF terarsip yang sudah disetujui; mengganti PDF tidak merusak pembacanya sebelum revisi baru terbit.
- Pratinjau PDF privat memeriksa akses terlebih dahulu; error sesi/akses/server memiliki penjelasan dan tombol coba lagi, bukan frame JSON/HTML tanpa penjelasan.

## Migrasi yang diperlukan

| Urutan | Berkas | Dampak |
| --- | --- | --- |
| 0010 | `0010_majestic_eddie_brock.sql` | Tabel revisi/publikasi, pointer kuis, dokumen/versi PDF; trigger immutable/review; indeks dan FK |
| 0011 | `0011_stormy_freak.sql` | Riwayat tindakan versi PDF |
| 0012 | `0012_curved_talon.sql` | Versi dasar revisi dan FK komposit lintas program |
| 0013 | `0013_slim_mulholland_black.sql` | Keunikan enrollment/progres per akun serta indeks baca progres, soal, opsi, percobaan dan jawaban |

Migrasi baru bersifat aditif: tidak berisi penghapusan data atau penggantian ID riwayat. Indeks unik 0013 akan menolak duplikasi lama; tidak ada deduplikasi/penghapusan otomatis. Tinjau jendela pemeliharaan untuk pembuatan indeks pada tabel besar.

### Hasil pemeriksaan database yang terhubung lewat `.env`

`npm run db:preflight` memakai transaksi PostgreSQL `readOnly: true`, tanpa DDL maupun perubahan data, dan tidak mencetak connection string/akun/secret.

- Tabel dasar ada, tetapi journal Drizzle kosong (0 entri), sehingga riwayat migrasi belum tercatat: **BASELINE_REQUIRED**. Ini bukan berarti tabel journal tidak ada.
- Struktur revisi dan PDF privat belum tersedia.
- Kelompok enrollment/progres duplikat: 0 pada saat pemeriksaan.
- Definisi permission yang dibutuhkan tersedia. Ini bukan bukti bahwa setiap role sudah dipetakan; pemetaan aktual perlu ditinjau administrator.
- Target pemeriksaan adalah `DATABASE_URL` lokal. Jangan menganggapnya identik dengan database produksi Netlify tanpa memverifikasi target secara privat.

**Jangan langsung menjalankan semua migrasi dari 0000.** Tabel yang sudah ada dapat bertabrakan dengan CREATE TABLE lama. Migrator sekarang menolak keadaan ini dan juga meminta argumen persetujuan eksplisit.

### Hasil rekonsiliasi pada salinan

- Salinan `codex-baseline-program-kajian-20261019` (`br-little-rice-azlbhgy5`) berasal dari branch sumber `production` dan bukan branch default/primary.
- Referensi PostgreSQL dibangun dari SQL migrasi, bukan dari asumsi nama tabel. Baseline 0000–0009 cocok: 33 tabel, kolom/default/nullability, PK/unique/check/FK tervalidasi, indeks, fungsi aplikasi dan trigger. Tidak ada DDL perbaikan baseline yang diperlukan.
- Journal baseline dicatat dalam transaksi dengan kunci migrasi, pemeriksaan ulang katalog, dan pengaman journal. Empat migrasi lanjutan selesai dalam satu transaksi atomik; hasil akhir 40 tabel, 14 entri journal dan 3 trigger aplikasi aktif, tanpa perbedaan katalog.
- Jumlah baris di 33 tabel awal sama sebelum/sesudah upgrade. Perintah baseline/upgrade diulang: 0 migrasi diterapkan. Smoke test sintetis membuktikan aturan revisi/PDF, FK, keunikan enrollment/progres dan rollback DDL+journal; semua fixture dibatalkan, tanpa residu.
- Migrator HTTP bawaan yang terpasang menjalankan DDL terpisah lalu mencatat journal di akhir. Skrip aplikasi sekarang memakai satu batch transaksi untuk seluruh DDL dan journal yang pending, dengan verifikasi prefix/hash serta pengaman konkurensi. Hash baru memakai LF kanonis agar konsisten Windows/Linux; hash CRLF historis yang benar tetap diterima.
- Pembacaan ulang sumber menemukan 33 tabel dengan katalog dan jumlah baris yang sama; journal sumber tetap 0 entri. Tidak ada query tulis dari pekerjaan ini yang diarahkan ke sumber. Verifikasi jumlah baris bukan fingerprint isi seluruh baris; password/token tidak dibaca untuk audit.

## Prosedur aktivasi yang aman

1. Pastikan target DB/Netlify, backup yang dapat dipulihkan, dan waktu pemeliharaan. Buat salinan terisolasi database yang akan di-upgrade.
2. Jalankan `npm run db:preflight` pada target salinan. Exit 2 berarti baseline/duplikasi/permission belum siap; jangan mengabaikannya.
3. Jika **BASELINE_REQUIRED**, bandingkan schema aktual dengan hasil migrasi 0000–0009. Rekonsiliasi perbedaan dan catat hanya migrasi yang benar-benar terverifikasi pada journal salinan. Jangan mengisi journal dengan nilai perkiraan atau menjalankan ulang CREATE TABLE lama. Penulisan baseline pada database nyata memerlukan persetujuan terpisah.
4. Pada salinan yang targetnya telah diverifikasi, gunakan perintah copy-only pada laporan rekonsiliasi. `db:baseline-copy` tanpa flag apply hanya memeriksa; `--apply-on-copy` mencatat baseline terverifikasi dan menjalankan upgrade atomik. `db:smoke-copy -- --rollback-copy-only` menjalankan fixture sintetis yang dipaksa rollback. Jangan menjalankan `db:migrate -- --approved` langsung dengan `.env` sumber yang belum direkonsiliasi. Verifikasi tabel, kolom, FK, trigger aktif, dan indeks; uji dengan dua akun tim berbeda serta akun peserta. Jangan mengedit SQL migrasi yang telah diterapkan.
5. Tinjau pemetaan role dengan prinsip izin minimum. Penulis: `program.read/update`, `lesson.create/update`, dan izin kuis sesuai tugas. Reviewer: `program.read/review`, `lesson.review`, `quiz.review` bila ada kuis. Publisher: `program.read/publish`, `lesson.publish`, `quiz.publish` bila ada kuis, serta `transcript.publish` bila menerbitkan PDF baru. Pembaca PDF peserta membutuhkan `transcript.read`; upload/review membutuhkan permission masing-masing. Role juga harus termasuk tim konten yang didukung. Tidak ada pengangkatan admin atau pemberian izin otomatis pada rilis ini.
6. Verifikasi akses Netlify Blobs pada lingkungan deploy yang dimaksud. Dalam Netlify Functions gunakan konteks Blobs bawaan. Kredensial lokal opsional `NETLIFY_SITE_ID` dan `NETLIFY_BLOBS_TOKEN` hanya di server; jangan memakai prefix `VITE_`, menaruh secret pada dokumentasi, atau mengecualikannya dari secret scanning.
7. Setelah hasil salinan disetujui, terapkan baseline/migrasi pada target nyata dengan persetujuan pengguna. Kode tidak menjalankan migrasi lewat request atau saat build.
8. Baru aktifkan `LMS_PRIVATE_PDF_ENABLED=true` dan `LMS_PROGRAM_REVISIONS_ENABLED=true` sebagai environment server, lalu redeploy. Verifikasi `/api/program-capabilities` menggunakan sesi tim. Flag tanpa struktur/pelindung integritas lengkap tidak membuka endpoint fitur.
9. Smoke test di staging: buat draft → simpan multi-materi/kuis → upload dan review PDF → submit revisi → reviewer independen approve → publisher publish → peserta membaca PDF/range, ikut program, menyimpan progres, mengerjakan kuis → revisi kedua → pastikan publikasi lama/riwayat tetap utuh sampai versi kedua terbit.

### Rollback operasional

- Sebelum pernah menerbitkan snapshot, kode boleh dirilis dengan kedua flag tetap `false`; alur kompatibel lama tetap tersedia.
- Setelah snapshot dipakai, **jangan** menjadikan flag `false` sebagai rollback konten: pembaca lama akan kembali ke tabel sumber. Tarik program dari publik dengan status draft/arsip, atau salin snapshot lama ke draft baru lalu review/terbitkan sebagai versi baru.
- Jangan DROP tabel revisi/PDF atau menghapus blob sebagai rollback. Upload yang status commit-nya tidak pasti ditahan untuk rekonsiliasi; tidak ada penghapusan blob otomatis setelah kegagalan jaringan.
- Membatasi tombol unduh bukan DRM: pembaca yang diizinkan melihat PDF sudah menerima byte dokumennya. Validasi signature/hash bukan antivirus atau pemeriksaan seluruh isi PDF. Review berkas tetap wajib.

## Verifikasi lokal

Pengujian otomatis mencakup PostgreSQL in-memory, driver HTTP Drizzle yang dipakai produksi (mapping + batch atomik), upgrade schema lama dengan data, rollback publikasi/migrasi gagal, prefix/hash journal, konkurensi migrator, guard target salinan, konflik versi, review independen, sanitasi jawaban, akses lintas akun, penarikan program di tengah transaksi, sinkronisasi progres, serta UI/error PDF. Smoke test Neon terpisah dijalankan hanya pada salinan yang ditetapkan dalam manifest.

Perintah pemeriksaan:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:preflight
```

Hasil setelah rekonsiliasi salinan: **281 tes / 44 file lulus**, lint repository **0 error / 0 warning**, typecheck dan build produksi lulus tanpa warning ukuran bundle, serta **26 fungsi server** berhasil dibundel lokal tanpa error/warning. Output tes memiliki log error yang memang dipicu skenario negatif dan warning runtime pengujian Node/Better Auth; itu bukan error lint atau kegagalan assertion. Uji browser localhost pada tahap sebelumnya memverifikasi navigasi peserta dan tab hasil evaluasi pada akun demo; tahap rekonsiliasi ini berfokus pada database/migrator.

Smoke test GET anonim localhost pada capabilities, revisi, progres, daftar PDF, berkas PDF, dan riwayat kuis mengembalikan JSON dengan status proteksi 401/403 yang sesuai serta `Cache-Control: private, no-store`; tidak ada fallback HTML.

Tes integrasi tidak memakai `DATABASE_URL`. Preview dengan akun demo tidak membuktikan aktivasi migrasi, Google OAuth, atau penyimpanan Blobs nyata. Validasi Netlify staging tetap diperlukan setelah persetujuan migrasi; belum ada deploy baru dari pekerjaan ini.

## Batas paket Git

Sertakan kode `src/`, `shared/`, handler/utilitas/schema/migrasi beserta snapshot/journal, tes, manifest/lockfile, `.env.example`, dan dokumentasi yang relevan. Pertahankan konfigurasi Netlify serta catatan rilis v0.2.2 dari `main` saat menyiapkan branch rilis; jangan menimpa main dengan checkout lama.

Jangan ikutkan `.env`, token, `.agents/`, `.netlify/`, build output, atau skrip diagnostik lokal `check-db.ts`, `check-db2.ts`, `test-login.ts`, `test-roles.ts`, `test.ts`, `scratch/`, dan `.zcodeignore`. Belum ada commit/push/merge/tag baru; perubahan pengguna lain tetap dipertahankan.
