import type { ReactNode } from 'react'
import { PosIcon, type PosIconName } from '@/pos/components/PosIcon'

type Variant = 'ventas' | 'productos' | 'caja' | 'generic'

const ICON: Record<Variant, PosIconName> = {
  ventas: 'ticket',
  productos: 'inventario',
  caja: 'caja',
  generic: 'home',
}

type Props = {
  variant?: Variant
  title: string
  hint?: string
  action?: ReactNode
}

export function PosEmptyState({ variant = 'generic', title, hint, action }: Props) {
  return (
    <div className="mc-pos-empty-state">
      <div className="mc-pos-empty-state__illus" aria-hidden>
        <div className="mc-pos-empty-state__ring" />
        <PosIcon name={ICON[variant]} size={32} />
      </div>
      <p className="mc-pos-empty-state__title">{title}</p>
      {hint && <p className="mc-pos-empty-state__hint">{hint}</p>}
      {action}
    </div>
  )
}
