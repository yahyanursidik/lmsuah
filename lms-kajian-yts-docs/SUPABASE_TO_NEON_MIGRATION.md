# Supabase to Neon Migration

| Sebelumnya | Sekarang |
|---|---|
| Supabase PostgreSQL | Neon PostgreSQL |
| Supabase Auth | Neon Auth + Better Auth |
| Supabase Storage | Netlify Blobs |
| Supabase Edge Functions | Netlify Functions |
| Supabase data provider | Custom Refine REST data provider |
| Direct browser data access | Server-side REST API |
| Supabase RLS utama | API authorization + query scoping + optional PostgreSQL RLS |
| Supabase CLI migration | Drizzle Kit + Neon branches |

Perubahan penting: frontend tidak lagi mengakses database langsung. Backend API eksplisit menjadi lapisan keamanan dan business logic.
