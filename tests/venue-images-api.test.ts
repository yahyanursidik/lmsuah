import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@netlify/functions";
import handler from "../netlify/functions/venues";

const state = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn() }));
vi.mock("../netlify/functions/utils/db.js", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [{ id: "venue-1" }] }),
      }),
    }),
    insert: () => ({
      values: (value: object) => {
        state.insert(value);
        return { returning: async () => [{ id: "venue-1", ...value }] };
      },
    }),
    update: () => ({
      set: (value: object) => {
        state.update(value);
        return {
          where: () => ({
            returning: async () => [{ id: "venue-1", ...value }],
          }),
        };
      },
    }),
  },
}));
vi.mock("../netlify/functions/utils/contentHelper.js", () => ({
  getOptionalAuth: async () => ({
    userId: "admin-one",
    roles: ["administrator"],
  }),
  requireContentCreateAccess: () => ({ userId: "admin-one" }),
  requireContentUpdateAccess: () => ({ userId: "admin-one" }),
  requireContentDeleteAccess: vi.fn(),
  logMutationAudit: vi.fn(),
  isGuest: () => false,
  parseQueryParams: vi.fn(),
}));
vi.mock("../netlify/functions/utils/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));
beforeEach(() => {
  state.insert.mockClear();
  state.update.mockClear();
});
const context = {} as Context;
const request = (method: string, image?: string) =>
  new Request("https://example.test/api/venues/venue-1", {
    method,
    body: JSON.stringify(
      method === "POST"
        ? {
            slug: "majelis",
            name: "Majelis",
            address: "Jl. Majelis",
            city: "Bandung",
            image,
          }
        : { image },
    ),
  });
describe("Location image persistence without schema migrations", () => {
  it.each(["POST", "PATCH"])(
    "validates and normalizes the existing image field in %s",
    async (method) => {
      expect(
        (
          await handler(
            request(method, " /masjid-umar-bin-khattab.jpg "),
            context,
          )
        ).status,
      ).toBe(200);
      expect(
        method === "POST" ? state.insert : state.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ image: "/masjid-umar.jpg" }),
      );
    },
  );
  it("allows clearing a custom photo without replacing it with another mosque", async () => {
    expect((await handler(request("PATCH", ""), context)).status).toBe(200);
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({ image: "" }),
    );
  });
  it("preserves the image on an unrelated partial update", async () => {
    expect((await handler(request("PATCH"), context)).status).toBe(200);
    expect(state.update.mock.calls[0][0]).not.toHaveProperty("image");
  });
  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml,bad",
    "https://user:secret@example.test/foto.jpg",
  ])("rejects unsafe URL %s without a write", async (image) => {
    expect((await handler(request("POST", image), context)).status).toBe(400);
    expect(state.insert).not.toHaveBeenCalled();
  });
});
