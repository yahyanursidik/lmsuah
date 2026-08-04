# Developer Brief

Bangun aplikasi web responsif LMS Kajian Ustadz Abu Haidar As-Sundawy.

## Architecture
React + Refine + Vite → Custom REST data provider → Netlify Functions → Neon PostgreSQL.

PDF menggunakan Netlify Blobs. Login Google menggunakan Neon Auth dengan Better Auth integration.

## Mandatory
- Tidak ada koneksi DB langsung dari browser
- Drizzle ORM dan migration
- Authorization setiap endpoint
- Server-side quiz scoring
- Authenticated PDF endpoint
- Desktop dan mobile testing
- Tidak ada dependency Supabase
