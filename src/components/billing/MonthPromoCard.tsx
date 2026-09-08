import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import {
  computeMonthPromoPricing,
  formatMonthPromoSash,
  monthPromoHint,
} from '@/lib/monthPromo'
import type { McMonthPromo } from '@/types/mc'

type Props = {
  promo: McMonthPromo
  monthlyCop: number
  selected?: boolean
  onSelect?: () => void
  preview?: boolean
}

export function MonthPromoCard({ promo, monthlyCop, selected, onSelect, preview }: Props) {
  const pricing = computeMonthPromoPricing(monthlyCop, promo)
  const hint = monthPromoHint(promo, monthlyCop, formatCop)
  const sash = formatMonthPromoSash(promo.monthKey)

  const inner = (
    <>
      <span className="mc-plan-promo__sash" aria-label={`${sash} promo`}>
        <span>{sash}</span>
        <span>promo</span>
      </span>
      <p className="mc-plan-promo__pack">
        {pricing.prepaidMonths} {pricing.prepaidMonths === 1 ? 'mes' : 'meses'} por
      </p>
      <div className="mc-plan-promo__deal">
        <div className="mc-plan-promo__prices">
          <p className="mc-plan-promo__now">{formatCop(pricing.finalTotalCop)}</p>
          <p className="mc-plan-promo__was">{formatCop(pricing.baseTotalCop)}</p>
        </div>
        <p className="mc-plan-promo__off" aria-label={`${pricing.discountPercent} por ciento de descuento`}>
          −{pricing.discountPercent}%
        </p>
      </div>
      <p className="mc-plan-promo__hint">{hint}</p>
    </>
  )

  if (preview || !onSelect) {
    return <div className="mc-plan-promo mc-plan-promo--preview">{inner}</div>
  }

  return (
    <button
      type="button"
      className={clsx('mc-plan-promo', selected && 'mc-plan-promo--active')}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {inner}
    </button>
  )
}
