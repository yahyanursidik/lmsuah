import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { HttpError } from './http-error.js';

// Synchronous Netlify Functions have a request-size limit. Keep binary uploads
// below that limit; larger files need a separately reviewed multipart flow.
export const MAX_PDF_BYTES = 4 * 1024 * 1024;

export function safePdfFilename(value: string) {
  const filename = Array.from(value.replace(/^.*[\\/]/, '')).filter(character => { const code = character.charCodeAt(0); return code >= 32 && code !== 127; }).join('').trim();
  if (!filename || filename.length > 180 || !/\.pdf$/i.test(filename)) throw new HttpError(400, 'Nama berkas harus berakhiran .pdf dan maksimal 180 karakter.');
  return filename;
}
export function validatePdf(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > MAX_PDF_BYTES) throw new HttpError(413, 'Ukuran PDF harus antara 1 byte dan 4 MB.');
  if (mime.split(';')[0]?.trim().toLowerCase() !== 'application/pdf' || !/^%PDF-(?:1\.[0-7]|2\.0)/.test(new TextDecoder().decode(bytes.slice(0, 8)))) throw new HttpError(400, 'Berkas bukan PDF yang valid. MIME dan signature PDF wajib sesuai.');
  return createHash('sha256').update(bytes).digest('hex');
}
export async function readLimitedPdfBody(request: Request) {
  const declared = Number(request.headers.get('content-length'));
  if (declared > MAX_PDF_BYTES) throw new HttpError(413, 'PDF maksimal 4 MB.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Berkas PDF diperlukan.');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > MAX_PDF_BYTES) { await reader.cancel(); throw new HttpError(413, 'PDF maksimal 4 MB.'); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
export function privateTranscriptStore() {
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_BLOBS_TOKEN;
    return getStore({ name: 'private-kajian-transcripts', consistency: 'strong', ...(siteID && token ? { siteID, token } : {}) });
  } catch { throw new HttpError(503, 'Penyimpanan PDF privat belum dikonfigurasi di server.', 'STORAGE_NOT_READY'); }
}
export function pdfRange(value: string | null, size: number): { start: number; end: number } | null {
  if (!value) return null;
  const match = value.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || !match[1] && !match[2]) throw new HttpError(416, 'Rentang berkas tidak valid.');
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start || !match[1] && Number(match[2]) === 0) throw new HttpError(416, 'Rentang berkas tidak tersedia.');
  start = Math.max(0, start);
  return { start, end };
}
