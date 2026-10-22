import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type {
  Browser,
  Page,
  APIResponse,
  Response as BrowserResponse,
} from "playwright";
import sharp from "sharp";
import { contaboConfig } from "../netlify/functions/utils/contabo-storage.js";
export interface MediaTestContext {
  baseURL: string;
  artifacts: string;
  password: string;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<Record<string, unknown>[]>;
  slug: string;
  title: string;
  programId: string;
  lessonId: string;
  publicKeys: Set<string>;
  stage: string;
}
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
function responseFor(
  page: Page,
  predicate: (response: BrowserResponse) => boolean,
) {
  const pending = page.waitForResponse(predicate);
  // Handle early rejection while the matching click/file input is still pending.
  void pending.catch(() => undefined);
  return pending;
}
const step = (c: MediaTestContext, stage: string) => {
  c.stage = stage;
  console.log(JSON.stringify({ e2eStage: stage }));
};
async function checked(
  response: Pick<APIResponse, "status" | "json">,
  status = 200,
) {
  assert.equal(
    response.status(),
    status,
    "HTTP_" + response.status() + "_EXPECTED_" + status,
  );
  return response.json();
}
async function login(page: Page, c: MediaTestContext, index: number) {
  await page.goto(c.baseURL + "/login");
  await page.getByLabel("Email", { exact: true }).fill(c.users[index].email);
  await page.locator('input[type="password"]').fill(c.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(
    index === 2 ? /\/(dashboard|belajar)(\/|$)/ : /\/admin(\/|$)/,
  );
}
async function pdfDialog(page: Page, c: MediaTestContext) {
  await page.goto(c.baseURL + `/admin/programs/${c.programId}/curriculum`);
  await page
    .getByRole("button", { name: "Kelola PDF privat & versi transkrip" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "PDF privat & versi transkrip",
  });
  await dialog.getByRole("button", { name: "Unggah sebagai draft" }).waitFor();
  return dialog;
}
export async function runMediaWorkflow(browser: Browser, c: MediaTestContext) {
  const adminContext = await browser.newContext({
    viewport: { width: 1365, height: 950 },
  });
  const admin = await adminContext.newPage();
  admin.setDefaultTimeout(30000);
  const pageErrors: string[] = [];
  admin.on("pageerror", (e) => pageErrors.push(e.name));
  step(c, "admin-login-create-cover");
  await login(admin, c, 0);
  await admin.goto(c.baseURL + "/admin/programs");
  await admin
    .getByRole("button", { name: /Tambah program/i })
    .first()
    .click();
  const form = admin.getByRole("dialog", { name: "Tambah program baru" });
  await form.getByLabel(/Judul program/).fill(c.title);
  await form.getByLabel(/URL slug/).fill(c.slug);
  await form
    .getByLabel(/Deskripsi singkat/)
    .fill("Program sintetis untuk uji unggah, bukan konten pengguna.");
  const image = await sharp({
    create: { width: 640, height: 360, channels: 3, background: "#176c52" },
  })
    .png()
    .toBuffer();
  const uploaded = responseFor(
    admin,
    (r) =>
      r.url().endsWith("/api/media-upload") && r.request().method() === "POST",
  );
  await form.getByLabel("Unggah foto dari perangkat").setInputFiles({
    name: "sampul-e2e.png",
    mimeType: "image/png",
    buffer: image,
  });
  assert(
    await form
      .getByRole("button", { name: "Buat program", exact: true })
      .isDisabled(),
    "SAVE_MUST_WAIT_FOR_UPLOAD",
  );
  const imageData = (await checked(await uploaded)).data;
  const publicConfig = contaboConfig();
  assert(
    imageData.url.startsWith(publicConfig.publicUrl + "/public/images/"),
    "UNEXPECTED_IMAGE_URL",
  );
  c.publicKeys.add(imageData.url.slice(publicConfig.publicUrl.length + 1));
  const preview = form.getByAltText("Pratinjau foto");
  await preview.waitFor();
  assert(
    await preview.evaluate(async (element) => {
      const img = element as HTMLImageElement;
      await img.decode();
      return img.naturalWidth > 0;
    }),
    "COVER_PREVIEW_NOT_LOADED",
  );
  assert.equal(
    await form.getByLabel("Sampul Program Kajian (opsional)").inputValue(),
    imageData.url,
  );
  step(c, "invalid-image-error-retains-cover");
  const invalid = responseFor(
    admin,
    (r) =>
      r.url().endsWith("/api/media-upload") && r.request().method() === "POST",
  );
  await form.getByLabel("Unggah foto dari perangkat").setInputFiles({
    name: "rusak.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  assert.equal((await invalid).status(), 400);
  await form.getByRole("alert").first().waitFor();
  assert.equal(
    await form.getByLabel("Sampul Program Kajian (opsional)").inputValue(),
    imageData.url,
  );
  const saved = responseFor(
    admin,
    (r) =>
      new URL(r.url()).pathname === "/api/programs" &&
      r.request().method() === "POST",
  );
  await form.getByRole("button", { name: "Buat program", exact: true }).click();
  const program = (await checked(await saved)).data;
  c.programId = program.id;
  assert.equal(
    (
      await c.query(
        "select cover_image from programs where id=$1 and created_by=$2",
        [c.programId, c.users[0].id],
      )
    )[0]?.cover_image,
    imageData.url,
  );
  step(c, "incomplete-publication-blocked");
  await checked(
    await admin.request.patch(c.baseURL + "/api/programs/" + c.programId, {
      data: { status: "published" },
    }),
    409,
  );
  const lesson = (
    await checked(
      await admin.request.post(c.baseURL + "/api/lessons", {
        data: {
          programId: c.programId,
          title: "E2E Pertemuan Media",
          slug: c.slug + "-meeting",
          sequence: 1,
          status: "draft",
          materials: [],
        },
      }),
    )
  ).data;
  c.lessonId = lesson.id;
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  step(c, "private-pdf-upload-draft");
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(
    "<h1>PDF privat E2E</h1><p>Dokumen sintetis. Tidak berisi data pribadi.</p>",
  );
  const pdf = await pdfPage.pdf({ format: "A4" });
  await pdfPage.close();
  const dialog = await pdfDialog(admin, c);
  await dialog
    .getByLabel("Judul dokumen", { exact: true })
    .fill("PDF Privat E2E");
  await dialog.getByLabel(/Berkas PDF/).setInputFiles({
    name: "transkrip-e2e.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  const pdfUploaded = responseFor(
    admin,
    (r) =>
      new URL(r.url()).pathname === "/api/transcripts" &&
      r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Unggah sebagai draft" }).click();
  const version = (await checked(await pdfUploaded)).data;
  assert(version.id, "PRIVATE_VERSION_NOT_CREATED");
  await dialog.getByText(/Versi PDF tersimpan sebagai draft/).waitFor();
  const stored = (
    await c.query(
      "select blob_key,status from transcript_versions where id=$1",
      [version.id],
    )
  )[0];
  assert(
    String(stored.blob_key).startsWith(
      `contabo-private-v1/transcripts/${c.programId}/${c.lessonId}/`,
    ),
    "WRONG_PRIVATE_BUCKET_ROUTE",
  );
  assert.equal(stored.status, "draft");
  const participantContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const participant = await participantContext.newPage();
  participant.setDefaultTimeout(30000);
  await login(participant, c, 2);
  const filePath = "/api/transcript-file/" + version.id;
  assert.equal(
    (await participant.request.get(c.baseURL + filePath)).status(),
    403,
    "PDF_READ_PERMISSION_REQUIRED",
  );
  const readerRole = c.slug + "-pdf-reader";
  await c.query("insert into roles (id,name) values ($1,$1)", [readerRole]);
  await c.query(
    "insert into role_permissions (role_id,permission_id) values ($1,'transcript.read')",
    [readerRole],
  );
  await c.query("insert into user_roles (user_id,role_id) values ($1,$2)", [
    c.users[2].id,
    readerRole,
  ]);
  assert.equal(
    (await participant.request.get(c.baseURL + filePath)).status(),
    403,
    "PARTICIPANT_MUST_NOT_READ_DRAFT",
  );
  assert.equal(
    (await guest.request.get(c.baseURL + filePath)).status(),
    401,
    "ANONYMOUS_MUST_NOT_READ_PRIVATE_PDF",
  );
  step(c, "independent-review-and-publish");
  await dialog
    .getByLabel("Catatan tindakan review/publikasi")
    .fill("Ajukan dokumen sintetis untuk pemeriksaan independen.");
  const changed = responseFor(
    admin,
    (r) =>
      new URL(r.url()).pathname === "/api/transcripts/" + version.id &&
      r.request().method() === "PATCH",
  );
  await dialog
    .getByRole("button", { name: "Ajukan review", exact: true })
    .click();
  await checked(await changed);
  await dialog
    .getByRole("button", { name: "Setujui versi", exact: true })
    .waitFor();
  assert(
    await dialog
      .getByRole("button", { name: "Setujui versi", exact: true })
      .isDisabled(),
    "AUTHOR_MUST_NOT_APPROVE_OWN_PDF",
  );
  assert.equal(
    (
      await admin.request.patch(c.baseURL + "/api/transcripts/" + version.id, {
        data: { action: "approve", note: "Tidak boleh menyetujui sendiri." },
      })
    ).status(),
    403,
  );
  const reviewerContext = await browser.newContext({
    viewport: { width: 1365, height: 950 },
  });
  const reviewer = await reviewerContext.newPage();
  reviewer.setDefaultTimeout(30000);
  await login(reviewer, c, 1);
  const reviewDialog = await pdfDialog(reviewer, c);
  await reviewDialog
    .getByLabel("Catatan tindakan review/publikasi")
    .fill("PDF sintetis diperiksa oleh reviewer berbeda.");
  let reviewed = responseFor(
    reviewer,
    (r) =>
      new URL(r.url()).pathname === "/api/transcripts/" + version.id &&
      r.request().method() === "PATCH",
  );
  await reviewDialog
    .getByRole("button", { name: "Setujui versi", exact: true })
    .click();
  await checked(await reviewed);
  await reviewDialog
    .getByRole("button", { name: "Terbitkan versi", exact: true })
    .waitFor();
  await reviewDialog
    .getByLabel("Catatan tindakan review/publikasi")
    .fill("Terbitkan versi yang telah diperiksa.");
  reviewed = responseFor(
    reviewer,
    (r) =>
      new URL(r.url()).pathname === "/api/transcripts/" + version.id &&
      r.request().method() === "PATCH",
  );
  await reviewDialog
    .getByRole("button", { name: "Terbitkan versi", exact: true })
    .click();
  await checked(await reviewed);
  const published = (
    await c.query(
      "select status,reviewed_by,uploaded_by from transcript_versions where id=$1",
      [version.id],
    )
  )[0];
  assert.equal(published.status, "published");
  assert.equal(published.reviewed_by, c.users[1].id);
  assert.notEqual(published.reviewed_by, published.uploaded_by);
  await reviewDialog
    .getByRole("button", { name: "Terbitkan versi", exact: true })
    .waitFor({ state: "hidden" });
  await reviewer.screenshot({
    path: c.artifacts + "/admin-reviewed-pdf.png",
    fullPage: true,
  });
  await checked(
    await admin.request.patch(c.baseURL + "/api/lessons/" + c.lessonId, {
      data: { status: "published" },
    }),
  );
  await checked(
    await admin.request.patch(c.baseURL + "/api/programs/" + c.programId, {
      data: { status: "published" },
    }),
  );
  step(c, "public-cover-render");
  await guest.goto(c.baseURL + "/programs/" + c.programId);
  const publicCover = guest.getByAltText("Sampul " + c.title);
  await publicCover.waitFor();
  assert(
    await publicCover.evaluate(async (element) => {
      const img = element as HTMLImageElement;
      await img.decode();
      return img.naturalWidth > 0;
    }),
    "PUBLIC_COVER_NOT_LOADED",
  );
  await guest.screenshot({
    path: c.artifacts + "/public-cover.png",
    fullPage: true,
  });
  step(c, "participant-cover-and-private-pdf");
  await participant.goto(c.baseURL + "/belajar/program/" + c.programId);
  const participantCover = participant.getByAltText("Sampul " + c.title);
  await participantCover.waitFor();
  assert(
    await participantCover.evaluate(async (element) => {
      const img = element as HTMLImageElement;
      await img.decode();
      return img.naturalWidth > 0;
    }),
    "PARTICIPANT_COVER_NOT_LOADED",
  );
  assert(
    await participant.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "PARTICIPANT_PROGRAM_MOBILE_OVERFLOW",
  );
  await participant.screenshot({
    path: c.artifacts + "/participant-cover-mobile.png",
    fullPage: true,
  });
  await participant.goto(c.baseURL + "/belajar/lesson/" + c.lessonId);
  await participant
    .locator('iframe[title^="Pratinjau PDF"]')
    .waitFor({ state: "visible" });
  let nativePdfPainted = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    const frameImage = await participant
      .locator('iframe[title^="Pratinjau PDF"]')
      .screenshot();
    const stats = await sharp(frameImage).stats();
    if (stats.channels.some((channel) => channel.stdev > 10)) {
      nativePdfPainted = true;
      break;
    }
    await participant.waitForTimeout(250);
  }
  assert(nativePdfPainted, "NATIVE_PDF_VIEWER_STILL_BLANK");
  const delivered = await participant.request.get(c.baseURL + filePath);
  assert.equal(delivered.status(), 200);
  assert.equal(
    digest(await delivered.body()),
    digest(pdf),
    "PRIVATE_PDF_HASH_MISMATCH",
  );
  assert.equal(delivered.headers()["cache-control"], "private, no-store");
  const ranged = await participant.request.get(c.baseURL + filePath, {
    headers: { Range: "bytes=0-15" },
  });
  assert.equal(ranged.status(), 206);
  assert.equal((await ranged.body()).length, 16);
  assert.equal(
    (
      await participant.request.get(c.baseURL + filePath + "?download=1")
    ).status(),
    403,
  );
  assert.equal(
    (
      await participant.request.post(c.baseURL + "/api/transcripts", {
        data: pdf,
        headers: { "Content-Type": "application/pdf" },
      })
    ).status(),
    403,
  );
  assert.equal(
    await participant
      .getByRole("link", { name: "Unduh PDF", exact: true })
      .count(),
    0,
  );
  assert(
    await participant.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "PARTICIPANT_LESSON_MOBILE_OVERFLOW",
  );
  await participant.screenshot({
    path: c.artifacts + "/participant-pdf-mobile.png",
    fullPage: true,
  });
  await participant
    .getByRole("button", { name: "Perbesar pratinjau PDF" })
    .click();
  await participant.getByRole("dialog", { name: /Pratinjau penuh/ }).waitFor();
  await participant.keyboard.press("Escape");
  await participant
    .getByRole("dialog", { name: /Pratinjau penuh/ })
    .waitFor({ state: "hidden" });
  assert.notEqual(
    new URL(participant.url()).pathname,
    "/login",
    "LESSON_MUST_NOT_LOG_OUT",
  );
  await guest.goto(c.baseURL + "/lessons/" + c.lessonId);
  await guest
    .getByText("Masuk untuk membaca PDF privat", { exact: true })
    .waitFor();
  for (const base of [
    "https://sin1.contabostorage.com/lmsuahprivate",
    "https://sin1.contabostorage.com/68671c4afe7c45fba062c1c65a776541:lmsuahprivate",
  ]) {
    const response = await fetch(base + "/" + stored.blob_key, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    assert(
      [401, 403, 404].includes(response.status),
      "PRIVATE_BUCKET_BECAME_PUBLIC",
    );
    assert.notEqual(
      digest(new Uint8Array(await response.arrayBuffer())),
      digest(pdf),
    );
  }
  assert.deepEqual(pageErrors, [], "ADMIN_BROWSER_RUNTIME_ERRORS");
  step(c, "all-browser-flows-passed");
}
