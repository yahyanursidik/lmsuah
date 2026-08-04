# Deployment

## Environments
Development, Preview, Staging, Production.

## Neon
Gunakan branch terpisah. Production tidak dipakai untuk pengembangan harian.

## Netlify
Hosting Vite, Functions, CDN, SSL, deploy preview, environment variables, dan Blobs.

## Server Secrets
`DATABASE_URL`, auth secret, Google OAuth secret, Turnstile secret, dan email secret.

## Build
`npm run typecheck && npm run lint && npm run test && npm run build`

## Migration
Dijalankan melalui CI/release terkontrol dengan credential migration terpisah. Runtime tidak menjalankan migration otomatis.
