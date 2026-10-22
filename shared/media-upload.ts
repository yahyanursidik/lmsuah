export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type UploadKind = "image" | "document";
