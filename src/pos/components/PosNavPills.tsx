import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { PosIcon } from '@/pos/components/PosIcon'
import type { PosNavItem } from '@/pos/lib/posNavConfig'

type Props = {
  items: PosNavItem[]
  ariaLabel: string
}

export function PosNavPills({ items, ariaLabel }: Props) {
  return (
    <nav className="mc-pos-nav" aria-label={ariaLabel}>
      <div className="mc-pos-nav__scroll mc-landing-container">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx('mc-pos-nav__pill', isActive && 'mc-pos-nav__pill--active')
            }
          >
            <PosIcon name={item.icon} size={16} className="mc-pos-nav__pill-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
