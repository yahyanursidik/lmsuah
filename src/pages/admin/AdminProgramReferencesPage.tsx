/* Hallmark · genre: modern-minimal · macrostructure: Reference workbench · design-system: design.md · designed-as-app */
import { useState } from "react";
import { useCreate, useList, usePermissions, useUpdate } from "@refinedev/core";
import { useOutletContext, useParams } from "react-router-dom";
import { useDialog } from "../../components/ui/useDialog";
import { ErrorAlert } from "../../components/public/UIStates";
import { ProgramRevisionNotice } from '../../components/ui/ProgramRevisionNotice';

interface Book {
  id: string;
  title: string;
  slug: string;
  author?: string;
  description?: string;
  status: string;
  updatedAt?: string;
}
interface Series {
  id: string;
  title: string;
  slug: string;
  description?: string;
  sequence: number;
  status: string;
  books: Book[];
  updatedAt?: string;
}
interface Form {
  kind: "series" | "book";
  id?: string;
  title: string;
  slug: string;
  author: string;
  description: string;
  sequence: number;
  status: string;
  bookIds: string[];
  updatedAt?: string;
}
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const control =
  "mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50";
const statuses: Record<string, string> = {
  draft: "Draft",
  published: "Terbit",
  archived: "Arsip",
};

export function AdminProgramReferencesPage() {
  const { id: programId = "" } = useParams();
  const revisionMode = useOutletContext<{ revisionMode: boolean } | undefined>()?.revisionMode;
  const seriesQuery = useList<Series>({
    resource: "series",
    filters: [{ field: "programId", operator: "eq", value: programId }],
    sorters: [{ field: "sequence", order: "asc" }],
    pagination: { mode: "off" },
  });
  const booksQuery = useList<Book>({
    resource: "books",
    sorters: [{ field: "title", order: "asc" }],
    pagination: { mode: "off" },
  });
  const { data: role } = usePermissions<string>({});
  const publisher = [
    "admin",
    "administrator",
    "super_administrator",
    "publisher",
  ].includes(role || "");
  const { mutate: create, mutation: createMutation } = useCreate();
  const { mutate: update, mutation: updateMutation } = useUpdate();
  const [form, setForm] = useState<Form | null>(null);
  const [initial, setInitial] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const pending = createMutation.isPending || updateMutation.isPending;
  const dialog = useDialog({
    open: !!form,
    pending,
    dirty: !!form && JSON.stringify(form) !== initial,
    onClose: () => setForm(null),
  });
  const refresh = () => {
    void seriesQuery.query.refetch();
    void booksQuery.query.refetch();
  };
  const edit = (kind: Form["kind"], item?: Book | Series) => {
    if (kind === "book" && item)
      item =
        booksQuery.result.data.find((book) => book.id === item!.id) || item;
    const entry: Form = {
      kind,
      id: item?.id,
      title: item?.title || "",
      slug: item?.slug || "",
      author: item && "author" in item ? item.author || "" : "",
      description: item?.description || "",
      sequence:
        item && "sequence" in item
          ? item.sequence
          : Math.max(
              0,
              ...seriesQuery.result.data.map((series) => series.sequence),
            ) + 1,
      status: item?.status || "draft",
      bookIds: item && "books" in item ? item.books.map((book) => book.id) : [],
      updatedAt: item?.updatedAt,
    };
    setForm(entry);
    setInitial(JSON.stringify(entry));
    setManualSlug(Boolean(item));
    setFeedback(null);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || pending) return;
    setFeedback(null);
    const values = {
      title: form.title,
      slug: form.slug,
      description: form.description,
      status: form.status,
      ...(form.id && form.updatedAt
        ? { expectedUpdatedAt: form.updatedAt }
        : {}),
      ...(form.kind === "series"
        ? { programId, sequence: form.sequence, bookIds: form.bookIds }
        : { author: form.author }),
    };
    const options = {
      onSuccess: () => {
        setForm(null);
        refresh();
        setFeedback({
          error: false,
          message:
            "Rujukan tersimpan. Status seri dan kitab dikelola terpisah dari publikasi program.",
        });
      },
      onError: (error: unknown) =>
        setFeedback({
          error: true,
          message:
            error && typeof error === "object" && "message" in error
              ? String(error.message)
              : "Rujukan gagal disimpan.",
        }),
    };
    const resource = form.kind === "series" ? "series" : "books";
    if (form.id) update({ resource, id: form.id, values }, options);
    else create({ resource, values }, options);
  };
  if (seriesQuery.query.isLoading || booksQuery.query.isLoading)
    return <p role="status">Memuat seri dan kitab…</p>;
  if (seriesQuery.query.isError || booksQuery.query.isError)
    return (
      <ErrorAlert
        message="Seri/kitab gagal dimuat. Penyuntingan dinonaktifkan sampai daftar lengkap tersedia."
        onRetry={refresh}
      />
    );
  return (
    <div className="space-y-6">
      {revisionMode && <ProgramRevisionNotice programId={programId} />}
      <header className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">
          Seri & kitab rujukan
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Susun seri di dalam program, lalu hubungkan kitab yang digunakan.
          Kitab merupakan rujukan bersama: mengeditnya dapat memengaruhi program
          lain. Modul/pertemuan tetap dikelola di Pertemuan & Materi.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={revisionMode} onClick={() => edit("series")}>
            Tambah seri
          </button>
          <button className={button} onClick={() => edit("book")}>
            Tambah kitab
          </button>
        </div>
      </header>
      {feedback && !form && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={`rounded-lg border p-3 text-sm ${feedback.error ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
        >
          {feedback.message}
        </p>
      )}
      <section aria-label="Seri program" className="space-y-3">
        {seriesQuery.result.data.map((series) => (
          <article
            key={series.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-600">
                  Urutan {series.sequence} ·{" "}
                  {statuses[series.status] || series.status}
                </p>
                <h3 className="mt-1 break-words text-base font-bold">
                  {series.title}
                </h3>
                {series.description && (
                  <p className="mt-2 text-sm text-slate-600">
                    {series.description}
                  </p>
                )}
              </div>
              <button className={button} disabled={revisionMode} onClick={() => edit("series", series)}>
                Edit seri
              </button>
            </div>
            <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4">
              {series.books.map((book) => (
                <li
                  key={book.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 text-sm">
                    <span className="font-semibold">{book.title}</span>
                    <span className="block text-xs text-slate-600">
                      {book.author || "Penulis belum diatur"} ·{" "}
                      {statuses[book.status] || book.status}
                    </span>
                  </div>
                  <button className={button} onClick={() => edit("book", book)}>
                    Edit kitab
                  </button>
                </li>
              ))}
            </ul>
            {series.books.length === 0 && (
              <p className="text-sm text-slate-600">
                Belum ada kitab terhubung. Pilih kitab melalui Edit seri.
              </p>
            )}
          </article>
        ))}
        {seriesQuery.result.data.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
            Belum ada seri. Seri bersifat opsional untuk program dengan
            pertemuan langsung.
          </p>
        )}
      </section>
      <section className="space-y-3 border-t border-slate-200 pt-5">
        <h3 className="font-bold">Katalog kitab bersama</h3>
        <label className="block text-sm font-semibold">
          Cari kitab
          <input
            className={control}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Judul atau penulis…"
          />
        </label>
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {booksQuery.result.data
            .filter((book) =>
              `${book.title} ${book.author || ""}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((book) => (
              <li
                key={book.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {book.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {book.author || "Penulis belum diatur"} ·{" "}
                    {statuses[book.status] || book.status}
                  </p>
                </div>
                <button className={button} onClick={() => edit("book", book)}>
                  Edit
                </button>
              </li>
            ))}
        </ul>
      </section>
      {form && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-white/85 sm:items-center sm:p-4">
          <div
            ref={dialog.ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reference-title"
            className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl border border-slate-300 bg-white p-5 shadow-xl sm:max-w-2xl sm:rounded-2xl"
          >
            <h2 id="reference-title" className="text-lg font-bold">
              {form.id ? "Edit" : "Tambah"}{" "}
              {form.kind === "series" ? "seri program" : "kitab rujukan"}
            </h2>
            {feedback?.error && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
              >
                {feedback.message}
              </p>
            )}
            <form onSubmit={submit} className="mt-5 space-y-4">
              <fieldset disabled={pending} className="contents">
                <label className="block text-sm font-semibold">
                  Judul *
                  <input
                    autoFocus
                    required
                    maxLength={180}
                    value={form.title}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        title: event.target.value,
                        slug: manualSlug
                          ? form.slug
                          : slugify(event.target.value),
                      })
                    }
                    className={control}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Slug *
                  <input
                    required
                    maxLength={160}
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    value={form.slug}
                    onChange={(event) => {
                      setManualSlug(true);
                      setForm({ ...form, slug: event.target.value });
                    }}
                    className={control}
                  />
                </label>
                {form.kind === "book" && (
                  <label className="block text-sm font-semibold">
                    Penulis
                    <input
                      maxLength={180}
                      value={form.author}
                      onChange={(event) =>
                        setForm({ ...form, author: event.target.value })
                      }
                      className={control}
                    />
                  </label>
                )}
                <label className="block text-sm font-semibold">
                  Deskripsi
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    className={`${control} py-3`}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Status
                  <select
                    value={form.status}
                    disabled={!publisher}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                    className={control}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Terbit</option>
                    <option value="archived">Arsip</option>
                  </select>
                </label>
                {form.kind === "series" && (
                  <>
                    <label className="block text-sm font-semibold">
                      Urutan seri
                      <input
                        type="number"
                        min={1}
                        required
                        value={form.sequence}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            sequence: Number(event.target.value),
                          })
                        }
                        className={control}
                      />
                    </label>
                    <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <legend className="text-sm font-semibold">
                        Kitab rujukan seri (opsional)
                      </legend>
                      <p className="text-xs text-slate-600">
                        Centang sesuai urutan rujukan. Kitab yang sama boleh
                        digunakan seri lain.
                      </p>
                      {booksQuery.result.data.map((book) => (
                        <label
                          key={book.id}
                          className="flex min-h-11 items-center gap-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={form.bookIds.includes(book.id)}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                bookIds: event.target.checked
                                  ? [...form.bookIds, book.id]
                                  : form.bookIds.filter((id) => id !== book.id),
                              })
                            }
                          />
                          <span>
                            {book.title}
                            {form.bookIds.includes(book.id)
                              ? ` · urutan ${form.bookIds.indexOf(book.id) + 1}`
                              : ""}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  </>
                )}
                <p className="text-xs leading-5 text-slate-600">
                  Seri dan kitab harus terbit agar rujukannya tampil di
                  informasi publik. Pengarsipan tidak menghapus isi atau
                  riwayat.
                </p>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className={button}
                    disabled={pending}
                    onClick={dialog.close}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`${button} bg-emerald-50`}
                    disabled={
                      pending || (!publisher && form.status === "published")
                    }
                  >
                    {pending ? "Menyimpan…" : "Simpan rujukan"}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
