/* Hallmark · genre: modern-minimal · design-system: design.md · component: private PDF workspace */
import { useRef, useState } from "react";
import { useGetIdentity, useList, useOne, useUpdate } from "@refinedev/core";
import { useDialog } from "../../components/ui/useDialog";
import { ErrorAlert } from "../../components/public/UIStates";
import { fetchWrapper } from "../../providers/dataProvider";

interface Version {
  id: string;
  documentId: string;
  title: string;
  version: number;
  filename: string;
  sizeBytes: number;
  status: string;
  uploadedBy: string | null;
  reviewNote?: string;
  history?: Array<{ action: string; note: string; actorName: string | null; createdAt: string }>;
  viewUrl: string;
  downloadUrl: string | null;
}
const button =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50";
const control =
  "mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900";
const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu review",
  approved: "Disetujui",
  published: "Terbit",
  revision_requested: "Perlu revisi",
  archived: "Arsip",
};

export function AdminTranscriptDialog({
  lessonId,
  onClose,
  onChanged,
}: {
  lessonId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const capabilities = useOne<{
    id: string;
    privatePdf: boolean;
    maxPdfBytes: number;
  }>({ resource: "program-capabilities", id: "general" });
  const versions = useList<Version>({
    resource: "transcripts",
    filters: [{ field: "lessonId", operator: "eq", value: lessonId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: capabilities.result?.privatePdf === true },
  });
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { mutate: update, mutation } = useUpdate();
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState("");
  const [title, setTitle] = useState("");
  const [downloadable, setDownloadable] = useState(false);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = uploading || mutation.isPending;
  const dialog = useDialog({
    onClose,
    pending,
    dirty: Boolean(file || note.trim()),
  });
  const records = versions.result.data || [];
  const documents = [
    ...new Map(
      records.map((version) => [version.documentId, version.title]),
    ).entries(),
  ];
  const fail = (cause: unknown) =>
    setFeedback({
      error: true,
      message:
        cause && typeof cause === "object" && "message" in cause
          ? String(cause.message)
          : "Operasi PDF belum berhasil. Coba lagi.",
    });
  const refresh = () => {
    void versions.query.refetch();
    onChanged();
  };
  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || pending) return;
    if (file.size > (capabilities.result?.maxPdfBytes || 4194304)) {
      setFeedback({
        error: true,
        message: "PDF maksimal 4 MB untuk jalur unggah melalui Functions ini.",
      });
      return;
    }
    setUploading(true);
    setFeedback(null);
    try {
      await fetchWrapper("/api/transcripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
          "X-LMS-Lesson-Id": lessonId,
          "X-LMS-Filename": encodeURIComponent(file.name),
          "X-LMS-Title": encodeURIComponent(title),
          "X-LMS-Downloadable": String(downloadable),
          ...(documentId ? { "X-LMS-Document-Id": documentId } : {}),
        },
        body: file,
      });
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setFeedback({
        error: false,
        message:
          "Versi PDF tersimpan sebagai draft. Ajukan review sebelum diterbitkan. Versi lama tidak ditimpa.",
      });
      refresh();
    } catch (cause) {
      fail(cause);
    } finally {
      setUploading(false);
    }
  };
  const act = (version: Version, action: string) => {
    if (pending) return;
    if (note.trim().length < 3) {
      setFeedback({
        error: true,
        message: "Isi catatan tindakan minimal tiga karakter.",
      });
      return;
    }
    update(
      {
        resource: "transcripts",
        id: version.id,
        values: { action, note: note.trim() },
      },
      {
        onSuccess: () => {
          setNote("");
          setFeedback({
            error: false,
            message:
              "Status versi PDF diperbarui. Riwayat dan versi lama dipertahankan.",
          });
          refresh();
        },
        onError: fail,
      },
    );
  };
  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-white/85 sm:items-center sm:p-4">
      <div
        ref={dialog.ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="private-pdf-title"
        className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl border border-slate-300 bg-white p-5 shadow-xl sm:max-w-4xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="private-pdf-title" className="text-lg font-bold">
              PDF privat & versi transkrip
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Unggah → draft → review oleh orang lain → publikasi. Berkas hanya
              dikirim melalui endpoint bersesi.
            </p>
          </div>
          <button
            className={button}
            disabled={pending}
            onClick={dialog.close}
            aria-label="Tutup pengelolaan PDF"
          >
            Tutup
          </button>
        </header>
        {capabilities.query.isLoading ? (
          <p role="status" className="mt-5">
            Memeriksa konfigurasi PDF privat…
          </p>
        ) : capabilities.query.isError ? (
          <ErrorAlert
            message="Konfigurasi PDF belum dapat diperiksa."
            onRetry={() => capabilities.query.refetch()}
          />
        ) : !capabilities.result?.privatePdf ? (
          <section className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <h3 className="font-bold">Belum diaktifkan pada database ini</h3>
            <p>
              PDF privat belum aktif pada lingkungan ini. Pastikan migrasi yang
              disetujui sudah diterapkan, penyimpanan Netlify Blobs privat atau
              bucket Contabo privat sudah dikonfigurasi, dan izin pengguna sudah
              ditinjau sebelum mengaktifkan LMS_PRIVATE_PDF_ENABLED di server.
              Pembaca memerlukan izin transcript.read. Tombol ini tidak
              menjalankan migrasi atau mengubah izin pengguna.
            </p>
            <p className="mt-2">
              Sumber PDF eksternal tetap dapat dikelola melalui Tambah materi.
            </p>
          </section>
        ) : (
          <div className="mt-5 space-y-5">
            {feedback && (
              <p
                role={feedback.error ? "alert" : "status"}
                className={`rounded-lg border p-3 text-sm ${feedback.error ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
              >
                {feedback.message}
              </p>
            )}
            {versions.query.isError ? (
              <ErrorAlert
                message="Daftar versi gagal dimuat. Periksa akses transcript.read atau coba lagi."
                onRetry={() => versions.query.refetch()}
              />
            ) : (
              <>
                <form
                  onSubmit={upload}
                  className="space-y-4 rounded-xl border border-slate-200 p-4"
                >
                  <fieldset
                    disabled={pending || versions.query.isLoading}
                    className="contents"
                  >
                    <h3 className="font-bold">
                      Unggah versi baru · maksimal 4 MB
                    </h3>
                    <label className="block text-sm font-semibold">
                      Dokumen
                      <select
                        className={control}
                        value={documentId}
                        onChange={(event) => setDocumentId(event.target.value)}
                      >
                        <option value="">Buat dokumen baru</option>
                        {documents.map(([id, title]) => (
                          <option key={id} value={id}>
                            Versi baru: {title}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!documentId && (
                      <label className="block text-sm font-semibold">
                        Judul dokumen
                        <input
                          required
                          maxLength={180}
                          className={control}
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                        />
                      </label>
                    )}
                    <label className="block text-sm font-semibold">
                      Berkas PDF *
                      <input
                        ref={fileInput}
                        required
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) =>
                          setFile(event.target.files?.[0] || null)
                        }
                        className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </label>
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={downloadable}
                        onChange={(event) =>
                          setDownloadable(event.target.checked)
                        }
                      />
                      Izinkan tombol unduh versi ini (tetap mengikuti Pengaturan
                      Sistem)
                    </label>
                    <button
                      type="submit"
                      className={button}
                      disabled={pending || !file}
                    >
                      {uploading ? "Mengunggah…" : "Unggah sebagai draft"}
                    </button>
                  </fieldset>
                </form>
                <label className="block text-sm font-semibold">
                  Catatan tindakan review/publikasi
                  <textarea
                    rows={2}
                    maxLength={2000}
                    className={`${control} py-2`}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Jelaskan hasil pemeriksaan atau alasan perubahan status…"
                  />
                </label>
                <section aria-label="Daftar versi PDF" className="space-y-3">
                  {records.map((version) => (
                    <article
                      key={version.id}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <h3 className="break-words font-semibold">
                        {version.title} · versi {version.version}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {version.filename} ·{" "}
                        {Math.ceil(version.sizeBytes / 1024)} KB ·{" "}
                        {statusLabels[version.status] || version.status}
                      </p>
                      {version.reviewNote && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          Catatan: {version.reviewNote}
                        </p>
                      )}
                      {Boolean(version.history?.length) && <details className="mt-2 border-t border-slate-200 pt-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Riwayat tindakan ({version.history?.length})</summary><ol className="space-y-3 pb-3">{version.history?.map((event, index) => <li key={`${event.createdAt}-${index}`} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">{event.actorName || 'Akun tim'} · {event.action} · {new Date(event.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p><p className="mt-1 whitespace-pre-wrap leading-5">{event.note}</p></li>)}</ol></details>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          className={button}
                          href={version.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Pratinjau PDF
                        </a>
                        {["draft", "revision_requested"].includes(
                          version.status,
                        ) && (
                          <button
                            className={button}
                            disabled={pending}
                            onClick={() => act(version, "submit")}
                          >
                            Ajukan review
                          </button>
                        )}
                        {version.status === "submitted" && (
                          <>
                            <button
                              className={button}
                              disabled={
                                pending || version.uploadedBy === identity?.id
                              }
                              onClick={() => act(version, "approve")}
                            >
                              Setujui versi
                            </button>
                            <button
                              className={button}
                              disabled={pending}
                              onClick={() => act(version, "request_revision")}
                            >
                              Minta revisi
                            </button>
                          </>
                        )}
                        {version.status === "approved" && (
                          <button
                            className={button}
                            disabled={pending}
                            onClick={() => act(version, "publish")}
                          >
                            Terbitkan versi
                          </button>
                        )}
                        {version.status !== "archived" && (
                          <button
                            className={button}
                            disabled={pending}
                            onClick={() => act(version, "archive")}
                          >
                            Arsipkan
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                  {records.length === 0 && (
                    <p className="text-sm text-slate-600">
                      Belum ada PDF privat untuk pertemuan ini.
                    </p>
                  )}
                </section>
              </>
            )}
            <p className="text-xs leading-5 text-slate-600">
              Batas 4 MB mengikuti jalur unggah sinkron Functions. Pembatasan
              tombol unduh bukan DRM; berkas yang sudah dikirim ke browser tidak
              dapat dijamin mustahil disalin. Izin setiap tindakan tetap
              diperiksa server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
