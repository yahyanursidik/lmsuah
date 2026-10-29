/* Hallmark · genre: modern-minimal · macrostructure: Guided Workbench · design-system: design.md · designed-as-app */
import { useEffect, useRef, useState } from "react";
import { ImageUrlField } from '../../components/ui/ImageUrlField';
import { ProgramCategoryField } from '../../components/ui/ProgramCategoryField';
import { useUploadsPending } from '../../lib/media-upload-state';
import { useList, useOne, usePermissions, useUpdate } from "@refinedev/core";
import { Link, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { ErrorAlert } from "../../components/public/UIStates";
import { programReadiness } from "../../../shared/program-readiness";
import { AdminCurriculumPage } from "./AdminCurriculumPage";
import { AdminQuizDialog } from "./AdminQuizDialog";
import { ProgramRevisionNotice } from '../../components/ui/ProgramRevisionNotice';

interface Program {
  id: string;
  updatedAt?: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string | null;
  category?: string | null;
  status: string;
}
interface Meeting {
  id: string;
  title: string;
  status: string;
  materialCount: number;
  hasQuiz: boolean;
}
const steps = [
  ["information", "Informasi program"],
  ["content", "Pertemuan & materi"],
  ["evaluation", "Evaluasi & jadwal"],
  ["review", "Review & terbitkan"],
] as const;
const control =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";
const action =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50";

export function AdminProgramSetupPage() {
  const uploading = useUploadsPending();
  const { id = "" } = useParams();
  const revisionMode = useOutletContext<{ revisionMode: boolean } | undefined>()?.revisionMode;
  const [params, setParams] = useSearchParams();
  const step = Math.max(
    0,
    steps.findIndex(([key]) => key === (params.get("step") || "information")),
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const programQuery = useOne<Program>({ resource: "programs", id });
  const meetings = useList<Meeting>({
    resource: "lessons",
    filters: [{ field: "programId", operator: "eq", value: id }],
    pagination: { mode: "off" },
  });
  const { data: permissions } = usePermissions<string>({});
  const publisher = [
    "admin",
    "administrator",
    "super_administrator",
    "publisher",
  ].includes(permissions || "");
  const { mutate: update, mutation } = useUpdate();
  const [form, setForm] = useState({ title: "", slug: "", description: "", coverImage: "", category: "" });
  const [dirty, setDirty] = useState(false);
  const [quizLesson, setQuizLesson] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const program = programQuery.result;
  const baseRevision = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (program && !dirty) {
      baseRevision.current = program.updatedAt;
      setForm({
        title: program.title,
        slug: program.slug,
        description: program.description || "",
        coverImage: program.coverImage || "",
        category: program.category || "",
      });
    }
  }, [program, dirty]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (step === 3) {
      void programQuery.query.refetch();
      void meetings.query.refetch();
    }
    // Refresh when entering review, including after edits in the curriculum.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, id]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const refresh = () => {
    void programQuery.query.refetch();
    void meetings.query.refetch();
  };
  const go = (index: number) => {
    if (
      mutation.isPending || uploading ||
      (dirty &&
        !window.confirm(
          "Perubahan informasi belum disimpan. Pindah langkah dan abaikan perubahan?",
        ))
    )
      return;
    setDirty(false);
    setFeedback(null);
    setParams({ step: steps[index]![0] });
  };
  const failure = (error: unknown) =>
    setFeedback({
      error: true,
      message:
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Perubahan gagal disimpan.",
    });
  const saveInformation = (event: React.FormEvent) => {
    event.preventDefault();
    update(
      { resource: "programs", id, values: { ...form, expectedUpdatedAt: baseRevision.current } },
      {
        onSuccess: () => {
          setDirty(false);
          refresh();
          setParams({ step: "content" });
        },
        onError: failure,
      },
    );
  };
  const checks = programReadiness(program || {}, meetings.result.data);
  const ready = checks.every((check) => check.ready);
  if (revisionMode) return <ProgramRevisionNotice programId={id} />;
  if (programQuery.query.isLoading)
    return <p role="status">Memuat persiapan program…</p>;
  if (programQuery.query.isError || !program)
    return <ErrorAlert message="Program gagal dimuat." onRetry={refresh} />;
  return (
    <div className="min-w-0 space-y-5">
      <header>
        <h2
          ref={heading}
          tabIndex={-1}
          className="text-xl font-bold text-slate-900 outline-none"
        >
          Persiapan program
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Selesaikan langkah persiapan sebelum terbit. Data yang sudah disimpan
          tetap tersedia saat Anda kembali. Kuis dan jadwal bersifat opsional.
        </p>
      </header>
      <ol
        aria-label="Langkah persiapan"
        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
      >
        {steps.map(([key, label], index) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => go(index)}
              aria-current={step === index ? "step" : undefined}
              className={`flex min-h-14 w-full items-center gap-2 rounded-lg border p-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${step === index ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-slate-700"}`}
            >
              <span aria-hidden="true">{index + 1}.</span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      {feedback && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={`rounded-lg border p-4 text-sm ${feedback.error ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
        >
          {feedback.message}
        </p>
      )}
      {step === 0 && (
        <form
          onSubmit={saveInformation}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"
        >
          <ImageUrlField value={form.coverImage} onChange={coverImage => { setDirty(true); setForm(previous => ({ ...previous, coverImage })); }} label="Sampul Program Kajian (opsional)" />
          <ProgramCategoryField value={form.category} onChange={category => { setDirty(true); setForm(previous => ({ ...previous, category })); }} />
          <label className="block space-y-2 text-sm font-semibold">
            Judul *
            <input
              required
              maxLength={160}
              className={control}
              value={form.title}
              onChange={(event) => {
                setDirty(true);
                setForm({ ...form, title: event.target.value });
              }}
            />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            Slug *
            <input
              required
              maxLength={160}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className={control}
              value={form.slug}
              onChange={(event) => {
                setDirty(true);
                setForm({ ...form, slug: event.target.value });
              }}
            />
          </label>
          <p className="break-all text-xs text-slate-600">
            Alamat: /programs/{form.slug}. Mengganti slug mengubah tautan yang
            telah dibagikan.
          </p>
          <label className="block space-y-2 text-sm font-semibold">
            Deskripsi *
            <textarea
              required
              maxLength={500}
              rows={4}
              className={`${control} py-3`}
              value={form.description}
              onChange={(event) => {
                setDirty(true);
                setForm({ ...form, description: event.target.value });
              }}
            />
          </label>
          <button
            disabled={mutation.isPending || uploading}
            className={`${action} bg-emerald-50`}
          >
            {mutation.isPending ? "Menyimpan…" : "Simpan & lanjutkan"}
          </button>
        </form>
      )}
      {step === 1 && <AdminCurriculumPage />}
      {step === 1 && <Link className={action} to={`/admin/programs/${id}/references`}>Atur seri & kitab rujukan (opsional)</Link>}
      {step === 2 && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold">Evaluasi & penyelenggaraan (opsional)</h3>
          <p className="text-sm text-slate-600">
            Kuis ditambahkan per pertemuan. Jadwal dan lokasi dikelola melalui
            modul jadwal yang sama, tanpa membuat data ganda.
          </p>
          {meetings.query.isError ? (
            <ErrorAlert
              message="Pertemuan belum dapat dimuat."
              onRetry={refresh}
            />
          ) : (
            meetings.result.data.map((lesson) => (
              <div
                key={lesson.id}
                className="flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="min-w-0 break-words text-sm font-semibold">
                  {lesson.title}
                </p>
                <button
                  className={action}
                  onClick={() => setQuizLesson(lesson.id)}
                >
                  {lesson.hasQuiz ? "Kelola kuis" : "Tambah kuis"}
                </button>
              </div>
            ))
          )}
          <Link className={action} to={`/admin/schedules?programId=${id}`}>
            Atur jadwal & lokasi
          </Link>
        </section>
      )}
      {step === 3 && (
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold">Checklist sebelum publikasi</h3>
          {meetings.query.isFetching || programQuery.query.isFetching ? (
            <p role="status">Memeriksa kesiapan terbaru…</p>
          ) : meetings.query.isError ? (
            <ErrorAlert
              message="Kesiapan program belum dapat diperiksa."
              onRetry={refresh}
            />
          ) : (
            <ul className="space-y-3">
              {checks.map((check) => (
                <li
                  key={check.key}
                  className="flex items-start gap-2 text-sm text-slate-800"
                >
                  {check.ready ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-amber-700" />
                  )}
                  <span>
                    {check.label}:{" "}
                    <strong>{check.ready ? "Siap" : "Perlu dilengkapi"}</strong>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-slate-600">
            Hanya pertemuan terbit yang terlihat oleh peserta setelah program
            diterbitkan. Draft tidak ikut diterbitkan. Publikasi tidak otomatis
            membuat jadwal atau mendaftarkan peserta.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className={action} onClick={refresh} disabled={meetings.query.isFetching || programQuery.query.isFetching || mutation.isPending}>Periksa ulang kesiapan</button>
            <Link
              className={action}
              to={`/belajar/program/${id}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Pratinjau peserta
            </Link>
            <button
              className={`${action} bg-emerald-50`}
              disabled={
                !publisher ||
                !ready ||
                 meetings.query.isLoading ||
                 meetings.query.isFetching ||
                 programQuery.query.isFetching ||
                 programQuery.query.isError ||
                meetings.query.isError ||
                mutation.isPending || uploading ||
                program.status === "published"
              }
              onClick={() => {
                if (
                  !window.confirm(
                    "Terbitkan program dan tampilkan pertemuan terbit ke publik?",
                  )
                )
                  return;
                update(
                  { resource: "programs", id, values: { status: "published", expectedUpdatedAt: program.updatedAt } },
                  {
                    onSuccess: () => {
                      refresh();
                      setFeedback({
                        error: false,
                        message:
                          "Program berhasil diterbitkan. Draft pertemuan tetap tidak terlihat publik.",
                      });
                    },
                    onError: (error) => {
                      failure(error);
                      refresh();
                    },
                  },
                );
              }}
            >
              {program.status === "published"
                ? "Program sudah terbit"
                : mutation.isPending
                  ? "Menerbitkan…"
                  : "Terbitkan program"}
            </button>
          </div>
          {!publisher && (
            <p className="text-sm text-amber-800">
              Publikasi memerlukan Publisher atau Administrator.
            </p>
          )}
        </section>
      )}
      {quizLesson && (
        <AdminQuizDialog
          lessonId={quizLesson}
          onClose={() => setQuizLesson(null)}
          onSuccess={refresh}
        />
      )}
      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
        <Link
          to={`/admin/programs/${id}`}
          className={action}
          onClick={(event) => {
            if (
              dirty &&
              !window.confirm(
                "Informasi belum disimpan. Keluar dari persiapan?",
              )
            )
              event.preventDefault();
          }}
        >
          Keluar dari persiapan
        </Link>
        <div className="flex flex-wrap gap-2">
          {step > 0 && (
            <button className={action} onClick={() => go(step - 1)}>
              Kembali
            </button>
          )}
          {step < steps.length - 1 && (
            <button className={action} onClick={() => go(step + 1)}>
              {step === 2 ? "Lewati / lanjutkan review" : "Lanjutkan"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
