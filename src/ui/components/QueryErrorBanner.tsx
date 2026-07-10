/** Shared load-failure banner with Retry for TanStack Query screens. */
export function QueryErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
    >
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-md border border-red-600/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-red-500/15"
      >
        Retry
      </button>
    </div>
  );
}
