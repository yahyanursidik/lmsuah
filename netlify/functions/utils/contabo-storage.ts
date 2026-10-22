import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { HttpError } from "./http-error.js";

export function contaboConfig() {
  // Select one complete credential family; never mix keys from two accounts.
  const useContabo = Boolean(
    process.env.CONTABO_ACCESS_KEY_ID || process.env.CONTABO_SECRET_ACCESS_KEY,
  );
  const accessKeyId = useContabo
    ? process.env.CONTABO_ACCESS_KEY_ID
    : process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = useContabo
    ? process.env.CONTABO_SECRET_ACCESS_KEY
    : process.env.S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey)
    throw new HttpError(
      503,
      "Penyimpanan Contabo belum dikonfigurasi. Isi pasangan S3_ACCESS_KEY_ID dan S3_SECRET_ACCESS_KEY, atau pasangan CONTABO_ACCESS_KEY_ID dan CONTABO_SECRET_ACCESS_KEY.",
      "STORAGE_NOT_READY",
    );
  const signingRegion =
    process.env.CONTABO_SIGNING_REGION || process.env.S3_REGION || "us-east-1";
  const bucket =
    process.env.CONTABO_BUCKET || process.env.S3_BUCKET || "lmsuah";
  const safeUrl = (value: string) => {
    try {
      const url = new URL(value);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw new Error("invalid");
      return url;
    } catch {
      throw new HttpError(
        503,
        "Konfigurasi URL Contabo tidak valid. Gunakan HTTPS tanpa kredensial, query atau fragmen.",
        "STORAGE_CONFIG_INVALID",
      );
    }
  };
  const endpoint = safeUrl(
    process.env.CONTABO_ENDPOINT ||
      process.env.S3_ENDPOINT ||
      "https://sin1.contabostorage.com",
  );
  // Accept the supplied bucket URL as well as the S3 origin, avoiding /bucket/bucket.
  if (endpoint.pathname.replace(/\/$/, "") === `/${bucket}`)
    endpoint.pathname = "/";
  if (endpoint.pathname !== "/")
    throw new HttpError(
      503,
      "Endpoint S3 harus alamat server, bukan Public URL tenant.",
      "STORAGE_CONFIG_INVALID",
    );
  const publicUrl = safeUrl(
    process.env.CONTABO_PUBLIC_URL ||
      process.env.S3_PUBLIC_URL ||
      "https://sin1.contabostorage.com/68671c4afe7c45fba062c1c65a776541:lmsuah",
  );
  return {
    bucket,
    endpoint: endpoint.origin,
    publicUrl: publicUrl.toString().replace(/\/$/, ""),
    // SIN selects the endpoint; the S3 signing region is independent of the display region.
    region: signingRegion.toUpperCase() === "SIN" ? "us-east-1" : signingRegion,
    accessKeyId,
    secretAccessKey,
  };
}
export function contaboClient() {
  const config = contaboConfig();
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 2,
  });
}
export async function putPublicMedia(
  key: string,
  bytes: Uint8Array,
  mime: string,
) {
  if (!/^public\/(images|documents)\/[a-f0-9-]{36}\.(webp|pdf)$/.test(key))
    throw new HttpError(400, "Kunci media tidak valid.");
  const config = contaboConfig();
  try {
    await contaboClient().send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: bytes,
        ContentType: mime,
        ACL: "public-read",
        CacheControl: "public, max-age=31536000, immutable",
        ContentDisposition: key.endsWith(".pdf")
          ? 'inline; filename="dokumen.pdf"'
          : "inline",
      }),
    );
  } catch {
    throw new HttpError(
      502,
      "Unggah ke Contabo gagal. Periksa koneksi, kredensial dan izin bucket; foto lama tetap dipertahankan.",
      "STORAGE_UPLOAD_FAILED",
    );
  }
  return `${config.publicUrl}/${key}`;
}

/** Existing Netlify keys remain readable; Contabo private documents NEVER use the public URL. */
export function contaboPrivateStore() {
  if (process.env.CONTABO_PRIVATE_PREFIX_VERIFIED !== "true")
    throw new HttpError(
      503,
      "Privasi prefix private/ Contabo belum diverifikasi. Jangan gunakan Public URL untuk PDF privat.",
      "PRIVATE_STORAGE_NOT_VERIFIED",
    );
  const config = contaboConfig();
  const client = contaboClient();
  const keyFor = (key: string) => {
    if (!key.startsWith("contabo/private/transcripts/") || key.includes(".."))
      throw new HttpError(400, "Kunci dokumen privat tidak valid.");
    return key.slice("contabo/".length);
  };
  return {
    async set(
      key: string,
      body: ArrayBuffer,
      options: { onlyIfNew: boolean; metadata: Record<string, string> },
    ) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: keyFor(key),
          Body: new Uint8Array(body),
          ContentType: "application/pdf",
          ACL: "private",
          CacheControl: "private, no-store",
          IfNoneMatch: options.onlyIfNew ? "*" : undefined,
          Metadata: options.metadata,
        }),
      );
      return { modified: true };
    },
    async get(
      key: string,
      _options: { type: "arrayBuffer"; consistency: "strong" },
    ) {
      void _options;
      try {
        const result = await client.send(
          new GetObjectCommand({ Bucket: config.bucket, Key: keyFor(key) }),
        );
        const bytes = await result.Body?.transformToByteArray();
        return bytes ? new Uint8Array(bytes).buffer : null;
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          ["NoSuchKey", "NotFound"].includes(String(error.name))
        )
          return null;
        throw error;
      }
    },
    async delete(key: string) {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: keyFor(key) }),
      );
    },
  };
}
