import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { LANDING_REGISTER_PATH, landingRegisterCta } from '@/landing/landingContent'

type Variant = 'primary' | 'secondary' | 'ghost' | 'nav' | 'light'

type Props = {
  variant?: Variant
  className?: string
  children?: ReactNode
  fullWidth?: boolean
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'mc-landing-btn-primary',
  secondary: 'mc-landing-btn-secondary',
  ghost: 'mc-landing-btn-ghost',
  nav: 'mc-landing-btn-nav',
  light: 'mc-landing-btn-light',
}

function DefaultCtaLabel() {
  return (
    <span className="mc-landing-btn__label">
      {landingRegisterCta.label}
      <span className="mc-landing-btn__badge">{landingRegisterCta.highlight}</span>
    </span>
  )
}

export function LandingRegisterButton({
  variant = 'primary',
  className = '',
  children,
  fullWidth = false,
}: Props) {
  const ariaLabel =
    typeof children === 'string'
      ? children
      : `${landingRegisterCta.label} ${landingRegisterCta.highlight}`

  return (
    <Link
      to={LANDING_REGISTER_PATH}
      className={clsx(VARIANT_CLASS[variant], fullWidth && 'w-full', className)}
      aria-label={ariaLabel}
    >
      {children ?? <DefaultCtaLabel />}
    </Link>
  )
}
