import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { contaboConfig } from "./contabo-storage.js";
import { HttpError } from "./http-error.js";

// Versioned keys stay bound to the separately verified private bucket.
export const PRIVATE_CONTABO_PREFIX = "contabo-private-v1/";
const MAX_BYTES = 4 * 1024 * 1024;
const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const keyPattern = new RegExp(
  `^contabo-private-v1/transcripts/${uuid}/${uuid}/${uuid}/${uuid}\\.pdf$`,
);
export function privateContaboConfig() {
  const base = contaboConfig();
  const bucket = process.env.CONTABO_PRIVATE_BUCKET || "lmsuahprivate";
  let endpoint: URL;
  try {
    endpoint = new URL(
      process.env.CONTABO_PRIVATE_ENDPOINT || "https://sin1.contabostorage.com",
    );
  } catch {
    throw new HttpError(
      503,
      "Endpoint bucket privat tidak valid.",
      "PRIVATE_STORAGE_CONFIG_INVALID",
    );
  }
  if (endpoint.pathname.replace(/\/$/, "") === `/${bucket}`)
    endpoint.pathname = "/";
  if (
    bucket !== "lmsuahprivate" ||
    bucket === base.bucket ||
    endpoint.origin !== "https://sin1.contabostorage.com" ||
    endpoint.pathname !== "/" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    base.endpoint !== endpoint.origin
  ) {
    throw new HttpError(
      503,
      "PDF privat wajib memakai bucket lmsuahprivate di endpoint SIN yang telah diuji, bukan bucket publik.",
      "PRIVATE_STORAGE_CONFIG_INVALID",
    );
  }
  return { ...base, bucket, endpoint: endpoint.origin };
}
export function privateContaboClient() {
  const config = privateContaboConfig();
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
function assertKey(key: string) {
  if (!keyPattern.test(key))
    throw new HttpError(400, "Kunci PDF privat tidak valid.");
}
export function contaboPrivateStore() {
  const config = privateContaboConfig();
  const target = (key: string) => {
    assertKey(key);
    return { Bucket: config.bucket, Key: key };
  };
  return {
    async set(
      key: string,
      data: ArrayBuffer,
      options: { onlyIfNew?: boolean; metadata?: Record<string, unknown> },
    ) {
      const input = target(key);
      if (
        options.onlyIfNew !== true ||
        data.byteLength < 1 ||
        data.byteLength > MAX_BYTES
      )
        throw new HttpError(
          400,
          "PDF privat harus versi baru dan maksimal 4 MB.",
        );
      const client = privateContaboClient();
      let created = false;
      try {
        await client.send(
          new PutObjectCommand({
            ...input,
            Body: new Uint8Array(data),
            ContentType: "application/pdf",
            ACL: "private",
            CacheControl: "private, no-store",
            ContentDisposition: 'inline; filename="dokumen.pdf"',
            IfNoneMatch: "*",
          }),
          { abortSignal: AbortSignal.timeout(15000) },
        );
        created = true;
        // Reject accidental public access before any transcript metadata is saved.
        for (const base of [
          `${config.endpoint}/${config.bucket}`,
          `${config.endpoint}/68671c4afe7c45fba062c1c65a776541:${config.bucket}`,
        ]) {
          const response = await fetch(`${base}/${key}`, {
            method: "GET",
            redirect: "manual",
            signal: AbortSignal.timeout(10000),
          });
          await response.body?.cancel();
          if (![401, 403, 404].includes(response.status))
            throw new HttpError(
              503,
              "Akses anonim bucket privat tidak ditolak. Unggah dibatalkan; periksa akses publik Contabo.",
              "PRIVATE_STORAGE_PUBLIC_ACCESS",
            );
        }
        return { modified: true };
      } catch (error) {
        if (
          !created &&
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode === 412
        )
          return { modified: false };
        if (created) {
          try {
            await client.send(new DeleteObjectCommand(input), {
              abortSignal: AbortSignal.timeout(15000),
            });
          } catch {
            throw new HttpError(
              503,
              "Verifikasi privasi gagal dan objek baru memerlukan pembersihan pengelola.",
              "PRIVATE_STORAGE_CLEANUP_REQUIRED",
            );
          }
        }
        if (error instanceof HttpError) throw error;
        throw new HttpError(
          502,
          "Penyimpanan PDF privat tidak merespons. Periksa koneksi dan izin bucket, lalu coba lagi.",
          "PRIVATE_STORAGE_UPLOAD_FAILED",
        );
      } finally {
        client.destroy();
      }
    },
    async get(
      key: string,
      _options?: { type?: "arrayBuffer"; consistency?: "strong" },
    ) {
      void _options;
      const input = target(key);
      const client = privateContaboClient();
      try {
        const result = await client.send(new GetObjectCommand(input), {
          abortSignal: AbortSignal.timeout(15000),
        });
        if (!result.Body) return null;
        const reader = result.Body.transformToWebStream().getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            size += next.value.length;
            if (size > MAX_BYTES) {
              await reader.cancel();
              throw new HttpError(
                502,
                "Ukuran PDF tersimpan tidak valid.",
                "FILE_INTEGRITY_ERROR",
              );
            }
            chunks.push(next.value);
          }
        } finally {
          reader.releaseLock();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        return bytes.buffer;
      } catch (error) {
        if (
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode === 404
        )
          return null;
        if (error instanceof HttpError) throw error;
        throw new HttpError(
          502,
          "PDF privat belum dapat dibaca dari penyimpanan. Coba lagi atau hubungi pengelola.",
          "PRIVATE_STORAGE_READ_FAILED",
        );
      } finally {
        client.destroy();
      }
    },
  };
}
