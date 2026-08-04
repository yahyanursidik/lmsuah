# System Architecture

```text
Desktop / Mobile Browser
        │ HTTPS JSON
        ▼
React + Refine + Vite on Netlify
        │ /api/*
        ▼
Netlify Functions
- session verification
- authorization
- validation
- business logic
- audit
   │                 │
   ▼                 ▼
Neon PostgreSQL   Netlify Blobs
structured data  PDF/lampiran
```

External services: Neon Auth/Better Auth, Google OAuth, YouTube, Google Maps, Turnstile, dan email provider.

## Trust Boundary
Browser tidak tepercaya. `DATABASE_URL`, OAuth secret, Turnstile secret, dan credential server tidak pernah dikirim ke frontend.

## API Layer
Semua operasi data dilakukan melalui Netlify Functions. Refine menggunakan custom REST data provider.

## Data Layer
Neon menyimpan data terstruktur. Netlify Blobs menyimpan file. Database hanya menyimpan metadata dan blob key.
