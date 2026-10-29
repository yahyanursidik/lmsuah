# Changelog aplikasi

Versi aplikasi mengikuti Semantic Versioning (`MAJOR.MINOR.PATCH`). Tag Git memakai awalan `v` dan menunjuk commit rilis pada `main`. `package.json` dan `package-lock.json` harus memakai versi yang sama. Changelog di `lms-kajian-yts-docs` merupakan riwayat dokumen, bukan versi aplikasi.

## [Unreleased]

- Kategori program kini disimpan mandiri, dapat diatur pada tambah/edit, persiapan, dan draft revisi; kategori jadwal tidak lagi menimpa kategori program.
- Menghapus default “Fiqih” pada beranda, memakai label netral “Kajian” untuk kategori kosong, dan menambahkan filter kategori dinamis di publik/admin termasuk kategori kustom.
- Menambahkan migrasi aditif `0015_program_category`; tidak ada klasifikasi otomatis data lama atau perubahan snapshot yang sudah disetujui. Panduan penerapan: `docs/program-categories.md`.

## [0.4.0] — 2026-10-22

- Menambahkan unggah foto/PDF publik langsung ke Contabo, sampul Program Kajian dengan pratinjau dan indikator proses, serta adapter PDF privat terpisah pada lmsuahprivate. Bucket publik tetap dilarang untuk konten privat; berkas Netlify lama tetap terbaca.
- E2E browser pada salinan lulus untuk admin, reviewer independen, publik dan peserta berizin: sampul tersimpan/tampil, error gambar rusak mempertahankan sampul, PDF dirender pada mobile, range 206, larangan unduh/akses tanpa izin dan mode layar penuh. Seluruh fixture dibersihkan dan jumlah baris kembali semula.
- Seluruh 419 tes/57 file, lint 0 error/0 warning, TypeScript dan build produksi lulus. Menambahkan runner Playwright yang dapat diulang; pengujian tidak mengubah database sumber, policy bucket atau role produksi.
- Menambahkan metadata provider/flag privat ke allowlist scanner Netlify tanpa menonaktifkan pemindaian kredensial.
- Endpoint /api/health kini mengikuti versi package.json dan dikawal tes konsistensi dengan package-lock.json.
- Migrasi produksi 0010–0014 telah diterapkan dengan izin setelah uji salinan lulus, tanpa penulisan baris aplikasi. Adapter privat tidak memerlukan migrasi baru. Flag privat/revisi tidak diaktifkan oleh rilis; pembaca memerlukan izin transcript.read. Catatan: docs/releases/v0.4.0.md.

## [0.3.3] — 2026-10-22

- Memperbaiki deploy Netlify yang terhenti karena nama bucket publik S3_BUCKET terdeteksi sebagai secret. Hanya key konfigurasi S3 publik yang dikecualikan; access key, secret key, database dan OAuth secret tetap dipindai.
- Menambahkan tes allowlist scanner yang menolak pengecualian credential keys, penonaktifan scanner, atau pengabaian seluruh path.
- Hotfix tidak menyertakan fitur unggah Contabo/sampul yang masih menunggu uji unggah nyata. Catatan: docs/releases/v0.3.3.md.

## [0.3.2] — 2026-10-22

- Memperbaiki jalur aset beranda yang salah dan pemetaan foto lokasi, termasuk ejaan Ukhuwwah. URL foto khusus lokasi kini diprioritaskan, bukan diabaikan.
- Menggunakan penampil gambar bersama di seluruh gambar publik, peserta, admin, navigasi dan profil: lazy loading, fallback lokal terbatas tanpa loop, ukuran tetap, serta placeholder yang jelas saat gambar gagal/belum tersedia.
- Menambahkan field dan pratinjau foto lokasi serta pratinjau foto pengumuman; validasi URL frontend/API menerima HTTP/HTTPS dan jalur lokal, menolak protokol berbahaya dan kredensial URL, tanpa proxy server yang mengambil URL arbitrer.
- Foto yang belum tersedia tidak diganti dengan foto lokasi lain. Tidak ada migrasi, pembaruan massal database, perubahan secret, atau aktivasi flag produksi. Sampul program khusus bukan perluasan schema dalam rilis ini.
- Workspace pengembangan dan paket rilis terisolasi sama-sama lulus 376 tes / 50 file; lint 0 error/0 warning, typecheck/build produksi serta bundling dua fungsi Netlify terkait lulus. Rincian: `docs/releases/v0.3.2.md` dan `docs/image-loading-audit-2026-10-22.md`.

