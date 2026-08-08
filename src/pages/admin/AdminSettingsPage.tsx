/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5
 * Hallmark · genre: modern-minimal · macrostructure: settings workbench · design-system: design.md · designed-as-app
 */
import { useEffect, useState } from 'react';
import { useOne, useUpdate } from '@refinedev/core';
import { AlertTriangle, CheckCircle2, FileText, Globe2, LoaderCircle, Save, Settings2, ShieldCheck } from 'lucide-react';

export interface SystemSettings {
  id: 'general';
  siteName: string;
  supportEmail: string;
  defaultTimezone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  allowRegistration: boolean;
  maintenanceMode: boolean;
  showPublicSchedule: boolean;
  allowPdfDownload: boolean;
  updatedAt?: string;
}

const defaults: SystemSettings = {
  id: 'general', siteName: 'Portal Kajian UAH', supportEmail: '', defaultTimezone: 'Asia/Jakarta',
  allowRegistration: true, maintenanceMode: false, showPublicSchedule: true, allowPdfDownload: true,
};

function ToggleRow({ label, description, checked, onChange, warning }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void; warning?: boolean }) {
  return <label className="flex min-h-16 cursor-pointer items-start gap-4 border-b border-slate-800 py-4 last:border-0">
    <span className="min-w-0 flex-1"><span className={`block text-sm font-bold ${warning ? 'text-amber-200' : 'text-slate-100'}`}>{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
    <span aria-hidden="true" className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full border border-slate-600 bg-slate-800 peer-checked:border-emerald-500 peer-checked:bg-emerald-700 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-400 after:absolute after:left-1 after:top-1 after:h-[1.125rem] after:w-[1.125rem] after:rounded-full after:bg-slate-300 after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:bg-white motion-reduce:after:transition-none" />
  </label>;
}

export function AdminSettingsPage() {
  const settingsQuery = useOne<SystemSettings>({ resource: 'settings', id: 'general' });
  const { mutate: updateSettings, mutation } = useUpdate<SystemSettings>();
  const [form, setForm] = useState<SystemSettings>(defaults);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { if (settingsQuery.result) setForm({ ...defaults, ...settingsQuery.result }); }, [settingsQuery.result]);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    updateSettings({ resource: 'settings', id: 'general', values: form }, {
      onSuccess: ({ data }) => { setForm({ ...defaults, ...data }); setFeedback({ type: 'success', message: 'Pengaturan sistem berhasil disimpan.' }); },
      onError: (error) => setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Pengaturan belum dapat disimpan.' }),
    });
  };

  if (settingsQuery.query.isLoading) return <div className="h-96 animate-pulse rounded-xl bg-slate-800 motion-reduce:animate-none" />;

  return <form onSubmit={save} className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-400"><Settings2 className="h-4 w-4" /> Administrasi sistem</div><h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">Pengaturan Sistem</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Atur identitas portal, akses peserta, publikasi jadwal, dan kebijakan dokumen dari satu tempat.</p></div><button type="submit" disabled={mutation.isPending || !form.siteName.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55">{mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Save className="h-4 w-4" />} Simpan pengaturan</button></header>

    {settingsQuery.query.isError && <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-bold">Pengaturan belum dapat dimuat</p><button type="button" onClick={() => settingsQuery.query.refetch()} className="mt-2 min-h-10 font-bold text-rose-100 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">Coba lagi</button></div></div>}
    {feedback && <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${feedback.type === 'success' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200' : 'border-rose-800 bg-rose-950/40 text-rose-200'}`}>{feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}<span>{feedback.message}</span></div>}

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-700 bg-slate-950 p-5 sm:p-6"><div className="flex items-start gap-3"><Globe2 className="mt-0.5 h-5 w-5 text-emerald-400" /><div><h2 className="text-base font-bold text-white">Identitas portal</h2><p className="mt-1 text-xs leading-5 text-slate-500">Informasi dasar yang digunakan oleh antarmuka dan komunikasi layanan.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-semibold text-slate-300">Nama portal</span><input required minLength={3} maxLength={80} value={form.siteName} onChange={(event) => setForm({ ...form, siteName: event.target.value })} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm text-white outline-2 outline-transparent placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:outline-emerald-500" /></label><label className="space-y-2"><span className="text-xs font-semibold text-slate-300">Email dukungan</span><input type="email" value={form.supportEmail} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} placeholder="admin@contoh.id" className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm text-white outline-2 outline-transparent placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:outline-emerald-500" /></label><label className="space-y-2 sm:col-span-2"><span className="text-xs font-semibold text-slate-300">Zona waktu bawaan</span><select value={form.defaultTimezone} onChange={(event) => setForm({ ...form, defaultTimezone: event.target.value as SystemSettings['defaultTimezone'] })} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm text-white outline-2 outline-transparent hover:border-slate-600 focus:border-emerald-500 focus:outline-emerald-500"><option value="Asia/Jakarta">WIB · Asia/Jakarta</option><option value="Asia/Makassar">WITA · Asia/Makassar</option><option value="Asia/Jayapura">WIT · Asia/Jayapura</option></select></label></div></section>

        <section className="rounded-xl border border-slate-700 bg-slate-950 p-5 sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" /><div><h2 className="text-base font-bold text-white">Akses dan operasional</h2><p className="mt-1 text-xs leading-5 text-slate-500">Perubahan mode pemeliharaan perlu dikomunikasikan kepada peserta.</p></div></div><div className="mt-3"><ToggleRow label="Izinkan pendaftaran peserta" description="Peserta baru dapat membuat akun melalui halaman login dan onboarding." checked={form.allowRegistration} onChange={(checked) => setForm({ ...form, allowRegistration: checked })} /><ToggleRow warning label="Mode pemeliharaan" description="Tandai portal sedang dalam pemeliharaan. Admin tetap dapat mengakses ruang kerja." checked={form.maintenanceMode} onChange={(checked) => setForm({ ...form, maintenanceMode: checked })} /></div></section>
      </div>

      <aside className="space-y-5"><section className="rounded-xl border border-slate-700 bg-slate-950 p-5"><div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-emerald-400" /><div><h2 className="text-base font-bold text-white">Publikasi dan dokumen</h2><p className="mt-1 text-xs leading-5 text-slate-500">Kontrol yang langsung memengaruhi pengalaman pembaca.</p></div></div><div className="mt-3"><ToggleRow label="Tampilkan jadwal publik" description="Jadwal yang aktif dapat dilihat tanpa masuk sebagai peserta." checked={form.showPublicSchedule} onChange={(checked) => setForm({ ...form, showPublicSchedule: checked })} /><ToggleRow label="Izinkan unduh PDF" description="Tombol unduh tersedia pada pembaca PDF. Membuka dokumen di tab baru tetap tersedia sebagai fallback." checked={form.allowPdfDownload} onChange={(checked) => setForm({ ...form, allowPdfDownload: checked })} /></div></section><section className="rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="text-sm font-bold text-white">Status konfigurasi</h2><dl className="mt-4 space-y-3 text-xs"><div className="flex items-center justify-between gap-4"><dt className="text-slate-500">Record aktif</dt><dd className="font-bold text-slate-200">general</dd></div><div className="flex items-center justify-between gap-4"><dt className="text-slate-500">Zona waktu</dt><dd className="font-bold text-slate-200">{form.defaultTimezone}</dd></div><div className="flex items-center justify-between gap-4"><dt className="text-slate-500">Terakhir diperbarui</dt><dd className="text-right font-bold text-slate-200">{form.updatedAt ? new Date(form.updatedAt).toLocaleString('id-ID') : 'Belum tersimpan'}</dd></div></dl></section></aside>
    </div>
  </form>;
}
