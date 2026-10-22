# Unggah media Contabo dan sampul Program Kajian

Status pengembangan: 2026-10-22. Belum dirilis; unggah nyata ke bucket menunggu kredensial lokal dan konfigurasi Functions Netlify.

Kandidat rilis terisolasi: 399 tes/55 file lulus, tambahan pengaman URL lulus 8 tes Contabo; lint/typecheck/build lulus. Hotfix deploy v0.3.3 sudah dirilis melalui PR #14, sedangkan unggahan tetap kandidat draft v0.4.0.

## Media publik

Admin/editor dapat memilih JPEG, PNG, atau WebP (maksimal 4 MiB); server memverifikasi dan mendekode gambar, membatasi 20 megapiksel, mengoreksi orientasi, menghapus metadata, dan menyimpan WebP maksimal 1600 × 1600. Sampul program, foto lokasi, dan gambar pengumuman memakai pemilih/pratinjau yang sama. URL manual tetap didukung untuk kompatibilitas.

Materi PDF publik dapat diunggah dari editor materi setelah admin mencentang konfirmasi publik. Berkas publik disimpan dengan nama UUID baru di public/images/ atau public/documents/. Simpan formulir setelah unggah selesai untuk mengaitkan URL. Tombol simpan dinonaktifkan selama unggah; kegagalan mempertahankan URL lama dan menampilkan pesan.

Tidak ada penghapusan otomatis foto lama/unggahan yang tidak jadi disimpan: objek lama mungkin masih direferensikan publikasi atau konten lain. Pembersihan orphan memerlukan audit referensi terpisah.

## Konfigurasi server

Simpan CONTABO_ACCESS_KEY_ID dan CONTABO_SECRET_ACCESS_KEY di .env lokal serta Netlify Environment Variables dengan scope Functions. Jangan gunakan prefix VITE_, commit .env, atau menaruh secret di klien.

Nama yang sudah dipakai di Netlify juga didukung: S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_BUCKET, S3_REGION, dan S3_PUBLIC_URL. Pilih satu pasangan kredensial lengkap; pasangan CONTABO_* tidak dicampur dengan S3__. Jika keduanya lengkap, CONTABO__ didahulukan. Label S3_REGION=SIN dinormalisasi menjadi signing region us-east-1; endpoint tetap Singapore.

Log deploy 6ada0776644cdefd19024894 menunjukkan build/bundling v0.3.2 berhasil, lalu secret scanner salah menandai nilai S3_BUCKET yang merupakan nama publik. Allowlist scanner dibatasi ke key URL/nama bucket/region publik; DATABASE_URL, OAuth secret, access key, dan secret key tetap dipindai. Scanning global maupun path tidak dinonaktifkan.

Nilai publik yang digunakan:

- Endpoint: https://sin1.contabostorage.com
- Bucket: lmsuah
- Public base: https://sin1.contabostorage.com/68671c4afe7c45fba062c1c65a776541:lmsuah
- Signing region: us-east-1 (dapat diubah melalui CONTABO_SIGNING_REGION bila diperlukan akun).
- Konfigurasi override: CONTABO_ENDPOINT, CONTABO_BUCKET, CONTABO_PUBLIC_URL.

Pemroses sharp dipaketkan sebagai external node module untuk fungsi media-upload. Pastikan optional dependencies platform Linux ikut terpasang pada Netlify. Pembatasan unggahan 4 MiB berada di bawah batas buffered binary Functions.

Rujukan: [Netlify native modules](https://docs.netlify.com/build/functions/configuration/), [sharp installation](https://sharp.pixelplumbing.com/install/), [Contabo Object Storage](https://docs.contabo.com/docs/storage/object-storage/).

## PDF privat tetap opt-in

LMS_PRIVATE_PDF_STORAGE tetap netlify secara default. Pembacaan blob key lama tetap memakai Netlify; hanya objek baru dengan key contabo/private/transcripts/ menggunakan Contabo bila provider dipilih.

Jangan aktifkan CONTABO_PRIVATE_PREFIX_VERIFIED atau LMS_PRIVATE_PDF_ENABLED sebelum memverifikasi policy bucket/prefix private/ dan akses anonim benar-benar ditolak melalui semua endpoint/public base. ACL private saja tidak boleh dianggap membatalkan bucket policy publik. Jangan memindah objek privat ke prefix publik, menampilkan public URL-nya, atau mengubah policy bucket otomatis.

LMS_PROGRAM_REVISIONS_ENABLED dan LMS_PRIVATE_PDF_ENABLED tidak diaktifkan oleh perubahan ini.

## Migrasi yang sudah dilaksanakan dengan persetujuan

Pengguna mengizinkan produksi hanya setelah uji salinan lulus. Salinan Neon terbaru: br-snowy-bread-azo1vqgx (codex-baseline-contabo-cover-20261022), induk br-tiny-term-az2vuw03, titik salin 0/3F68698.

- Baseline 0000–0009 cocok dengan 33 tabel aktual tanpa perbedaan schema.
- Rekonsiliasi baseline dan migrasi 0010–0014 lulus pada salinan: 40 tabel, 15 journal entries, jumlah baris tabel lama tidak berubah, pengulangan menerapkan 0 migrasi.
- Smoke rollback salinan memverifikasi DDL/journal atomik, review independen, immutability, FK lintas program, keunikan enrollment/progres dan rollback penggantian PDF. Tidak ada fixture yang disimpan.
- Cadangan sebelum produksi dipertahankan tanpa compute: br-round-feather-azrxqf5h, codex-pre-cover-production-20261022, titik salin 0/3F8B720.
- Produksi diperiksa read-only: baseline cocok, journal kosong, tidak ada duplikasi enrollment/progres.
- Produksi direkonsiliasi dan dimigrasi dalam satu transaksi dengan advisory lock, schema guard, journal guard dan timeout. Hasil: baselineRecorded=10, applied=5, total=15; perbandingan schema akhir kosong; pengulangan applied=0.
- Tidak ada INSERT/UPDATE/DELETE pada tabel aplikasi, pengangkatan role, perubahan feature flag, atau pemindahan dokumen lama.
- Smoke GET produksi /api/health, /api/programs, /api/lessons dan /api/schedules: HTTP 200, JSON valid.
- Preflight SELECT-only setelah migrasi: tidak ada migrasi tertunda, konflik enrollment/progres 0, seluruh definisi izin tersedia dan schema revisi/PDF siap. Kesiapan schema tidak berarti feature flags atau penyimpanan privat sudah diaktifkan.

Verifikasi kode: 398 tes dalam 55 file lulus; tambahan alias S3/allowlist scanner lulus 7 tes dalam 2 file. Lint 0 error/0 warning, typecheck dan build produksi lulus. Localhost aktif kembali pada port 5180; POST unggah tanpa login menghasilkan 401 JSON, GET menghasilkan 405 JSON, dan metadata program 200 JSON. Verifikasi visual browser serta unggah/unduh bucket nyata belum terkonfirmasi.

Migrasi 0014 hanya menambah kolom nullable programs.cover_image. Pembaca program tetap kompatibel sebelum migrasi; snapshot lama tanpa coverImage tetap valid tanpa mengubah format/hash historis.

Perintah inspect-only:

```
node --liftoff-only --no-wasm-tier-up --wasm-lazy-compilation --import tsx netlify/functions/db/baseline-production.ts --tested-copy=netlify/functions/db/baseline-copy-20261022.json
```

--approved hanya digunakan dengan persetujuan eksplisit setelah memvalidasi salinan dan cadangan. Jangan menjalankan migrasi awal pada tabel produksi yang sudah ada tanpa rekonsiliasi katalog.