## [0.3.1] — 2026-10-22

- Footer menyediakan kontak bantuan `ahlan@yahyanursidik.my.id` untuk kendala/error/kegagalan sistem, dengan profil Yahya Nursidik dan keterangan Special Advisor for Digital Transformation, Innovation & Business YTS.
- Label live pada jadwal publik dan portal peserta memakai Tarbiyah Sunnah Channel, bukan Radio Rodja.
- Form Jadwal & Agenda menyediakan mode otomatis daftar siaran (`https://www.youtube.com/@TarbiyahSunnahChannel/streams`), otomatis live (`https://www.youtube.com/tarbiyahsunnahchannel/live`), atau tautan manual, lengkap dengan pratinjau dan validasi.
- Default handle lama dikoreksi saat dibaca/diedit tanpa mengganti tautan video/channel khusus. URL manual dipertahankan ketika siaran dinonaktifkan; tombol tonton disembunyikan pada siaran nonaktif, agenda dibatalkan dan URL tidak aman.
- Menggunakan kolom URL yang sudah ada; tidak ada migrasi, pembaruan massal data, perubahan secret, atau aktivasi fitur produksi. Catatan rilis: `docs/releases/v0.3.1.md`.
- Paket rilis terisolasi lulus 323 tes / 46 file dengan satu worker; lint 0 error/0 warning, build/TypeScript dan bundling handler jadwal tanpa warning lulus. Tes diulang sendiri setelah percobaan bersamaan dengan build mencapai batas memori Windows.

## [0.3.0] — 2026-10-20

- Menyelesaikan workspace Program Kajian lanjutan, persiapan/referensi program, revisi snapshot dengan review independen, multi-materi/kuis, serta progres dan riwayat evaluasi peserta di server.
- Menambahkan PDF privat dengan izin akses, review, versi immutable, pembacaan range dan publikasi atomik bersama revisi program. Netlify Blobs staging tetap perlu diverifikasi sebelum aktivasi produksi.
- Menyertakan migrasi aditif 0010–0013, preflight SELECT-only, migrator atomik dengan journal terverifikasi, dan alat baseline/smoke copy-only. Baseline/upgrade sudah diuji pada salinan Neon; database sumber tidak dimigrasi.
- Paket rilis terisolasi lulus 281 tes dalam 44 file; lint 0 error/0 warning, typecheck/build dan bundling 26 fungsi Netlify lulus.
- Kedua flag server tetap opt-in: `LMS_PROGRAM_REVISIONS_ENABLED` dan `LMS_PRIVATE_PDF_ENABLED` tidak diaktifkan oleh rilis atau build. Tidak ada migrasi otomatis, pengangkatan role, atau perubahan secret produksi.
- Catatan aktivasi dan batas rilis: `docs/releases/v0.3.0.md` dan `docs/program-kajian-release-readiness.md`.

### Catatan pengembangan dan verifikasi sebelum rilis

### Baseline dan uji migrasi salinan — 2026-10-20

