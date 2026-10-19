# Changelog aplikasi

Versi aplikasi mengikuti Semantic Versioning (`MAJOR.MINOR.PATCH`). Tag Git memakai awalan `v` dan menunjuk commit rilis pada `main`. `package.json` dan `package-lock.json` harus memakai versi yang sama. Changelog di `lms-kajian-yts-docs` merupakan riwayat dokumen, bukan versi aplikasi.

## [0.2.2] — 2026-10-19

### Diperbaiki

- Cache query portal selama 30 detik mengurangi pengambilan ulang saat kembali ke menu. Cache dibersihkan saat login/logout dan mutasi menginvalidasi data terkait.
- Identitas dan izin berbagi request akun yang sedang berjalan. Gangguan pemeriksaan izin ditampilkan dengan pesan error dan tombol coba lagi, bukan dianggap sebagai akun peserta.
- Pembacaan materi, kuis, dan detail soal yang independen dijalankan paralel setelah pemeriksaan akses. Pembaca umum/peserta hanya menerima metadata kuis, tanpa jawaban benar melalui detail pertemuan.
- Daftar tanpa pagination memuat seluruh halaman dengan maksimal tiga request paralel, tetap menjaga urutan.
- Jadwal menerima program kosong/null sebagai agenda umum, dapat melepas relasi program, dan tidak menggunakan ID demo untuk foreign key pembuat.
- Form jadwal menampilkan hasil sukses/gagal, mempertahankan isian saat gagal, menunggu pilihan lokasi/program, dan mencegah submit ganda. Pesan validasi menyebut field yang perlu diperbaiki.
- Loading lokal/global mencakup autentikasi, refresh, dan penerimaan body respons. Pembacaan dibatasi 20 detik dan mutasi 45 detik, tanpa pengulangan otomatis mutasi yang mungkin sudah tersimpan.
- Pembatalan form pertemuan tidak memuat ulang kurikulum; kegagalan materi tidak lagi ditampilkan sebagai daftar kosong.
- Route dipisahkan secara lazy; paket framework, data, dan autentikasi dipisahkan dari bundle aplikasi tanpa menonaktifkan peringatan ukuran.

### Verifikasi dan batas rilis

- Paket rilis diuji terpisah dari workspace pengembangan: 162 tes dalam 26 file lulus; lint bersih (0 error/0 warning); typecheck/build dan pemeriksaan diff lulus tanpa peringatan ukuran bundle.
- Rilis tidak memerlukan migrasi, perubahan kredensial, atau aktivasi fitur baru di database produksi.
- Wizard/referensi Program Kajian, sinkronisasi belajar server lanjutan, progres baru, revisi terpisah, PDF privat/transkrip, serta migrasi 0010–0012 tetap berada di workspace pengembangan dan tidak termasuk paket ini.
- Kecepatan produksi dan alur login akun nyata tetap perlu diperiksa setelah deploy; tes lokal bukan bukti keberhasilan OAuth produksi.

## [0.2.1] — 2026-10-19

### Diperbaiki

- Endpoint pertemuan, pendaftaran program, dan kuis menggunakan default export Netlify Functions modern agar rute API tidak jatuh ke halaman HTML aplikasi.
- Pembungkus API mempertahankan status HTTP, body, dan header respons yang sudah dibuat handler, termasuk respons kuis dan error 404/405.
- Portal dan penyelesaian login Google menangani respons HTML/JSON rusak dengan pesan yang jelas, tanpa menyamarkannya sebagai sesi kedaluwarsa.
- Tipe data daftar publik, pengelolaan peserta, role, dan pengumuman diperjelas; error ditangani sebagai `unknown` tanpa menonaktifkan aturan lint.
- Endpoint pengumuman memverifikasi sesi dan role admin saat menulis, menyimpan identitas pembuat yang valid, dan membatasi pembaca umum ke pengumuman terbit.
- Konfigurasi Netlify disimpan dalam repository; hanya `BETTER_AUTH_URL` (origin publik, bukan kredensial) dikecualikan dari secret scanning untuk mengatasi false positive pada dokumentasi. Secret scanning lainnya tetap aktif.

### Verifikasi

- Seluruh 128 tes dalam 20 file lulus, mencakup regresi respons JSON, ekspor handler modern, akses pengumuman, pesan error, dan batas pengecualian secret scanning.
- Lint seluruh repository lulus dengan 0 error dan 0 warning; build produksi dan pemeriksaan diff lulus. Peringatan ukuran bundle tetap dicatat terpisah dari kegagalan deploy.
- Keberhasilan deploy produksi, OAuth Google end-to-end, dan konfigurasi kredensial tetap perlu diverifikasi setelah rilis; tes lokal bukan bukti keberhasilan login produksi.

## [0.2.0] — 2026-10-08

### Ditambahkan

- Login Google melalui Better Auth, pemeriksaan ketersediaan provider, serta halaman penyelesaian login yang mengarahkan admin dan peserta sesuai peran.
- Pencarian menu admin/peserta, breadcrumb, navigasi bawah pada ponsel, dan menu mobile dengan dukungan keyboard.
- Akses cepat pengelolaan program, pengguna, jadwal, lokasi, pengumuman, dan pengaturan di dashboard admin.
- Ringkasan belajar peserta, akses pertemuan berikutnya, progres, agenda, serta catatan dan materi tersimpan.
- Panduan konfigurasi Google OAuth dalam `docs/google-login.md`.

### Diperbarui

- Tampilan login, pendaftaran, navigasi publik, serta portal admin dan peserta menjadi lebih hangat, ramah, dan responsif.
- Pemuatan awal, penyegaran, data kosong, dan kegagalan API ditampilkan sebagai kondisi berbeda.
- Cache kueri portal selama 30 detik dan tombol segarkan untuk mengurangi pengambilan data berulang.
- Indikator permintaan aktif dan pesan ketika pemuatan membutuhkan waktu lebih lama.

### Diperbaiki dan diamankan

- Data contoh tidak lagi menggantikan data peserta ketika API kosong atau gagal; data cache yang tersedia tetap dipertahankan.
- Statistik gagal dimuat tidak ditampilkan sebagai angka nol yang menyesatkan.
- Navigasi menyorot tujuan yang tepat pada halaman detail; materi dan kuis tetap berada di Program Kajian.
- Login demo hanya aktif dalam mode pengembangan, bukan build produksi.
- Kebijakan penutupan pendaftaran berlaku untuk akun baru melalui email maupun Google.

### Verifikasi dan aktivasi

- Build produksi dan lint pada file perubahan telah lulus.
- Seluruh 70 tes dalam 15 file telah lulus; fixture integrasi program diperbarui agar respons program dan pertemuan sesuai endpoint masing-masing.
- Dashboard diuji secara visual pada lebar 320, 375, 414, 768, dan desktop, tanpa scroll horizontal pada ukuran yang diperiksa.
- Google OAuth belum dianggap aktif di produksi: konfigurasi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_URL`, dan redirect URI yang cocok tetap diperlukan. Pertahankan `BETTER_AUTH_SECRET` yang sudah digunakan.
- Pengujian UI menggunakan sesi demo lokal; bukan bukti keberhasilan login akun produksi atau OAuth end-to-end.
- Build masih memberi peringatan ukuran bundle; peringatan ini bukan kegagalan build.

## [0.1.0]

- Versi aplikasi sebelum pengenalan riwayat rilis dan tag Semantic Versioning. Riwayat perubahan terdahulu tersedia melalui commit Git.
