# LMS Kajian Ustadz Abu Haidar As-Sundawy

Dokumentasi pengembangan aplikasi web responsif milik Yayasan Tarbiyah Sunnah.

## Bentuk Produk

Aplikasi web berbasis browser dengan desktop view, mobile view, tablet view, dan fondasi PWA. Produk bukan aplikasi Android/iOS native pada fase awal.

## Arsitektur

```text
Browser (React + Refine + Vite)
→ Netlify Functions REST API
→ Neon PostgreSQL
```

Layanan pendukung:

- Neon Auth dengan Better Auth integration untuk login Google
- Netlify Blobs untuk PDF dan lampiran
- YouTube embedded player
- Google Maps
- Cloudflare Turnstile
- Netlify hosting, CDN, deploy preview, dan Functions

## Aturan Utama

1. Browser tidak terhubung langsung ke Neon.
2. Semua query melalui Netlify Functions.
3. Database URL hanya di server.
4. Authorization diterapkan di setiap endpoint.
5. Drizzle ORM dan migration wajib digunakan.
6. PDF disimpan di Netlify Blobs; metadata di Neon.
7. Skor kuis dihitung server-side.
8. Desktop dan mobile wajib diuji.

## Dokumen Penting

- `PRD.md`
- `DEVELOPER_BRIEF.md`
- `SYSTEM_ARCHITECTURE.md`
- `STACK.md`
- `NEON_ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `AUTHORIZATION_PLAN.md`
- `AUTH_FLOW.md`
- `REST_API_CONTRACT.md`
- `TRANSCRIPT_PDF_FLOW.md`
- `FILE_STORAGE.md`
- `SECURITY.md`
- `MIGRATION_PLAN.md`
- `ROADMAP.md`
- `AGENTS.md`
