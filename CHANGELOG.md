# Changelog aplikasi

Versi aplikasi mengikuti Semantic Versioning (`MAJOR.MINOR.PATCH`). Tag Git memakai awalan `v` dan menunjuk commit rilis pada `main`. `package.json` dan `package-lock.json` harus memakai versi yang sama. Changelog di `lms-kajian-yts-docs` merupakan riwayat dokumen, bukan versi aplikasi.

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
