import type { ReactNode } from 'react'
import { MiCatalogoLogo } from '@/brand/MiCatalogoLogo'

type Props = {
  title?: string
  subtitle?: ReactNode
  className?: string
}

/** Cabecera de marca en flujos de autenticación (login, registro, verificación). */
export function AuthBrandHeader({ title, subtitle, className = '' }: Props) {
  return (
    <header className={`mb-10 flex flex-col items-center gap-4 text-center ${className}`}>
      <MiCatalogoLogo variant="full" size="md" title="mi catálogo" />
      {title ? (
        <h1 className="ios-large-title tracking-tighter">{title}</h1>
      ) : null}
      {subtitle ? (
        <p className="ios-subhead max-w-sm leading-relaxed text-mc-600">{subtitle}</p>
      ) : null}
    </header>
  )
}
