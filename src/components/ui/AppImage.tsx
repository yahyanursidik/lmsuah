import { useState, type ImgHTMLAttributes } from "react";
import { BookOpen, ImageOff, MapPin, UserRound } from "lucide-react";
import { normalizeImageSource } from "@/lib/image-source";
import { cn } from "@/lib/utils";
import "./app-image.css";

type ImageKind = "image" | "program" | "venue" | "avatar" | "brand";
type AppImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "alt"
> & {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  kind?: ImageKind;
};

export function AppImage({ src, fallbackSrc, ...props }: AppImageProps) {
  const candidates = [
    ...new Set(
      [normalizeImageSource(src), normalizeImageSource(fallbackSrc)].filter(
        (value): value is string => !!value,
      ),
    ),
  ];
  // Reset failures when the actual source changes, including after editing or switching accounts.
  return (
    <ImageContent
      key={JSON.stringify(candidates)}
      candidates={candidates}
      {...props}
    />
  );
}

function ImageContent({
  candidates,
  kind = "image",
  alt,
  className,
  width,
  height,
  style,
  loading = "lazy",
  decoding = "async",
  onError,
  onLoad,
  ...props
}: Omit<AppImageProps, "src" | "fallbackSrc"> & { candidates: string[] }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const source = candidates[index];
  if (!source) {
    const Icon =
      kind === "program"
        ? BookOpen
        : kind === "venue"
          ? MapPin
          : kind === "avatar" || kind === "brand"
            ? UserRound
            : ImageOff;
    const compact = kind === "avatar" || kind === "brand";
    const message = candidates.length
      ? "Gambar tidak dapat dimuat"
      : "Gambar belum tersedia";
    return (
      <span
        id={props.id}
        role={alt ? "img" : undefined}
        aria-label={alt ? `${alt} — ${message}` : undefined}
        aria-hidden={alt ? undefined : true}
        title={message}
        data-image-state="unavailable"
        className={cn("app-image-placeholder", className)}
        style={{
          width:
            typeof width === "string" && /^\d+$/.test(width)
              ? Number(width)
              : width,
          height:
            typeof height === "string" && /^\d+$/.test(height)
              ? Number(height)
              : height,
          ...style,
        }}
      >
        <Icon size={compact ? 22 : 32} aria-hidden="true" />
        {!compact && <span className="app-image-message">{message}</span>}
      </span>
    );
  }
  return (
    <img
      {...props}
      key={source}
      src={source}
      alt={alt}
      width={width}
      height={height}
      style={style}
      loading={loading}
      decoding={decoding}
      className={className}
      data-image-state={loaded ? "loaded" : "loading"}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      onError={(event) => {
        setIndex((current) => current + 1);
        setLoaded(false);
        onError?.(event);
      }}
    />
  );
}
