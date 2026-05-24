import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useSearchParams } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  hasExpertFeatureAccess,
  isBillingPastDueInGrace,
  planExpertDisplayName,
} from '@/lib/billingAccess'
import { resolvePlanConfig, type McPlanConfig } from '@/lib/billingPlans'
import type { McBillingPeriod } from '@/lib/billingSubscriptionClient'
import { firebaseConfigured, getDb, getFirebaseFunctions } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

export function useExpertPlanPurchase() {
  const { tenant } = useMcAuth()
  const [searchParams] = useSearchParams()
  const [msg, setMsg] = useState<string | null>(null)
  const [planConfig, setPlanConfig] = useState<McPlanConfig>(() => resolvePlanConfig(null))
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [discountPreview, setDiscountPreview] = useState<{
    finalPriceCop: number
    basePriceCop: number
    freeMonths?: number
    requiresPaymentMethod?: boolean
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

  useEffect(() => {
    const fromUrl = searchParams.get('code')?.trim()
    const fromTenant = tenant?.onboardingExpertRewardCode?.trim()
    const initial = fromUrl || fromTenant
    if (initial) {
      const normalized = initial.toUpperCase()
      setDiscountCode(normalized)
      void validarCodigo('monthly', normalized)
    }
  }, [searchParams, tenant?.onboardingExpertRewardCode])

  async function validarCodigo(p: McBillingPeriod, codeOverride?: string) {
    const code = (codeOverride ?? discountCode).trim()
    if (!code || !firebaseConfigured) {
      setDiscountPreview(null)
      return
    }
    setValidatingCode(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcBillingValidateDiscountCode')
      const res = await fn({ code, period: p })
      const d = res.data as {
        basePriceCop?: number
        finalPriceCop?: number
        freeMonths?: number
        requiresPaymentMethod?: boolean
      }
      setDiscountPreview({
        basePriceCop: d.basePriceCop ?? 0,
        finalPriceCop: d.finalPriceCop ?? 0,
        freeMonths: d.freeMonths,
        requiresPaymentMethod: d.requiresPaymentMethod,
      })
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
  const checkoutRequiresPaymentMethod =
    amountForPeriod > 0 || discountPreview?.requiresPaymentMethod === true

  function resetCheckout() {
    setCheckoutOpen(false)
  }

  return {
    tenant,
    msg,
    setMsg,
    planConfig,
    platformSettings,
    expertAccess,
    expertName,
    showPurchase,
    discountCode,
    setDiscountCode,
    discountPreview,
    validatingCode,
    period,
    setPeriod,
    checkoutOpen,
    setCheckoutOpen,
    validarCodigo,
    precioMensual,
    precioAnual,
    amountForPeriod,
    checkoutRequiresPaymentMethod,
    resetCheckout,
  }
}
