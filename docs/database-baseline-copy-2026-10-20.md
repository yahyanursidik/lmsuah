# Rekonsiliasi baseline dan uji migrasi pada salinan

Tanggal: 19–20 Oktober 2026 (Asia/Jakarta). Lingkup persetujuan: salinan database dahulu, tanpa migrasi, perubahan role, aktivasi flag, atau deploy pada sumber/produksi.

## Target yang diverifikasi

| Atribut | Nilai |
| --- | --- |
| Proyek Neon | `lmsahss` / `floral-bar-74911976` |
| Sumber | `production` / `br-tiny-term-az2vuw03` |
| Salinan | `codex-baseline-program-kajian-20261019` / `br-little-rice-azlbhgy5` |
| Endpoint salinan | `ep-flat-flower-aznt1j1t` |
| Database / PostgreSQL | `neondb` / 18 |
| Parent LSN salinan | `0/3B2D3B8` |
| Waktu pembuatan | `2026-10-19T16:48:20Z` |
| Default / primary salinan | `false` / `false` |

Manifest nonrahasia: `netlify/functions/db/baseline-copy-20261019.json`. Endpoint dan hubungan parent diverifikasi lewat metadata Neon sebelum pemakaian. Skrip menolak target yang sama dengan sumber (termasuk alias pooler), default/primary, nama branch yang tidak sesuai, database berbeda, endpoint/host tidak cocok, atau connection options override. Manifest bukan bukti otoritas untuk target lain: sebelum dipakai ulang, verifikasi kembali metadata branch/endpoint melalui Neon.

Kredensial tidak diambil dari connector, tidak dicetak dan tidak disimpan ulang. Salinan mewarisi role/password; skrip mengganti hostname URL `.env` hanya di memori setelah guard lulus. `.env` sumber tidak diubah.

## Rekonsiliasi baseline

1. Membuat branch salinan dari sumber; perbandingan schema Neon awal kosong (tidak ada perbedaan).
2. Menjalankan SQL 0000–0009 pada PostgreSQL lokal terisolasi untuk memperoleh katalog referensi yang nyata.
3. Membandingkan katalog salinan: **33 tabel**, kolom beserta tipe/default/nullability, constraint PK/unique/check/FK dan status validasinya, indeks, fungsi aplikasi non-extension, serta trigger beserta status aktifnya. Hasil **0 perbedaan**.
4. Sumber/salinan memiliki journal Drizzle kosong. Tabel journal ada; yang belum tersedia adalah entri riwayat. Tidak perlu mengulang CREATE TABLE lama atau menebak timestamp/hash.
5. Mencatat 10 entri baseline dalam satu transaksi: advisory lock → pemeriksaan katalog ulang → guard journal kosong → INSERT journal dengan timestamp asli dan SHA-256 LF kanonis. Tidak ada perubahan DDL atau baris aplikasi pada tahap baseline.

Jumlah baris awal yang tidak nol: user 9, account 9, session 9, profiles 8, roles 12, permissions 35, role_permissions 70, user_roles 6, programs 2, lessons 2, lesson_videos 2, schedules 1, venues 2, announcements 2. Tabel lainnya kosong. Hanya metadata dan COUNT agregat yang dibaca; tidak ada password, token, cookie, atau isi akun disalin ke laporan.

Pemeriksaan fingerprint seluruh baris tidak dilakukan: pengaman menolak pendekatan tersebut karena dapat memproses data autentikasi. Alternatif yang digunakan adalah metadata, jumlah baris dan tes integritas pada fixture sintetis. Kesamaan COUNT bukan pembuktian byte-per-byte isi seluruh tabel.

## Migrasi dan pengaman baru

Migrasi **0010–0013** diterapkan pada salinan saja. Seluruh DDL yang pending dan INSERT journal dikirim melalui **satu transaksi Neon HTTP**, bukan migrator HTTP bawaan yang mengeksekusi DDL terpisah lalu mencatat journal di akhir. Prefix journal, timestamp dan hash harus cocok; journal berubah saat menunggu lock membuat transaksi batal. Hash kanonis menghindari perbedaan CRLF Windows dan LF Linux; hash CRLF historis hanya diterima bila cocok dengan SQL yang dikenal.

Hasil:

- **40 tabel**, **14 entri journal**, **3 trigger aplikasi aktif**.
- **0 perbedaan katalog akhir** terhadap hasil migrasi 0000–0013 pada PostgreSQL referensi.
- Jumlah baris **33 tabel awal tidak berubah**.
- Migrator diulang di dalam verifikasi: **0 migrasi diterapkan**.
- Seluruh perintah baseline/upgrade kemudian diulang dari awal: **0 migrasi diterapkan**, 14 entri tetap, katalog dan jumlah baris tetap cocok.

## Pengujian kegagalan dan integritas

