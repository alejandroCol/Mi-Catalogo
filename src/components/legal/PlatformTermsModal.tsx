import { useEffect, useRef } from 'react'

type PlatformTermsModalProps = {
  open: boolean
  title?: string
  version: string
  text: string
  onClose: () => void
}

export function PlatformTermsModal({ open, title, version, text, onClose }: PlatformTermsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className="mc-terms-dialog fixed inset-0 z-[100] m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/45"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div
        className="mx-auto flex h-full max-h-svh w-full max-w-lg flex-col px-4 py-6 sm:py-10"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mc-card flex min-h-0 flex-1 flex-col overflow-hidden shadow-xl ring-1 ring-neutral-200/60">
          <div className="shrink-0 border-b border-neutral-200/50 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">
              {title ?? 'Términos y condiciones'}
            </p>
            <h2 className="ios-headline mt-1 text-mc-900">Mi Catálogo</h2>
            <p className="ios-footnote mt-1 text-mc-600">Versión {version}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-mc-800">{text}</pre>
          </div>
          <div className="shrink-0 border-t border-neutral-200/50 px-5 py-4">
            <button type="button" className="mc-btn-primary w-full py-3" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
