import { config } from "dotenv";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  copyDatabaseUrl,
  type CopyManifest,
} from "../netlify/functions/db/copy-target.js";
import { hashCredentialPassword } from "../netlify/functions/utils/password.js";
import {
  contaboClient,
  contaboConfig,
} from "../netlify/functions/utils/contabo-storage.js";
import {
  privateContaboClient,
  privateContaboConfig,
} from "../netlify/functions/utils/contabo-private.js";
import { runMediaWorkflow, type MediaTestContext } from "./media-workflow.js";

async function main() {
  assert(
    process.argv.includes("--approved-copy-fixtures"),
    "COPY_FIXTURE_APPROVAL_REQUIRED",
  );
  config({ path: process.env.LMS_E2E_ENV_FILE || ".env", quiet: true });
  const manifest = JSON.parse(
    readFileSync("netlify/functions/db/baseline-copy-20261022.json", "utf8"),
  ) as CopyManifest;
  const copyUrl = copyDatabaseUrl(process.env.DATABASE_URL || "", manifest);
  const client = neon(copyUrl);
  const query = (sql: string, params: unknown[] = []) =>
    client.query(sql, params) as Promise<Record<string, unknown>[]>;
  assert.equal(
    Number(
      (await query("select count(*) as n from drizzle.__drizzle_migrations"))[0]
        .n,
    ),
    15,
    "COPY_SCHEMA_NOT_READY",
  );
  const run = randomUUID();
  console.log(
    JSON.stringify({
      e2eRun: run,
      copyBranch: manifest.targetBranchId,
      sourceWrites: false,
    }),
  );
  const probe = await fetch("http://127.0.0.1:5182", {
    signal: AbortSignal.timeout(1000),
  }).catch(() => null);
  assert(!probe, "E2E_PORT_ALREADY_IN_USE");
  const password = randomBytes(24).toString("base64url");
  const users = ["admin", "reviewer", "participant"].map((kind, index) => ({
    id: randomUUID(),
    name: "E2E " + kind,
    email: `e2e-${run}-${index}@example.invalid`,
    role: kind === "participant" ? "participant" : "super_administrator",
  }));
  const hash = await hashCredentialPassword(password);
  const tables = [
    "user",
    "roles",
    "role_permissions",
    "account",
    "session",
    "profiles",
    "user_roles",
    "programs",
    "lessons",
    "transcript_documents",
    "transcript_versions",
    "transcript_version_events",
    "lesson_progress",
    "enrollments",
  ];
  const counts = () =>
    query(
      tables
        .map((t) => `select '${t}' as name, count(*)::int as n from "${t}"`)
        .join(" union all ") + " order by name",
    );
  const before = await counts();
  await client.transaction(
    users.flatMap((u) => [
      client.query(
        'insert into "user" (id,name,email,email_verified,created_at,updated_at) values ($1,$2,$3,true,now(),now())',
        [u.id, u.name, u.email],
      ),
      client.query(
        "insert into account (id,account_id,provider_id,user_id,password,created_at,updated_at) values ($1,$2,'credential',$2,$3,now(),now())",
        [randomUUID(), u.id, hash],
      ),
      client.query(
        "insert into profiles (auth_user_id,name,email) values ($1,$2,$3)",
        [u.id, u.name, u.email],
      ),
      client.query("insert into user_roles (user_id,role_id) values ($1,$2)", [
        u.id,
        u.role,
      ]),
    ]),
  );
  const baseURL = "http://127.0.0.1:5182";
  const artifacts = resolve("test-results/media-e2e/" + run);
  mkdirSync(artifacts, { recursive: true });
  const context: MediaTestContext = {
    baseURL,
    artifacts,
    password,
    users,
    query,
    slug: "e2e-media-" + run,
    title: "E2E Program Media " + run.slice(0, 8),
    programId: "",
    lessonId: randomUUID(),
    publicKeys: new Set<string>(),
    stage: "start",
  };
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "5182",
      "--strictPort",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        DATABASE_URL: copyUrl,
        BETTER_AUTH_URL: baseURL,
        NODE_ENV: "development",
        LMS_PRIVATE_PDF_ENABLED: "true",
        LMS_PRIVATE_PDF_STORAGE: "contabo",
        LMS_PROGRAM_REVISIONS_ENABLED: "false",
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
      },
      windowsHide: true,
    },
  );
  server.stdout?.resume();
  server.stderr?.resume();
  let failure: unknown;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    for (let attempt = 0; ; attempt++) {
      if (server.exitCode !== null) throw Error("E2E_SERVER_EXITED");
      try {
        const r = await fetch(baseURL, { signal: AbortSignal.timeout(1000) });
        if (r.ok) break;
      } catch {
        /* wait for owned server */
      }
      if (attempt >= 40) throw Error("E2E_SERVER_START_TIMEOUT");
      await new Promise((r) => setTimeout(r, 500));
    }
    browser = await chromium.launch({ headless: true, channel: "chromium" });
    await runMediaWorkflow(browser, context);
    console.log(
      JSON.stringify({
        browserE2E: true,
        sourceWrites: false,
        privateFeatureEnabledOnlyOnCopy: true,
        artifacts,
      }),
    );
  } catch (error) {
    failure = error;
    for (const [index, page] of (
      browser?.contexts().flatMap((ctx) => ctx.pages()) || []
    ).entries()) {
      await page
        .screenshot({
          path: artifacts + "/failure-" + index + ".png",
          fullPage: true,
        })
        .catch(() => undefined);
    }
    let message = error instanceof Error ? error.message : "E2E_FAILED";
    for (const value of [
      password,
      hash,
      ...Object.entries(process.env)
        .filter(([k]) =>
          /SECRET|TOKEN|ACCESS_KEY|DATABASE_URL|PASSWORD/.test(k),
        )
        .map(([, v]) => v || ""),
    ])
      if (value.length >= 8) message = message.split(value).join("[REDACTED]");
    console.error(
      JSON.stringify({
        stage: context.stage,
        error: message.slice(0, 1800),
        sourceWrites: false,
      }),
    );
  }
  await browser?.close();
  if (server.exitCode === null) {
    server.kill();
    await once(server, "exit");
  }
  const found = await query(
    "select id from programs where slug=$1 and created_by=$2",
    [context.slug, users[0].id],
  );
  const programId = String(found[0]?.id || "");
  if (programId) {
    const foundLesson = await query(
      "select id from lessons where program_id=$1 and slug=$2 and created_by=$3",
      [programId, context.slug + "-meeting", users[0].id],
    );
    if (foundLesson[0]) context.lessonId = String(foundLesson[0].id);
  }
  const privateKeys = programId
    ? await query(
        "select v.blob_key from transcript_versions v join transcript_documents d on d.id=v.document_id where d.lesson_id=$1 and v.uploaded_by=$2",
        [context.lessonId, users[0].id],
      )
    : [];
  const publicConfig = contaboConfig(),
    privateConfig = privateContaboConfig();
  assert.equal(publicConfig.bucket, "lmsuah", "UNEXPECTED_PUBLIC_BUCKET");
  const stores = [
    {
      client: contaboClient(),
      bucket: publicConfig.bucket,
      keys: [...context.publicKeys],
    },
    {
      client: privateContaboClient(),
      bucket: privateConfig.bucket,
      keys: privateKeys.map((r) => String(r.blob_key)),
    },
  ];
  let removed = 0;
  for (const store of stores) {
    for (const key of store.keys) {
      assert(
        store.bucket === "lmsuah"
          ? /^public\/(images|documents)\/[a-f0-9-]{36}\.(webp|pdf)$/.test(key)
          : key.startsWith(
              `contabo-private-v1/transcripts/${programId}/${context.lessonId}/`,
            ),
        "UNSAFE_FIXTURE_DELETE",
      );
      await store.client.send(
        new DeleteObjectCommand({ Bucket: store.bucket, Key: key }),
      );
      try {
        await store.client.send(
          new HeadObjectCommand({ Bucket: store.bucket, Key: key }),
        );
        throw Error("FIXTURE_DELETE_NOT_CONFIRMED");
      } catch (error) {
        if (
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode !== 404
        )
          throw error;
      }
      removed++;
    }
    store.client.destroy();
  }
  await client.transaction([
    client.query(
      "delete from transcript_version_events where version_id in(select v.id from transcript_versions v join transcript_documents d on d.id=v.document_id where d.lesson_id=$1)",
      [context.lessonId],
    ),
    client.query(
      "delete from transcript_versions where document_id in(select id from transcript_documents where lesson_id=$1)",
      [context.lessonId],
    ),
    client.query("delete from transcript_documents where lesson_id=$1", [
      context.lessonId,
    ]),
    client.query("delete from lesson_progress where lesson_id=$1", [
      context.lessonId,
    ]),
    client.query("delete from lesson_quiz_drafts where lesson_id=$1", [
      context.lessonId,
    ]),
    client.query("delete from lesson_attachments where lesson_id=$1", [
      context.lessonId,
    ]),
    client.query("delete from lessons where id=$1 and created_by=$2", [
      context.lessonId,
      users[0].id,
    ]),
    client.query(
      "delete from enrollments where program_id=$1::uuid and user_id=any($2::text[])",
      [programId || null, users.map((u) => u.id)],
    ),
    client.query(
      "delete from programs where id=$1::uuid and slug=$2 and created_by=$3",
      [programId || null, context.slug, users[0].id],
    ),
    client.query("delete from session where user_id=any($1::text[])", [
      users.map((u) => u.id),
    ]),
    client.query("delete from account where user_id=any($1::text[])", [
      users.map((u) => u.id),
    ]),
    client.query("delete from profiles where auth_user_id=any($1::text[])", [
      users.map((u) => u.id),
    ]),
    client.query("delete from user_roles where user_id=any($1::text[])", [
      users.map((u) => u.id),
    ]),
    client.query("delete from role_permissions where role_id=$1", [
      context.slug + "-pdf-reader",
    ]),
    client.query("delete from roles where id=$1", [
      context.slug + "-pdf-reader",
    ]),
    client.query('delete from "user" where id=any($1::text[])', [
      users.map((u) => u.id),
    ]),
  ]);
  assert.deepEqual(
    await counts(),
    before,
    "COPY_FIXTURE_ROW_COUNTS_NOT_RESTORED",
  );
  console.log(
    JSON.stringify({
      fixtureObjectsRemoved: removed,
      fixtureAccountsRemoved: users.length,
      copyRowCountsRestored: true,
      sourceWrites: false,
    }),
  );
  if (failure) throw Error("MEDIA_E2E_FAILED");
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "E2E_SETUP_OR_CLEANUP_FAILED",
      sourceWrites: false,
    }),
  );
  process.exitCode = 1;
});
