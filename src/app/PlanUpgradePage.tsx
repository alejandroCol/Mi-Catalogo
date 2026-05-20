import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { BillingPastDueBanner } from '@/components/billing/BillingPastDueBanner'
import { BillingSubscriptionManage } from '@/components/billing/BillingSubscriptionManage'
import { BillingV2Checkout } from '@/components/billing/BillingV2Checkout'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { PlanEleganceBadge } from '@/components/billing/PlanEleganceBadge'
import {
  hasExpertFeatureAccess,
  isBillingPastDueInGrace,
  planExpertDisplayName,
} from '@/lib/billingAccess'
import { resolvePlanConfig } from '@/lib/billingPlans'
import type { McBillingPeriod } from '@/lib/billingSubscriptionClient'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getDb, getFirebaseFunctions } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

function PlanFeatureCheck() {
  return (
    <span className="mc-plan-feature-check" aria-hidden>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-[var(--cat-text)]">
        <path
          d="M2.5 6.2 4.8 8.5 9.5 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function PlanUpgradePage() {
  const { tenant } = useMcAuth()
  const [msg, setMsg] = useState<string | null>(null)
  const [planConfig, setPlanConfig] = useState(() => resolvePlanConfig(null))
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [discountPreview, setDiscountPreview] = useState<{
    finalPriceCop: number
    basePriceCop: number
  } | null>(null)
  const [validatingCode, setValidatingCode] = useState(false)
  const [period, setPeriod] = useState<McBillingPeriod>('monthly')
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const expertAccess = hasExpertFeatureAccess(tenant)
  const expertName = planExpertDisplayName(platformSettings)
  const showPurchase = !expertAccess || isBillingPastDueInGrace(tenant)

  useEffect(() => {
    if (!firebaseConfigured) return
    void getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)).then((ps) => {
      const data = ps.exists() ? (ps.data() as McPlatformSettings) : {}
      setPlatformSettings(data)
      setPlanConfig(resolvePlanConfig(data))
    })
  }, [])

  async function validarCodigo(p: McBillingPeriod) {
    const code = discountCode.trim()
    if (!code || !firebaseConfigured) {
      setDiscountPreview(null)
      return
    }
    setValidatingCode(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingValidateDiscountCode')
      const res = await fn({ code, period: p })
      const d = res.data as { basePriceCop?: number; finalPriceCop?: number }
      setDiscountPreview({ basePriceCop: d.basePriceCop ?? 0, finalPriceCop: d.finalPriceCop ?? 0 })
      setMsg(null)
    } catch {
      setDiscountPreview(null)
      setMsg('Código no válido.')
    } finally {
      setValidatingCode(false)
    }
  }

  const precioMensual = discountPreview?.finalPriceCop ?? planConfig.expertPrecioMensualCop
  const precioAnual = planConfig.expertPrecioAnualCop
  const amountForPeriod = period === 'yearly' ? precioAnual : precioMensual

  const features = useMemo(
    () => [
      'Plantillas y colores del catálogo',
      'Logo de tienda',
      'Carga masiva de fotos',
      'Recuperación de carritos abandonados',
      `Hasta ${planConfig.expertMaxProductos} productos`,
    ],
    [planConfig.expertMaxProductos],
  )

  return (
    <div className="mc-plan-page">
      <ConfiguracionesBackLink />

      <header className="shrink-0 space-y-1">
        <h1 className="ios-large-title">Tu plan</h1>
        {expertAccess && tenant ? (
          <PlanEleganceBadge tenant={tenant} settings={platformSettings} className="!text-[20px] sm:!text-[22px]" />
        ) : (
          <p className="ios-footnote text-[var(--cat-muted)]">
            Plan <span className="font-medium text-[var(--cat-text)]">{expertName}</span>
          </p>
        )}
      </header>

      {tenant && isBillingPastDueInGrace(tenant) && <BillingPastDueBanner tenant={tenant} />}

      {expertAccess && (
        <BillingSubscriptionManage expertName={expertName} onMessage={setMsg} />
      )}

      {!expertAccess && (
        <section className="mc-plan-offer space-y-3" aria-labelledby="plan-benefits-title">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <ExpertStar className="!h-3.5 !w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                {expertName}
              </span>
            </div>
            <h2
              id="plan-benefits-title"
              className="text-[18px] font-semibold leading-snug tracking-tight text-[var(--cat-text)] sm:text-[19px]"
            >
              Usá Expert y obtené uso de:
            </h2>
          </div>
          <ul className="flex flex-col gap-2">
            {features.map((f) => (
              <li key={f} className="mc-plan-feature">
                <PlanFeatureCheck />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showPurchase && !checkoutOpen && (
        <section className="mc-plan-checkout">
          <div className="mc-card space-y-2.5 !py-3.5">
            <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Código de descuento</label>
            <div className="flex gap-2">
              <input
                className="mc-input !mt-0 flex-1"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="EXPERT2026"
              />
              <button
                type="button"
                className="mc-btn-secondary shrink-0 px-4"
                disabled={validatingCode}
                onClick={() => void validarCodigo(period)}
              >
                Aplicar
              </button>
            </div>
            {discountPreview && (
              <p className="ios-footnote text-[var(--cat-muted)]">
                Con código:{' '}
                <span className="font-medium text-[var(--cat-text)]">{formatCop(discountPreview.finalPriceCop)}</span>
              </p>
            )}
          </div>

          <div className="mc-plan-period-grid" role="group" aria-label="Período de facturación">
            <button
              type="button"
              className={`mc-plan-period-option ${period === 'monthly' ? 'mc-plan-period-option-active' : ''}`}
              aria-pressed={period === 'monthly'}
              onClick={() => setPeriod('monthly')}
            >
              <span className="mc-plan-period-label">Mensual</span>
              <span className="mc-plan-period-price">{formatCop(precioMensual)}</span>
              <span className="mc-plan-period-hint">Cada mes</span>
            </button>
            <button
              type="button"
              className={`mc-plan-period-option ${period === 'yearly' ? 'mc-plan-period-option-active' : ''}`}
              aria-pressed={period === 'yearly'}
              onClick={() => setPeriod('yearly')}
            >
              <span className="mc-plan-period-label">Anual</span>
              <span className="mc-plan-period-price">{formatCop(precioAnual)}</span>
              <span className="mc-plan-period-hint">Por año</span>
            </button>
          </div>

          <button type="button" className="mc-btn-primary w-full py-3.5 text-[16px]" onClick={() => setCheckoutOpen(true)}>
            Continuar con el pago
          </button>
          <p className="text-center ios-footnote text-[var(--cat-muted)]">Cancelá cuando quieras</p>
        </section>
      )}

      {showPurchase && checkoutOpen && (
        <section className="mc-plan-checkout min-h-0 flex-1 overflow-y-auto">
          <button
            type="button"
            className="text-[13px] font-medium text-[var(--cat-muted)] transition hover:opacity-70"
            onClick={() => setCheckoutOpen(false)}
          >
            ← Cambiar plan o código
          </button>
          <div className="mc-card overflow-hidden !p-0">
            <BillingV2Checkout
              period={period}
              amountCop={amountForPeriod}
              discountCode={discountCode.trim() || undefined}
              expertName={expertName}
              onSuccess={(m) => {
                setMsg(m)
                setCheckoutOpen(false)
              }}
              onError={(m) => setMsg(m)}
            />
          </div>
        </section>
      )}

      {msg && (
        <p className="shrink-0 rounded-md border border-neutral-200/50 bg-neutral-50/80 px-4 py-2.5 text-[14px] text-[var(--cat-text)]">
          {msg}
        </p>
      )}
    </div>
  )
}
