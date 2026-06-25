import { useEffect } from 'react'
import { formatCop } from '@/lib/formatCop'

type Props = {
  active: boolean
  totalCop: number
  onDismiss: () => void
}

export function PosSaleCelebration({ active, totalCop, onDismiss }: Props) {
  useEffect(() => {
    if (!active) return
    const auto = window.setTimeout(onDismiss, 5200)
    return () => window.clearTimeout(auto)
  }, [active, onDismiss])

  if (!active) return null

  return (
    <>
      <div className="mc-pos-sale-flash" aria-hidden />
      <div className="mc-pos-sale-celebration" role="status">
        <div className="mc-pos-sale-celebration__pulse" />
        <p className="mc-pos-sale-celebration__eyebrow">¡Venta registrada!</p>
        <p className="mc-pos-sale-celebration__total">{formatCop(totalCop)}</p>
        <button type="button" className="mc-landing-btn-secondary text-sm" onClick={onDismiss}>
          Nueva venta
        </button>
      </div>
    </>
  )
}
