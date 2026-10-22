/** Legacy asset names must resolve identically from public and nested portal routes. */
const ASSET_ALIASES: Record<string, string> = {
  "/masjid-al-ukhuwah.jpg": "/masjid-ukhuwah.jpg",
  "/masjid-umar-bin-khattab.jpg": "/masjid-umar.jpg",
};

export const PORTAL_LOGO = "/logo-abu-haidar.jpg";

/** Never request script/file/data URLs or send credentials embedded in an image URL. */
export function normalizeImageSource(
  value?: string | null,
): string | undefined {
  const source = value?.trim();
  if (
    !source ||
    source.includes("\\") ||
    [...source].some(
      (char) => char.charCodeAt(0) <= 31 || char.charCodeAt(0) === 127,
    ) ||
    source.startsWith("//")
  )
    return;
  try {
    if (/^https?:\/\//i.test(source)) {
      const url = new URL(source);
      if (url.username || url.password) return;
      return url.href;
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(source) || /^[?#]/.test(source)) return;
    const url = new URL(
      source.startsWith("/") ? source : `/${source.replace(/^\.\//, "")}`,
      "https://local.invalid",
    );
    return `${ASSET_ALIASES[url.pathname] || url.pathname}${url.search}${url.hash}`;
  } catch {
    return;
  }
}

/** Do not present another mosque's photo as the actual location. */
export function getVenueFallbackImage(venue: {
  id?: string;
  name?: string;
  slug?: string;
}): string | undefined {
  const identity = [venue.id, venue.name, venue.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\bukhuww?ah\b/.test(identity)) return "/masjid-ukhuwah.jpg";
  if (/\bumar[\s-]+bin[\s-]+khatt?ab\b/.test(identity))
    return "/masjid-umar.jpg";
  return undefined;
}
