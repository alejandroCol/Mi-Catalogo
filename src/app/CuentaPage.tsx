import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { buildConfigMenuItems, ConfigTileGrid } from '@/app/configuraciones'
import { BillingPastDueBanner } from '@/components/billing/BillingPastDueBanner'
import { PlanEleganceBadge } from '@/components/billing/PlanEleganceBadge'
import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import { billingPlanOf } from '@/lib/catalogTheme'
import { isCatalogoVendedorListo } from '@/lib/checkoutVentasModo'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { isSubscriptionActive } from '@/lib/subscription'
import type { McPlatformSettings } from '@/types/mc'

export function CuentaPage() {
  const { tenant, firebaseUser } = useMcAuth()
  const nav = useNavigate()
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)

  useEffect(() => {
    if (!firebaseConfigured) return
    void getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)).then((ps) => {
      setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
    })
  }, [])

  const active = tenant ? isSubscriptionActive(tenant.subscriptionEndsAt) : false
  const plan = tenant ? billingPlanOf(tenant) : 'free'
  const expertAccess = tenant ? hasExpertFeatureAccess(tenant) : false
  const catalogoListo = tenant ? isCatalogoVendedorListo(tenant, platformSettings) : false
  const cuponesCount = tenant?.cuponesCatalogo?.length ?? 0

  const menuItems = useMemo(() => {
    if (!tenant) return []
    return buildConfigMenuItems({ tenant, cuponesCount, catalogoListo })
  }, [tenant, cuponesCount, catalogoListo])

  async function salir() {
    if (!firebaseConfigured) return
    await signOut(getAuthApp())
    nav('/login', { replace: true })
  }

  return (
    <div className="mc-shell mc-config-page pb-4">
      <header className="mc-config-page__head">
        <h1 className="ios-large-title">Configuraciones</h1>
      </header>

      {!active && (
        <p className="mc-config-page__alert border border-neutral-200/60 bg-neutral-50/50 px-4 py-3 text-[13px] leading-relaxed text-[var(--cat-text)]">
          Membresía vencida. Contactá soporte o pedí extensión al súper admin.
        </p>
      )}

      {tenant && <BillingPastDueBanner tenant={tenant} />}

      {tenant && (
        <>
          <section className="mc-config-page__intro" aria-label="Tu plan">
            {expertAccess && <PlanEleganceBadge tenant={tenant} settings={platformSettings} />}
            {plan === 'free' ? (
              <Link
                to="/app/plan"
                className="mc-config-page__plan-link flex flex-wrap items-center gap-3 no-underline transition duration-200 ease-in-out hover:opacity-[0.97]"
              >
                <span className="ios-footnote font-medium">Plan producto:</span>
                <span className="border border-neutral-200/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-mc-600">
                  Free
                </span>
              </Link>
            ) : (
              <Link
                to="/app/plan"
                className="mc-config-page__plan-link flex flex-wrap items-center gap-3 no-underline transition duration-200 ease-in-out hover:opacity-[0.97]"
              >
                <span className="ios-footnote font-medium text-[var(--cat-text)]">Plan producto:</span>
                <span className="border border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cat-text)]">
                  Expert
                </span>
              </Link>
            )}
          </section>

          <section className="mc-config-page__grid" aria-label="Opciones de la tienda">
            <ConfigTileGrid items={menuItems} hasExpertAccess={expertAccess} />
          </section>
        </>
      )}

      <footer className="mc-config-page__footer">
        <button
          type="button"
          className="mc-btn-secondary w-full py-3.5 text-[15px]"
          onClick={() => void salir()}
        >
          Cerrar sesión
        </button>
        {firebaseUser?.email && <p className="text-center ios-footnote text-[var(--cat-muted)]">{firebaseUser.email}</p>}
      </footer>
    </div>
  )
}
