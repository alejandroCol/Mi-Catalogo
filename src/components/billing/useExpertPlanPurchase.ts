import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
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
  const [msg, setMsg] = useState<string | null>(null)
  const [planConfig, setPlanConfig] = useState<McPlanConfig>(() => resolvePlanConfig(null))
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
    resetCheckout,
  }
}
