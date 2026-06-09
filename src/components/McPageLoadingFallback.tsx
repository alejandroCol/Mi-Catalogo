export function McPageLoadingFallback() {
  return (
    <div className="mc-shell flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900"
        aria-hidden
      />
      <p className="ios-subhead text-mc-600">Cargando…</p>
    </div>
  )
}
