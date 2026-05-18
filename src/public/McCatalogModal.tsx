import type { ReactNode } from 'react'

/** Carrito: sheet en móvil, panel lateral tipo REY en desktop. Hereda --cat-*. */
export function McCatalogModal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-0 sm:items-stretch"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-catalog-modal-title"
    >
      <button
        type="button"
        className="mc-pc-modal-backdrop absolute inset-0"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className="mc-pc-drawer-panel relative z-10 w-full max-w-md overflow-y-auto overscroll-contain p-5 shadow-2xl sm:ml-auto sm:w-[min(100%,26rem)] sm:p-7 sm:shadow-[-12px_0_40px_-12px_rgba(0,0,0,0.12)]"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="mc-catalog-modal-title"
            className="mc-pc-display pr-2 text-lg font-semibold tracking-tight mc-pc-text sm:text-xl"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border mc-pc-border p-2 text-sm mc-pc-muted transition hover:opacity-75"
            aria-label="Cerrar"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mt-5 sm:mt-6">{children}</div>
        {footer && (
          <div className="mt-8 flex flex-col-reverse gap-2 border-t mc-pc-modal-footer-rule pt-6 sm:flex-row sm:flex-wrap sm:justify-stretch sm:gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
