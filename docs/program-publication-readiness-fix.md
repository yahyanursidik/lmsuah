# Checklist siap tetapi publikasi ditolak

## Gejala dan akar masalah

Pada Persiapan program → Review & terbitkan, semua checklist berstatus
**Siap**, tetapi server mengembalikan `409 PROGRAM_NOT_READY` dengan pesan
“Semua pertemuan terbit memiliki materi”.

Checklist mengambil `materialCount` dari API daftar pertemuan. Validasi
publikasi sebelumnya menghitung ulang lewat correlated subquery pada
single-table select Drizzle. Drizzle menghilangkan qualifier kolom di SQL
tersebut. Contoh yang direproduksi menggunakan versi dependency proyek:

```sql
-- Yang dimaksud:
select (select count(*) from lesson_videos
        where lesson_videos.lesson_id = lessons.id) from lessons;

-- Yang terbentuk:
select (select count(*) from "lesson_videos"
        where "lesson_id" = "id") from "lessons";
```

Pada query kedua, `id` merujuk ke video, bukan pertemuan. Karena ID video
dan ID pertemuan normalnya berbeda, jumlahnya nol meskipun video tersedia.
Lampiran mengalami masalah serupa. Ini bug query aplikasi, bukan alasan
untuk mengganti ID, menghapus data, atau mengunggah ulang materi.

## Perbaikan

- `netlify/functions/utils/lesson-material-counts.ts` menjadi perhitungan
  bersama untuk API daftar pertemuan dan validasi publikasi.
- Video dan lampiran dihitung berdasarkan `lessonId` secara eksplisit;
  transkrip privat hanya dihitung jika berstatus `published` dan fitur
  `LMS_PRIVATE_PDF_ENABLED` aktif.
- Seluruh pertemuan terbit tetap wajib memiliki materi. Pertemuan draft,
  kuis, dan jadwal tidak menambah persyaratan publikasi.
- Penolakan menyebut judul pertemuan tanpa materi dan tindakan perbaikannya.
- Halaman mengambil ulang data saat memasuki review dan setelah publikasi
  ditolak, menyediakan **Periksa ulang kesiapan**, dan menonaktifkan
  publikasi selama pemeriksaan berlangsung.
- Mode `LMS_PROGRAM_REVISIONS_ENABLED` tetap menggunakan alur Review &
  Revisi. Perbaikan ini tidak memintas persetujuan atau snapshot.

## Penerapan dan verifikasi

1. Deploy frontend **dan Netlify Functions** dari perubahan yang sama.
   Mengunggah folder `dist` saja tidak memperbaiki validasi server.
2. Tidak ada perubahan schema, migrasi database, atau pengubahan data lama.
3. Setelah deploy selesai, muat ulang halaman admin agar bundle terbaru dipakai.
4. Buka program → Persiapan → Review & terbitkan → Periksa ulang kesiapan.
5. Jika siap, terbitkan dengan akun Publisher/Administrator. Pastikan status
   program berubah dan pertemuan terbit terlihat pada tampilan peserta;
   pertemuan draft harus tetap tersembunyi.
6. Jika ada pertemuan kosong, tambahkan materi atau ubah menjadi draft.
   Jangan menonaktifkan validasi hanya untuk memaksa program terbit.
7. Jika masalah tetap terjadi, catat status/respons request
   `PATCH /api/programs/:id`, request ID, waktu kejadian, serta commit deploy.
   Jangan membagikan cookie, token, atau kredensial database.

## Pengujian

`tests/program-readiness.pg.test.ts` menjalankan handler produksi dengan
driver Drizzle Neon HTTP pada PostgreSQL in-memory (PGlite), tanpa membaca
`DATABASE_URL`. Meliputi ID materi berbeda dari pertemuan, video, tautan,
PDF, isolasi antarprogram, draft, dan status publikasi transkrip privat.
`tests/program-setup.test.tsx` mencakup refresh dan pencegahan publikasi
selama data diperbarui.

```sh
npm ci
npm test -- --maxWorkers=2
npm run lint
npm run build
```

Pengujian lokal bukan konfirmasi bahwa situs produksi telah menerima
deploy atau data program produksi sudah diperiksa.
