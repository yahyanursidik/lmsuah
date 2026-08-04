# Transcript PDF Flow

## Storage
- File: Netlify Blobs
- Metadata: Neon PostgreSQL
- Upload/read: Netlify Functions

## Upload
Session → permission → validasi MIME dan `%PDF` signature → size limit → SHA-256 → simpan Blob → simpan metadata Neon → audit.

## Read
Peserta meminta metadata → API memeriksa akses → authenticated file endpoint membaca Blob → mengirim PDF dengan header aman.

## Versioning
File lama tidak ditimpa. Setiap versi memakai key baru. Hanya satu versi published aktif.

## Catatan Download
`is_downloadable=false` adalah kontrol distribusi, bukan DRM mutlak.
