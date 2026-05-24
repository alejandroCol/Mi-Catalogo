import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function CheckoutEnvioRequiredModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function irAConfigurarEnvio() {
    onClose()
    navigate('/app/cuenta/envio')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-envio-req-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative mx-4 mb-4 w-full max-w-md rounded-t-xl border border-neutral-200/55 bg-[var(--cat-surface)] p-5 shadow-lg sm:mx-0 sm:mb-0 sm:rounded-xl">
        <h2 id="mc-envio-req-title" className="ios-headline text-[var(--cat-text)]">
          Configurá el envío
        </h2>
        <p className="ios-footnote mt-2 leading-relaxed text-[var(--cat-muted)]">
          Antes de abrir el catálogo público, configurá el envío en el checkout:{' '}
          <strong className="font-medium text-[var(--cat-text)]">cotización automática</strong> con tarifas reales o{' '}
          <strong className="font-medium text-[var(--cat-text)]">precios fijos por ciudad</strong>.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="mc-btn-primary inline-flex w-full items-center justify-center py-3 text-[15px]"
            onClick={irAConfigurarEnvio}
          >
            Configurar envío
          </button>
          <button
            type="button"
            className="mc-btn-secondary inline-flex w-full items-center justify-center py-3 text-[15px]"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