- Membuat salinan Neon terisolasi dan membuktikan baseline 0000–0009 sesuai dengan 33 tabel aktual tanpa perbaikan DDL. Mencatat baseline hanya pada salinan, lalu menerapkan 0010–0013 hingga 40 tabel/14 entri journal/3 trigger aktif, tanpa perbedaan katalog.
- Mengganti migrator HTTP terpasang dengan batch transaksi atomik untuk semua DDL dan journal yang pending. Verifikasi prefix/hash, advisory lock dan guard journal mencegah migrasi sebagian atau rencana basi. Hash LF kanonis konsisten lintas Windows/Linux dengan kompatibilitas hash CRLF historis.
- Menambahkan CLI copy-only dan fixture smoke test rollback. Upgrade/perintah baseline yang diulang menerapkan 0 migrasi; jumlah baris lama tetap sama. Uji Neon langsung membuktikan review independen, immutability, FK lintas program, indeks unik progres/enrollment, serta pemulihan PDF setelah kegagalan penggantian, tanpa fixture tersimpan.
- Database sumber tidak dimigrasi, flag/Blobs produksi tidak diaktifkan. Salinan dipertahankan untuk tinjauan. Target, bukti dan prosedur ulang tercatat di `docs/database-baseline-copy-2026-10-20.md`.
- Verifikasi: 281 tes dalam 44 file lulus; lint 0 error/0 warning; typecheck/build produksi dan bundling 26 fungsi Netlify lulus. Belum ada push/merge/deploy baru.

### Program Kajian lanjutan, progres server, dan PDF privat — 2026-10-19

- Menghubungkan menu/route Review & Revisi; editor lama mengikuti mode revisi aktif. Penyuntingan snapshot mencakup modul, seri/kitab, multi-materi, timestamp, kuis, dan pemilihan PDF yang telah disetujui.
- Membuka backend revisi hanya setelah flag server dan pemeriksaan kolom, trigger aktif, indeks unik, serta FK terpenuhi. Capabilities membedakan fitur nonaktif dengan migrasi belum lengkap.
- Menyelesaikan kebuntuan PDF pada publikasi pertama: versi PDF approved diterbitkan atomik bersama snapshot program, dengan izin publisher dan riwayat tindakan.
- Mempertahankan versi publik, progres, percobaan dan jawaban lama; menolak self-approval, draft basi, akses lintas akun, dan penulisan setelah penarikan program. Publikasi gagal di tengah transaksi tidak meninggalkan perubahan sebagian.
- Progres akun nyata disimpan di server; update posisi diantrikan, tombol selesai menunjukkan status simpan, dan respons akun lama tidak diterapkan pada akun baru.
- Progres Belajar menyediakan kuis berjalan dan hasil terdahulu, termasuk halaman evaluasi mandiri untuk percobaan versi lama yang sudah tidak tampil dalam kurikulum terbaru. Akses riwayat dibatasi pemilik dan tidak membuka percobaan baru pada versi lama.
- Menambahkan pemeriksaan akses/pratinjau PDF privat, pesan sesi/error yang jelas, dan tombol coba lagi. PDF tetap memakai endpoint terautentikasi dengan range dan no-store.
- Migrasi 0013 menambahkan indeks keunikan enrollment/progres serta indeks baca penilaian. Migrasi 0010–0012 tetap diperlukan untuk revisi dan PDF privat.
- Menambahkan `db:preflight` SELECT-only dan pengaman migrator. Database `.env` memiliki tabel dasar tanpa entri journal migrasi, sehingga baseline harus direkonsiliasi sebelum migrasi disetujui; pada tahap 19 Oktober belum ada perubahan database terhubung atau aktivasi flag. Rekonsiliasi salinan diselesaikan terpisah pada catatan 20 Oktober.
- Panduan aktivasi, izin, batas Git, dan rollback tersedia di `docs/program-kajian-release-readiness.md`.
- Verifikasi akhir tahap ini: 260 tes dalam 41 file lulus, lint seluruh repository 0 error/0 warning, typecheck/build produksi lulus tanpa warning ukuran bundle, serta 26 fungsi server berhasil dibundel lokal tanpa error/warning. Migrasi upgrade dengan data lama, rollback transaksi, PDF privat, dan riwayat kuis diuji pada PostgreSQL terisolasi; pengujian ini tidak mengaktifkan fitur atau penyimpanan Blobs produksi.

### Loading, navigasi, dan jadwal — 2026-10-19

Catatan: perbaikan yang kompatibel dengan skema produksi sudah dirilis terpisah sebagai v0.2.2 di bawah. Sinkronisasi belajar server lanjutan dan pengembangan Program Kajian pada workspace ini tetap Unreleased.

