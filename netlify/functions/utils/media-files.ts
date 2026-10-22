import sharp from "sharp";
import {
  MAX_MEDIA_BYTES,
  IMAGE_MIME_TYPES,
} from "../../../shared/media-upload.js";
import { HttpError } from "./http-error.js";

export async function readMediaBody(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_MEDIA_BYTES)
    throw new HttpError(413, "Berkas maksimal 4 MB.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Pilih berkas untuk diunggah.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > MAX_MEDIA_BYTES) {
        await reader.cancel();
        throw new HttpError(413, "Berkas maksimal 4 MB.");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new HttpError(400, "Berkas kosong tidak dapat diunggah.");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function prepareImage(bytes: Uint8Array, mime: string) {
  if (!IMAGE_MIME_TYPES.includes(mime as (typeof IMAGE_MIME_TYPES)[number]))
    throw new HttpError(
      415,
      "Foto harus JPG, PNG, atau WebP. SVG dan GIF tidak didukung.",
    );
  try {
    const image = sharp(bytes, {
      limitInputPixels: 20_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      (metadata.pages || 1) > 1 ||
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      `image/${metadata.format}` !== mime
    )
      throw new Error("Invalid image");
    // Decode and re-encode; orientation is applied and EXIF/GPS metadata is not copied.
    return await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      "Foto rusak, format tidak sesuai, atau melebihi 20 megapiksel. Pilih foto JPG/PNG/WebP lain.",
    );
  }
}
