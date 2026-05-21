import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { LANDING_REGISTER_PATH } from '@/landing/landingContent'

type Variant = 'primary' | 'secondary' | 'ghost' | 'nav' | 'light'

type Props = {
  variant?: Variant
  className?: string
  children?: string
  fullWidth?: boolean
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'mc-landing-btn-primary',
  secondary: 'mc-landing-btn-secondary',
  ghost: 'mc-landing-btn-ghost',
  nav: 'mc-landing-btn-nav',
  light: 'mc-landing-btn-light',
}

export function LandingRegisterButton({
  variant = 'primary',
  className = '',
  children = 'Registrar mi tienda',
  fullWidth = false,
}: Props) {
  return (
    <Link
      to={LANDING_REGISTER_PATH}
      className={clsx(VARIANT_CLASS[variant], fullWidth && 'w-full', className)}
    >
      {children}
    </Link>
  )
}
