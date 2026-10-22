import { config } from "dotenv";
import { createHash, randomUUID } from "node:crypto";
import { HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  privateContaboClient,
  privateContaboConfig,
} from "../netlify/functions/utils/contabo-private.js";
import {
  privateTranscriptKey,
  privateTranscriptStore,
  validatePdf,
} from "../netlify/functions/utils/pdf-files.js";
config({ path: process.env.CONTABO_SMOKE_ENV_FILE || ".env", quiet: true });
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
async function main() {
  if (!process.argv.includes("--approved-test-objects"))
    throw Error("TEST_OBJECT_APPROVAL_REQUIRED");
  // Only this process selects the provider. Never enables a feature or changes .env.
  process.env.LMS_PRIVATE_PDF_STORAGE = "contabo";
  const cfg = privateContaboConfig();
  const client = privateContaboClient();
  const key = privateTranscriptKey(
    "transcripts/" +
      Array.from({ length: 4 }, () => randomUUID()).join("/") +
      ".pdf",
  );
  const input = { Bucket: cfg.bucket, Key: key };
  const send = (command: HeadObjectCommand | DeleteObjectCommand) =>
    client.send(command as HeadObjectCommand, {
      abortSignal: AbortSignal.timeout(15000),
    });
  const pdf = new TextEncoder().encode(
    "%PDF-1.4\n% Synthetic storage fixture, no personal data\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n",
  );
  validatePdf(pdf, "application/pdf");
  let owned = false;
  let failure: unknown;
  try {
    try {
      await send(new HeadObjectCommand(input));
      throw Error("FIXTURE_ALREADY_EXISTS");
    } catch (error) {
      if (
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode !== 404
      )
        throw error;
    }
    // Reserve cleanup even if an upload response times out after PUT commits.
    owned = true;
    const saved = await privateTranscriptStore(key).set(key, pdf.buffer, {
      onlyIfNew: true,
    });
    if (!saved.modified) throw Error("PRIVATE_CREATE_FAILED");
    const received = await privateTranscriptStore(key).get(key, {
      type: "arrayBuffer",
      consistency: "strong",
    });
    if (!received || hash(new Uint8Array(received)) !== hash(pdf))
      throw Error("PRIVATE_READ_HASH_MISMATCH");
    const duplicate = await privateTranscriptStore(key).set(key, pdf.buffer, {
      onlyIfNew: true,
    });
    if (duplicate.modified) throw Error("CREATE_ONLY_NOT_ENFORCED");
    const anonymous: Array<{ status: number; hashMatches: boolean }> = [];
    for (const base of [
      cfg.endpoint + "/" + cfg.bucket,
      cfg.endpoint + "/68671c4afe7c45fba062c1c65a776541:" + cfg.bucket,
    ]) {
      const response = await fetch(base + "/" + key, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      anonymous.push({
        status: response.status,
        hashMatches:
          hash(new Uint8Array(await response.arrayBuffer())) === hash(pdf),
      });
    }
    if (
      !anonymous.every(
        (r) => [401, 403, 404].includes(r.status) && !r.hashMatches,
      )
    )
      throw Error("PRIVATE_ANONYMOUS_READ_NOT_DENIED");
    console.log(
      JSON.stringify({
        bucket: cfg.bucket,
        signedReadHashMatches: true,
        duplicateRejected: true,
        anonymous,
        flagsChanged: false,
      }),
    );
  } catch (error) {
    failure = error;
  }
  if (owned) {
    try {
      await send(new DeleteObjectCommand(input));
      try {
        await send(new HeadObjectCommand(input));
        throw Error("FIXTURE_DELETE_NOT_CONFIRMED");
      } catch (error) {
        if (
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode !== 404
        )
          throw error;
      }
      console.log(
        JSON.stringify({
          fixtureObjectsRemoved: 1,
          existingObjectsTouched: false,
        }),
      );
    } catch {
      console.error(JSON.stringify({ cleanupFailedKey: key }));
      failure = Error("FIXTURE_CLEANUP_FAILED");
    }
  }
  client.destroy();
  if (failure) throw failure;
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error && /^[A-Z_]+$/.test(error.message)
          ? error.message
          : error?.code || "PRIVATE_STORAGE_SMOKE_FAILED",
      credentialsPrinted: false,
    }),
  );
  process.exitCode = 1;
});
