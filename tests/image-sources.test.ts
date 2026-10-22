import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeImageSource,
  getVenueFallbackImage,
  PORTAL_LOGO,
} from "../shared/image-source";
import { imageSourceSchema } from "../netlify/functions/utils/image-validation";

describe("Shared image sources and bundled assets", () => {
  it.each([
    ["/masjid-al-ukhuwah.jpg", "/masjid-ukhuwah.jpg"],
    ["  ./masjid-umar-bin-khattab.jpg  ", "/masjid-umar.jpg"],
    ["photos/majelis.jpg", "/photos/majelis.jpg"],
    ["/photos/a b.jpg", "/photos/a%20b.jpg"],
    [
      "https://cdn.example.test/foto.jpg?signature=keep&width=800",
      "https://cdn.example.test/foto.jpg?signature=keep&width=800",
    ],
  ])("normalizes %s without losing signed queries", (source, expected) => {
    expect(normalizeImageSource(source)).toBe(expected);
  });
  it.each([
    undefined,
    null,
    "",
    "  ",
    "javascript:alert(1)",
    "data:image/svg+xml,bad",
    "file:///C:/foto.jpg",
    "blob:https://example.test/id",
    "//example.test/foto.jpg",
    "https://user:secret@example.test/foto.jpg",
    "C:\\foto.jpg",
    "https://",
    "/photo\n.jpg",
  ])("does not request unsafe/empty source %s", (source) => {
    expect(normalizeImageSource(source)).toBeUndefined();
  });
  it("recognizes both Ukhuwah spellings and uses no unrelated mosque image", () => {
    for (const name of [
      "Masjid Al-Ukhuwah Bandung",
      "Masjid Agung Al Ukhuwwah",
    ])
      expect(getVenueFallbackImage({ name })).toBe("/masjid-ukhuwah.jpg");
    expect(getVenueFallbackImage({ slug: "masjid-umar-bin-khattab" })).toBe(
      "/masjid-umar.jpg",
    );
    expect(getVenueFallbackImage({ name: "Masjid PUSDAI" })).toBeUndefined();
  });
  it("ships valid JPEG bytes for all built-in/legacy fallback destinations", () => {
    const assets = [
      PORTAL_LOGO,
      "/masjid-ukhuwah.jpg",
      "/masjid-umar.jpg",
      normalizeImageSource("/masjid-al-ukhuwah.jpg")!,
      normalizeImageSource("/masjid-umar-bin-khattab.jpg")!,
    ];
    for (const source of assets) {
      const bytes = readFileSync(join(process.cwd(), "public", source));
      expect(bytes.subarray(0, 3).toString("hex")).toBe("ffd8ff");
      expect(bytes.subarray(-2).toString("hex")).toBe("ffd9");
    }
  });
  it("routes every application image through the failure-safe component", () => {
    const visit = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? visit(join(directory, entry.name))
          : [join(directory, entry.name)],
      );
    const rawImages = visit(join(process.cwd(), "src")).filter(
      (path) =>
        path.endsWith(".tsx") && /<img\b/.test(readFileSync(path, "utf8")),
    );
    expect(
      rawImages.map((path) => path.replaceAll("\\", "/").split("/src/")[1]),
    ).toEqual(["components/ui/AppImage.tsx"]);
  });
  it("validates optional URLs, allows clearing, and canonicalizes legacy assets at the API boundary", () => {
    expect(imageSourceSchema.optional().parse(undefined)).toBeUndefined();
    expect(imageSourceSchema.parse("  ")).toBe("");
    expect(imageSourceSchema.parse(" /masjid-al-ukhuwah.jpg ")).toBe(
      "/masjid-ukhuwah.jpg",
    );
    expect(imageSourceSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
    expect(
      imageSourceSchema.safeParse("https://user:secret@example.test/a.jpg")
        .success,
    ).toBe(false);
    expect(imageSourceSchema.safeParse("a".repeat(2049)).success).toBe(false);
  });
});
