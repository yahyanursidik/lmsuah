import { useId } from "react";
import { AppImage } from "./AppImage";
import { normalizeImageSource } from "@/lib/image-source";

export function ImageUrlField({
  value,
  onChange,
  label = "URL foto (opsional)",
  fallbackSrc,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  fallbackSrc?: string;
}) {
  const id = useId();
  const invalid = !!value.trim() && !normalizeImageSource(value);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="url"
        value={value}
        maxLength={2048}
        aria-invalid={invalid}
        aria-describedby={`${id}-hint${invalid ? ` ${id}-error` : ""}`}
        onChange={(event) => {
          const next = event.target.value;
          event.target.setCustomValidity(
            next.trim() && !normalizeImageSource(next)
              ? "Gunakan URL HTTP/HTTPS atau jalur gambar lokal."
              : "",
          );
          onChange(next);
        }}
        placeholder="https://contoh.com/foto.jpg atau /foto.jpg"
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
      />
      <p id={`${id}-hint`} className="text-xs leading-5 text-slate-500">
        Gunakan tautan langsung ke gambar, bukan halaman berbagi. HTTPS
        disarankan. Kosongkan untuk menghapus foto khusus.
      </p>
      {invalid && (
        <p id={`${id}-error`} role="alert" className="text-sm text-rose-700">
          URL gambar tidak valid. Gunakan HTTP/HTTPS atau jalur lokal.
        </p>
      )}
      {(value.trim() || fallbackSrc) && (
        <figure className="space-y-1">
          <div className="h-40 overflow-hidden rounded-lg border border-stone-200">
            <AppImage
              src={value.trim() ? value : fallbackSrc}
              alt="Pratinjau foto"
              loading="eager"
              className="h-full w-full object-contain"
            />
          </div>
          <figcaption className="text-xs text-slate-500">
            {value.trim()
              ? "Pratinjau tautan foto. Jika gagal, periksa URL dan izin akses gambar."
              : "Foto bawaan lokasi. Anda dapat menggantinya dengan URL foto khusus."}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
