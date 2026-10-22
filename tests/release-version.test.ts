// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { Context } from "@netlify/functions";
vi.mock("../netlify/functions/utils/db.js", () => ({
  db: { execute: vi.fn(async () => undefined) },
}));
import health from "../netlify/functions/health";
describe("Release version consistency", () => {
  it("keeps API health, package and lock versions consistent", async () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    const response = await health(
      new Request("http://localhost/api/health"),
      {} as Context,
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.version).toBe(pkg.version);
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[""].version).toBe(pkg.version);
  });
});