- Cache query selama 30 detik mengurangi pengambilan ulang data saat berpindah menu; cache dibersihkan saat login/logout dan data terkait diperbarui setelah mutasi. Sinkronisasi belajar peserta memakai cache terpisah per akun, dengan refresh paksa dan invalidasi setelah penyimpanan.
- Identitas dan izin berbagi request akun yang sedang berjalan. Gangguan layanan izin ditampilkan sebagai error yang dapat dicoba ulang, bukan dianggap sebagai akun peserta.
- Pembacaan materi, kuis, dan detail soal yang independen dijalankan paralel setelah pemeriksaan akses. Daftar besar dimuat dengan maksimal tiga request halaman paralel, tetap menjaga urutan dan kelengkapan data.
- Jadwal menerima program kosong/null sebagai agenda umum, mendukung pelepasan relasi program, dan tidak menulis ID demo ke foreign key pembuat. Form menampilkan sukses/error, mempertahankan isian saat gagal, menunggu pilihan lokasi/program, dan mencegah submit berulang.
- Loading lokal/global mencakup query autentikasi, refresh, serta penerimaan body respons. Request dibatasi 20 detik untuk pembacaan dan 45 detik untuk mutasi; mutasi tidak dicoba ulang otomatis saat timeout karena perubahan mungkin sudah tersimpan.
- Membatalkan form pertemuan tidak mengambil ulang seluruh kurikulum. Kegagalan materi tidak lagi ditampilkan sebagai daftar kosong.
- Paket framework, data, dan autentikasi dipisahkan dari bundle aplikasi; tidak ada aturan peringatan ukuran bundle yang dinonaktifkan. Perubahan masih lokal, tanpa deploy atau migrasi produksi.
- Verifikasi akhir: 237 tes dalam 36 file lulus; lint seluruh repository bersih; build/typecheck lulus tanpa peringatan ukuran bundle. Browser memverifikasi navigasi dashboard–jadwal peserta, halaman build produksi, dan pesan/tombol coba lagi pada pertemuan yang tidak ditemukan. Uji penyimpanan jadwal menggunakan fixture database terisolasi, bukan database produksi.

### Stabilisasi pengembangan — 2026-10-19

- Pratinjau materi menerima durasi `null` dari snapshot revisi tanpa menggagalkan build TypeScript.
- Sinkronisasi pendaftaran dan progres peserta mengabaikan respons akun lama, refresh yang sudah digantikan, dan respons setelah halaman ditutup.
- Penulisan progres dan pendaftaran menunggu sinkronisasi awal berhasil; respons mutasi akun lama tidak diterapkan pada akun yang sedang aktif.
- Tes PDF privat disesuaikan dengan pembaca snapshot publik dan diperluas untuk memastikan referensi dokumen, reviewer independen, dan penarikan publikasi diperiksa sebelum mengambil isi berkas.
- Fitur revisi terpisah tetap nonaktif; tidak ada migrasi atau perubahan konfigurasi database produksi yang dijalankan.

### Verifikasi tahap stabilisasi

- Seluruh 182 tes dalam 27 file lulus, termasuk pengujian migrasi pada PostgreSQL in-memory yang tidak memakai database produksi.
- Build produksi, lint file tahap ini, dan pemeriksaan diff lulus. Peringatan ukuran bundle masih ada.
- Pada pemeriksaan awal tahap ini, lint repository gagal dengan 26 error lama dan 1 warning; semuanya kemudian diperbaiki tanpa mematikan aturan lint, termasuk dua error pada berkas diagnostik lokal di `scratch/`.
- Deploy preview PR #9 sempat gagal pada secret scanning; perbaikannya dirilis terpisah dalam v0.2.1. Pengembangan Program Kajian pada bagian Unreleased ini tetap lokal dan belum diaktifkan di produksi.

### Kualitas dan deploy — 2026-10-19

- Menghilangkan `any` pada data publik, pengelolaan peserta/role, dan pengumuman; penanganan error memakai tipe `unknown` serta pesan fallback yang aman.
- Endpoint pengumuman memverifikasi sesi/role admin dan membatasi pembaca umum ke pengumuman terbit.
- Mengatasi false positive secret scanning Netlify dengan pengecualian hanya untuk `BETTER_AUTH_URL` sebagai origin publik; kredensial dan OAuth secret tidak dikecualikan.
- Perbaikan rilis disiapkan pada worktree terpisah agar perubahan Program Kajian yang memerlukan migrasi tidak ikut diterbitkan sebelum siap.
- Validasi lanjutan workspace: 204 tes dalam 30 file lulus, build/typecheck lulus, lint seluruh repository bersih (0 error, 0 warning).

