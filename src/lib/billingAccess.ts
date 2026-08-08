import {
  isExpertBillingPlan,
  isMasterBillingPlan,
  isPaidBillingPlan,
} from '@/lib/billingPlan'
import { isSubscriptionActive } from '@/lib/subscription'
import type { McPlatformSettings, McTenant } from '@/types/mc'

export const MC_BILLING_GRACE_DAYS = 7

export const DEFAULT_PLAN_EXPERT_DISPLAY_NAME = 'Expert'
export const DEFAULT_PLAN_MASTER_DISPLAY_NAME = 'Master'

export function planExpertDisplayName(settings: McPlatformSettings | null | undefined): string {
  const n = settings?.planExpertDisplayName?.trim()
  return n && n.length > 0 ? n : DEFAULT_PLAN_EXPERT_DISPLAY_NAME
}

export function planMasterDisplayName(settings: McPlatformSettings | null | undefined): string {
  const n = settings?.planMasterDisplayName?.trim()
  return n && n.length > 0 ? n : DEFAULT_PLAN_MASTER_DISPLAY_NAME
}

function hasActivePaidSubscription(tenant: McTenant): boolean {
  if (isSubscriptionActive(tenant.subscriptionEndsAt)) return true
  const grace = tenant.billingGraceUntilMs
  return typeof grace === 'number' && grace > Date.now()
}

/** Expert o Master con suscripción activa (o gracia): funciones premium del catálogo. */
export function hasExpertFeatureAccess(tenant: McTenant | null | undefined): boolean {
  if (!tenant || !isPaidBillingPlan(tenant.billingPlan)) return false
  return hasActivePaidSubscription(tenant)
}

/** Solo Master con suscripción activa: live shopping. */
export function hasLiveFeatureAccess(tenant: McTenant | null | undefined): boolean {
  if (!tenant || !isMasterBillingPlan(tenant.billingPlan)) return false
  return hasActivePaidSubscription(tenant)
}

/** Solo Master con suscripción activa: Drop Room + Pasillo / Showroom. */
export function hasShowroomFeatureAccess(tenant: McTenant | null | undefined): boolean {
  return hasLiveFeatureAccess(tenant)
}

/** Cobro vencido pero aún en período de gracia (7 días). */
export function isBillingPastDueInGrace(tenant: McTenant | null | undefined): boolean {
  if (!tenant || tenant.billingSubStatus !== 'past_due') return false
  const grace = tenant.billingGraceUntilMs
  return typeof grace === 'number' && grace > Date.now()
}

/** Debe actualizar método de pago (past_due en gracia o suscripción activa con aviso). */
export function needsBillingPaymentUpdate(tenant: McTenant | null | undefined): boolean {
  return isBillingPastDueInGrace(tenant)
}

export function billingGraceDaysRemaining(tenant: McTenant | null | undefined): number {
  const grace = tenant?.billingGraceUntilMs
  if (typeof grace !== 'number') return 0
  const ms = grace - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

/** Etiqueta elegante del plan actual para el dueño. */
export function ownerPlanEleganceLabel(
  tenant: McTenant | null | undefined,
  settings: McPlatformSettings | null | undefined,
): string {
  if (!tenant) return 'Free'
  if (isMasterBillingPlan(tenant.billingPlan)) {
    return planMasterDisplayName(settings)
  }
  if (isExpertBillingPlan(tenant.billingPlan)) {
    return planExpertDisplayName(settings)
  }
  return 'Free'
}
