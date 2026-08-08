import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { tenantHasPoliticas } from '@/lib/tenantPoliticas'
import type { McTenant } from '@/types/mc'
import { usePublicStore } from '@/public/PublicStoreContext'

type Props = {
  tenant: McTenant
  className?: string
  /** @deprecated kept for call-site compat; layout is always compact */
  compact?: boolean
}

export function CatalogTrustSignals({ tenant, className }: Props) {
  const { to } = usePublicStore()
  const modo = explicitCheckoutVentasModo(tenant)
  const hasPoliticas = tenantHasPoliticas(tenant)
  const hasCod = tenant.contraentregaCatalogoEnabled === true

  const labels: string[] = []
  if (modo === 'pasarela' || modo === 'pasarela_micatalogo') {
    labels.push('Pago seguro')
  }
  if (hasCod) {
    labels.push('Contraentrega')
  }
  if ((tenant.politicasCambios ?? '').trim() || hasPoliticas) {
    labels.push('Cambios')
  }

  if (labels.length === 0 && !hasPoliticas) return null

  return (
    <div className={clsx('text-[11px] leading-none tracking-[0.04em] text-[var(--cat-muted)]', className)}>
      {labels.length > 0 ? (
        <p className="font-medium text-[color-mix(in_srgb,var(--cat-text)_72%,var(--cat-muted)_28%)]">
          {labels.join(' · ')}
        </p>
      ) : null}
      {hasPoliticas ? (
        <p className={clsx(labels.length > 0 && 'mt-1.5')}>
          <Link
            to={to('/politicas')}
            className="font-medium tracking-[0.03em] text-[var(--cat-muted)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_35%,transparent)] underline-offset-[3px] transition hover:text-[var(--cat-text)]"
          >
            Envíos, pagos y cambios
          </Link>
        </p>
      ) : null}
    </div>
  )
}
