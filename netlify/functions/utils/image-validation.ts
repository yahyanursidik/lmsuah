import { z } from "zod";
import { normalizeImageSource } from "../../../shared/image-source.js";

// Validate syntax only: do not fetch arbitrary admin-supplied URLs on the server (SSRF).
export const imageSourceSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => !value || !!normalizeImageSource(value),
    "URL gambar harus HTTP/HTTPS atau jalur lokal yang valid.",
  )
  .transform((value) => normalizeImageSource(value) || "");
