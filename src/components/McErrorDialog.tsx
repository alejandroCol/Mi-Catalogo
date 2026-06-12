import { useEffect } from 'react'

export function McErrorDialog({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean
  title?: string
  message: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mc-error-dialog-title"
      aria-describedby="mc-error-dialog-message"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative mx-4 mb-4 w-full max-w-sm rounded-t-2xl border border-red-200/60 bg-[var(--cat-surface)] p-6 shadow-xl sm:mx-0 sm:mb-0 sm:rounded-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 8v5M12 16h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 id="mc-error-dialog-title" className="ios-headline mt-4 text-center text-[var(--cat-text)]">
          {title ?? 'No se pudo guardar'}
        </h2>
        <p id="mc-error-dialog-message" className="ios-footnote mt-2 text-center leading-relaxed text-[var(--cat-muted)]">
          {message}
        </p>
        <button
          type="button"
          className="mc-btn-primary mt-5 inline-flex w-full items-center justify-center py-3 text-[15px]"
          onClick={onClose}
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
