// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contaboPrivateStore,
  privateContaboConfig,
} from "../netlify/functions/utils/contabo-private";
import {
  privateTranscriptKey,
  privateTranscriptStore,
} from "../netlify/functions/utils/pdf-files";
const state = vi.hoisted(() => ({
  send: vi.fn(),
  destroy: vi.fn(),
  blobs: vi.fn(),
}));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = state.send;
    destroy = state.destroy;
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  GetObjectCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock("@netlify/blobs", () => ({ getStore: state.blobs }));
const id = "12345678-1234-4234-8234-123456789012";
const path = `transcripts/${id}/${id}/${id}/${id}.pdf`;
const key = "contabo-private-v1/" + path;
const bytes = new TextEncoder().encode("%PDF-1.7\nfixture\n%%EOF");
beforeEach(() => {
  vi.stubEnv("CONTABO_ACCESS_KEY_ID", "test-access");
  vi.stubEnv("CONTABO_SECRET_ACCESS_KEY", "test-secret");
  vi.stubEnv("CONTABO_BUCKET", "lmsuah");
  vi.stubEnv("CONTABO_ENDPOINT", "https://sin1.contabostorage.com");
  vi.stubEnv("CONTABO_PRIVATE_BUCKET", "");
  vi.stubEnv("CONTABO_PRIVATE_ENDPOINT", "");
  vi.stubEnv("LMS_PRIVATE_PDF_STORAGE", "netlify");
  state.send.mockReset().mockResolvedValue({});
  state.blobs.mockReset().mockReturnValue({ get: vi.fn() });
  state.destroy.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Separate private Contabo bucket", () => {
  it("normalizes the supplied URL and never routes to the public bucket", () => {
    vi.stubEnv(
      "CONTABO_PRIVATE_ENDPOINT",
      "https://sin1.contabostorage.com/lmsuahprivate",
    );
    expect(privateContaboConfig()).toMatchObject({
      bucket: "lmsuahprivate",
      endpoint: "https://sin1.contabostorage.com",
    });
    vi.stubEnv("CONTABO_PRIVATE_BUCKET", "lmsuah");
    expect(() => privateContaboConfig()).toThrow(/wajib memakai bucket/);
    expect(state.send).not.toHaveBeenCalled();
  });
  it.each([
    "https://user:password@sin1.contabostorage.com",
    "https://sin1.contabostorage.com?token=x",
    "http://sin1.contabostorage.com",
    "https://example.test",
    "https://sin1.contabostorage.com/other",
  ])("rejects unsafe or unverified endpoint %s", (endpoint) => {
    vi.stubEnv("CONTABO_PRIVATE_ENDPOINT", endpoint);
    expect(() => privateContaboConfig()).toThrow();
  });
  it("selects new private keys explicitly and preserves old Netlify routing", () => {
    expect(privateTranscriptKey(path)).toBe(path);
    privateTranscriptStore(path);
    expect(state.blobs).toHaveBeenCalledOnce();
    vi.stubEnv("LMS_PRIVATE_PDF_STORAGE", "contabo");
    expect(privateTranscriptKey(path)).toBe(key);
    privateTranscriptStore(key);
    expect(state.blobs).toHaveBeenCalledOnce();
    expect(() => privateTranscriptStore("contabo/private/" + path)).toThrow(
      /bersifat publik/,
    );
    vi.stubEnv("LMS_PRIVATE_PDF_STORAGE", "typo");
    expect(() => privateTranscriptKey(path)).toThrow(/Penyedia/);
  });
  it("uses private ACL and atomic create-only writes, without returning a public URL", async () => {
    expect(
      await contaboPrivateStore().set(key, bytes.buffer, { onlyIfNew: true }),
    ).toEqual({ modified: true });
    expect(state.send.mock.calls[0][0].input).toMatchObject({
      Bucket: "lmsuahprivate",
      Key: key,
      ACL: "private",
      IfNoneMatch: "*",
      CacheControl: "private, no-store",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not overwrite existing versions or delete them on conflict", async () => {
    state.send.mockRejectedValue({ $metadata: { httpStatusCode: 412 } });
    expect(
      await contaboPrivateStore().set(key, bytes.buffer, { onlyIfNew: true }),
    ).toEqual({ modified: false });
    expect(state.send).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([200, 302, 500])(
    "blocks unexpected anonymous status %s and deletes only its new object",
    async (status) => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status }));
      await expect(
        contaboPrivateStore().set(key, bytes.buffer, { onlyIfNew: true }),
      ).rejects.toMatchObject({ code: "PRIVATE_STORAGE_PUBLIC_ACCESS" });
      expect(state.send).toHaveBeenCalledTimes(2);
      expect(state.send.mock.calls[1][0].input).toEqual({
        Bucket: "lmsuahprivate",
        Key: key,
      });
    },
  );
  it("fails closed and cleans its new object when privacy verification times out", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network secret details"));
    await expect(
      contaboPrivateStore().set(key, bytes.buffer, { onlyIfNew: true }),
    ).rejects.toMatchObject({ code: "PRIVATE_STORAGE_UPLOAD_FAILED" });
    expect(state.send).toHaveBeenCalledTimes(2);
  });
  it("reports cleanup failure instead of claiming the new object was removed", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    state.send
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("no permission"));
    await expect(
      contaboPrivateStore().set(key, bytes.buffer, { onlyIfNew: true }),
    ).rejects.toMatchObject({ code: "PRIVATE_STORAGE_CLEANUP_REQUIRED" });
  });
  it("rejects traversal, public keys and writes without create-only protection before sending", async () => {
    await expect(
      contaboPrivateStore().set("../x.pdf", bytes.buffer, { onlyIfNew: true }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      contaboPrivateStore().get("public/documents/file.pdf"),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      contaboPrivateStore().set(key, bytes.buffer, {}),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(state.send).not.toHaveBeenCalled();
  });
  it("reads bounded bytes from the private bucket and preserves not-found semantics", async () => {
    state.send.mockResolvedValueOnce({
      Body: { transformToWebStream: () => new Blob([bytes]).stream() },
    });
    expect(new Uint8Array((await contaboPrivateStore().get(key))!)).toEqual(
      bytes,
    );
    expect(state.send.mock.calls[0][0].input).toEqual({
      Bucket: "lmsuahprivate",
      Key: key,
    });
    state.send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } });
    expect(await contaboPrivateStore().get(key)).toBeNull();
  });
  it("bounds stored PDF reads and sanitizes storage errors", async () => {
    state.send.mockResolvedValueOnce({
      Body: {
        transformToWebStream: () =>
          new Blob([new Uint8Array(4 * 1024 * 1024 + 1)]).stream(),
      },
    });
    await expect(contaboPrivateStore().get(key)).rejects.toMatchObject({
      code: "FILE_INTEGRITY_ERROR",
    });
    state.send.mockRejectedValueOnce(new Error("secret SDK details"));
    await expect(contaboPrivateStore().get(key)).rejects.toMatchObject({
      code: "PRIVATE_STORAGE_READ_FAILED",
    });
  });
});
