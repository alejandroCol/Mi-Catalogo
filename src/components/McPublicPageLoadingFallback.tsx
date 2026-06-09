/** Spinner para rutas del catálogo público (respeta variables --cat-* del tema de la tienda). */
export function McPublicPageLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--cat-muted)_35%,transparent)] border-t-[var(--cat-text)]"
        aria-hidden
      />
      <p className="text-sm mc-pc-muted">Cargando…</p>
    </div>
  )
}
