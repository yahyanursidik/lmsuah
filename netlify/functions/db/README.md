# Neon Database & Drizzle ORM

## Branch Strategy
Sesuai arsitektur, proyek ini menggunakan pendekatan *Branching* pada Neon Database:
- **Development Branch**: Digunakan untuk pengembangan lokal dan pengujian harian.
- **Preview Branch**: Dibuat secara dinamis oleh CI/CD saat ada *Pull Request*.
- **Staging Branch**: Untuk pengujian prapeluncuran (UAT).
- **Production Branch**: Data utama pengguna (Live). Tidak boleh digunakan untuk *development* harian.

## Roles
- **Migration Role**: Memiliki izin DDL (Data Definition Language) seperti `CREATE`, `ALTER`, `DROP`. Kredensial ini hanya digunakan di lingkungan terkontrol (CI/CD atau manual oleh admin) via script `npm run db:migrate`.
- **Runtime Role**: Digunakan oleh aplikasi Netlify Functions saat berjalan. Memiliki *least privilege* (hanya bisa `SELECT`, `INSERT`, `UPDATE`, `DELETE` pada tabel yang diizinkan) dan **TIDAK** memiliki hak DDL.

## Commands
- `npm run db:generate`: Menghasilkan file `.sql` migrasi baru berdasarkan perubahan di file `schema`.
- `npm run db:migrate`: Mengaplikasikan file migrasi `.sql` ke database. Dijalankan dengan peran *Migration Role*.
