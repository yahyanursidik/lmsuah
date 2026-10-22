// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contaboConfig,
  putPublicMedia,
} from "../netlify/functions/utils/contabo-storage";
import { privateTranscriptStore } from "../netlify/functions/utils/pdf-files";
const state = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = state.send;
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
beforeEach(() => {
  state.send.mockReset().mockResolvedValue({});
  vi.stubEnv("CONTABO_ACCESS_KEY_ID", "test-access");
  vi.stubEnv("CONTABO_SECRET_ACCESS_KEY", "test-secret");
  vi.stubEnv("CONTABO_PRIVATE_PREFIX_VERIFIED", "false");
});
afterEach(() => vi.unstubAllEnvs());
describe("Contabo bucket access", () => {
  it("normalizes the supplied bucket URL without duplicating the bucket path", () => {
    vi.stubEnv("CONTABO_ENDPOINT", "https://sin1.contabostorage.com/lmsuah");
    expect(contaboConfig().endpoint).toBe("https://sin1.contabostorage.com");
  });
  it("rejects credentials or signed queries in URLs instead of exposing them to the browser", () => {
    vi.stubEnv(
      "CONTABO_PUBLIC_URL",
      "https://example.test/file?token=not-a-real-secret",
    );
    expect(() => contaboConfig()).toThrow(/URL Contabo tidak valid/);
    vi.stubEnv("CONTABO_PUBLIC_URL", "https://user:password@example.test");
    expect(() => contaboConfig()).toThrow(/URL Contabo tidak valid/);
  });
  it("supports existing Netlify S3 variables without mixing credential families", () => {
    vi.stubEnv("CONTABO_ACCESS_KEY_ID", "");
    vi.stubEnv("CONTABO_SECRET_ACCESS_KEY", "");
    vi.stubEnv("S3_ACCESS_KEY_ID", "s3-test-access");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "s3-test-secret");
    vi.stubEnv("S3_BUCKET", "lmsuah");
    vi.stubEnv("S3_ENDPOINT", "https://sin1.contabostorage.com");
    vi.stubEnv("S3_REGION", "SIN");
    expect(contaboConfig()).toMatchObject({
      accessKeyId: "s3-test-access",
      secretAccessKey: "s3-test-secret",
      region: "us-east-1",
      bucket: "lmsuah",
    });
    vi.stubEnv("CONTABO_ACCESS_KEY_ID", "partial-other-account");
    expect(() => contaboConfig()).toThrow(/belum dikonfigurasi/);
  });
  it("uses the supplied SIN endpoint, bucket and tenant public URL", () => {
    const config = contaboConfig();
    expect(config.endpoint).toBe("https://sin1.contabostorage.com");
    expect(config.bucket).toBe("lmsuah");
    expect(config.publicUrl).toContain(
      "68671c4afe7c45fba062c1c65a776541:lmsuah",
    );
  });
  it("never sends credentials/private keys in public media URLs", async () => {
    const key = "public/images/12345678-1234-4234-8234-123456789012.webp";
    const url = await putPublicMedia(key, new Uint8Array([1]), "image/webp");
    expect(url).not.toContain("test-secret");
    expect(url).not.toContain("test-access");
    expect(state.send.mock.calls[0][0].input).toMatchObject({
      Bucket: "lmsuah",
      Key: key,
      ACL: "public-read",
      ContentType: "image/webp",
    });
    await expect(
      putPublicMedia(
        "private/documents/x.pdf",
        new Uint8Array([1]),
        "application/pdf",
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
  it("fails clearly when server credentials are absent", () => {
    vi.stubEnv("CONTABO_ACCESS_KEY_ID", "");
    expect(() => contaboConfig()).toThrow(/belum dikonfigurasi/);
    expect(state.send).not.toHaveBeenCalled();
  });
  it("blocks private Contabo writes before reaching storage", () => {
    expect(() =>
      privateTranscriptStore("contabo/private/transcripts/fixture.pdf"),
    ).toThrow(/Contabo diblokir/);
    expect(state.send).not.toHaveBeenCalled();
  });
  it("cannot bypass the public bucket block by setting a verification flag", () => {
    vi.stubEnv("CONTABO_PRIVATE_PREFIX_VERIFIED", "true");
    vi.stubEnv("LMS_PRIVATE_PDF_STORAGE", "contabo");
    expect(() =>
      privateTranscriptStore("contabo/private/transcripts/fixture.pdf"),
    ).toThrow(/bersifat publik/);
    expect(state.send).not.toHaveBeenCalled();
  });
});
