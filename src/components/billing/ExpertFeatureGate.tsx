import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import type { McTenant } from '@/types/mc'
import { ExpertStar } from './ExpertStar'

type Props = {
  tenant: McTenant | null | undefined
  children: ReactNode
  /** Si false, solo muestra el contenido con estrella (sin bloquear). */
  lockWhenNoAccess?: boolean
  className?: string
}

/**
 * Muestra funciones Expert visibles con estrellita.
 * Sin acceso: enlace al panel de planes.
 */
export function ExpertFeatureGate({ tenant, children, lockWhenNoAccess = true, className = '' }: Props) {
  const hasAccess = hasExpertFeatureAccess(tenant)

  if (hasAccess || !lockWhenNoAccess) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <ExpertStar />
        {children}
      </span>
    )
  }

  return (
    <Link
      to="/app/plan"
      className={`inline-flex items-center gap-1.5 text-[var(--cat-text)] no-underline transition hover:opacity-80 ${className}`}
    >
      <ExpertStar />
      {children}
    </Link>
  )
}
