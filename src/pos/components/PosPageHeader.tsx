import type { ReactNode } from 'react'
import { PosIconBox, type PosIconName } from '@/pos/components/PosIcon'

type PosPageHeaderProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: PosIconName
}

export function PosPageHeader({ eyebrow, title, subtitle, action, icon }: PosPageHeaderProps) {
  return (
    <header className="mc-pos-page-header">
      <div className="mc-pos-page-header__text">
        {icon && <PosIconBox name={icon} tone="gold" size="sm" className="mc-pos-page-header__icon" />}
        <div>
          {eyebrow && <p className="mc-landing-eyebrow">{eyebrow}</p>}
          <h1 className="mc-pos-page-header__title">{title}</h1>
          {subtitle && <p className="mc-pos-page-header__subtitle">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="mc-pos-page-header__action">{action}</div>}
    </header>
  )
}
