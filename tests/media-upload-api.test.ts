// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@netlify/functions";
import sharp from "sharp";
import handler from "../netlify/functions/media-upload";
const state = vi.hoisted(() => ({
  roles: ["administrator"] as string[] | null,
  put: vi.fn(),
}));
vi.mock("../netlify/functions/middleware/auth.js", () => {
  class AuthError extends Error {}
  class ForbiddenError extends Error {}
  return {
    AuthError,
    ForbiddenError,
    requireAuth: async () => {
      if (!state.roles) throw new AuthError("Login diperlukan");
      return { roles: state.roles, userId: "admin-one" };
    },
    requireRole: (session: { roles: string[] }, allowed: string[]) => {
      if (!session.roles.some((role) => allowed.includes(role)))
        throw new ForbiddenError("Tidak diizinkan");
    },
  };
});
vi.mock("../netlify/functions/utils/contabo-storage.js", () => ({
  putPublicMedia: state.put,
  contaboPrivateStore: vi.fn(),
}));
vi.mock("../netlify/functions/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));
const context = {} as Context;
function request(
  body: Uint8Array | string,
  mime = "image/png",
  kind = "image",
  extra: Record<string, string> = {},
) {
  return new Request("https://example.test/api/media-upload", {
    method: "POST",
    headers: { "content-type": mime, "x-upload-kind": kind, ...extra },
    body: typeof body === "string" ? body : new Uint8Array(body).buffer,
  });
}
beforeEach(() => {
  state.roles = ["administrator"];
  state.put
    .mockReset()
    .mockImplementation(
      async (key: string) => `https://storage.example.test/${key}`,
    );
});
describe("Authenticated Contabo uploads", () => {
  it("decodes a real PNG, optimizes to WebP and stores an immutable key", async () => {
    const png = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#116655" },
    })
      .png()
      .toBuffer();
    const response = await handler(request(png), context);
    expect(response.status).toBe(200);
    expect((await response.json()).data.url).toMatch(
      /\/public\/images\/[a-f0-9-]{36}\.webp$/,
    );
    const [, bytes, mime] = state.put.mock.calls[0];
    expect(mime).toBe("image/webp");
    expect((await sharp(bytes).metadata()).format).toBe("webp");
  });
  it.each([null, ["participant"]])(
    "rejects unauthorized role %s before storage",
    async (roles) => {
      state.roles = roles;
      expect((await handler(request("x"), context)).status).toBe(
        roles ? 403 : 401,
      );
      expect(state.put).not.toHaveBeenCalled();
    },
  );
  it("rejects cross-site requests", async () => {
    expect(
      (
        await handler(
          request("x", "image/png", "image", { origin: "https://evil.test" }),
          context,
        )
      ).status,
    ).toBe(403);
    expect(state.put).not.toHaveBeenCalled();
  });
  it.each([
    ["image/svg+xml", "<svg/>"],
    ["image/png", "<!doctype html>"],
    ["image/jpeg", "%PDF-1.7"],
  ])("rejects fake/unsupported %s", async (mime, body) => {
    expect([400, 415]).toContain(
      (await handler(request(body, mime), context)).status,
    );
    expect(state.put).not.toHaveBeenCalled();
  });
  it("bounds streamed uploads without content-length", async () => {
    expect(
      (await handler(request(new Uint8Array(4 * 1024 * 1024 + 1)), context))
        .status,
    ).toBe(413);
    expect(state.put).not.toHaveBeenCalled();
  });
  it("requires explicit public-document acknowledgement", async () => {
    expect(
      (
        await handler(
          request("%PDF-1.7\nfixture", "application/pdf", "document"),
          context,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handler(
          request("%PDF-1.7\nfixture", "application/pdf", "document", {
            "x-public-confirmed": "1",
          }),
          context,
        )
      ).status,
    ).toBe(200);
    expect(state.put.mock.calls[0][0]).toMatch(/^public\/documents\/.*\.pdf$/);
  });
});
