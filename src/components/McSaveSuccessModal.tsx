import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type McSaveSuccessOptions = {
  title?: string
  message?: string
  /** Se ejecuta al cerrar el diálogo (botón Listo, overlay o Escape). */
  onAfterClose?: () => void
}

type McSaveSuccessContextValue = {
  showSaveSuccess: (options?: McSaveSuccessOptions) => void
}

const McSaveSuccessContext = createContext<McSaveSuccessContextValue | null>(null)

export function useSaveSuccess() {
  const ctx = useContext(McSaveSuccessContext)
  if (!ctx) {
    throw new Error('useSaveSuccess debe usarse dentro de McSaveSuccessProvider')
  }
  return ctx
}

export function McSaveSuccessProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<McSaveSuccessOptions>({})
  const afterCloseRef = useRef<(() => void) | undefined>(undefined)

  const showSaveSuccess = useCallback((opts?: McSaveSuccessOptions) => {
    afterCloseRef.current = opts?.onAfterClose
    setOptions({
      title: opts?.title ?? 'Cambios guardados',
      message: opts?.message,
    })
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    const fn = afterCloseRef.current
    afterCloseRef.current = undefined
    fn?.()
  }, [])

  return (
    <McSaveSuccessContext.Provider value={{ showSaveSuccess }}>
      {children}
      <McSaveSuccessModal
        open={open}
        title={options.title ?? 'Cambios guardados'}
        message={options.message}
        onClose={handleClose}
      />
    </McSaveSuccessContext.Provider>
  )
}

export function McSaveSuccessModal({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean
  title: string
  message?: string
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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-save-success-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative mx-4 mb-4 w-full max-w-sm rounded-t-2xl border border-neutral-200/55 bg-[var(--cat-surface)] p-6 shadow-xl sm:mx-0 sm:mb-0 sm:rounded-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 id="mc-save-success-title" className="ios-headline mt-4 text-center text-[var(--cat-text)]">
          {title}
        </h2>
        {message ? (
          <p className="ios-footnote mt-2 text-center leading-relaxed text-[var(--cat-muted)]">{message}</p>
        ) : null}
        <button
          type="button"
          className="mc-btn-primary mt-5 inline-flex w-full items-center justify-center py-3 text-[15px]"
          onClick={onClose}
        >
          Listo
        </button>
      </div>
    </div>
  )
}
