/* Hallmark · component: material viewer · genre: modern-minimal · theme: design.md
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass
 */
import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileAudio, FileText, Link2, Maximize2, Minimize2, X } from 'lucide-react';

export type ViewableMaterial = {
  id?: string;
  type: string;
  url: string;
  filename?: string;
  duration?: string;
};

type MaterialViewerProps = {
  material: ViewableMaterial;
  tone?: 'admin' | 'participant';
  compact?: boolean;
  allowDownload?: boolean;
  startAtSeconds?: number;
};

const youtubeId = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)?.[1];
const typeLabel = (type: string) => ({ youtube: 'Video YouTube', PDF: 'Dokumen PDF', audio: 'Audio', drive: 'Google Drive', DOCX: 'Dokumen DOCX', link: 'Tautan' }[type] || 'Materi');

function withPdfPreferences(url: string) {
  if (!url) return url;
  const base = url.split('#')[0];
  return `${base}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`;
}

export function MaterialViewer({ material, tone = 'participant', compact = false, allowDownload = true, startAtSeconds = 0 }: MaterialViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const isAdmin = tone === 'admin';
  const videoId = material.type === 'youtube' ? youtubeId(material.url) : undefined;
  const label = material.filename || typeLabel(material.type);
  const pdfUrl = useMemo(() => withPdfPreferences(material.url), [material.url]);

  useEffect(() => {
    setFrameLoaded(false);
  }, [material.url]);

  useEffect(() => {
    if (!expanded) return undefined;
    const previous = document.body.style.overflow;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', close);
    };
  }, [expanded]);

  const shell = isAdmin ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-stone-200 bg-white text-slate-950';
  const toolbar = isAdmin ? 'border-slate-700 bg-slate-900' : 'border-stone-200 bg-stone-50';
  const muted = isAdmin ? 'text-slate-400' : 'text-slate-500';
  const action = isAdmin
    ? 'border-slate-700 text-slate-200 hover:bg-slate-800 focus-visible:ring-emerald-400 active:bg-slate-700'
    : 'border-stone-300 text-slate-700 hover:bg-stone-100 focus-visible:ring-emerald-700 active:bg-stone-200';

  if (videoId) {
    return <div className={`aspect-video overflow-hidden rounded-xl border bg-slate-950 ${isAdmin ? 'border-slate-700' : 'border-stone-300'}`}>
      <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}?start=${Math.floor(startAtSeconds)}&rel=0&modestbranding=1`} title={label} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>;
  }

  if (material.type === 'audio') {
    return <div className={`rounded-xl border p-4 ${shell}`}><div className="mb-3 flex items-center gap-3"><FileAudio className="h-5 w-5 text-emerald-500" aria-hidden="true" /><div><p className="text-sm font-bold">{label}</p><p className={`text-xs ${muted}`}>Pemutar audio</p></div></div><audio controls preload="metadata" src={material.url} className="w-full">Browser tidak mendukung pemutar audio.</audio></div>;
  }

  if (material.type !== 'PDF') {
    const Icon = material.type === 'link' || material.type === 'drive' ? Link2 : FileText;
    return <div className={`flex flex-col items-start gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between ${shell}`}><div className="flex min-w-0 items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" /><div className="min-w-0"><p className="break-words text-sm font-bold">{label}</p><p className={`mt-1 break-all text-xs ${muted}`}>{material.url}</p></div></div><a href={material.url} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 ${action}`}><ExternalLink className="h-4 w-4" aria-hidden="true" /> Buka sumber</a></div>;
  }

  const pdfPanel = (fullScreen: boolean) => <div className={`flex min-h-0 flex-col overflow-hidden border ${fullScreen ? 'h-full rounded-none' : 'rounded-xl'} ${shell}`}>
    <div className={`flex min-h-14 items-center gap-3 border-b px-3 sm:px-4 ${toolbar}`}>
      <FileText className="h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{label}</p><p className={`hidden text-[11px] sm:block ${muted}`}>PDF · gunakan toolbar dokumen untuk zoom, halaman, dan pencarian</p></div>
      <div className="flex shrink-0 items-center gap-1">
        {!fullScreen && <button type="button" onClick={() => setExpanded(true)} aria-label="Perbesar pratinjau PDF" className={`flex h-10 w-10 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 ${action}`}><Maximize2 className="h-4 w-4" aria-hidden="true" /></button>}
        {fullScreen && <button type="button" onClick={() => setExpanded(false)} aria-label="Keluar dari layar penuh" className={`flex h-10 w-10 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 ${action}`}><Minimize2 className="h-4 w-4" aria-hidden="true" /></button>}
        <a href={material.url} target="_blank" rel="noreferrer" aria-label="Buka PDF di tab baru" className={`flex h-10 w-10 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 ${action}`}><ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
        {allowDownload && <a href={material.url} download aria-label="Unduh PDF" className={`hidden h-10 w-10 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 sm:flex ${action}`}><Download className="h-4 w-4" aria-hidden="true" /></a>}
      </div>
    </div>
    <div className="relative min-h-0 flex-1 bg-stone-200">
      {!frameLoaded && <div className="absolute inset-0 flex items-center justify-center bg-stone-100 text-center"><div><FileText className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-700">Memuat dokumen…</p></div></div>}
      <iframe src={pdfUrl} title={`Pratinjau PDF ${label}`} onLoad={() => setFrameLoaded(true)} className={`relative w-full bg-white ${fullScreen ? 'h-full' : compact ? 'h-[28rem] sm:h-[34rem]' : 'h-[65dvh] min-h-[30rem] max-h-[52rem]'}`} />
    </div>
    <div className={`flex min-h-11 items-center justify-between gap-3 border-t px-3 text-[11px] sm:px-4 ${toolbar} ${muted}`}><span className="min-w-0 truncate">Jika pratinjau kosong, sumber mungkin melarang penyematan.</span><a href={material.url} target="_blank" rel="noreferrer" className="shrink-0 whitespace-nowrap font-bold text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">Buka langsung</a></div>
  </div>;

  return <>
    {pdfPanel(false)}
    {expanded && <div className="fixed inset-0 z-[160] bg-slate-950" role="dialog" aria-modal="true" aria-label={`Pratinjau penuh ${label}`}>
      <button type="button" onClick={() => setExpanded(false)} aria-label="Tutup pratinjau PDF" className="absolute right-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950/80 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:hidden"><X className="h-5 w-5" /></button>
      {pdfPanel(true)}
    </div>}
  </>;
}
