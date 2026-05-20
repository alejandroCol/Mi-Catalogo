import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { Link } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { BillingPastDueBanner } from '@/components/billing/BillingPastDueBanner'
import { BillingV2Checkout } from '@/components/billing/BillingV2Checkout'
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
    <div className="mc-shell space-y-8">
      <Link
        to="/app/cuenta"
        className="text-[13px] font-medium text-[var(--cat-muted)] transition hover:opacity-70"
      >
        ← Cuenta
      </Link>
      <h1 className="ios-large-title mt-3">Tu plan</h1>

      {tenant && isBillingPastDueInGrace(tenant) && <BillingPastDueBanner tenant={tenant} />}

      {expertAccess && tenant && (
        <div className="space-y-2">
          <PlanEleganceBadge tenant={tenant} settings={platformSettings} />
        </div>
      )}

      {!expertAccess && (
        <>
          <p className="ios-footnote max-w-xl leading-relaxed text-[var(--cat-muted)]">
            Pasá a <strong className="font-medium text-[var(--cat-text)]">{expertName}</strong>. Pago in-app con
            tarjeta o Nequi y renovación automática.
          </p>
          <ul className="ios-footnote list-inside list-disc space-y-1 text-[var(--cat-muted)]">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </>
      )}

      {showPurchase && !checkoutOpen && (
        <>
          <div className="mc-card mx-auto max-w-lg space-y-3">
            <label className="ios-footnote font-medium opacity-80">Código de descuento</label>
            <div className="flex gap-2">
              <input
                className="mc-input flex-1"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="EXPERT2026"
              />
              <button
                type="button"
                className="mc-btn-secondary px-4"
                disabled={validatingCode}
                onClick={() => void validarCodigo(period)}
              >
                Aplicar
              </button>
            </div>
            {discountPreview && (
              <p className="ios-footnote text-[var(--cat-muted)]">
                Con código: {formatCop(discountPreview.finalPriceCop)}
              </p>
            )}
          </div>

          <div className="max-w-lg">
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-[14px] font-medium ${
                  period === 'monthly' ? 'border-[var(--cat-text)] bg-neutral-50' : 'border-neutral-200'
                }`}
                onClick={() => setPeriod('monthly')}
              >
                Mensual · {formatCop(precioMensual)}
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-[14px] font-medium ${
                  period === 'yearly' ? 'border-[var(--cat-text)] bg-neutral-50' : 'border-neutral-200'
                }`}
                onClick={() => setPeriod('yearly')}
              >
                Anual · {formatCop(precioAnual)}
              </button>
            </div>
          </div>

          <button type="button" className="mc-btn-primary w-full max-w-lg" onClick={() => setCheckoutOpen(true)}>
            Continuar con el pago
          </button>
        </>
      )}

      {showPurchase && checkoutOpen && (
        <div className="mx-auto max-w-lg space-y-4">
          <button
            type="button"
            className="text-[13px] font-medium text-[var(--cat-muted)]"
            onClick={() => setCheckoutOpen(false)}
          >
            ← Cambiar plan o código
          </button>
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
      )}

      {msg && <p className="text-[13px]">{msg}</p>}
    </div>
  )
}
