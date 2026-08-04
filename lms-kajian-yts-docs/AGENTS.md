# AGENTS.md

## Stack
React, TypeScript, Vite, Refine Core, Netlify Functions, Neon PostgreSQL, Neon serverless driver, Drizzle ORM, Neon Auth/Better Auth, Netlify Blobs, Netlify hosting.

## Rules
1. Browser tidak boleh terhubung langsung ke Neon.
2. Refine memakai custom REST data provider.
3. Semua query berjalan di Netlify Functions.
4. Semua endpoint privat memverifikasi session dan permission.
5. Semua perubahan schema melalui migration.
6. Runtime DB role least privilege.
7. PDF di Netlify Blobs; metadata di Neon.
8. Quiz scoring server-side.
9. Jangan menambahkan dependency Supabase.
10. Jangan expose `DATABASE_URL`.
11. Uji desktop dan mobile.
12. Jalankan typecheck, lint, test, build.
