# Technology Stack

## Frontend
- React, TypeScript, Vite
- `@refinedev/core`, React Router
- Tailwind CSS, shadcn/ui
- React Hook Form, Zod
- Custom Refine REST `dataProvider`
- Custom `authProvider` dan `accessControlProvider`

## Backend
- Netlify Functions
- TypeScript
- Zod validation
- Neon serverless driver
- Drizzle ORM dan Drizzle Kit

## Database
- Neon PostgreSQL
- Neon branches untuk development, staging, preview, dan production
- Migration disimpan di Git

## Authentication
- Neon Auth
- Better Auth integration
- Google OAuth
- Session diverifikasi pada Netlify Functions
- Cloudflare Turnstile

## File Storage
- Netlify Blobs
- Metadata file di Neon
- Akses privat melalui authenticated file endpoint

## Deployment
- Netlify hosting, CDN, Functions, deploy preview
