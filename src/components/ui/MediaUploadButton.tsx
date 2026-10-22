import { useEffect, useId, useRef, useState } from "react";
import { notifyUpload as notify } from "@/lib/media-upload-state";
import { fetchWrapper } from "@/providers/dataProvider";
import { getErrorMessage } from "@/lib/error-message";
import {
  MAX_MEDIA_BYTES,
  IMAGE_MIME_TYPES,
  type UploadKind,
} from "../../../shared/media-upload";

export function MediaUploadButton({
  onUploaded,
  kind = "image",
  disabled = false,
}: {
  onUploaded: (url: string) => void;
  kind?: UploadKind;
  disabled?: boolean;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [publicConfirmed, setPublicConfirmed] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  const upload = async (file?: File) => {
    if (!file || busy || disabled) return;
    setError("");
    if (!file.size || file.size > MAX_MEDIA_BYTES) {
      setError("Berkas harus berisi data dan maksimal 4 MB.");
      return;
    }
    if (
      kind === "image"
        ? !IMAGE_MIME_TYPES.includes(
            file.type as (typeof IMAGE_MIME_TYPES)[number],
          )
        : file.type !== "application/pdf"
    ) {
      setError(
        kind === "image"
          ? "Pilih foto JPG, PNG, atau WebP."
          : "Pilih dokumen PDF.",
      );
      return;
    }
    if (kind === "document" && !publicConfirmed) {
      setError("Konfirmasikan bahwa PDF ini boleh diakses publik.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    notify(1);
    try {
      const response = await fetchWrapper(
        `${import.meta.env.VITE_API_URL || ""}/api/media-upload`,
        {
          method: "POST",
          body: file,
          signal: controller.signal,
          headers: {
            "Content-Type": file.type,
            "X-Upload-Kind": kind,
            ...(kind === "document" ? { "X-Public-Confirmed": "1" } : {}),
          },
        },
      );
      const result = await response.json();
      if (!result.data?.url || typeof result.data.url !== "string")
        throw new Error("Server tidak mengembalikan tautan berkas.");
      if (!controller.signal.aborted) onUploaded(result.data.url);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          getErrorMessage(
            failure,
            "Unggah gagal. Pilih kembali berkas untuk mencoba lagi; gambar sebelumnya tidak diubah.",
          ),
        );
    } finally {
      notify(-1);
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      {kind === "document" && (
        <label className="flex min-h-11 items-center gap-2 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={publicConfirmed}
            disabled={busy || disabled}
            onChange={(event) => setPublicConfirmed(event.target.checked)}
          />
          PDF ini boleh diakses publik. Bukan dokumen privat.
        </label>
      )}
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-800"
      >
        {kind === "image"
          ? "Unggah foto dari perangkat"
          : "Unggah PDF publik dari perangkat"}
      </label>
      <input
        id={id}
        type="file"
        accept={
          kind === "image"
            ? "image/jpeg,image/png,image/webp"
            : "application/pdf"
        }
        disabled={busy || disabled || (kind === "document" && !publicConfirmed)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void upload(file);
        }}
        className="min-h-11 w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-900 disabled:opacity-50"
      />
      <p className="text-xs text-slate-500">
        Maksimal 4 MB.{" "}
        {kind === "image"
          ? "Foto dioptimalkan otomatis menjadi WebP; foto publik tidak menyimpan metadata GPS."
          : "Gunakan pengelola PDF privat untuk dokumen terbatas."}{" "}
        Setelah unggah selesai, simpan form untuk menerapkan berkas.
      </p>
      {busy && (
        <p role="status" className="text-sm font-semibold text-emerald-800">
          Mengunggah ke Contabo… Tunggu hingga selesai sebelum menyimpan.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
