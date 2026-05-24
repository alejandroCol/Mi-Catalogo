import { useEffect } from 'react'
import {
  ONEPAY_COMMISSION_IVA_RATE,
  ONEPAY_MERCHANT_TX_FIXED_COP,
  ONEPAY_MERCHANT_TX_RATE,
} from '@/lib/pasarelaFees'

const TX_PCT = (ONEPAY_MERCHANT_TX_RATE * 100).toFixed(2).replace('.', ',')
const IVA_PCT = (ONEPAY_COMMISSION_IVA_RATE * 100).toFixed(0)

export function PasarelaOnepayComisionesModal({
  open,
  onClose,
}: {
  open: boolean
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
      aria-labelledby="mc-pasarela-comisiones-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative mx-4 mb-4 w-full max-w-md rounded-t-xl border border-neutral-200/55 bg-[var(--cat-surface)] p-5 shadow-lg sm:mx-0 sm:mb-0 sm:rounded-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">OnePay</p>
        <h2 id="mc-pasarela-comisiones-title" className="mt-1 text-[1.25rem] font-medium tracking-tight text-[var(--cat-text)]">
          Comisiones de pasarela
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--cat-muted)]">
          Por cada venta cobrada con pasarela en tu catálogo:
        </p>
        <ul className="mt-4 space-y-3 border border-neutral-200/50 bg-neutral-50/35 px-4 py-4 text-[14px] leading-relaxed text-[var(--cat-text)]">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_18%,transparent)] text-[11px] font-semibold text-[var(--cat-text)]">
              %
            </span>
            <span>
              <strong className="font-medium">{TX_PCT}%</strong> del monto de la venta
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_18%,transparent)] text-[11px] font-semibold text-[var(--cat-text)]">
              +
            </span>
            <span>
              <strong className="font-medium">${ONEPAY_MERCHANT_TX_FIXED_COP.toLocaleString('es-CO')} COP</strong> fijos
              por transacción
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_18%,transparent)] text-[11px] font-semibold text-[var(--cat-text)]">
              IVA
            </span>
            <span>
              <strong className="font-medium">{IVA_PCT}% de IVA</strong> calculado sobre la comisión{' '}
              <span className="text-[var(--cat-muted)]">(no sobre el total de la venta)</span>
            </span>
          </li>
        </ul>
        <p className="mt-4 text-[12px] leading-relaxed text-[var(--cat-muted)]">
          Estos valores son referencia de OnePay según normativa colombiana vigente. El neto de cada venta ya refleja
          este descuento en tu saldo disponible.
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
