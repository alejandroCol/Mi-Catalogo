import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { DASHBOARD_RETURN_NAV } from '@/app/configuraciones/configSubpageNav'
import { WhatsNewFeatureIcon } from '@/components/admin/WhatsNewFeatureIcon'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  adminWhatsNewGeneral,
  isWhatsNewInCurrentRelease,
  type AdminWhatsNewItem,
} from '@/lib/adminWhatsNew'
import { useAdminWhatsNew } from '@/hooks/useAdminWhatsNew'

function WhatsNewGrid({ items }: { items: AdminWhatsNewItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="mc-whats-new-grid">
      {items.map((item, index) => {
        const accent = item.accent ?? 'neutral'
        const isFresh = isWhatsNewInCurrentRelease(item)

        return (
          <Link
            key={item.id}
            to={item.to}
            state={item.linkState ?? DASHBOARD_RETURN_NAV}
            className={clsx(
              'mc-whats-new-grid__tile group',
              `mc-whats-new-grid__tile--${accent}`,
            )}
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <div className="mc-whats-new-grid__head">
              <WhatsNewFeatureIcon id={item.id} />
              {isFresh ? <span className="mc-whats-new-grid__fresh">Nuevo</span> : null}
            </div>
            {item.tag ? <span className="mc-whats-new-grid__tag">{item.tag}</span> : null}
            <h2 className="mc-whats-new-grid__title">{item.title}</h2>
            <p className="mc-whats-new-grid__desc">{item.description}</p>
          </Link>
        )
      })}
    </div>
  )
}

export function AdminWhatsNewPage() {
  const { tenant } = useMcAuth()
  const { markReleaseSeen } = useAdminWhatsNew(tenant)

  const general = adminWhatsNewGeneral(tenant)

  useEffect(() => {
    markReleaseSeen()
  }, [markReleaseSeen])

  return (
    <div className="mc-shell mc-config-subpage mc-whats-new-page pb-8">
      <ConfiguracionesBackLink to="/app" label="← Inicio" state={DASHBOARD_RETURN_NAV} />
      <header className="mt-3">
        <h1 className="ios-large-title">Lo nuevo en Mi Catálogo</h1>
      </header>

      <div className="mt-6">
        <WhatsNewGrid items={general} />
      </div>
    </div>
  )
}
