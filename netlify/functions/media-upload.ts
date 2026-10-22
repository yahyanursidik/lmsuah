import type { Config } from "@netlify/functions";
import { createHandler } from "./middleware/handler.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { HttpError } from "./utils/http-error.js";
import { readMediaBody, prepareImage } from "./utils/media-files.js";
import { validatePdf } from "./utils/pdf-files.js";
import { putPublicMedia } from "./utils/contabo-storage.js";

export default createHandler(async (request) => {
  if (request.method !== "POST")
    throw new HttpError(405, "Gunakan POST untuk mengunggah berkas.");
  const session = await requireAuth(request);
  requireRole(session, [
    "admin",
    "administrator",
    "super_administrator",
    "editor",
  ]);
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Unggah harus berasal dari portal yang sama.");
  const kind = request.headers.get("x-upload-kind");
  if (!["image", "document"].includes(kind || ""))
    throw new HttpError(400, "Jenis unggahan tidak valid.");
  if (kind === "document" && request.headers.get("x-public-confirmed") !== "1")
    throw new HttpError(
      400,
      "Konfirmasi dokumen publik diperlukan. Gunakan pengelola PDF privat untuk dokumen terbatas.",
    );
  const mime =
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ||
    "";
  const bytes = await readMediaBody(request);
  let body: Uint8Array;
  let extension: string;
  let contentType: string;
  if (kind === "image") {
    body = await prepareImage(bytes, mime);
    extension = "webp";
    contentType = "image/webp";
  } else {
    validatePdf(bytes, mime);
    body = bytes;
    extension = "pdf";
    contentType = "application/pdf";
  }
  const key = `public/${kind === "image" ? "images" : "documents"}/${crypto.randomUUID()}.${extension}`;
  const url = await putPublicMedia(key, body, contentType);
  return {
    url,
    mime: contentType,
    sizeBytes: body.length,
    visibility: "public",
  };
});
export const config: Config = { path: "/api/media-upload" };