## [0.2.2] — 2026-10-19

- Cache navigasi 30 detik, penggabungan request akun, pembersihan cache saat login/logout, dan invalidasi setelah mutasi.
- Pembacaan materi/kuis paralel; pembaca umum/peserta menerima metadata kuis tanpa jawaban melalui detail pertemuan.
- Perbaikan jadwal tanpa program, pelepasan relasi program, pesan validasi, indikator simpan, pencegahan submit ganda, dan pemeliharaan isian saat gagal.
- Loading, refresh, timeout, serta tombol coba lagi diperjelas. Pembatalan form pertemuan tidak memuat ulang kurikulum.
- Route dan dependency dipisahkan; build tanpa peringatan ukuran bundle.
- Paket rilis terisolasi lulus 162 tes dalam 26 file, lint 0 error/0 warning, typecheck/build, dan pemeriksaan diff. Hasil 237 tes di workspace pengembangan bukan jumlah tes paket rilis.
- PR #10 di-merge ke main pada commit aa73e93; tag v0.2.2 menunjuk commit merge tersebut. Catatan rilis: https://github.com/yahyanursidik/lmsuah/releases/tag/v0.2.2.
- Deploy preview dan produksi Netlify berstatus Ready. Smoke test GET domain utama memverifikasi halaman 200, API pertemuan/jadwal 200 JSON, akun tanpa sesi 401 JSON, dan pertemuan tidak ditemukan 404 JSON; tidak ada penulisan data produksi atau pengujian login akun nyata.
- Migrasi 0010–0012, wizard/referensi Program Kajian, sinkronisasi belajar server lanjutan, progres baru, revisi terpisah, dan PDF privat/transkrip tidak disertakan. Tidak ada migrasi database produksi yang dijalankan.

## [0.2.1] — 2026-10-19

### Diperbaiki

- Endpoint pertemuan, pendaftaran program, dan kuis menggunakan default export Netlify Functions modern agar rute API tidak jatuh ke halaman HTML aplikasi.
- Pembungkus API mempertahankan status HTTP, body, dan header respons yang sudah dibuat handler, termasuk respons kuis dan error 404/405.
- Portal dan penyelesaian login Google menangani respons HTML/JSON rusak dengan pesan yang jelas, tanpa menyamarkannya sebagai sesi kedaluwarsa.
- Tipe data daftar publik, pengelolaan peserta, role, dan pengumuman diperjelas; error ditangani sebagai `unknown` tanpa menonaktifkan aturan lint.
- Endpoint pengumuman memverifikasi sesi dan role admin saat menulis, menyimpan identitas pembuat yang valid, dan membatasi pembaca umum ke pengumuman terbit.
- Konfigurasi Netlify disimpan dalam repository; hanya `BETTER_AUTH_URL` (origin publik, bukan kredensial) dikecualikan dari secret scanning untuk mengatasi false positive pada dokumentasi. Secret scanning lainnya tetap aktif.

### Verifikasi

- Seluruh 128 tes dalam 20 file lulus pada salinan rilis, mencakup regresi respons JSON, ekspor handler modern, akses pengumuman, pesan error, dan batas pengecualian secret scanning.
- Lint seluruh repository rilis lulus dengan 0 error dan 0 warning; build produksi dan pemeriksaan diff lulus. Peringatan ukuran bundle tetap dicatat terpisah dari kegagalan deploy.
- PR #9 sudah di-merge ke main dan tag v0.2.1 menunjuk commit merge 2850666. Deploy preview dan produksi Netlify berstatus Ready.
- OAuth Google end-to-end dan konfigurasi kredensial tetap perlu diverifikasi terpisah; tes lokal dan deploy Ready bukan bukti keberhasilan login akun produksi.

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
