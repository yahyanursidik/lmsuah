# Pengaturan kategori program

## Masalah yang diselesaikan

Beranda sebelumnya menggunakan `prog.category || 'Fiqih'`. API program
mengambil kategori dari jadwal rutin, bukan dari program itu sendiri. Form
program tidak menyediakan kategori, dan filter publik menggunakan daftar
statis yang bahkan tidak mencakup Tafsir. Akibatnya program Tauhid tanpa
jadwal/kategori dapat diberi label Fiqih secara keliru.

## Perilaku baru

- Kategori disimpan pada kolom opsional `programs.category`.
- Saran kategori: Aqidah, Tauhid, Fiqih, Hadits, Tafsir, Akhlaq, Sirah,
  Bahasa Arab, dan Tematik. Tim dapat mengetik kategori lain; ini bukan
  daftar tertutup maupun modul pengelolaan taksonomi terpisah.
- Maksimal 100 karakter. API menolak tipe selain string/null dan panjang
  berlebih; whitespace tepi dipangkas. Payload yang tidak menyertakan
  kategori mempertahankan nilai lama; string kosong/null mengosongkannya.
- Program tanpa kategori memakai label netral **Kajian**. Judul dan sampul
  tidak dipakai untuk menebak kategori.
- Kategori jadwal tetap milik agenda. Menyetel kategori program tidak
  mengubah jadwal, begitu pula sebaliknya.
- Daftar filter publik/admin dibentuk dari kategori program yang dimuat,
  termasuk kategori kustom dan kelompok Kajian. Filter admin dapat
  digabungkan dengan status/pencarian dan direset bersama-sama.
- Kontrol menggunakan label aksesibel; badge panjang dibatasi pada kartu
  publik dan filter dapat digulir pada layar kecil.

## Cara mengatur

### Alur langsung

1. Admin → Program Kajian → Tambah program / Edit program.
2. Isi **Kategori program (opsional)**, lalu simpan.
3. Alternatif: Kelola program → Persiapan → Informasi program → simpan.
4. Penerbitan program tetap mengikuti checklist dan izin yang sudah ada.
   Contributor tidak diberi akses baru untuk mengubah program terbit.

### Mode Review & Revisi

1. Buka Review & Revisi → buat/pilih draft.
2. Ubah kategori di Informasi versi program, isi ringkasan, lalu simpan draft.
3. Ajukan review → persetujuan reviewer independen → terbitkan oleh publisher.
4. Kategori publik berasal dari snapshot yang diterbitkan, bukan jadwal atau
   draft yang belum disetujui. Kategori tersinkron ke sumber pada transaksi
   penerbitan. Snapshot lama tetap immutable; perubahan kategori ikut hash.
5. Snapshot lama yang sudah memiliki kategori tetap menampilkan nilai lama
   sampai tim menerbitkan revisi koreksi. Snapshot tanpa kategori tidak
   mengambil kategori dari jadwal sebagai fallback.

## Migrasi dan penerapan aman

Migrasi `0015_program_category.sql` hanya menambahkan kolom nullable.
Tidak ada pengubahan baris lama, penghapusan data, backfill kategori dari
judul/jadwal, perubahan secret, atau aktivasi flag revisi.

1. Tinjau backup dan target database. Jalankan `npm run db:preflight`
   (SELECT-only) dan tinjau seluruh migrasi tertunda, bukan hanya 0015.
2. Uji migrasi pada salinan database terlebih dahulu. Jika baseline/journal
   belum terverifikasi, ikuti alur rekonsiliasi yang ada; jangan menjalankan
   ulang migrasi awal secara sembarang.
3. **Setelah persetujuan operator**, jalankan migrator resmi:
   `npm run db:migrate -- --approved`. Jangan menyalin DDL manual tanpa
   mencatat journal karena checksum/riwayat migrasi diperiksa migrator.
4. Terapkan migrasi sebelum deploy frontend dan Netlify Functions terbaru.
   Read API kompatibel sebelum kolom tersedia, tetapi penulisan kategori
   dan penerbitan revisi memakai schema baru dan memerlukan migrasi.
5. Muat ulang admin, atur program Fawaid Tauhid menjadi **Tauhid** atau
   **Aqidah** sesuai keputusan tim konten. Kode tidak mengubahnya otomatis.
6. Verifikasi beranda, daftar/filter, detail program, serta tampilan peserta.
   Uji program tanpa kategori: harus Kajian, bukan Fiqih. Uji kategori jadwal
   yang berbeda: kategori program harus tetap benar.
7. Untuk rollback kode, biarkan kolom nullable tetap ada agar nilainya tidak
   hilang. Jangan menghapus kolom atau mengedit snapshot publik sebagai
   jalan pintas koreksi.

Tidak ada migrasi atau perubahan data produksi yang dijalankan oleh
pengembangan/pengujian lokal ini.

## Pengujian

```sh
npm test -- --maxWorkers=2
npm run lint
npm run typecheck
npm run build
```

- `tests/program-category.pg.test.ts`: CRUD handler nyata, validasi, izin,
  kategori agenda berbeda, kompatibilitas baca sebelum migrasi, preservasi data.
- `tests/program-workflow.pg.test.ts`: kategori snapshot, hash, penolakan
  editor langsung, review/publikasi, pengosongan, dan preservasi versi lama.
- `tests/program-category-ui.test.tsx`, `tests/program-setup.test.tsx`,
  `tests/program-revisions-ui.test.tsx`: label netral, filter dinamis,
  penyimpanan form dan revisi. Database pengujian memakai PostgreSQL
  in-memory (PGlite), bukan `DATABASE_URL` produksi.
