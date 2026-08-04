# Authentication Flow

## Teknologi
- Neon Auth
- Better Auth integration
- Google OAuth
- Custom Refine authProvider

## Alur
Daftar → Turnstile → Google OAuth → callback → session → sinkronisasi profile → consent → onboarding → dashboard.

## Backend Verification
Setiap endpoint privat harus memverifikasi session, memperoleh auth user ID, memuat profile/role, memeriksa permission, lalu menjalankan query.

Frontend tidak menentukan role yang berlaku.
