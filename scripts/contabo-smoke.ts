import { config } from "dotenv";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  contaboConfig,
  contaboClient,
  putPublicMedia,
} from "../netlify/functions/utils/contabo-storage.js";
import { prepareImage } from "../netlify/functions/utils/media-files.js";
import { validatePdf } from "../netlify/functions/utils/pdf-files.js";

config({ quiet: true });
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
function fixturePdf() {
  const stream =
    "BT /F1 12 Tf 20 100 Td (Storage verification fixture - no personal data) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(pdf);
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
      .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
async function main() {
  if (!process.argv.includes("--approved-test-objects"))
    throw new Error("TEST_OBJECT_APPROVAL_REQUIRED");
  const cfg = contaboConfig();
  if (
    cfg.bucket !== "lmsuah" ||
    cfg.endpoint !== "https://sin1.contabostorage.com" ||
    cfg.publicUrl !==
      "https://sin1.contabostorage.com/68671c4afe7c45fba062c1c65a776541:lmsuah"
  )
    throw new Error("UNEXPECTED_STORAGE_TARGET");
  const client = contaboClient();
  const owned = new Set<string>();
  const send = (
    command:
      | PutObjectCommand
      | GetObjectCommand
      | HeadObjectCommand
      | DeleteObjectCommand,
  ) =>
    client.send(command as HeadObjectCommand, {
      abortSignal: AbortSignal.timeout(15000),
    });
  const assertNew = async (key: string) => {
    try {
      await send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
    } catch (error) {
      if (
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      )
        return;
      throw error;
    }
    throw new Error("FIXTURE_KEY_ALREADY_EXISTS");
  };
  const verifyPublic = async (key: string, bytes: Uint8Array, mime: string) => {
    await assertNew(key);
    const url = await putPublicMedia(key, bytes, mime);
    owned.add(key);
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const received = new Uint8Array(await response.arrayBuffer());
    if (
      response.status !== 200 ||
      response.headers.get("content-type")?.split(";")[0] !== mime ||
      digest(received) !== digest(bytes)
    )
      throw new Error("PUBLIC_READ_VERIFICATION_FAILED");
    console.log(
      JSON.stringify({
        kind: mime,
        upload: true,
        anonymousRead: 200,
        byteHashMatches: true,
      }),
    );
  };
  let failure: unknown;
  try {
    const png = await sharp({
      create: { width: 24, height: 24, channels: 3, background: "#176c52" },
    })
      .png()
      .toBuffer();
    const webp = await prepareImage(png, "image/png");
    await verifyPublic(
      `public/images/${randomUUID()}.webp`,
      webp,
      "image/webp",
    );
    const pdf = fixturePdf();
    validatePdf(pdf, "application/pdf");
    await verifyPublic(
      `public/documents/${randomUUID()}.pdf`,
      pdf,
      "application/pdf",
    );
    if (process.argv.includes("--check-private-acl")) {
      const key = `private/transcripts/fixture-${randomUUID()}/verification.pdf`;
      await assertNew(key);
      await send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          Body: pdf,
          ContentType: "application/pdf",
          ACL: "private",
          CacheControl: "private, no-store",
        }),
      );
      owned.add(key);
      const result = await client.send(
        new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
      const received = await result.Body!.transformToByteArray();
      if (digest(received) !== digest(pdf))
        throw new Error("PRIVATE_SIGNED_READ_FAILED");
      const statuses: number[] = [];
      const anonymousHashMatches: boolean[] = [];
      for (const base of [cfg.publicUrl, `${cfg.endpoint}/${cfg.bucket}`]) {
        const response = await fetch(`${base}/${key}`, {
          signal: AbortSignal.timeout(15000),
        });
        statuses.push(response.status);
        anonymousHashMatches.push(
          digest(new Uint8Array(await response.arrayBuffer())) === digest(pdf),
        );
      }
      const denied = statuses.every((status) =>
        [401, 403, 404].includes(status),
      );
      console.log(
        JSON.stringify({
          privateSignedRead: true,
          anonymousStatuses: statuses,
          anonymousHashMatches,
          privateAccessDenied: denied,
          flagsChanged: false,
        }),
      );
      if (anonymousHashMatches.some(Boolean))
        throw new Error("PRIVATE_PREFIX_PUBLICLY_READABLE");
      if (!denied) throw new Error("PRIVATE_ANONYMOUS_RESPONSE_UNEXPECTED");
    }
  } catch (error) {
    failure = error;
  }
  {
    const cleanupFailed: string[] = [];
    for (const key of owned) {
      try {
        await send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
        try {
          await send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
          throw new Error("FIXTURE_DELETE_NOT_CONFIRMED");
        } catch (error) {
          if (
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode !== 404
          )
            throw error;
        }
      } catch {
        cleanupFailed.push(key);
      }
    }
    console.log(
      JSON.stringify({
        fixtureObjectsRemoved: owned.size - cleanupFailed.length,
        failedFixtureKeys: cleanupFailed,
        existingObjectsTouched: false,
        flagsChanged: false,
      }),
    );
    client.destroy();
    if (cleanupFailed.length) throw new Error("FIXTURE_CLEANUP_FAILED");
  }
  if (failure) throw failure;
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error && /^[A-Z_]+$/.test(error.message)
          ? error.message
          : "STORAGE_SMOKE_FAILED",
      httpStatus: error?.$metadata?.httpStatusCode,
      credentialsPrinted: false,
    }),
  );
  process.exitCode = 1;
});
