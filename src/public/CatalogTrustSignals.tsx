import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { tenantHasPoliticas } from '@/lib/tenantPoliticas'
import type { McTenant } from '@/types/mc'
import { usePublicStore } from '@/public/PublicStoreContext'

type Props = {
  tenant: McTenant
  className?: string
  /** @deprecated kept for call-site compat */
  compact?: boolean
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 3.2 5.5 5.6v5.3c0 4.2 2.7 7.9 6.5 9.3 3.8-1.4 6.5-5.1 6.5-9.3V5.6L12 3.2Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.1 11.1 14l3.7-4.2"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CatalogTrustSignals({ tenant, className }: Props) {
  const { to } = usePublicStore()
  const modo = explicitCheckoutVentasModo(tenant)
  const hasPoliticas = tenantHasPoliticas(tenant)
  const hasCod = tenant.contraentregaCatalogoEnabled === true
  const showPagoSeguro = modo === 'pasarela' || modo === 'pasarela_micatalogo'

  const secondary: string[] = []
  if (hasCod) secondary.push('Contraentrega')
  if ((tenant.politicasCambios ?? '').trim() || hasPoliticas) secondary.push('Cambios')

  if (!showPagoSeguro && secondary.length === 0 && !hasPoliticas) return null

  return (
    <div className={clsx(className)}>
      {showPagoSeguro ? (
        <div className="inline-flex w-fit max-w-full items-center gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--cat-text)_8%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_88%,var(--cat-bg)_12%)] px-3 py-2.5 shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_4%,transparent)]">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cat-text)_5%,var(--cat-surface)_95%)] text-[var(--cat-text)]"
            aria-hidden
          >
            <ShieldCheckIcon className="h-[15px] w-[15px] opacity-80" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[12px] font-semibold tracking-tight text-[var(--cat-text)]">Pago seguro</p>
            <p className="mt-0.5 text-[11px] text-[var(--cat-muted)]">Checkout protegido</p>
          </div>
        </div>
      ) : null}

      {secondary.length > 0 ? (
        <p
          className={clsx(
            'text-[11px] font-medium tracking-[0.04em] text-[color-mix(in_srgb,var(--cat-text)_65%,var(--cat-muted)_35%)]',
            showPagoSeguro ? 'mt-2' : null,
          )}
        >
          {secondary.join(' · ')}
        </p>
      ) : null}

      {hasPoliticas ? (
        <p className={clsx('text-[11px]', showPagoSeguro || secondary.length > 0 ? 'mt-1.5' : null)}>
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
