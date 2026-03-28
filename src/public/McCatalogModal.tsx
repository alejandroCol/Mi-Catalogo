import type { ReactNode } from 'react'

/** Modal del catálogo público (hereda --cat-* del layout). */
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
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
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
      <div className="mc-pc-modal-panel relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border p-5 sm:rounded-2xl sm:p-6">
        <h2 id="mc-catalog-modal-title" className="mc-pc-display text-lg font-semibold mc-pc-text">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
        {footer && (
          <div className="mt-6 flex flex-col-reverse gap-2 border-t mc-pc-modal-footer-rule pt-4 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