Tes otomatis terisolasi membuktikan:

- Kegagalan di akhir rangkaian migrasi membatalkan seluruh DDL dan journal yang belum commit.
- Konflik indeks unik pada upgrade membatalkan 0010–0013, mempertahankan 33 tabel baseline, 10 entri journal, serta baris lama yang berkonflik. Tidak ada deduplikasi otomatis.
- Perubahan journal oleh runner lain menggagalkan rencana basi tanpa menjalankan DDL aplikasi.
- Hash salah, timestamp/prefix berlubang, entri duplikat/future, target sumber/default/primary dan manifest tidak lengkap ditolak.
- Perubahan default/nullability, constraint/indeks, fungsi, atau trigger nonaktif terdeteksi oleh perbandingan katalog.

Smoke test **langsung pada salinan Neon** memakai user/program/pertemuan/PDF sintetis dalam transaksi yang selalu diakhiri exception rollback:

- DDL probe dan INSERT journal palsu hilang setelah kegagalan yang disengaja; journal asli tetap utuh.
- Konten revisi submitted tidak dapat diubah; penulis tidak dapat menyetujui revisinya sendiri.
- Publikasi harus memakai payload yang persis disetujui; versi dasar lintas program ditolak FK.
- Duplikasi enrollment dan progres ditolak indeks unik.
- Identitas/isi versi PDF immutable; self-approval PDF ditolak; hanya satu PDF terbit per dokumen.
- Kegagalan penggantian PDF mempertahankan versi lama published dan penggantinya approved.
- Seluruh COUNT dari **40 tabel** dan journal sama sebelum/sesudah tes. Tidak ada fixture tersimpan; revisi, publikasi, dan versi PDF tetap 0 setelah tes.

Ini menguji metadata/aturan database, bukan upload/download byte melalui Netlify Blobs atau sesi pengguna di staging.

## Mengulang verifikasi salinan yang sama

Jalankan dari root repository setelah memverifikasi ulang manifest dan endpoint Neon. Jangan mengganti `DATABASE_URL` menjadi target lain secara sembarang.

```sh
# SELECT-only; memeriksa katalog dan journal terhadap referensi yang sesuai
npm run db:baseline-copy -- --manifest=netlify/functions/db/baseline-copy-20261019.json

# Hanya salinan terverifikasi; pengulangan setelah selesai menerapkan 0 migrasi
npm run db:baseline-copy -- --manifest=netlify/functions/db/baseline-copy-20261019.json --apply-on-copy

# Fixture sintetis dan DDL probe; transaksi selalu rollback
npm run db:smoke-copy -- --manifest=netlify/functions/db/baseline-copy-20261019.json --rollback-copy-only
```

Skrip tidak mengubah environment aplikasi atau mengaktifkan fitur. Untuk database sumber tanpa baseline, `db:migrate -- --approved` tetap menolak dengan `BASELINE_REQUIRED`; flag persetujuan bukan jalan pintas untuk mengisi journal.

## Status sumber dan batas rilis

Verifikasi repository setelah perubahan: **281 tes / 44 file lulus**, lint **0 error / 0 warning**, typecheck/build produksi lulus tanpa warning ukuran bundle, dan **26 fungsi Netlify** dibundel lokal tanpa error/warning. `git diff --check` tidak menemukan masalah whitespace; Git hanya memberi pemberitahuan normalisasi LF/CRLF. Log skenario negatif dan warning runtime Node/Better Auth pada tes tidak menandakan kegagalan assertion.

Pembacaan ulang sumber menunjukkan **33 tabel**, **0 perbedaan katalog** dari kondisi saat salinan dibuat, jumlah baris 33 tabel sama, dan **journal tetap 0 entri**. Tidak ada query tulis pekerjaan ini yang diarahkan ke sumber. Sumber masih memerlukan baseline/migrasi dengan persetujuan terpisah sebelum fitur diaktifkan.

Salinan dipertahankan untuk tinjauan pengguna. Compute 0.25 CU, auto-suspend 300 detik. Branch tidak dihapus otomatis; penyimpanan/compute mengikuti penagihan Neon akun. Ini salinan data nyata dengan izin akses database yang diwariskan: jangan membuka endpoint ke pihak lain atau memasukkan connection string dalam Git.

Persiapan Git harus mempertahankan main/rilis v0.2.2 serta konfigurasi Netlify dan mengecualikan `.env`, token, output build, `.agents/`, `.netlify/`, dan skrip diagnostik lokal. Tidak ada commit/tag/push/merge/deploy baru pada tahap ini. Sebelum aktivasi produksi tetap diperlukan persetujuan migrasi sumber, verifikasi least-privilege role, Blobs staging dan alur dua reviewer dengan akun nyata. Lihat [runbook rilis](program-kajian-release-readiness.md).
