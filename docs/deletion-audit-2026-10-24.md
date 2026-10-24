# Audit penghapusan lintas modul — 24 Oktober 2026

## Keluhan dan akar masalah

`/admin/programs` menyediakan tombol hapus, tetapi handler sebelumnya langsung
menghapus baris `programs`. Foreign key `NO ACTION` menolak penghapusan bila
program masih digunakan oleh pertemuan, modul, seri, jadwal atau pendaftaran.
Pesan konflik sebelumnya terlalu umum. Halaman materi, lokasi dan pengumuman
juga belum memiliki penanganan kegagalan hapus lokal yang terlihat jelas.

Temuan berdasarkan pembacaan kode dan reproduksi melalui handler produksi
dengan PostgreSQL in-memory; bukan percobaan penghapusan data produksi.

## Kebijakan yang diterapkan

Tidak ada cascade yang menghapus riwayat peserta. Hapus permanen hanya untuk
data yang aman dihapus. Konflik bukan disamarkan sebagai sukses atau diam-diam
diubah menjadi arsip. Pengarsipan adalah tindakan terpisah yang dipilih pengguna.

| Modul/subfitur | Hasil pemeriksaan dan perbaikan |
| --- | --- |
| Program | Preflight merinci jumlah pertemuan, modul, seri, jadwal, pendaftaran dan revisi yang menghalangi. Dialog tetap terbuka saat gagal dan menyediakan **Arsipkan**. Program kosong dapat dihapus; bookmark program dibersihkan atomik. |
| Pertemuan/materi | Progres, catatan, percobaan kuis, PDF privat dan snapshot revisi mencegah penghapusan. Pertemuan tanpa riwayat bisa dihapus bersama materi/soal yang dimilikinya. Penunjuk `lesson_quiz_drafts` dibersihkan sebelum kuis untuk mengatasi FK tambahan; bookmark dibersihkan dalam transaksi yang sama. |
| Kuis, soal dan jawaban | Percobaan dan jawaban tidak dihapus otomatis ketika menghapus pertemuan. Uji memastikan riwayat tetap utuh. Alur menonaktifkan kuis tetap bukan penghapusan riwayat. |
| Modul/bab | Dependensi pertemuan dilaporkan dengan jumlah dan instruksi memindahkan pertemuan terlebih dahulu. Tidak ada pemindahan atau penghapusan anak diam-diam. |
| Seri | Perbaikan FK pada `series_books`: hapus tautan dan seri dalam satu batch atomik, tanpa menghapus kitab bersama. Guard revisi yang sudah ada tetap berlaku. |
| Kitab | Rujukan seri dan modul dilaporkan sebagai konflik; kitab bersama tidak dihapus melalui penghapusan seri. |
| Jadwal | Tidak memiliki anak FK pada skema saat ini; penghapusan normal dipertahankan. Validasi ID diseragamkan. UI sudah memiliki pesan gagal lokal. |
| Lokasi | Jadwal yang masih menggunakan lokasi dilaporkan; pengguna diarahkan memindahkan jadwal atau menonaktifkan lokasi. Pesan gagal kini terlihat di halaman, bukan hanya melalui notifikasi global. |
| Pengumuman | Tidak memiliki anak FK. DELETE memakai `returning` dan memberi 404 bila record sudah tidak ada, bukan sukses palsu. UI menampilkan kegagalan dan menyegarkan daftar setelah sukses. |
| Pengguna, peran dan pendaftaran | UI pengguna tidak menyediakan hapus akun permanen. Tidak ditambahkan endpoint atau cascade baru untuk menghapus identitas, pendaftaran, persetujuan privasi maupun riwayat. Alur pengelolaan yang ada tetap dipertahankan. |
| PDF/revisi | Tabel retensi dideteksi dari instalasi database, bukan hanya feature flag. Menonaktifkan fitur setelah pernah dipakai tidak membolehkan penghapusan riwayatnya. Tidak ada penghapusan blob privat. |

## Konsistensi API dan UI

- Delapan endpoint hapus memvalidasi UUID; ID malformed menghasilkan 400.
- Record tidak ditemukan menghasilkan 404; pengumuman tidak lagi sukses palsu.
- Otorisasi penghapusan tetap diperiksa sebelum preflight atau mutasi.
- Konflik dependensi menghasilkan 409 beserta rincian yang dapat ditindaklanjuti.
- Foreign key tetap menjadi lapisan pengaman terakhir jika dependensi baru masuk
  setelah preflight. Kegagalan membatalkan seluruh batch, termasuk pembersihan bookmark.
- Tombol hapus materi/lokasi/pengumuman memiliki nama aksesibel dan dinonaktifkan
  selama permintaan berlangsung. Handler juga menolak klik berulang saat pending.
- Pesan gagal hapus program berada di dalam dialog aktif, dengan warna teks yang
  terbaca di latar terang, dan bukan tersembunyi di belakang dialog.

## Verifikasi

Hasil akhir: **453 tes lulus pada 59 file**, termasuk **29 tes integrasi
penghapusan** dan **5 tes UI penghapusan**. `npm run typecheck`,
`npm run build`, dan ESLint terarah pada seluruh file perubahan penghapusan
lulus. Ini bukan klaim bahwa lint seluruh repositori telah bersih.

`tests/deletion-workflow.pg.test.ts` menguji handler nyata dengan Drizzle Neon HTTP
di atas PGlite terisolasi: otorisasi delapan endpoint, ID invalid, 404, penghapusan
sukses, semua kelompok dependensi utama, pengarsipan, retensi PDF/revisi/kuis,
rollback seri dan pertemuan, concurrent enrollment, serta database lama hanya
sampai migrasi 0009 tanpa tabel fitur opsional.

`tests/deletion-ui.test.tsx` menggunakan Refine dan React Query nyata dengan
provider uji: error program tetap di dialog, pemulihan melalui arsip, sukses hapus
menyegarkan daftar, serta pesan error pada materi, lokasi dan pengumuman.

Tidak ada migrasi baru yang diperlukan oleh perbaikan ini. Tidak ada migrasi,
penghapusan, atau pengarsipan yang dijalankan terhadap database aktif. Perubahan
perlu dideploy sebelum tersedia pada situs yang sudah berjalan.
