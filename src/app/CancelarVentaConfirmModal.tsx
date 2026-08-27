import { useEffect } from 'react'
import { formatCop } from '@/lib/formatCop'

export function CancelarVentaConfirmModal({
  open,
  busy,
  error,
  totalCop,
  referencia,
  requiresOnePayRefund,
  hasPendingOnePayCheckout,
  paidWithAddi,
  alreadyCancelled,
  onConfirm,
  onClose,
}: {
  open: boolean
  busy: boolean
  error: string | null
  totalCop: number
  referencia: string | null
  requiresOnePayRefund: boolean
  hasPendingOnePayCheckout: boolean
  paidWithAddi: boolean
  alreadyCancelled: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open || busy) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  const title = alreadyCancelled
    ? 'Devolver el dinero al cliente'
    : '¿Cancelar esta venta?'
  const amount = formatCop(totalCop)
  const refLabel = referencia ? ` (${referencia})` : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-cancel-venta-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar"
        disabled={busy}
        onClick={onClose}
      />
      <div className="relative mx-4 mb-4 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-neutral-200/55 bg-[var(--cat-surface)] p-5 shadow-lg sm:mx-0 sm:mb-0 sm:rounded-xl">
        <h2 id="mc-cancel-venta-title" className="ios-headline text-[var(--cat-text)]">
          {title}
        </h2>
        {requiresOnePayRefund ? (
          <p className="ios-footnote mt-2 leading-relaxed text-[var(--cat-muted)]">
            {alreadyCancelled
              ? `Esta venta${refLabel} ya está cancelada en el catálogo, pero el cobro sigue en OnePay. Si confirmás, se devolverá el total de `
              : `Si confirmás, esta venta${refLabel} se cancela y OnePay devolverá el total de `}
            <strong className="font-medium text-[var(--cat-text)]">{amount}</strong>
            {' al cliente.'}
          </p>
        ) : hasPendingOnePayCheckout ? (
          <p className="ios-footnote mt-2 leading-relaxed text-[var(--cat-muted)]">
            Esta venta{refLabel} se cancela y se anula el cobro pendiente en OnePay. El cliente no fue debitado.
          </p>
        ) : paidWithAddi ? (
          <p className="ios-footnote mt-2 leading-relaxed text-[var(--cat-muted)]">
            Esta venta{refLabel} se pagó con Addi. Cancelar no hace la devolución automática: hay que gestionarla en Addi.
          </p>
        ) : (
          <p className="ios-footnote mt-2 leading-relaxed text-[var(--cat-muted)]">
            Esta venta{refLabel} pasará a Cancelado. No hay un cobro OnePay para devolver.
          </p>
        )}
        {error ? <p className="mt-3 text-[13px] leading-relaxed text-red-800">{error}</p> : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            className="mc-btn-primary inline-flex w-full items-center justify-center py-3 text-[15px] sm:w-auto sm:min-w-[10rem]"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Procesando…' : requiresOnePayRefund ? 'Sí, devolver el dinero' : 'Sí, cancelar'}
          </button>
          <button
            type="button"
            className="mc-btn-secondary inline-flex w-full items-center justify-center py-3 text-[15px] sm:w-auto sm:min-w-[8rem]"
            disabled={busy}
            onClick={onClose}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  )
}
