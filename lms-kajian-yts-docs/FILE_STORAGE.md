# File Storage

## Provider
Netlify Blobs.

## Files
Transkrip PDF, lampiran, cover, dan aset unggahan.

## Access
Upload dan read file privat hanya melalui Netlify Functions. Tidak ada public listing atau credential di browser.

## Key Format
`transcripts/{programId}/{lessonId}/{transcriptId}/{versionId}.pdf`

## Metadata
Blob key, MIME, size, SHA-256, filename, version, status, uploader, dan waktu.

Batas awal PDF: 25 MB, lalu divalidasi terhadap kebutuhan dan batas platform.
