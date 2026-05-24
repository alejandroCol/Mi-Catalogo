import { useEffect } from 'react'

export function OnepayRetiroPayoutSuccessModal({
  open,
  accountHint,
  onContinue,
  onClose,
}: {
  open: boolean
  accountHint: string | null
  onContinue: () => void
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-payout-success-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative mx-4 mb-4 w-full max-w-md rounded-t-xl border border-neutral-200/55 bg-[var(--cat-surface)] p-5 shadow-lg sm:mx-0 sm:mb-0 sm:rounded-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 id="mc-payout-success-title" className="ios-headline mt-4 text-center text-[var(--cat-text)]">
          Cuenta registrada
        </h2>
        <p className="ios-footnote mt-2 text-center leading-relaxed text-[var(--cat-muted)]">
          Tu cuenta bancaria quedó vinculada
          {accountHint ? (
            <>
              {' '}
              (<span className="font-mono text-[var(--cat-text)]">{accountHint}</span>)
            </>
          ) : null}
          . El siguiente paso es solicitar el retiro de tu saldo disponible.
        </p>
        <ol className="mt-4 space-y-2 border border-neutral-200/50 bg-neutral-50/40 px-4 py-3 text-[13px] leading-relaxed text-[var(--cat-muted)]">
          <li>
            <strong className="font-medium text-[var(--cat-text)]">1.</strong> Revisá tu saldo disponible según tus
            ventas.
          </li>
          <li>
            <strong className="font-medium text-[var(--cat-text)]">2.</strong> Ingresá el monto a retirar (o dejá vacío
            para retirar todo).
          </li>
          <li>
            <strong className="font-medium text-[var(--cat-text)]">3.</strong> Confirmá la dispersión a tu cuenta
            bancaria.
          </li>
        </ol>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="mc-btn-cat inline-flex w-full items-center justify-center py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em]"
            onClick={onContinue}
          >
            Solicitar retiro
          </button>
          <button
            type="button"
            className="mc-btn-secondary inline-flex w-full items-center justify-center py-3 text-[15px]"
            onClick={onClose}
          >
            Volver a mi saldo
          </button>
        </div>
      </div>
    </div>
  )
}
