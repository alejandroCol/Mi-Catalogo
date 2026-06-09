import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { buildConfigMenuItems } from '@/app/configuraciones/configMenuItems'
import { PlanEleganceBadge } from '@/components/billing/PlanEleganceBadge'
import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import { billingPlanOf } from '@/lib/catalogTheme'
import { isCatalogoVendedorListo } from '@/lib/checkoutVentasModo'
import { isCatalogPubliclyAccessible } from '@/lib/catalogPublish'
import type { ConfigMenuItem } from '@/app/configuraciones/types'
import { useDemoAdmin } from '@/vendedor/demo-admin/DemoAdminContext'

const SIZE_CLASS: Record<ConfigMenuItem['size'], string> = {
  large: 'col-span-2 row-span-2 min-h-[9.5rem] sm:min-h-[10.5rem]',
  wide: 'col-span-2 min-h-[5.25rem]',
  normal: 'col-span-1 min-h-[5.75rem]',
  compact: 'col-span-1 min-h-[4.75rem]',
}

export function DemoAdminCuentaPage() {
  const { tenant } = useDemoAdmin()
  const catalogoPublico = isCatalogPubliclyAccessible(tenant)
  const plan = billingPlanOf(tenant)
  const expertAccess = hasExpertFeatureAccess(tenant)
  const catalogoListo = isCatalogoVendedorListo(tenant, { pasarelaMicatalogoActiva: true })
  const cuponesCount = tenant.cuponesCatalogo?.length ?? 0

  const menuItems = useMemo(
    () => buildConfigMenuItems({ tenant, cuponesCount, catalogoListo }),
    [tenant, cuponesCount, catalogoListo],
  )

  return (
    <div className="mc-shell mc-config-page pb-4">
      <header className="mc-config-page__head">
        <h1 className="ios-large-title">Configuraciones</h1>
      </header>

      <section className="mc-config-page__intro" aria-label="Tu plan">
        {expertAccess && <PlanEleganceBadge tenant={tenant} settings={{ pasarelaMicatalogoActiva: true }} />}
        <div className="flex flex-wrap items-center gap-3">
          <span className="ios-footnote font-medium">Plan producto:</span>
          <span
            className={`border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${
              plan === 'expert'
                ? 'border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] text-[var(--cat-text)]'
                : 'border-neutral-200/80 text-neutral-600'
            }`}
          >
            {plan === 'expert' ? 'Expert' : 'Free'}
          </span>
          {catalogoPublico ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Tienda publicada
            </span>
          ) : null}
        </div>
      </section>

      <section className="mc-config-page__grid" aria-label="Opciones de la tienda">
        <div className="mc-config-grid-shell">
          <div
            className="grid grid-cols-2 gap-2 auto-rows-min sm:gap-2.5"
            role="navigation"
            aria-label="Opciones de configuración"
          >
            {menuItems.map((item) => (
              <div
                key={item.id}
                data-size={item.size}
                className={`mc-config-tile flex flex-col justify-between p-3.5 text-left sm:p-4 ${SIZE_CLASS[item.size]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  {item.icon ? (
                    <span className="mc-config-tile__icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200/50 text-[var(--cat-text)]">
                      {item.icon}
                    </span>
                  ) : (
                    <span className="sr-only">{item.title}</span>
                  )}
                </div>
                <div className="mt-auto pt-2">
                  <p className="text-[15px] font-medium leading-snug text-[var(--cat-text)] sm:text-[16px]">{item.title}</p>
                  {item.description ? (
                    <p className="ios-footnote mt-1 line-clamp-2 leading-relaxed text-[var(--cat-muted)]">
                      {item.description}
                    </p>
                  ) : null}
                  {item.hint ? (
                    <p className="ios-footnote mt-1 font-medium text-[var(--cat-muted)]">{item.hint}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mc-config-page__footer space-y-3">
        <p className="text-center text-[12px] leading-relaxed text-[var(--cat-muted)]">
          En la demo las opciones son ilustrativas. El comerciante accede a cada sección desde su panel real.
        </p>
        <Link
          to="/vendedor"
          className="mc-btn-secondary flex w-full items-center justify-center py-3.5 text-[15px] no-underline"
        >
          Volver al panel vendedor
        </Link>
      </footer>
    </div>
  )
}
