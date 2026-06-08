import clsx from 'clsx'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type Props = {
  to?: string
  onClick?: () => void
  icon: ReactNode
  title: string
  description?: string
  accent?: 'gold' | 'neutral' | 'dark'
  size?: 'small' | 'medium' | 'large'
}

export function VendedorDashboardTile({
  to,
  onClick,
  icon,
  title,
  description,
  accent = 'neutral',
  size = 'small',
}: Props) {
  const className = clsx(
    'mc-vendedor-bento__tile',
    `mc-vendedor-bento__tile--${size}`,
    `mc-vendedor-bento__tile--${accent}`,
    (to || onClick) && 'mc-vendedor-bento__tile--interactive group hover:shadow-[0_8px_24px_-12px_rgba(28,27,31,0.12)]',
  )

  const inner = (
    <>
      <span className="mc-vendedor-bento__icon">{icon}</span>
      <p className="mc-vendedor-bento__title">{title}</p>
      {description ? <p className="mc-vendedor-bento__desc">{description}</p> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}
