import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useAdminWhatsNew } from '@/hooks/useAdminWhatsNew'
import type { McTenant } from '@/types/mc'

type Props = {
  tenant: McTenant | null | undefined
  className?: string
}

export function AdminWhatsNewPromo({ tenant, className }: Props) {
  const { showChip, hasUnreadRelease } = useAdminWhatsNew(tenant)
  if (!showChip) return null

  return (
    <Link
      to="/app/novedades"
      className={clsx('mc-whats-new-chip group', className)}
      aria-label="Lo nuevo en Mi Catálogo"
    >
      <span className="mc-whats-new-chip__label-wrap">
        <span className="mc-whats-new-chip__label">Lo nuevo</span>
        <span
          className={clsx(
            'mc-whats-new-chip__underline',
            hasUnreadRelease && 'mc-whats-new-chip__underline--live',
          )}
          aria-hidden
        >
          <span className="mc-whats-new-chip__underline-shine" />
        </span>
      </span>
    </Link>
  )
}
