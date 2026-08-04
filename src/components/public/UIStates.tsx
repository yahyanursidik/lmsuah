export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs"
        >
          <div className="h-48 w-full rounded-xl bg-stone-200" />
          <div className="mt-4 h-6 w-3/4 rounded-md bg-stone-200" />
          <div className="mt-2 h-4 w-1/2 rounded-md bg-stone-200" />
          <div className="mt-6 flex justify-between">
            <div className="h-4 w-20 rounded-md bg-stone-200" />
            <div className="h-4 w-24 rounded-md bg-stone-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title = 'Tidak Ada Data',
  description = 'Maaf, data yang Anda cari tidak ditemukan atau belum tersedia.',
  actionText,
  onAction,
}: {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-950 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export function ErrorAlert({
  title = 'Gagal Memuat Data',
  message = 'Terjadi kesalahan sistem saat mengambil data dari server.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-900 shadow-xs">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-red-900">{title}</h4>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 rounded-md bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Coba Lagi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
