# Aktivasi login Google

Login email/password tetap tersedia. Login Google menggunakan Better Auth dan hanya meminta identitas dasar (nama, email, foto); tidak meminta akses isi Gmail.

## Google Cloud

1. Buka Google Cloud Console → Google Auth Platform. Siapkan branding aplikasi, audience, dan kontak pengembang.
2. Buat OAuth client dengan tipe **Web application**.
3. Isi Authorized JavaScript origins dengan origin website, misalnya `https://lmsuah.netlify.app` dan domain khusus yang benar-benar dipakai.
4. Isi Authorized redirect URIs dengan `https://lmsuah.netlify.app/api/auth/callback/google` dan `https://abuhaidarassundawy.id/api/auth/callback/google` untuk domain produksi. Redirect URI harus sama persis dengan yang dikirim aplikasi. Untuk pengembangan lokal, sesuaikan origin dan port, misalnya `http://127.0.0.1:5180/api/auth/callback/google`.
5. Jika consent screen masih dalam mode Testing, tambahkan akun uji. Untuk peserta umum, publikasikan aplikasi sesuai persyaratan Google.

## Netlify

Isi environment variables untuk Functions pada konteks Production:

- `GOOGLE_CLIENT_ID`: Client ID dari Google.
- `GOOGLE_CLIENT_SECRET`: Client Secret dari Google.
- `BETTER_AUTH_URL`: origin utama website, tanpa `/api/auth`, misalnya `https://lmsuah.netlify.app`.
- `BETTER_AUTH_SECRET`: nilai acak kuat minimal 32 karakter. Pertahankan secret yang sudah digunakan agar sesi pengguna tetap valid.

Jangan gunakan awalan `VITE_` untuk secret dan jangan commit nilai rahasia. Redeploy sesudah konfigurasi berubah. Preview memakai OAuth client/redirect URI sendiri bila ingin diuji pada domain preview; konfigurasi production harus cocok dengan domain production.

## Verifikasi

1. GET `/api/auth/providers` harus mengembalikan `{ "google": true }`. Endpoint hanya menampilkan ketersediaan, bukan secret.
2. Klik **Lanjutkan dengan Google** di halaman masuk atau daftar. Pilih akun dan selesaikan persetujuan Google.
3. Google kembali ke `/api/auth/callback/google`; aplikasi kemudian membuka `/auth/complete` untuk mengecek sesi dan peran.
4. Akun baru memperoleh profil dan peran peserta. Peran admin yang sudah ada tetap dipakai bila akun berhasil dihubungkan. Akun lokal dengan email yang belum terverifikasi dapat ditolak oleh kebijakan keamanan penghubungan akun; gunakan login email/password, bukan menonaktifkan perlindungan ini atau menandai semua akun sebagai terverifikasi. Email berbeda tidak digabung.
   Pengaturan `allowRegistration` berlaku untuk akun baru melalui Google maupun formulir email. Penutupan pendaftaran tidak menutup login akun lama.
5. Admin menuju `/admin`; peserta menuju `/dashboard`. Pembatalan, gangguan server, dan konfigurasi yang belum tersedia ditampilkan sebagai pesan yang dapat ditindaklanjuti.
6. Uji login email/password, logout, serta sesi setelah refresh.

## Membedakan kegagalan

- `redirect_uri_mismatch`: daftarkan URI callback yang ditampilkan Google pada OAuth client yang digunakan, termasuk protokol, domain, port, dan path.
- `401 invalid_client` dari Google: cocokkan pasangan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` dari OAuth client bertipe Web application yang sama. Pastikan keduanya tersedia untuk Functions/Production, lalu redeploy. Perbaikan parsing JSON tidak memperbaiki kredensial OAuth yang salah.
- `401` dari `/api/auth/me` sebelum login: sesi belum tersedia. Setelah callback berhasil, `/api/auth/get-session` tidak boleh `null` dan `/api/auth/me` harus mengembalikan akun beserta perannya.
- `Unexpected token '<'` atau pesan `Respons API ... bukan JSON`: endpoint API mengirim HTML, misalnya karena jatuh ke fallback SPA. Periksa URL request dan Content-Type. Endpoint pertemuan, pendaftaran, dan kuis harus menggunakan default export Netlify Functions modern, bukan named export `handler`.
- Setelah deploy, `/api/enrollments` tanpa sesi harus mengembalikan JSON `403`, dan `/api/quizzes` tanpa ID harus mengembalikan JSON `405`, bukan HTML `200`. Endpoint `/api/lessons` harus mengembalikan JSON untuk permintaan data. Tes lokal tidak menggantikan verifikasi deployment dan login Google end-to-end.

Jangan kirim cookie, token, password, atau client secret saat mengumpulkan informasi error.

Referensi: https://better-auth.com/docs/authentication/google
