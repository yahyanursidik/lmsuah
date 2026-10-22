# Pemeriksaan gambar lintas portal — 22 Oktober 2026

## Penyebab yang terverifikasi

- Beranda meminta `/masjid-al-ukhuwah.jpg` dan `/masjid-umar-bin-khattab.jpg`, sedangkan file yang tersedia adalah `/masjid-ukhuwah.jpg` dan `/masjid-umar.jpg`.
- GET jalur yang hilang di localhost dan produksi mengembalikan status 200 dengan `Content-Type: text/html` (fallback SPA), bukan byte gambar. Memeriksa status HTTP saja tidak cukup.
- Ketiga JPEG bawaan (logo dan dua gambar masjid) tersedia sebagai `image/jpeg` di lokal/produksi dan memiliki signature JPEG yang benar. Tiga URL Unsplash mock juga merespons `image/jpeg` pada saat pemeriksaan; tidak ada bukti bahwa semuanya mati.
- Delapan lokasi dari API publik belum memiliki `image`. Halaman lokasi sebelumnya mengabaikan URL foto eksternal dan memakai gambar Umar sebagai pengganti hampir semua lokasi. Ejaan `Ukhuwwah` juga belum dikenali.
- Banyak elemen gambar tidak menangani kegagalan jaringan, URL kedaluwarsa, file hilang, atau avatar eksternal yang gagal.
- Field foto lokasi sudah ada pada tabel/API, tetapi belum tersedia di form admin. Sampul program bukan field yang tersedia di schema program saat ini; ketiadaan sampul harus ditampilkan dengan jujur, bukan foto acak.

## Perbaikan

- Satu resolver bersama menormalisasi jalur lama, jalur relatif agar tidak mengikuti route bersarang, dan URL yang memiliki query. Protokol script/file/data, karakter kontrol, serta URL dengan kredensial ditolak.
- `AppImage` dipakai untuk seluruh elemen gambar aplikasi: beranda, katalog, lokasi/detail lokasi publik dan peserta, profil pemateri, profil peserta, navigasi, dan pengumuman admin.
- Foto khusus lokasi tetap menjadi prioritas. Foto bawaan hanya dipetakan untuk nama/slug Umar bin Khattab dan dua ejaan Ukhuwah/Ukhuwwah. Lokasi lain tanpa foto memakai placeholder, bukan gambar lokasi lain.
- Jika gambar gagal, fallback lokal dicoba maksimal satu kali; bila tetap gagal, elemen gambar rusak diganti placeholder dengan teks alternatif dan ukuran yang dipertahankan. Mengubah URL/akun memulai siklus pemuatan yang baru.
- Gambar konten memakai lazy loading dan asynchronous decoding; logo navigasi dan gambar utama profil/detail tetap eager. Tidak menambahkan `crossOrigin` yang dapat menyebabkan penolakan CORS baru.
- Admin lokasi mendapat field URL foto dan pratinjau. Form pengumuman memakai pratinjau yang sama. Kesalahan format dan penyimpanan memiliki pesan yang terlihat; isian tidak hilang saat simpan gagal.
- Validasi URL yang sama dipakai API lokasi/pengumuman, termasuk jalur aset lokal dan penghapusan URL. Server tidak mengambil URL foto arbitrer sehingga tidak menambahkan proxy/risiko SSRF.

## Batas verifikasi dan data

- Pengujian simpan memakai mock database; pemeriksaan lokal/produksi menggunakan GET saja. Tidak ada foto pengganti yang ditulis massal ke database dan tidak ada migrasi.
- Foto lokasi yang memang belum tersedia tetap perlu diisi admin dengan tautan langsung yang bisa diakses browser. Placeholder tidak mengklaim sebagai foto asli. Sampul program khusus merupakan fitur/schema terpisah, tidak ditambahkan diam-diam dalam perbaikan ini.
- Browser otomatis mengalami timeout saat inventaris dan pemilihan tab; tidak ada klaim verifikasi visual browser/responsivitas penuh. Aset JPEG diperiksa langsung, dan perilaku tampilan/form diuji lewat komponen React.
- Perbaikan ini disiapkan sebagai rilis patch v0.3.2. Status rilis dan bukti verifikasi paket terisolasi/deploy dicatat di `docs/releases/v0.3.2.md` dan PR rilis; catatan diagnosis ini bukan indikator bahwa deploy sudah selesai.

## Pengujian

- Hasil akhir: **376 tes / 50 file lulus**, lint seluruh repository 0 error/0 warning, serta `tsc -b` dan build produksi lulus tanpa peringatan ukuran bundle. Kedua fungsi Netlify yang diubah (`venues`, `announcements`) berhasil dibundel tanpa warning.
- Smoke GET localhost: beranda, katalog, lokasi, route lokasi peserta dan modul frontend baru merespons 200 tanpa overlay error Vite. Ketiga aset bawaan merespons `image/jpeg` dengan signature JPEG, bukan HTML.

- Tes resolver/aset memastikan signature JPEG, kedua alias lama, URL aman dan query, ejaan lokasi, serta bahwa tidak ada elemen `<img>` mentah di luar `AppImage`.
- Tes komponen memastikan pemuatan, fallback terbatas, tidak ada loop, placeholder, pergantian URL/akun, semantik dekoratif, ukuran, dan pratinjau/validasi input.
- Tes integrasi mencakup beranda/katalog, lokasi/detail lokasi pada route peserta, pengumuman admin, kedua aksi edit desktop/mobile, dan payload simpan foto.
- Tes handler lokasi/pengumuman mencakup normalisasi, penolakan URL tidak aman sebelum write, mengosongkan foto, serta mempertahankan foto pada PATCH yang tidak mengubahnya.
