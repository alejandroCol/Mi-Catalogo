import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { PosIcon } from '@/pos/components/PosIcon'

type Props = {
  to?: string | null
  compact?: boolean
  className?: string
}

export function PosBrandLogo({ to, compact, className }: Props) {
  const mark = (
    <span className={clsx('mc-pos-brand', compact && 'mc-pos-brand--compact', className)}>
      <span className="mc-pos-brand__mark" aria-hidden>
        <PosIcon name="caja" size={compact ? 16 : 18} />
      </span>
      <span className="mc-pos-brand__text">
        <span className="mc-pos-brand__name">Mi Catálogo</span>
        <span className="mc-pos-brand__pos">POS</span>
      </span>
    </span>
  )

  if (to) {
    return (
      <Link to={to} className="no-underline">
        {mark}
      </Link>
    )
  }
  return mark
}
